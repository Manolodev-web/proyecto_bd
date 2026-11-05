-- =========================================================================
-- SISTEMA DE GESTIÓN Y RECOLECCIÓN DE RESIDUOS SÓLIDOS - UMSA
-- SCRIPT MAESTRO DE PROCEDIMIENTOS, FUNCIONES, CURSORES Y TRIGGERS
-- BASE DE DATOS: bd_recoleccion (PostgreSQL 16)
-- USUARIO: grupo4_recoleccion
-- =========================================================================

-- =========================================================================
-- TABLAS DE AUDITORÍA Y CONTROL (ALIMENTADAS EXCLUSIVAMENTE POR TRIGGERS)
-- =========================================================================

DROP TABLE IF EXISTS HISTORIAL_CONTENEDOR CASCADE;
CREATE TABLE HISTORIAL_CONTENEDOR (
    id_historial        SERIAL PRIMARY KEY,
    id_contenedor       INT NOT NULL,
    id_ruta_anterior    INT,
    id_ruta_nueva       INT,
    estado_anterior     VARCHAR(30),
    estado_nuevo        VARCHAR(30),
    motivo              VARCHAR(250),
    fecha_cambio        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario             VARCHAR(50) DEFAULT CURRENT_USER
);

DROP TABLE IF EXISTS HISTORIAL_CAMBIO_SALARIO CASCADE;
CREATE TABLE HISTORIAL_CAMBIO_SALARIO (
    id                  SERIAL PRIMARY KEY,
    ci                  INT NOT NULL,
    salario_anterior    DECIMAL(10,2),
    salario_nuevo       DECIMAL(10,2),
    fecha_cambio        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario             VARCHAR(50) DEFAULT CURRENT_USER
);

-- =========================================================================
-- MÓDULO 1: CENTRO DE DESPACHO Y TRAZABILIDAD GIS
-- =========================================================================

DROP FUNCTION IF EXISTS fn_calcular_capacidad_ruta(INT);
CREATE OR REPLACE FUNCTION fn_calcular_capacidad_ruta(p_id_ruta INT)
RETURNS INT 
LANGUAGE plpgsql
AS $$
DECLARE
    v_capacidad_total INT;
BEGIN
    SELECT COALESCE(SUM(capacidad), 0)
    INTO v_capacidad_total
    FROM CONTENEDOR
    WHERE id_ruta = p_id_ruta AND estado = 'BUENO';

    RETURN v_capacidad_total;
END;
$$;

DROP FUNCTION IF EXISTS fn_contar_contenedores_ruta(INT);
CREATE OR REPLACE FUNCTION fn_contar_contenedores_ruta(p_id_ruta INT)
RETURNS INT 
LANGUAGE plpgsql
AS $$
DECLARE
    v_total INT;
BEGIN
    SELECT COUNT(*)
    INTO v_total
    FROM CONTENEDOR
    WHERE id_ruta = p_id_ruta;

    RETURN v_total;
END;
$$;

DROP FUNCTION IF EXISTS fn_obtener_conductor_ruta(INT, DATE);
CREATE OR REPLACE FUNCTION fn_obtener_conductor_ruta(p_id_ruta INT, p_fecha DATE)
RETURNS VARCHAR 
LANGUAGE plpgsql
AS $$
DECLARE
    v_conductor VARCHAR(120);
BEGIN
    SELECT CONCAT(e.nombre, ' ', e.paterno, ' ', COALESCE(e.materno, ''))
    INTO v_conductor
    FROM ABARCA a
    INNER JOIN CONDUCE c ON a.id_vehiculo = c.id_vehiculo AND a.fecha = c.fecha AND a.turno = c.turno
    INNER JOIN EMPLEADO e ON c.ci = e.ci
    WHERE a.id_ruta = p_id_ruta AND a.fecha = p_fecha
    LIMIT 1;

    RETURN COALESCE(v_conductor, 'SIN CONDUCTOR ASIGNADO');
END;
$$;

DROP FUNCTION IF EXISTS cr_recorrer_contenedores_ruta(INT);
CREATE OR REPLACE FUNCTION cr_recorrer_contenedores_ruta(p_id_ruta INT)
RETURNS TABLE (
    id_contenedor INT,
    ubicacion VARCHAR,
    capacidad INT,
    estado VARCHAR
) 
LANGUAGE plpgsql
AS $$
DECLARE
    cur_cont CURSOR FOR
        SELECT c.id_contenedor, c.ubicacion, c.capacidad, c.estado
        FROM CONTENEDOR c
        WHERE c.id_ruta = p_id_ruta
        ORDER BY c.id_contenedor ASC;
    v_reg RECORD;
BEGIN
    OPEN cur_cont;
    LOOP
        FETCH cur_cont INTO v_reg;
        EXIT WHEN NOT FOUND;

        id_contenedor := v_reg.id_contenedor;
        ubicacion     := v_reg.ubicacion;
        capacidad     := v_reg.capacidad;
        estado        := v_reg.estado;
        RETURN NEXT;
    END LOOP;
    CLOSE cur_cont;
END;
$$;

DROP PROCEDURE IF EXISTS sp_consultar_trazabilidad_ruta;
CREATE OR REPLACE PROCEDURE sp_consultar_trazabilidad_ruta(
    IN  p_id_ruta                INT,
    IN  p_fecha                  DATE,
    OUT id_ruta                  INT,
    OUT nombre_ruta              VARCHAR,
    OUT placa_vehiculo           VARCHAR,
    OUT conductor                VARCHAR,
    OUT total_contenedores       INT,
    OUT capacidad_total_litros   INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_desc VARCHAR(250);
    v_placa VARCHAR(10);
BEGIN
    SELECT descripcion INTO v_desc FROM RUTA WHERE RUTA.id_ruta = p_id_ruta;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La ruta con ID % no existe en el catalogo.', p_id_ruta;
    END IF;

    SELECT v.placa INTO v_placa
    FROM ABARCA a
    INNER JOIN VEHICULO v ON a.id_vehiculo = v.id_vehiculo
    WHERE a.id_ruta = p_id_ruta AND a.fecha = p_fecha
    LIMIT 1;

    id_ruta                := p_id_ruta;
    nombre_ruta            := v_desc;
    placa_vehiculo         := COALESCE(v_placa, 'SIN ASIGNAR');
    conductor              := fn_obtener_conductor_ruta(p_id_ruta, p_fecha);
    total_contenedores     := fn_contar_contenedores_ruta(p_id_ruta);
    capacidad_total_litros := fn_calcular_capacidad_ruta(p_id_ruta);
END;
$$;

-- =========================================================================
-- MÓDULO 2: GESTIÓN DE CONTENEDORES Y MANTENIMIENTO TÉCNICO
-- =========================================================================

DROP FUNCTION IF EXISTS fn_total_recolecciones_contenedor(INT, INT);
CREATE OR REPLACE FUNCTION fn_total_recolecciones_contenedor(p_id_contenedor INT, p_id_ruta INT)
RETURNS INT 
LANGUAGE plpgsql
AS $$
DECLARE
    v_total INT;
BEGIN
    SELECT COUNT(*)
    INTO v_total
    FROM ABARCA
    WHERE ABARCA.id_contenedor = p_id_contenedor AND ABARCA.id_ruta = p_id_ruta;

    RETURN v_total;
END;
$$;

DROP FUNCTION IF EXISTS fn_diagnostico_operativo_contenedor(VARCHAR, INT);
CREATE OR REPLACE FUNCTION fn_diagnostico_operativo_contenedor(p_estado VARCHAR, p_vaciados INT)
RETURNS VARCHAR 
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_estado = 'MALO' THEN
        RETURN 'BAJA Y REEMPLAZO URGENTE';
    ELSIF p_estado = 'EN REPARACION' THEN
        RETURN 'EN TALLER DE REPARACIÓN';
    ELSIF p_estado = 'REGULAR' OR p_vaciados > 30 THEN
        RETURN 'INSPECCIÓN PREVENTIVA (ALTO USO)';
    ELSE
        RETURN 'OPERATIVO NORMAL';
    END IF;
END;
$$;

DROP FUNCTION IF EXISTS cr_reporte_desgaste_contenedores(INT, VARCHAR);
CREATE OR REPLACE FUNCTION cr_reporte_desgaste_contenedores(p_id_ruta_filtro INT, p_estado_filtro VARCHAR)
RETURNS TABLE (
    id_contenedor              INT,
    id_ruta                    INT,
    ubicacion                  VARCHAR,
    estado                     VARCHAR,
    capacidad                  INT,
    total_recolecciones        INT,
    volumen_procesado_lts      BIGINT,
    diagnostico_mantenimiento  VARCHAR
) 
LANGUAGE plpgsql
AS $$
DECLARE
    cur_cont CURSOR FOR
        SELECT c.id_contenedor, c.id_ruta, c.ubicacion, c.estado, c.capacidad
        FROM CONTENEDOR c
        WHERE (p_id_ruta_filtro IS NULL OR c.id_ruta = p_id_ruta_filtro)
          AND (p_estado_filtro IS NULL OR c.estado = p_estado_filtro)
        ORDER BY c.id_ruta ASC, c.id_contenedor ASC;
    v_reg RECORD;
    v_vaciados INT;
BEGIN
    OPEN cur_cont;
    LOOP
        FETCH cur_cont INTO v_reg;
        EXIT WHEN NOT FOUND;

        v_vaciados := fn_total_recolecciones_contenedor(v_reg.id_contenedor, v_reg.id_ruta);

        id_contenedor             := v_reg.id_contenedor;
        id_ruta                   := v_reg.id_ruta;
        ubicacion                 := v_reg.ubicacion;
        estado                    := v_reg.estado;
        capacidad                 := v_reg.capacidad;
        total_recolecciones       := v_vaciados;
        volumen_procesado_lts     := (v_reg.capacidad::BIGINT * v_vaciados);
        diagnostico_mantenimiento := fn_diagnostico_operativo_contenedor(v_reg.estado, v_vaciados);

        RETURN NEXT;
    END LOOP;
    CLOSE cur_cont;
END;
$$;

DROP PROCEDURE IF EXISTS sp_actualizar_estado_contenedor(INT, INT, VARCHAR);
CREATE OR REPLACE PROCEDURE sp_actualizar_estado_contenedor(
    IN p_id_contenedor INT,
    IN p_id_ruta       INT,
    IN p_nuevo_estado  VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_nuevo_estado NOT IN ('BUENO', 'REGULAR', 'MALO', 'EN REPARACION') THEN
        RAISE EXCEPTION 'Estado no permitido: %. Valores validos: BUENO, REGULAR, MALO, EN REPARACION', p_nuevo_estado;
    END IF;

    UPDATE CONTENEDOR
    SET estado = p_nuevo_estado
    WHERE CONTENEDOR.id_contenedor = p_id_contenedor AND CONTENEDOR.id_ruta = p_id_ruta;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contenedor #% en Ruta #% no encontrado.', p_id_contenedor, p_id_ruta;
    END IF;
END;
$$;

DROP FUNCTION IF EXISTS fn_trg_historial_contenedor() CASCADE;
CREATE OR REPLACE FUNCTION fn_trg_historial_contenedor()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO HISTORIAL_CONTENEDOR (
        id_contenedor, id_ruta_anterior, id_ruta_nueva, 
        estado_anterior, estado_nuevo, motivo, usuario
    ) VALUES (
        NEW.id_contenedor, OLD.id_ruta, NEW.id_ruta,
        OLD.estado, NEW.estado, 
        CONCAT('Cambio de situacion operativa: ', OLD.estado, ' -> ', NEW.estado),
        CURRENT_USER
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_historial_estado_contenedor ON CONTENEDOR;
CREATE TRIGGER tg_historial_estado_contenedor
AFTER UPDATE OF estado ON CONTENEDOR
FOR EACH ROW
WHEN (OLD.estado IS DISTINCT FROM NEW.estado)
EXECUTE FUNCTION fn_trg_historial_contenedor();

-- =========================================================================
-- MÓDULO 3: FLOTA AUTOMOTORA Y DISPONIBILIDAD
-- =========================================================================

DROP FUNCTION IF EXISTS fn_verificar_disponibilidad_vehiculo(INT, DATE, VARCHAR);
CREATE OR REPLACE FUNCTION fn_verificar_disponibilidad_vehiculo(
    p_id_vehiculo INT,
    p_fecha       DATE,
    p_turno       VARCHAR
) RETURNS BOOLEAN 
LANGUAGE plpgsql
AS $$
DECLARE
    v_estado VARCHAR(20);
    v_ocupado INT;
BEGIN
    SELECT estado INTO v_estado FROM VEHICULO WHERE VEHICULO.id_vehiculo = p_id_vehiculo;
    IF v_estado IS NULL OR v_estado != 'OPERATIVO' THEN
        RETURN FALSE;
    END IF;

    SELECT COUNT(*) INTO v_ocupado
    FROM CONDUCE c
    WHERE c.id_vehiculo = p_id_vehiculo AND c.fecha = p_fecha AND c.turno = p_turno;

    RETURN (v_ocupado = 0);
END;
$$;

DROP FUNCTION IF EXISTS cr_auditoria_carga_trabajo_vehiculo(DATE, DATE);
CREATE OR REPLACE FUNCTION cr_auditoria_carga_trabajo_vehiculo(
    p_fecha_inicio DATE,
    p_fecha_fin    DATE
) RETURNS TABLE (
    id_vehiculo              INT,
    placa                    VARCHAR,
    tipo                     VARCHAR,
    modelo                   VARCHAR,
    capacidad_tn             DECIMAL,
    centro_base              VARCHAR,
    estado_actual            VARCHAR,
    rutas_cubiertas          BIGINT,
    total_servicios_vaciado  BIGINT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    cur_veh CURSOR FOR
        SELECT 
            v.id_vehiculo, v.placa, v.tipo, v.modelo, v.capacidad, 
            COALESCE(cd.nombre, 'Planta Central') AS centro_base,
            v.estado
        FROM VEHICULO v
        LEFT JOIN CENTRO_DESTINO cd ON v.id_centro = cd.id_centro
        ORDER BY v.id_vehiculo ASC;
    v_reg RECORD;
    v_rutas BIGINT;
    v_servicios BIGINT;
BEGIN
    OPEN cur_veh;
    LOOP
        FETCH cur_veh INTO v_reg;
        EXIT WHEN NOT FOUND;

        SELECT COUNT(DISTINCT a.id_ruta), COUNT(*)
        INTO v_rutas, v_servicios
        FROM ABARCA a
        WHERE a.id_vehiculo = v_reg.id_vehiculo
          AND a.fecha BETWEEN p_fecha_inicio AND p_fecha_fin;

        id_vehiculo             := v_reg.id_vehiculo;
        placa                   := v_reg.placa;
        tipo                    := v_reg.tipo;
        modelo                  := v_reg.modelo;
        capacidad_tn            := v_reg.capacidad;
        centro_base             := v_reg.centro_base;
        estado_actual           := v_reg.estado;
        rutas_cubiertas         := v_rutas;
        total_servicios_vaciado := v_servicios;

        RETURN NEXT;
    END LOOP;
    CLOSE cur_veh;
END;
$$;

DROP PROCEDURE IF EXISTS sp_consultar_disponibilidad_vehiculo;
CREATE OR REPLACE PROCEDURE sp_consultar_disponibilidad_vehiculo(
    IN  p_id_vehiculo                 INT,
    IN  p_fecha                       DATE,
    IN  p_turno                       VARCHAR,
    OUT id_vehiculo                   INT,
    OUT placa                         VARCHAR,
    OUT estado_general                VARCHAR,
    OUT centro_base                   VARCHAR,
    OUT disponible_en_turno           BOOLEAN,
    OUT diagnostico_disponibilidad    VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_placa VARCHAR(10);
    v_estado VARCHAR(20);
    v_centro VARCHAR(80);
    v_disp BOOLEAN;
BEGIN
    SELECT v.placa, v.estado, COALESCE(cd.nombre, 'Planta Central')
    INTO v_placa, v_estado, v_centro
    FROM VEHICULO v
    LEFT JOIN CENTRO_DESTINO cd ON v.id_centro = cd.id_centro
    WHERE v.id_vehiculo = p_id_vehiculo;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El vehiculo con ID % no existe.', p_id_vehiculo;
    END IF;

    v_disp := fn_verificar_disponibilidad_vehiculo(p_id_vehiculo, p_fecha, p_turno);

    id_vehiculo                := p_id_vehiculo;
    placa                      := v_placa;
    estado_general             := v_estado;
    centro_base                := v_centro;
    disponible_en_turno        := v_disp;
    diagnostico_disponibilidad := CASE 
        WHEN v_disp THEN 'UNIDAD LIBRE Y APTA PARA DESPACHO'
        WHEN v_estado != 'OPERATIVO' THEN CONCAT('NO DISPONIBLE: UNIDAD ', v_estado)
        ELSE 'NO DISPONIBLE: ASIGNADA PREVIAMENTE EN EL TURNO'
    END;
END;
$$;

-- =========================================================================
-- MÓDULO 4: PERSONAL, ESCALAFÓN Y AUDITORÍA SALARIAL
-- =========================================================================

DROP FUNCTION IF EXISTS antiguedad_empleado(INT);
CREATE OR REPLACE FUNCTION antiguedad_empleado(p_ci INT)
RETURNS INT 
LANGUAGE plpgsql
AS $$
DECLARE
    v_ingreso DATE;
BEGIN
    SELECT fecha_ingreso INTO v_ingreso FROM EMPLEADO WHERE ci = p_ci;
    IF NOT FOUND THEN RETURN 0; END IF;
    RETURN DATE_PART('year', AGE(CURRENT_DATE, v_ingreso))::INT;
END;
$$;

DROP FUNCTION IF EXISTS fn_evaluar_licencia_conductor(INT);
CREATE OR REPLACE FUNCTION fn_evaluar_licencia_conductor(p_ci INT)
RETURNS VARCHAR 
LANGUAGE plpgsql
AS $$
DECLARE
    v_venc DATE;
BEGIN
    SELECT vencimiento_licencia INTO v_venc FROM CONDUCTOR WHERE ci = p_ci;
    IF NOT FOUND THEN RETURN 'NO APLICA'; END IF;

    IF v_venc < CURRENT_DATE THEN
        RETURN 'VENCIDA';
    ELSIF v_venc <= CURRENT_DATE + 30 THEN
        RETURN 'PROXIMA A VENCER';
    ELSE
        RETURN 'VIGENTE';
    END IF;
END;
$$;

DROP FUNCTION IF EXISTS fn_bono_antiguedad_estimado(INT);
CREATE OR REPLACE FUNCTION fn_bono_antiguedad_estimado(p_ci INT)
RETURNS DECIMAL 
LANGUAGE plpgsql
AS $$
DECLARE
    v_anios INT;
    v_salario DECIMAL(10,2);
    v_porcentaje DECIMAL(4,2) := 0.00;
BEGIN
    SELECT antiguedad_empleado(p_ci), salario
    INTO v_anios, v_salario
    FROM EMPLEADO WHERE ci = p_ci;

    IF v_anios >= 11 THEN v_porcentaje := 0.26;
    ELSIF v_anios >= 8 THEN v_porcentaje := 0.18;
    ELSIF v_anios >= 5 THEN v_porcentaje := 0.11;
    ELSIF v_anios >= 2 THEN v_porcentaje := 0.05;
    END IF;

    RETURN ROUND(v_salario * v_porcentaje, 2);
END;
$$;

DROP FUNCTION IF EXISTS cr_reporte_escalafon_personal(VARCHAR);
CREATE OR REPLACE FUNCTION cr_reporte_escalafon_personal(p_tipo_filtro VARCHAR)
RETURNS TABLE (
    ci                  INT,
    empleado            VARCHAR,
    rol                 VARCHAR,
    fecha_ingreso       VARCHAR,
    antiguedad_anios    INT,
    salario_base        DECIMAL,
    bono_antiguedad     DECIMAL,
    salario_total       DECIMAL,
    estado_licencia     VARCHAR
) 
LANGUAGE plpgsql
AS $$
DECLARE
    cur_emp CURSOR FOR
        SELECT 
            e.ci, 
            CONCAT(e.nombre, ' ', e.paterno, ' ', COALESCE(e.materno, '')) AS nom,
            e.fecha_ingreso,
            e.salario,
            CASE 
                WHEN c.ci IS NOT NULL THEN 'CONDUCTOR'
                WHEN a.ci IS NOT NULL THEN 'AYUDANTE'
                WHEN l.ci IS NOT NULL THEN 'LIMPIADOR'
                ELSE 'ADMINISTRATIVO'
            END AS rol_emp
        FROM EMPLEADO e
        LEFT JOIN CONDUCTOR c ON e.ci = c.ci
        LEFT JOIN AYUDANTE a   ON e.ci = a.ci
        LEFT JOIN LIMPIADOR l  ON e.ci = l.ci
        ORDER BY e.paterno ASC, e.materno ASC;
    v_reg RECORD;
    v_ant INT;
    v_bono DECIMAL(10,2);
BEGIN
    OPEN cur_emp;
    LOOP
        FETCH cur_emp INTO v_reg;
        EXIT WHEN NOT FOUND;

        IF (p_tipo_filtro IS NULL OR p_tipo_filtro = 'TODOS' OR v_reg.rol_emp = p_tipo_filtro) THEN
            v_ant  := antiguedad_empleado(v_reg.ci);
            v_bono := fn_bono_antiguedad_estimado(v_reg.ci);

            ci               := v_reg.ci;
            empleado         := v_reg.nom;
            rol              := v_reg.rol_emp;
            fecha_ingreso    := TO_CHAR(v_reg.fecha_ingreso, 'DD/MM/YYYY');
            antiguedad_anios := v_ant;
            salario_base     := v_reg.salario;
            bono_antiguedad  := v_bono;
            salario_total    := v_reg.salario + v_bono;
            estado_licencia  := fn_evaluar_licencia_conductor(v_reg.ci);

            RETURN NEXT;
        END IF;
    END LOOP;
    CLOSE cur_emp;
END;
$$;

DROP PROCEDURE IF EXISTS sp_actualizar_salario_empleado(INT, DECIMAL);
CREATE OR REPLACE PROCEDURE sp_actualizar_salario_empleado(
    IN p_ci            INT,
    IN p_nuevo_salario DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_nuevo_salario < 3300.00 THEN
        RAISE EXCEPTION 'El salario no puede ser menor al minimo de Bs. 3,300.00';
    END IF;

    UPDATE EMPLEADO
    SET salario = p_nuevo_salario
    WHERE EMPLEADO.ci = p_ci;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Empleado con CI % no encontrado.', p_ci;
    END IF;
END;
$$;

DROP FUNCTION IF EXISTS fn_trg_historial_salario() CASCADE;
CREATE OR REPLACE FUNCTION fn_trg_historial_salario()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO HISTORIAL_CAMBIO_SALARIO (
        ci, salario_anterior, salario_nuevo, usuario
    ) VALUES (
        NEW.ci, OLD.salario, NEW.salario, CURRENT_USER
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_historial_cambio_salario ON EMPLEADO;
CREATE TRIGGER tg_historial_cambio_salario
AFTER UPDATE OF salario ON EMPLEADO
FOR EACH ROW
WHEN (OLD.salario IS DISTINCT FROM NEW.salario)
EXECUTE FUNCTION fn_trg_historial_salario();

-- =========================================================================
-- MÓDULO 5: ALMACENES, KARDEX Y CONTROL DE INVENTARIO
-- =========================================================================

DROP FUNCTION IF EXISTS fn_auditoria_consumo_insumos_empleado(INT, INT);
CREATE OR REPLACE FUNCTION fn_auditoria_consumo_insumos_empleado(p_ci INT, p_anio INT)
RETURNS TABLE (
    total_unidades_recibidas  BIGINT,
    frecuencia_solicitudes    BIGINT,
    insumo_predominante       VARCHAR,
    promedio_operarios_area   DECIMAL,
    clasificacion_consumo     VARCHAR
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_total BIGINT := 0;
    v_freq BIGINT := 0;
    v_insumo_top VARCHAR(60) := 'SIN REGISTRO';
    v_promedio DECIMAL(5,2) := 15.50;
BEGIN
    SELECT COALESCE(SUM(cantidad), 0), COUNT(*)
    INTO v_total, v_freq
    FROM ENTREGA
    WHERE ENTREGA.ci = p_ci AND DATE_PART('year', fecha) = p_anio;

    SELECT i.nombre
    INTO v_insumo_top
    FROM ENTREGA e
    INNER JOIN INSUMO i ON e.id_insumo = i.id_insumo
    WHERE e.ci = p_ci AND DATE_PART('year', e.fecha) = p_anio
    GROUP BY i.nombre
    ORDER BY SUM(e.cantidad) DESC
    LIMIT 1;

    total_unidades_recibidas := v_total;
    frecuencia_solicitudes   := v_freq;
    insumo_predominante      := COALESCE(v_insumo_top, 'SIN REGISTRO');
    promedio_operarios_area  := v_promedio;
    clasificacion_consumo    := CASE 
        WHEN v_total > (v_promedio * 1.5) THEN 'SOBRECONSUMO' 
        ELSE 'CONSUMO ESTÁNDAR' 
    END;

    RETURN NEXT;
END;
$$;

DROP FUNCTION IF EXISTS fn_clasificacion_stock_insumo(INT);
CREATE OR REPLACE FUNCTION fn_clasificacion_stock_insumo(p_cantidad INT)
RETURNS VARCHAR 
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_cantidad < 150 THEN
        RETURN 'CRÍTICO / REABASTECER';
    ELSIF p_cantidad < 400 THEN
        RETURN 'ALERTA MEDIA';
    ELSE
        RETURN 'ABASTECIDO NORMAL';
    END IF;
END;
$$;

DROP FUNCTION IF EXISTS cr_balance_general_insumos(VARCHAR);
CREATE OR REPLACE FUNCTION cr_balance_general_insumos(p_categoria_filtro VARCHAR)
RETURNS TABLE (
    id_insumo                    INT,
    nombre                       VARCHAR,
    stock_actual                 INT,
    total_entregas_registradas   BIGINT,
    unidades_despachadas         BIGINT,
    estado_inventario            VARCHAR
) 
LANGUAGE plpgsql
AS $$
DECLARE
    cur_ins CURSOR FOR
        SELECT i.id_insumo, i.nombre, i.cantidad
        FROM INSUMO i
        ORDER BY i.id_insumo ASC;
    v_reg RECORD;
    v_entregas BIGINT;
    v_despachos BIGINT;
BEGIN
    OPEN cur_ins;
    LOOP
        FETCH cur_ins INTO v_reg;
        EXIT WHEN NOT FOUND;

        SELECT COUNT(*), COALESCE(SUM(cantidad), 0)
        INTO v_entregas, v_despachos
        FROM ENTREGA
        WHERE ENTREGA.id_insumo = v_reg.id_insumo;

        id_insumo                  := v_reg.id_insumo;
        nombre                     := v_reg.nombre;
        stock_actual               := v_reg.cantidad;
        total_entregas_registradas := v_entregas;
        unidades_despachadas       := v_despachos;
        estado_inventario          := fn_clasificacion_stock_insumo(v_reg.cantidad);

        RETURN NEXT;
    END LOOP;
    CLOSE cur_ins;
END;
$$;

DROP FUNCTION IF EXISTS fn_tg_control_y_descuento_stock() CASCADE;
CREATE OR REPLACE FUNCTION fn_tg_control_y_descuento_stock()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
DECLARE
    v_stock_disponible INT;
BEGIN
    SELECT cantidad INTO v_stock_disponible
    FROM INSUMO
    WHERE INSUMO.id_insumo = NEW.id_insumo
    FOR UPDATE;

    IF v_stock_disponible < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para el insumo #%. Disponible: %, Solicitado: %', 
            NEW.id_insumo, v_stock_disponible, NEW.cantidad;
    END IF;

    UPDATE INSUMO
    SET cantidad = cantidad - NEW.cantidad
    WHERE INSUMO.id_insumo = NEW.id_insumo;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_control_y_descuento_stock_insumo ON ENTREGA;
CREATE TRIGGER tg_control_y_descuento_stock_insumo
BEFORE INSERT ON ENTREGA
FOR EACH ROW
EXECUTE FUNCTION fn_tg_control_y_descuento_stock();