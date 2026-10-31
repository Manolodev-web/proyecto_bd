import { ESQUEMA_BD, LISTA_TABLAS } from "./schema";

/**
 * Normaliza los nombres de tablas a MAYÚSCULAS en la consulta SQL.
 * Respeta rigurosamente el texto dentro de cadenas literales ('...') y comentarios.
 * Esto soluciona de raíz el error de MySQL en Linux Docker (donde las tablas son case-sensitive).
 */
export function resolveTableNamesCase(sql: string): string {
  if (!sql) return sql;

  // Regex que busca cadenas ('...'), comentarios de una línea (-- ...),
  // comentarios de bloque (/* ... */) o palabras (\b[a-zA-Z_0-9]+\b)
  const tokenRegex = /('(?:''|[^'])*'|--[^\r\n]*|\/\*[\s\S]*?\*\/|\b[a-zA-Z_][a-zA-Z0-9_]*\b)/g;

  // Mapa de nombres de tablas en minúsculas a su versión en MAYÚSCULAS
  const tablaMap = new Map<string, string>();
  for (const tabla of LISTA_TABLAS) {
    tablaMap.set(tabla.toLowerCase(), tabla);
  }

  return sql.replace(tokenRegex, (match) => {
    // Si es un comentario o un texto entre comillas simples, lo preservamos intacto
    if (match.startsWith("'") || match.startsWith("--") || match.startsWith("/*")) {
      return match;
    }

    // Si es un identificador que coincide con una de las tablas del esquema
    const coincidencia = tablaMap.get(match.toLowerCase());
    if (coincidencia) {
      return coincidencia;
    }

    return match;
  });
}

/**
 * Palabras clave SQL que se formatean a mayúsculas
 */
const SQL_KEYWORDS = [
  "SELECT", "FROM", "WHERE", "JOIN", "INNER JOIN", "LEFT JOIN", "RIGHT JOIN",
  "FULL JOIN", "ON", "GROUP BY", "ORDER BY", "HAVING", "LIMIT", "OFFSET",
  "INSERT INTO", "VALUES", "UPDATE", "SET", "DELETE FROM", "DELETE",
  "CREATE OR REPLACE", "CREATE", "ALTER", "DROP", "TABLE", "VIEW",
  "PROCEDURE", "FUNCTION", "TRIGGER", "INDEX", "BEGIN", "END", "DECLARE",
  "RETURNS", "RETURN", "AS", "IF", "ELSE", "THEN", "LOOP", "WHILE",
  "AND", "OR", "NOT", "IN", "NOT IN", "EXISTS", "BETWEEN", "LIKE", "ILIKE",
  "IS NULL", "IS NOT NULL", "UNION", "UNION ALL", "DISTINCT", "AS",
  "CASE", "WHEN", "ELSE", "END", "CAST", "COALESCE", "COUNT", "SUM",
  "AVG", "MIN", "MAX", "ASC", "DESC", "INTO", "PRIMARY KEY", "FOREIGN KEY",
  "REFERENCES", "CONSTRAINT", "CHECK", "DEFAULT", "CASCADE", "DO"
];

/**
 * Embellece y formatea una consulta SQL:
 * - Pone palabras clave en MAYÚSCULAS.
 * - Pone las 17 tablas en MAYÚSCULAS exactas.
 * - Organiza saltos de línea para SELECT, FROM, WHERE, etc.
 */
export function formatSql(sql: string): string {
  if (!sql.trim()) return sql;

  // Primero resolvemos las tablas a mayúsculas
  let formateado = resolveTableNamesCase(sql);

  // Reemplazamos palabras clave a mayúsculas preservando cadenas
  const tokenRegex = /('(?:''|[^'])*'|--[^\r\n]*|\/\*[\s\S]*?\*\/|\b[a-zA-Z_][a-zA-Z0-9_]*\b)/g;

  const keywordMap = new Map<string, string>();
  for (const kw of SQL_KEYWORDS) {
    keywordMap.set(kw.toLowerCase(), kw);
  }

  formateado = formateado.replace(tokenRegex, (match) => {
    if (match.startsWith("'") || match.startsWith("--") || match.startsWith("/*")) {
      return match;
    }
    const kwUpper = keywordMap.get(match.toLowerCase());
    return kwUpper ? kwUpper : match;
  });

  return formateado;
}

/**
 * Alterna entre todo mayúsculas o todo minúsculas (para flexibilidad rápida del usuario)
 */
export function toggleSqlCase(sql: string): string {
  const tieneMinusculas = /[a-z]/.test(sql);
  if (tieneMinusculas) {
    return sql.toUpperCase();
  }
  return sql.toLowerCase();
}

/**
 * Generador de plantillas y snippets según el motor
 */
export function obtenerSnippet(
  tipo: "select" | "count" | "insert" | "funcion" | "procedimiento" | "trigger" | "cursor" | "join_recoleccion",
  gestor: string,
  tabla: string = "EMPLEADO"
): string {
  const info = ESQUEMA_BD[tabla];

  if (tipo === "select") {
    return `SELECT * FROM ${tabla} LIMIT 50;`;
  }

  if (tipo === "count") {
    return `SELECT COUNT(*) AS total_registros FROM ${tabla};`;
  }

  if (tipo === "insert" && info) {
    const cols = info.cols.join(", ");
    const vals = info.cols.map((_, i) => `'valor_${i + 1}'`).join(", ");
    return `-- Inserción de ejemplo en ${tabla}\nINSERT INTO ${tabla} (${cols})\nVALUES (${vals});`;
  }

  if (tipo === "join_recoleccion") {
    return `-- Consulta relacional: Zonas, Rutas y sus Contenedores\nSELECT \n  z.nombre AS zona,\n  r.id_ruta,\n  r.tipo_acceso,\n  r.hora_inicio,\n  r.hora_fin,\n  c.id_contenedor,\n  c.tipo AS tipo_contenedor,\n  c.capacidad,\n  c.estado\nFROM ZONA z\nJOIN E_ZONA_RUTA ezr ON z.id_zona = ezr.id_zona\nJOIN RUTA r ON ezr.id_ruta = r.id_ruta\nLEFT JOIN CONTENEDOR c ON r.id_ruta = c.id_ruta\nORDER BY z.nombre, r.id_ruta;`;
  }

  if (gestor === "postgres") {
    switch (tipo) {
      case "funcion":
        return `CREATE OR REPLACE FUNCTION fn_calcular_antiguedad(p_ci INT)\nRETURNS INT AS $$\nDECLARE\n  v_anios INT;\nBEGIN\n  SELECT EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_ingreso))\n  INTO v_anios\n  FROM EMPLEADO WHERE ci = p_ci;\n  RETURN COALESCE(v_anios, 0);\nEND;\n$$ LANGUAGE plpgsql;\n\n-- Prueba de la función:\nSELECT ci, nombre, paterno, fn_calcular_antiguedad(ci) AS antiguedad_anios FROM EMPLEADO LIMIT 10;`;
      case "procedimiento":
        return `CREATE OR REPLACE PROCEDURE sp_incrementar_salario_turno(p_turno VARCHAR, p_porcentaje DECIMAL)\nLANGUAGE plpgsql AS $$\nBEGIN\n  UPDATE EMPLEADO\n  SET salario = salario * (1 + p_porcentaje / 100)\n  WHERE ci IN (SELECT ci FROM LIMPIADOR WHERE turno = p_turno);\nEND;\n$$;\n\n-- Llamada al procedimiento:\n-- CALL sp_incrementar_salario_turno('MANANA', 5.0);`;
      case "trigger":
        return `CREATE OR REPLACE FUNCTION fn_trg_validar_stock()\nRETURNS TRIGGER AS $$\nBEGIN\n  IF NEW.cantidad <= 0 THEN\n    RAISE EXCEPTION 'La cantidad entregada debe ser mayor a 0';\n  END IF;\n  RETURN NEW;\nEND;\n$$ LANGUAGE plpgsql;\n\nCREATE OR REPLACE TRIGGER trg_validar_entrega\nBEFORE INSERT ON ENTREGA\nFOR EACH ROW\nEXECUTE FUNCTION fn_trg_validar_stock();`;
      case "cursor":
        return `DO $$\nDECLARE\n  reg RECORD;\n  cur_rutas CURSOR FOR \n    SELECT r.id_ruta, r.descripcion, COUNT(c.id_contenedor) AS total_contenedores\n    FROM RUTA r\n    LEFT JOIN CONTENEDOR c ON r.id_ruta = c.id_ruta\n    GROUP BY r.id_ruta, r.descripcion;\nBEGIN\n  OPEN cur_rutas;\n  LOOP\n    FETCH cur_rutas INTO reg;\n    EXIT WHEN NOT FOUND;\n    RAISE NOTICE 'Ruta % (%): % contenedores', reg.id_ruta, reg.descripcion, reg.total_contenedores;\n  END LOOP;\n  CLOSE cur_rutas;\nEND $$;`;
    }
  } else if (gestor === "mysql") {
    switch (tipo) {
      case "funcion":
        return `DELIMITER //\nCREATE FUNCTION fn_obtener_nombre_completo(p_ci INT)\nRETURNS VARCHAR(150)\nDETERMINISTIC\nBEGIN\n  DECLARE v_nombre VARCHAR(150);\n  SELECT CONCAT(nombre, ' ', paterno, ' ', IFNULL(materno, ''))\n  INTO v_nombre\n  FROM EMPLEADO WHERE ci = p_ci;\n  RETURN v_nombre;\nEND //\nDELIMITER ;\n\n-- Prueba:\nSELECT ci, fn_obtener_nombre_completo(ci) AS nombre_completo FROM EMPLEADO LIMIT 10;`;
      case "procedimiento":
        return `DELIMITER //\nCREATE PROCEDURE sp_listar_vehiculos_estado(IN p_estado VARCHAR(20))\nBEGIN\n  SELECT v.id_vehiculo, v.placa, v.tipo, v.capacidad, cd.nombre AS centro_destino\n  FROM VEHICULO v\n  JOIN CENTRO_DESTINO cd ON v.id_centro = cd.id_centro\n  WHERE v.estado = p_estado;\nEND //\nDELIMITER ;\n\n-- Llamada:\n-- CALL sp_listar_vehiculos_estado('OPERATIVO');`;
      case "trigger":
        return `DELIMITER //\nCREATE TRIGGER trg_auditar_insumo_insert\nBEFORE INSERT ON INSUMO\nFOR EACH ROW\nBEGIN\n  IF NEW.cantidad < 0 THEN\n    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La cantidad de insumos no puede ser negativa';\n  END IF;\nEND //\nDELIMITER ;`;
      case "cursor":
        return `DELIMITER //\nCREATE PROCEDURE sp_recorrer_zonas()\nBEGIN\n  DECLARE fin INT DEFAULT FALSE;\n  DECLARE v_nombre VARCHAR(60);\n  DECLARE v_topo VARCHAR(30);\n  DECLARE cur CURSOR FOR SELECT nombre, topografia FROM ZONA;\n  DECLARE CONTINUE HANDLER FOR NOT FOUND SET fin = TRUE;\n\n  OPEN cur;\n  recorrido: LOOP\n    FETCH cur INTO v_nombre, v_topo;\n    IF fin THEN\n      LEAVE recorrido;\n    END IF;\n    -- Procesar datos aquí\n  END LOOP;\n  CLOSE cur;\nEND //\nDELIMITER ;`;
    }
  } else if (gestor === "sqlserver") {
    switch (tipo) {
      case "funcion":
        return `CREATE OR ALTER FUNCTION fn_calcular_capacidad_ruta(@p_id_ruta INT)\nRETURNS INT\nAS\nBEGIN\n  DECLARE @total INT;\n  SELECT @total = ISNULL(SUM(capacidad), 0) FROM CONTENEDOR WHERE id_ruta = @p_id_ruta;\n  RETURN @total;\nEND;\nGO\n\nSELECT id_ruta, descripcion, dbo.fn_calcular_capacidad_ruta(id_ruta) AS capacidad_total FROM RUTA;`;
      case "procedimiento":
        return `CREATE OR ALTER PROCEDURE sp_asignar_limpiador\n  @p_ci INT,\n  @p_id_ruta INT,\n  @p_fecha DATE,\n  @p_turno VARCHAR(10)\nAS\nBEGIN\n  INSERT INTO E_LIM_RUTA (ci, id_ruta, fecha, turno)\n  VALUES (@p_ci, @p_id_ruta, @p_fecha, @p_turno);\nEND;\nGO`;
      case "trigger":
        return `CREATE OR ALTER TRIGGER trg_validar_capacidad_vehiculo\nON VEHICULO\nAFTER INSERT, UPDATE\nAS\nBEGIN\n  IF EXISTS (SELECT 1 FROM inserted WHERE capacidad <= 0)\n  BEGIN\n    RAISERROR ('La capacidad del vehículo debe ser mayor a 0 kg', 16, 1);\n    ROLLBACK TRANSACTION;\n  END\nEND;\nGO`;
      case "cursor":
        return `DECLARE @ci INT, @nombre VARCHAR(60), @salario DECIMAL(10,2);\nDECLARE cur_emp CURSOR FOR\n  SELECT ci, nombre, salario FROM EMPLEADO WHERE salario > 3000;\n\nOPEN cur_emp;\nFETCH NEXT FROM cur_emp INTO @ci, @nombre, @salario;\n\nWHILE @@FETCH_STATUS = 0\nBEGIN\n  PRINT 'Empleado CI: ' + CAST(@ci AS VARCHAR) + ' - ' + @nombre;\n  FETCH NEXT FROM cur_emp INTO @ci, @nombre, @salario;\nEND;\n\nCLOSE cur_emp;\nDEALLOCATE cur_emp;`;
    }
  }

  return `SELECT * FROM ${tabla} LIMIT 20;`;
}
