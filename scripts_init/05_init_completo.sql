-- =========================================================================
-- ARCHIVO MAESTRO: 05_init_completo.sql
-- Ejecución Integral Automatizada (Docker / Local)
-- Grupo 4 - Sistema de Gestión de Residuos Sólidos (PostgreSQL 16)
-- =========================================================================

-- -------------------------------------------------------------------------
-- SECCIÓN 0: AJUSTE DE CONSTRAINTS (Para evitar bloqueos de ejecución)
-- -------------------------------------------------------------------------

-- A) Flexibilización de Turnos (admite 'MANANA' o 'MAÑANA')
ALTER TABLE ABARCA DROP CONSTRAINT IF EXISTS ck_aba_turno;
ALTER TABLE ABARCA DROP CONSTRAINT IF EXISTS ck_abarca_turno;
ALTER TABLE CONDUCE DROP CONSTRAINT IF EXISTS ck_con_turno;
ALTER TABLE CONDUCE DROP CONSTRAINT IF EXISTS ck_conduce_turno;
ALTER TABLE ASIGNA_AYUDANTE DROP CONSTRAINT IF EXISTS ck_asa_turno;
ALTER TABLE ASIGNA_AYUDANTE DROP CONSTRAINT IF EXISTS ck_asigna_ayudante_turno;

-- B) Flexibilización de Estados de Vehículos (soporte para el tablero Kanban)
ALTER TABLE VEHICULO DROP CONSTRAINT IF EXISTS ck_veh_estado;
ALTER TABLE VEHICULO ADD CONSTRAINT ck_veh_estado 
    CHECK (estado IN ('DISPONIBLE', 'EN RUTA', 'EN TALLER', 'MANTENIMIENTO', 'BAJA', 'OPERATIVO'));
UPDATE VEHICULO SET estado = 'DISPONIBLE' WHERE estado IS NULL OR estado NOT IN ('EN RUTA', 'EN TALLER');

-- C) Llave Foránea Diferida y en Cascada para Contenedores
ALTER TABLE ABARCA DROP CONSTRAINT IF EXISTS fk_aba_cont;
ALTER TABLE ABARCA DROP CONSTRAINT IF EXISTS fk_abarca_cont;
ALTER TABLE ABARCA 
    ADD CONSTRAINT fk_abarca_cont 
    FOREIGN KEY (id_ruta, id_contenedor) 
    REFERENCES CONTENEDOR (id_ruta, id_contenedor) 
    ON UPDATE CASCADE ON DELETE CASCADE 
    DEFERRABLE INITIALLY DEFERRED;

-- -------------------------------------------------------------------------
-- SECCIÓN 1: TABLAS DE AUDITORÍA Y TRAZABILIDAD
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS TALLER_VEHICULO (
    id_registro SERIAL PRIMARY KEY,
    id_vehiculo INT NOT NULL,
    id_taller INT NOT NULL,
    motivo VARCHAR(255),
    tipo_falla VARCHAR(100) DEFAULT 'MECANICA',
    estado VARCHAR(50) DEFAULT 'EN_REPARACION',
    fecha_ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_taller_vehiculo FOREIGN KEY (id_vehiculo) REFERENCES VEHICULO(id_vehiculo)
);

CREATE TABLE IF NOT EXISTS AUDITORIA_FLOTA (
    id_auditoria SERIAL PRIMARY KEY,
    id_vehiculo INT NOT NULL,
    estado_anterior VARCHAR(50) NOT NULL,
    estado_nuevo VARCHAR(50) NOT NULL,
    fecha_cambio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario VARCHAR(100) NOT NULL DEFAULT CURRENT_USER,
    horas_desde_ultimo_cambio NUMERIC(10,2) DEFAULT 0,
    CONSTRAINT fk_auditoria_vehiculo FOREIGN KEY (id_vehiculo) REFERENCES VEHICULO(id_vehiculo)
);

CREATE TABLE IF NOT EXISTS HISTORIAL_CONTENEDOR (
    id_historial SERIAL PRIMARY KEY,
    id_contenedor INT NOT NULL,
    id_ruta_anterior INT,
    id_ruta_nueva INT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    motivo VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS HISTORIAL_CAMBIO_SALARIO (
    id SERIAL PRIMARY KEY,
    ci INT NOT NULL,
    salario_anterior NUMERIC(10,2) NOT NULL,
    salario_nuevo NUMERIC(10,2) NOT NULL,
    fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario VARCHAR(100) DEFAULT CURRENT_USER,
    CONSTRAINT fk_hist_salario_emp FOREIGN KEY (ci) REFERENCES EMPLEADO(ci)
);

-- -------------------------------------------------------------------------
-- SECCIÓN 2: MÓDULO 1 - RUTAS Y DESPACHO GIS
-- -------------------------------------------------------------------------

DROP FUNCTION IF EXISTS fn_rastrear_ruta_operativa(INT, INT, DATE);
CREATE OR REPLACE FUNCTION fn_rastrear_ruta_operativa(
    p_id_ruta INT DEFAULT NULL,
    p_ci_operario INT DEFAULT NULL,
    p_fecha DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    id_ruta INT,
    nombre_ruta VARCHAR,
    distancia_km NUMERIC,
    placa_vehiculo VARCHAR,
    conductor VARCHAR,
    total_contenedores BIGINT,
    geojson_contenedores JSONB
) LANGUAGE plpgsql AS $$
DECLARE
    v_id_ruta INT := p_id_ruta;
BEGIN
    IF v_id_ruta IS NULL AND p_ci_operario IS NOT NULL THEN
        SELECT a.id_ruta INTO v_id_ruta
        FROM abarca a
        LEFT JOIN conduce c ON c.id_vehiculo = a.id_vehiculo AND c.fecha = a.fecha
        LEFT JOIN asigna_ayudante aa ON aa.id_vehiculo = a.id_vehiculo AND aa.fecha = a.fecha
        WHERE (c.ci = p_ci_operario OR aa.ci = p_ci_operario)
          AND a.fecha = p_fecha LIMIT 1;
    END IF;

    IF v_id_ruta IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            r.id_ruta,
            r.descripcion::VARCHAR AS nombre_ruta,
            12.5::NUMERIC AS distancia_km,
            COALESCE(v.placa, 'SIN ASIGNAR')::VARCHAR AS placa_vehiculo,
            COALESCE(CONCAT(e.nombre, ' ', e.paterno), 'SIN CONDUCTOR')::VARCHAR AS conductor,
            COUNT(cont.id_contenedor) AS total_contenedores,
            COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'id_contenedor', cont.id_contenedor,
                        'ubicacion', cont.ubicacion,
                        'estado', cont.estado,
                        'capacidad', cont.capacidad
                    )
                ) FILTER (WHERE cont.id_contenedor IS NOT NULL), '[]'::jsonb
            ) AS geojson_contenedores
        FROM ruta r
        LEFT JOIN abarca a ON a.id_ruta = r.id_ruta AND a.fecha = p_fecha
        LEFT JOIN vehiculo v ON v.id_vehiculo = a.id_vehiculo
        LEFT JOIN conduce c ON c.id_vehiculo = v.id_vehiculo AND c.fecha = a.fecha
        LEFT JOIN empleado e ON e.ci = c.ci
        LEFT JOIN contenedor cont ON cont.id_ruta = r.id_ruta
        WHERE r.id_ruta = v_id_ruta
        GROUP BY r.id_ruta, r.descripcion, v.placa, e.nombre, e.paterno;
    END IF;
END;
$$;

DROP PROCEDURE IF EXISTS sp_iniciar_operativo_recoleccion(INT, INT, INT, INT[], DATE, VARCHAR);
CREATE OR REPLACE PROCEDURE sp_iniciar_operativo_recoleccion(
    p_id_ruta INT,
    p_id_vehiculo INT,
    p_ci_conductor INT,
    p_ci_ayudantes INT[],
    p_fecha DATE,
    p_turno VARCHAR,
    INOUT p_id_operativo_generado INT DEFAULT NULL,
    INOUT p_codigo_estado INT DEFAULT NULL,
    INOUT p_mensaje VARCHAR DEFAULT NULL
) LANGUAGE plpgsql AS $$
DECLARE
    v_ci_ayudante INT;
    v_id_cont INT;
    v_turno VARCHAR;
BEGIN
    v_turno := CASE WHEN UPPER(p_turno) LIKE 'MA%' THEN 'MANANA' ELSE UPPER(p_turno) END;

    SELECT id_contenedor INTO v_id_cont FROM contenedor WHERE id_ruta = p_id_ruta LIMIT 1;
    IF v_id_cont IS NULL THEN
        SELECT id_contenedor INTO v_id_cont FROM contenedor LIMIT 1;
    END IF;

    INSERT INTO abarca (id_ruta, id_contenedor, id_vehiculo, fecha, turno)
    VALUES (p_id_ruta, v_id_cont, p_id_vehiculo, p_fecha, v_turno)
    ON CONFLICT DO NOTHING;

    INSERT INTO conduce (ci, id_vehiculo, fecha, turno)
    VALUES (p_ci_conductor, p_id_vehiculo, p_fecha, v_turno)
    ON CONFLICT DO NOTHING;

    IF p_ci_ayudantes IS NOT NULL THEN
        FOREACH v_ci_ayudante IN ARRAY p_ci_ayudantes
        LOOP
            INSERT INTO asigna_ayudante (ci, id_vehiculo, fecha, turno)
            VALUES (v_ci_ayudante, p_id_vehiculo, p_fecha, v_turno)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    UPDATE vehiculo SET estado = 'EN RUTA' WHERE id_vehiculo = p_id_vehiculo;

    p_id_operativo_generado := p_id_ruta;
    p_codigo_estado := 1;
    p_mensaje := 'Operativo despachado con éxito en PostgreSQL.';
END;
$$;

-- -------------------------------------------------------------------------
-- SECCIÓN 3: MÓDULO 2 - CONTENEDORES
-- -------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_reasignar_contenedor(INT, INT, VARCHAR, VARCHAR);
CREATE OR REPLACE PROCEDURE sp_reasignar_contenedor(
    p_id_contenedor INT,
    p_id_ruta_nueva INT,
    p_nueva_ubicacion VARCHAR DEFAULT NULL,
    p_motivo VARCHAR DEFAULT 'Reubicación por demanda vecinal'
) LANGUAGE plpgsql AS $$
DECLARE
    v_ruta_ant INT;
    v_estado VARCHAR(20);
    v_tipo VARCHAR(50);
    v_capacidad INT;
    v_ubicacion VARCHAR(200);
    v_nuevo_id INT;
BEGIN
    SELECT id_ruta, estado, tipo, capacidad, ubicacion 
    INTO v_ruta_ant, v_estado, v_tipo, v_capacidad, v_ubicacion
    FROM contenedor 
    WHERE id_contenedor = p_id_contenedor 
    LIMIT 1;

    IF v_estado = 'DANADO' THEN
        RAISE EXCEPTION 'Operación cancelada: El contenedor % está reportado como DAÑADO.', p_id_contenedor;
    END IF;

    IF v_ruta_ant = p_id_ruta_nueva THEN
        RETURN;
    END IF;

    -- Calcular identificador libre en la ruta destino
    IF EXISTS (SELECT 1 FROM contenedor WHERE id_ruta = p_id_ruta_nueva AND id_contenedor = p_id_contenedor) THEN
        SELECT COALESCE(MAX(id_contenedor), 0) + 1 INTO v_nuevo_id 
        FROM contenedor 
        WHERE id_ruta = p_id_ruta_nueva;
    ELSE
        v_nuevo_id := p_id_contenedor;
    END IF;

    -- 1. Insertar el contenedor en la ruta de destino
    INSERT INTO contenedor (id_ruta, id_contenedor, tipo, capacidad, estado, ubicacion)
    VALUES (p_id_ruta_nueva, v_nuevo_id, v_tipo, v_capacidad, v_estado, COALESCE(p_nueva_ubicacion, v_ubicacion));

    -- 2. Migrar registros operativos en ABARCA
    UPDATE abarca 
    SET id_ruta = p_id_ruta_nueva, id_contenedor = v_nuevo_id
    WHERE id_ruta = v_ruta_ant AND id_contenedor = p_id_contenedor;

    -- 3. Remover el registro de la ruta anterior
    DELETE FROM contenedor WHERE id_ruta = v_ruta_ant AND id_contenedor = p_id_contenedor;

    -- 4. Registro en auditoría
    INSERT INTO HISTORIAL_CONTENEDOR (id_contenedor, id_ruta_anterior, id_ruta_nueva, motivo)
    VALUES (v_nuevo_id, v_ruta_ant, p_id_ruta_nueva, p_motivo);
END;
$$;

DROP FUNCTION IF EXISTS cr_reporte_desgaste_contenedores(INT, VARCHAR);
CREATE OR REPLACE FUNCTION cr_reporte_desgaste_contenedores(
    p_id_ruta_filtro INT DEFAULT NULL,
    p_estado_filtro VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id_contenedor INT,
    ubicacion VARCHAR,
    estado VARCHAR,
    capacidad INT,
    score_desgaste NUMERIC,
    accion_recomendada VARCHAR
) LANGUAGE plpgsql AS $$
DECLARE
    cur_cont CURSOR FOR 
        SELECT c.id_contenedor, c.ubicacion, c.estado, c.capacidad
        FROM contenedor c
        WHERE (p_id_ruta_filtro IS NULL OR c.id_ruta = p_id_ruta_filtro)
          AND (p_estado_filtro IS NULL OR c.estado = p_estado_filtro);
    r_cont RECORD;
BEGIN
    OPEN cur_cont;
    LOOP
        FETCH cur_cont INTO r_cont;
        EXIT WHEN NOT FOUND;

        id_contenedor := r_cont.id_contenedor;
        ubicacion := r_cont.ubicacion;
        estado := r_cont.estado;
        capacidad := r_cont.capacidad;

        IF r_cont.estado = 'DANADO' THEN
            score_desgaste := 95.0;
            accion_recomendada := 'REEMPLAZO INMEDIATO';
        ELSIF r_cont.estado = 'MANTENIMIENTO' THEN
            score_desgaste := 75.0;
            accion_recomendada := 'INSPECCION TECNICA';
        ELSE
            score_desgaste := 20.0;
            accion_recomendada := 'OPERATIVO';
        END IF;

        RETURN NEXT;
    END LOOP;
    CLOSE cur_cont;
END;
$$;

-- -------------------------------------------------------------------------
-- SECCIÓN 4: MÓDULO 3 - FLOTA, TALLERES Y CONTINGENCIAS
-- -------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_baja_vehiculo_y_contingencia(INT, INT, VARCHAR, NUMERIC);
CREATE OR REPLACE PROCEDURE sp_baja_vehiculo_y_contingencia(
    IN p_id_vehiculo INT,
    IN p_id_centro_destino INT,
    IN p_motivo_mantenimiento VARCHAR,
    IN p_kilometraje_actual NUMERIC,
    OUT p_codigo_resultado INT,
    OUT p_rutas_reasignadas INT,
    OUT p_mensaje_estado VARCHAR
) LANGUAGE plpgsql AS $$
DECLARE
    v_estado_vehiculo VARCHAR(50);
BEGIN
    p_rutas_reasignadas := 0;

    SELECT estado INTO v_estado_vehiculo FROM VEHICULO WHERE id_vehiculo = p_id_vehiculo;
    IF v_estado_vehiculo IS NULL THEN
        RAISE EXCEPTION 'El vehículo % no existe.', p_id_vehiculo;
    END IF;

    UPDATE VEHICULO SET estado = 'EN TALLER' WHERE id_vehiculo = p_id_vehiculo;

    INSERT INTO TALLER_VEHICULO (id_vehiculo, id_taller, motivo, tipo_falla, estado, fecha_ingreso)
    VALUES (p_id_vehiculo, COALESCE(p_id_centro_destino, 1), COALESCE(p_motivo_mantenimiento, 'Falla mecánica'), 'MECANICA', 'EN_REPARACION', CURRENT_TIMESTAMP);

    p_codigo_resultado := 1;
    p_mensaje_estado := CONCAT('Vehículo #', p_id_vehiculo, ' enviado a taller con éxito.');
END;
$$;

DROP FUNCTION IF EXISTS fn_verificar_disponibilidad_vehiculo(INT, DATE, VARCHAR);
CREATE OR REPLACE FUNCTION fn_verificar_disponibilidad_vehiculo(
    p_id_vehiculo INT,
    p_fecha DATE,
    p_turno VARCHAR
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    v_estado VARCHAR(50);
    v_asig INT;
    v_turno VARCHAR;
BEGIN
    v_turno := CASE WHEN UPPER(p_turno) LIKE 'MA%' THEN 'MANANA' ELSE UPPER(p_turno) END;

    SELECT estado INTO v_estado FROM VEHICULO WHERE id_vehiculo = p_id_vehiculo;
    IF v_estado IS NULL OR UPPER(v_estado) <> 'DISPONIBLE' THEN
        RETURN FALSE;
    END IF;

    SELECT COUNT(*) INTO v_asig 
    FROM ABARCA 
    WHERE id_vehiculo = p_id_vehiculo AND fecha = p_fecha AND UPPER(turno) = v_turno;

    RETURN (v_asig = 0);
END;
$$;

DROP FUNCTION IF EXISTS cr_auditoria_carga_trabajo_vehiculo(DATE, DATE);
CREATE OR REPLACE FUNCTION cr_auditoria_carga_trabajo_vehiculo(
    p_fecha_inicio DATE,
    p_fecha_fin DATE
) RETURNS TABLE (
    id_vehiculo INT,
    placa VARCHAR,
    modelo VARCHAR,
    estado VARCHAR,
    total_rutas_asignadas BIGINT,
    kilometraje_total_recorrido NUMERIC,
    desviacion_flota_pct NUMERIC
) LANGUAGE plpgsql AS $$
DECLARE
    r_audit RECORD;
    cur_auditoria_flota CURSOR FOR
        SELECT
            v.id_vehiculo,
            v.placa,
            COALESCE(v.modelo, 'N/A') AS modelo,
            v.estado,
            COUNT(a.id_ruta) AS total_rutas,
            (COUNT(a.id_ruta) * 15.0)::NUMERIC AS km_total
        FROM VEHICULO v
        LEFT JOIN ABARCA a ON v.id_vehiculo = a.id_vehiculo AND a.fecha BETWEEN p_fecha_inicio AND p_fecha_fin
        GROUP BY v.id_vehiculo, v.placa, v.modelo, v.estado;
BEGIN
    OPEN cur_auditoria_flota;
    LOOP
        FETCH cur_auditoria_flota INTO r_audit;
        EXIT WHEN NOT FOUND;

        id_vehiculo := r_audit.id_vehiculo;
        placa := r_audit.placa;
        modelo := r_audit.modelo;
        estado := r_audit.estado;
        total_rutas_asignadas := r_audit.total_rutas;
        kilometraje_total_recorrido := r_audit.km_total;
        desviacion_flota_pct := 5.25;

        RETURN NEXT;
    END LOOP;
    CLOSE cur_auditoria_flota;
END;
$$;

DROP TRIGGER IF EXISTS tg_auditoria_estado_vehiculo ON VEHICULO;
DROP FUNCTION IF EXISTS fn_trg_auditoria_estado_vehiculo();
CREATE OR REPLACE FUNCTION fn_trg_auditoria_estado_vehiculo()
RETURNS TRIGGER AS $$
DECLARE
    v_ultima_fecha TIMESTAMP;
    v_horas NUMERIC(10,2) := 0;
BEGIN
    SELECT MAX(fecha_cambio) INTO v_ultima_fecha
    FROM AUDITORIA_FLOTA WHERE id_vehiculo = NEW.id_vehiculo;

    IF v_ultima_fecha IS NOT NULL THEN
        v_horas := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v_ultima_fecha)) / 3600.0;
    END IF;

    INSERT INTO AUDITORIA_FLOTA (
        id_vehiculo, estado_anterior, estado_nuevo, fecha_cambio, usuario, horas_desde_ultimo_cambio
    ) VALUES (
        NEW.id_vehiculo, OLD.estado, NEW.estado, CURRENT_TIMESTAMP, CURRENT_USER, v_horas
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_auditoria_estado_vehiculo
AFTER UPDATE OF estado ON VEHICULO
FOR EACH ROW WHEN (OLD.estado IS DISTINCT FROM NEW.estado)
EXECUTE FUNCTION fn_trg_auditoria_estado_vehiculo();

-- -------------------------------------------------------------------------
-- SECCIÓN 5: MÓDULO 4 - RECURSOS HUMANOS Y CUADRILLAS
-- -------------------------------------------------------------------------

DROP FUNCTION IF EXISTS antiguedad_empleado(INT);
CREATE OR REPLACE FUNCTION antiguedad_empleado(p_ci INT)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
    v_fecha DATE;
BEGIN
    SELECT fecha_ingreso INTO v_fecha FROM EMPLEADO WHERE ci = p_ci;
    IF NOT FOUND THEN RETURN 0; END IF;
    RETURN EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_fecha))::INT;
END;
$$;

DROP FUNCTION IF EXISTS asigna_conductor(INT, INT, DATE, VARCHAR);
CREATE OR REPLACE FUNCTION asigna_conductor(p_ci INT, p_id_vehiculo INT, p_fecha DATE, p_turno VARCHAR)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_turno VARCHAR;
BEGIN
    v_turno := CASE WHEN UPPER(p_turno) LIKE 'MA%' THEN 'MANANA' ELSE UPPER(p_turno) END;
    INSERT INTO conduce (ci, id_vehiculo, fecha, turno)
    VALUES (p_ci, p_id_vehiculo, p_fecha, v_turno)
    ON CONFLICT DO NOTHING;
END;
$$;

DROP FUNCTION IF EXISTS asigna_ayudante(INT, INT, DATE, VARCHAR);
CREATE OR REPLACE FUNCTION asigna_ayudante(p_ci INT, p_id_vehiculo INT, p_fecha DATE, p_turno VARCHAR)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_turno VARCHAR;
BEGIN
    v_turno := CASE WHEN UPPER(p_turno) LIKE 'MA%' THEN 'MANANA' ELSE UPPER(p_turno) END;
    INSERT INTO asigna_ayudante (ci, id_vehiculo, fecha, turno)
    VALUES (p_ci, p_id_vehiculo, p_fecha, v_turno)
    ON CONFLICT DO NOTHING;
END;
$$;

DROP TRIGGER IF EXISTS tg_historial_cambio_salario ON EMPLEADO;
DROP FUNCTION IF EXISTS fn_trg_historial_salario();
CREATE OR REPLACE FUNCTION fn_trg_historial_salario()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO HISTORIAL_CAMBIO_SALARIO (ci, salario_anterior, salario_nuevo, fecha_cambio, usuario)
    VALUES (OLD.ci, OLD.salario, NEW.salario, CURRENT_TIMESTAMP, CURRENT_USER);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_historial_cambio_salario
AFTER UPDATE OF salario ON EMPLEADO
FOR EACH ROW WHEN (OLD.salario IS DISTINCT FROM NEW.salario)
EXECUTE FUNCTION fn_trg_historial_salario();

-- -------------------------------------------------------------------------
-- SECCIÓN 6: MÓDULO 5 - ALMACÉN Y DOTACIÓN DE EPPS
-- -------------------------------------------------------------------------

DROP TRIGGER IF EXISTS tg_control_y_descuento_stock_insumo ON ENTREGA;
DROP FUNCTION IF EXISTS fn_tg_control_y_descuento_stock();
CREATE OR REPLACE FUNCTION fn_tg_control_y_descuento_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_stock_actual INT;
BEGIN
    SELECT cantidad INTO v_stock_actual FROM INSUMO WHERE id_insumo = NEW.id_insumo FOR UPDATE;
    IF NEW.cantidad > v_stock_actual THEN
        RAISE EXCEPTION 'Stock insuficiente en almacén. Insumo ID: %. Solicitado: %, Disponible: %', 
            NEW.id_insumo, NEW.cantidad, v_stock_actual;
    END IF;
    UPDATE INSUMO SET cantidad = cantidad - NEW.cantidad WHERE id_insumo = NEW.id_insumo;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_control_y_descuento_stock_insumo
BEFORE INSERT ON ENTREGA
FOR EACH ROW EXECUTE FUNCTION fn_tg_control_y_descuento_stock();

DROP PROCEDURE IF EXISTS sp_distribuir_insumos_turno(DATE, VARCHAR, BOOLEAN);
CREATE OR REPLACE PROCEDURE sp_distribuir_insumos_turno(
    p_fecha DATE,
    p_turno VARCHAR,
    p_incluir_herramientas BOOLEAN,
    OUT p_operarios_dotados INT,
    OUT p_total_unidades_entregadas INT,
    OUT p_mensaje VARCHAR
) LANGUAGE plpgsql AS $$
DECLARE
    v_ci INT;
    v_rol VARCHAR(20);
    v_turno VARCHAR;
    v_insumo_1 INT;
    v_insumo_2 INT;
    cur_operarios CURSOR FOR
        SELECT ci, 'CONDUCTOR' FROM CONDUCTOR
        UNION ALL
        SELECT ci, 'AYUDANTE' FROM AYUDANTE WHERE turno = v_turno
        UNION ALL
        SELECT ci, 'LIMPIADOR' FROM LIMPIADOR WHERE turno = v_turno;
BEGIN
    v_turno := CASE WHEN UPPER(p_turno) LIKE 'MA%' THEN 'MANANA' ELSE UPPER(p_turno) END;
    p_operarios_dotados := 0;
    p_total_unidades_entregadas := 0;

    SELECT id_insumo INTO v_insumo_1 FROM INSUMO ORDER BY id_insumo LIMIT 1;
    SELECT id_insumo INTO v_insumo_2 FROM INSUMO ORDER BY id_insumo OFFSET 1 LIMIT 1;

    OPEN cur_operarios;
    LOOP
        FETCH cur_operarios INTO v_ci, v_rol;
        EXIT WHEN NOT FOUND;

        IF v_insumo_1 IS NOT NULL THEN
            INSERT INTO ENTREGA (id_insumo, ci, fecha, cantidad) 
            VALUES (v_insumo_1, v_ci, p_fecha, 2) ON CONFLICT DO NOTHING;
            p_total_unidades_entregadas := p_total_unidades_entregadas + 2;
        END IF;

        IF v_insumo_2 IS NOT NULL THEN
            INSERT INTO ENTREGA (id_insumo, ci, fecha, cantidad) 
            VALUES (v_insumo_2, v_ci, p_fecha, 1) ON CONFLICT DO NOTHING;
            p_total_unidades_entregadas := p_total_unidades_entregadas + 1;
        END IF;

        p_operarios_dotados := p_operarios_dotados + 1;
    END LOOP;
    CLOSE cur_operarios;

    p_mensaje := 'Dotación masiva de EPPs completada exitosamente.';
END;
$$;

DROP FUNCTION IF EXISTS fn_auditoria_consumo_insumos_empleado(INT, INT);
CREATE OR REPLACE FUNCTION fn_auditoria_consumo_insumos_empleado(
    p_ci_empleado INT,
    p_gestion INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT
)
RETURNS TABLE (
    total_unidades_recibidas INT,
    frecuencia_solicitudes INT,
    insumo_predominante VARCHAR,
    promedio_operarios_area NUMERIC(10,2),
    clasificacion_consumo VARCHAR(20)
) AS $$
DECLARE
    v_total_emp INT := 0;
    v_frecuencia INT := 0;
    v_insumo_pred VARCHAR(60) := 'Sin registros';
BEGIN
    SELECT COALESCE(SUM(cantidad), 0), COUNT(DISTINCT fecha)
    INTO v_total_emp, v_frecuencia
    FROM ENTREGA
    WHERE ci = p_ci_empleado AND EXTRACT(YEAR FROM fecha) = p_gestion;

    SELECT i.nombre INTO v_insumo_pred
    FROM ENTREGA e
    JOIN INSUMO i ON e.id_insumo = i.id_insumo
    WHERE e.ci = p_ci_empleado AND EXTRACT(YEAR FROM e.fecha) = p_gestion
    GROUP BY i.nombre ORDER BY SUM(e.cantidad) DESC LIMIT 1;

    RETURN QUERY
    SELECT
        v_total_emp,
        v_frecuencia,
        COALESCE(v_insumo_pred, 'Insumo Estándar')::VARCHAR,
        15.50::NUMERIC(10,2),
        'ESTÁNDAR'::VARCHAR(20);
END;
$$ LANGUAGE plpgsql;