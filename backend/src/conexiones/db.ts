import dotenv from "dotenv";
import { Pool as PgPool } from "pg";
import mysql from "mysql2/promise";
import sql from "mssql";
import oracledb from "oracledb";

dotenv.config();

// Configuración opcional para Thin Mode nativo de node-oracledb
// Compatible con Oracle 12c, 19c, 21c y 23ai Free sin Instant Client
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

/**
 * Prueba la conectividad básica contra el motor solicitado
 * ejecutando una consulta de prueba sobre test_conexion o la tabla EMPLEADO.
 */
export async function probarConexion(gestor: string) {
  const motor = gestor.toLowerCase();

  switch (motor) {
    case "postgres": {
      const pool = new PgPool({
        host: process.env.PG_HOST || "localhost",
        port: Number(process.env.PG_PORT) || 5433,
        user: process.env.PG_USER || "grupo4_recoleccion",
        password: process.env.PG_PASSWORD || "grupo4",
        database: process.env.PG_DATABASE || "bd_recoleccion",
        connectionTimeoutMillis: 3000,
      });

      const cliente = await pool.connect();
      const res = await cliente.query("SELECT * FROM test_conexion LIMIT 1;");
      cliente.release();
      await pool.end();

      return {
        gestor: "PostgreSQL",
        estado: "Conectado exitosamente",
        puerto: Number(process.env.PG_PORT) || 5433,
        datos: res.rows,
      };
    }

    case "mysql": {
      const conexion = await mysql.createConnection({
        host: process.env.MYSQL_HOST || "localhost",
        port: Number(process.env.MYSQL_PORT) || 3307,
        user: process.env.MYSQL_USER || "grupo4_recoleccion",
        password: process.env.MYSQL_PASSWORD || "grupo4",
        database: process.env.MYSQL_DATABASE || "bd_recoleccion",
        connectTimeout: 3000,
      });

      const [rows] = await conexion.query("SELECT * FROM test_conexion LIMIT 1;");
      await conexion.end();

      return {
        gestor: "MySQL",
        estado: "Conectado exitosamente",
        puerto: Number(process.env.MYSQL_PORT) || 3307,
        datos: rows,
      };
    }

    case "sqlserver": {
      const config: sql.config = {
        server: process.env.SQLSERVER_HOST || "localhost",
        port: Number(process.env.SQLSERVER_PORT) || 1433,
        user: process.env.SQLSERVER_USER || "grupo4_recoleccion",
        password: process.env.SQLSERVER_PASSWORD || "grupo4",
        database: process.env.SQLSERVER_DATABASE || "bd_recoleccion",
        options: {
          encrypt: false,
          trustServerCertificate: true,
        },
        connectionTimeout: 3000,
      };

      const pool = await sql.connect(config);
      const res = await pool.request().query("SELECT TOP 1 * FROM test_conexion;");
      await pool.close();

      return {
        gestor: "SQL Server",
        estado: "Conectado exitosamente",
        puerto: Number(process.env.SQLSERVER_PORT) || 1433,
        datos: res.recordset,
      };
    }

    case "oracle": {
      const conexion = await oracledb.getConnection({
        user: process.env.ORACLE_USER || "grupo4_recoleccion",
        password: process.env.ORACLE_PASSWORD || "grupo4",
        connectString: `${process.env.ORACLE_HOST || "localhost"}:${process.env.ORACLE_PORT || 1521}/${process.env.ORACLE_SERVICE || "FREEPDB1"}`,
      });

      const res = await conexion.execute("SELECT * FROM EMPLEADO WHERE ROWNUM <= 1");
      await conexion.close();

      return {
        gestor: "Oracle",
        estado: "Conectado exitosamente",
        puerto: Number(process.env.ORACLE_PORT) || 1521,
        datos: res.rows || [],
      };
    }

    default:
      throw new Error(`Gestor no soportado actualmente: ${gestor}`);
  }
}

/**
 * Ejecuta sentencias SQL arbitrarias (DQL, DDL, DML o bloques anónimos)
 * en el gestor seleccionado y devuelve el resultado formateado como arreglo JSON.
 */
export async function ejecutarConsulta(gestor: string, sqlQuery: string) {
  const motor = gestor.toLowerCase();

  switch (motor) {
    case "postgres": {
      const pool = new PgPool({
        host: process.env.PG_HOST || "localhost",
        port: Number(process.env.PG_PORT) || 5433,
        user: process.env.PG_USER || "grupo4_recoleccion",
        password: process.env.PG_PASSWORD || "grupo4",
        database: process.env.PG_DATABASE || "bd_recoleccion",
        connectionTimeoutMillis: 5000,
      });

      const res = await pool.query(sqlQuery);
      await pool.end();

      // Si la sentencia devuelve filas (ej. SELECT), devolverlas; si es DML/DDL, devolver filas afectadas
      if (Array.isArray(res)) {
        // En caso de múltiples sentencias ejecutadas en un solo comando
        const ultimo = res[res.length - 1];
        return ultimo.rows || [{ mensaje: "Sentencias ejecutadas con éxito" }];
      }
      return res.rows || [{ filas_afectadas: res.rowCount ?? 0 }];
    }

    case "mysql": {
      const conexion = await mysql.createConnection({
        host: process.env.MYSQL_HOST || "localhost",
        port: Number(process.env.MYSQL_PORT) || 3307,
        user: process.env.MYSQL_USER || "grupo4_recoleccion",
        password: process.env.MYSQL_PASSWORD || "grupo4",
        database: process.env.MYSQL_DATABASE || "bd_recoleccion",
        connectTimeout: 5000,
        multipleStatements: true,
      });

      const [rows] = await conexion.query(sqlQuery);
      await conexion.end();
      return Array.isArray(rows) ? rows : [rows];
    }

    case "sqlserver": {
      const config: sql.config = {
        server: process.env.SQLSERVER_HOST || "localhost",
        port: Number(process.env.SQLSERVER_PORT) || 1433,
        user: process.env.SQLSERVER_USER || "grupo4_recoleccion",
        password: process.env.SQLSERVER_PASSWORD || "grupo4",
        database: process.env.SQLSERVER_DATABASE || "bd_recoleccion",
        options: {
          encrypt: false,
          trustServerCertificate: true,
        },
        connectionTimeout: 5000,
      };

      const pool = await sql.connect(config);
      const res = await pool.request().query(sqlQuery);
      await pool.close();
      return res.recordset || [{ filas_afectadas: res.rowsAffected[0] ?? 0 }];
    }

    case "oracle": {
      const conexion = await oracledb.getConnection({
        user: process.env.ORACLE_USER || "grupo4_recoleccion",
        password: process.env.ORACLE_PASSWORD || "grupo4",
        connectString: `${process.env.ORACLE_HOST || "localhost"}:${process.env.ORACLE_PORT || 1521}/${process.env.ORACLE_SERVICE || "FREEPDB1"}`,
      });

      const res = await conexion.execute(sqlQuery, [], { autoCommit: true });
      await conexion.close();

      return res.rows || [{ filas_afectadas: res.rowsAffected ?? 0 }];
    }

    default:
      throw new Error(`Gestor ${gestor} no disponible para consultas directas.`);
  }
}