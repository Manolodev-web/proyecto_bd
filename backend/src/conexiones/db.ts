// backend/src/conexiones/db.ts
import dotenv from "dotenv";
import { Pool as PgPool } from "pg";
import mysql from "mysql2/promise";
import sql from "mssql";
import oracledb from "oracledb";

dotenv.config();
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

/**
 * Obtiene la configuración de conexión leyendo estrictamente del .env
 * según el gestor y el entorno (local vs docker)
 */
export function obtenerConfiguracion(gestor: string, entorno: string = "local") {
  const esDocker = entorno.toLowerCase() === "docker";
  const motor = gestor.toLowerCase();

  switch (motor) {
    case "postgres":
      return {
        host: process.env.PG_HOST || "localhost",
        port: Number(esDocker ? process.env.PG_PORT_DOCKER : process.env.PG_PORT_LOCAL) || (esDocker ? 5433 : 5432),
        user: (esDocker ? process.env.PG_USER_DOCKER : process.env.PG_USER_LOCAL) || "postgres",
        password: (esDocker ? process.env.PG_PASSWORD_DOCKER : process.env.PG_PASSWORD_LOCAL) || "postgres",
        database: (esDocker ? process.env.PG_DATABASE_DOCKER : process.env.PG_DATABASE_LOCAL) || "recoleccion_lp",
      };

    case "mysql":
      return {
        host: process.env.MYSQL_HOST || "localhost",
        port: Number(esDocker ? process.env.MYSQL_PORT_DOCKER : process.env.MYSQL_PORT_LOCAL) || (esDocker ? 3307 : 3306),
        user: (esDocker ? process.env.MYSQL_USER_DOCKER : process.env.MYSQL_USER_LOCAL) || "root",
        password: (esDocker ? process.env.MYSQL_PASSWORD_DOCKER : process.env.MYSQL_PASSWORD_LOCAL) || "root",
        database: (esDocker ? process.env.MYSQL_DATABASE_DOCKER : process.env.MYSQL_DATABASE_LOCAL) || "recoleccion_lp",
      };

    case "sqlserver":
      return {
        server: process.env.SQLSERVER_HOST || "localhost",
        port: Number(process.env.SQLSERVER_PORT) || 1433,
        user: process.env.SQLSERVER_USER || "sa",
        password: process.env.SQLSERVER_PASSWORD || "TuPasswordSeguro123!",
        database: process.env.SQLSERVER_DATABASE || "recoleccion_lp",
        options: { encrypt: false, trustServerCertificate: true },
      };

    case "oracle":
      return {
        host: process.env.ORACLE_HOST || "localhost",
        port: Number(process.env.ORACLE_PORT) || 1521,
        user: process.env.ORACLE_USER || "system",
        password: process.env.ORACLE_PASSWORD || "oracle",
        service: process.env.ORACLE_SERVICE || "FREEPDB1",
      };

    default:
      throw new Error(`Gestor no soportado: ${gestor}`);
  }
}

/**
 * Prueba la conexión contra el motor y entorno seleccionado
 */
export async function probarConexion(gestor: string, entorno: string = "local") {
  const motor = gestor.toLowerCase();
  const cfg = obtenerConfiguracion(motor, entorno) as any;

  switch (motor) {
    case "postgres": {
      const pool = new PgPool({ ...cfg, connectionTimeoutMillis: 3000 });
      const cliente = await pool.connect();
      const res = await cliente.query("SELECT * FROM test_conexion LIMIT 1;");
      cliente.release();
      await pool.end();
      return { gestor: "PostgreSQL", entorno, puerto: cfg.port, estado: "Conectado exitosamente", datos: res.rows };
    }
    case "mysql": {
      const conexion = await mysql.createConnection({ ...cfg, connectTimeout: 3000 });
      const [rows] = await conexion.query("SELECT * FROM test_conexion LIMIT 1;");
      await conexion.end();
      return { gestor: "MySQL", entorno, puerto: cfg.port, estado: "Conectado exitosamente", datos: rows };
    }
    case "sqlserver": {
      const pool = await sql.connect(cfg);
      const res = await pool.request().query("SELECT TOP 1 * FROM test_conexion;");
      await pool.close();
      return { gestor: "SQL Server", entorno, puerto: cfg.port, estado: "Conectado exitosamente", datos: res.recordset };
    }
    case "oracle": {
      const conexion = await oracledb.getConnection({
        user: cfg.user,
        password: cfg.password,
        connectString: `${cfg.host}:${cfg.port}/${cfg.service}`,
      });
      const res = await conexion.execute("SELECT * FROM EMPLEADO WHERE ROWNUM <= 1");
      await conexion.close();
      return { gestor: "Oracle", entorno, puerto: cfg.port, estado: "Conectado exitosamente", datos: res.rows || [] };
    }
    default:
      throw new Error(`Gestor no soportado: ${gestor}`);
  }
}

/**
 * Ejecuta consultas dinámicas adaptándose al entorno y motor solicitado
 */
export async function ejecutarConsulta(gestor: string, sqlQuery: string, entorno: string = "local") {
  const motor = gestor.toLowerCase();
  const cfg = obtenerConfiguracion(motor, entorno) as any;

  switch (motor) {
    case "postgres": {
      const pool = new PgPool({ ...cfg, connectionTimeoutMillis: 5000 });
      const res = await pool.query(sqlQuery);
      await pool.end();
      if (Array.isArray(res)) {
        return res[res.length - 1].rows || [{ mensaje: "Sentencia ejecutada con éxito" }];
      }
      return res.rows || [{ filas_afectadas: res.rowCount ?? 0 }];
    }
    case "mysql": {
      const conexion = await mysql.createConnection({ ...cfg, connectTimeout: 5000, multipleStatements: true });
      const [rows] = await conexion.query(sqlQuery);
      await conexion.end();
      return Array.isArray(rows) ? rows : [rows];
    }
    case "sqlserver": {
      const pool = await sql.connect(cfg);
      const res = await pool.request().query(sqlQuery);
      await pool.close();
      return res.recordset || [{ filas_afectadas: res.rowsAffected[0] ?? 0 }];
    }
    case "oracle": {
      const conexion = await oracledb.getConnection({
        user: cfg.user,
        password: cfg.password,
        connectString: `${cfg.host}:${cfg.port}/${cfg.service}`,
      });
      const res = await conexion.execute(sqlQuery, [], { autoCommit: true });
      await conexion.close();
      return res.rows || [{ filas_afectadas: res.rowsAffected ?? 0 }];
    }
    default:
      throw new Error(`Gestor ${gestor} no disponible.`);
  }
}