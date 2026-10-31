import { Pool as PgPool } from "pg";
import mysql from "mysql2/promise";
import sql from "mssql";
import oracledb from "oracledb";
import dotenv from "dotenv";

dotenv.config();

// 1. Pool PostgreSQL
export const pgPool = new PgPool({
  host: process.env.PG_HOST || "localhost",
  port: Number(process.env.PG_PORT) || 5432,
  user: process.env.PG_USER || "postgres",
  password: process.env.PG_PASSWORD || "postgres",
  database: process.env.PG_DATABASE || "recoleccion_lp"
});

// 2. Pool MySQL
export const mysqlPool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "root",
  database: process.env.MYSQL_DATABASE || "recoleccion_lp",
  waitForConnections: true,
  connectionLimit: 10
});

// 3. Pool SQL Server
const sqlServerConfig: sql.config = {
  user: process.env.SQLSERVER_USER || "sa",
  password: process.env.SQLSERVER_PASSWORD || "TuPasswordSeguro123!",
  server: process.env.SQLSERVER_HOST || "localhost",
  port: Number(process.env.SQLSERVER_PORT) || 1433,
  database: process.env.SQLSERVER_DATABASE || "recoleccion_lp",
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};
export const sqlServerPool = new sql.ConnectionPool(sqlServerConfig);
let sqlServerConnected = false;

// 4. Inicializador Oracle
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// Interfaz que define la consulta para cada motor
export interface QueryDefinition {
  postgres: { sql: string; params: any[] };
  mysql: { sql: string; params: any[] };
  sqlserver: { sql: string; params?: { name: string; type: any; value: any }[] };
  oracle: { sql: string; binds?: any };
}

/**
 * Función que despacha la consulta al motor activo
 */
export async function ejecutarUniversal(gestor: string, queryDef: QueryDefinition): Promise<any> {
  const motor = (gestor || "postgres").toLowerCase();

  switch (motor) {
    case "postgres": {
      const client = await pgPool.connect();
      try {
        const res = await client.query(queryDef.postgres.sql, queryDef.postgres.params);
        return res.rows;
      } finally {
        client.release();
      }
    }

    case "mysql": {
      const [rows] = await mysqlPool.query(queryDef.mysql.sql, queryDef.mysql.params);
      return rows;
    }

    case "sqlserver": {
      if (!sqlServerConnected) {
        await sqlServerPool.connect();
        sqlServerConnected = true;
      }
      const request = sqlServerPool.request();
      if (queryDef.sqlserver.params) {
        for (const p of queryDef.sqlserver.params) {
          request.input(p.name, p.type, p.value);
        }
      }
      const result = await request.query(queryDef.sqlserver.sql);
      return result.recordset || result.rowsAffected;
    }

    case "oracle": {
      let conn;
      try {
        conn = await oracledb.getConnection({
          user: process.env.ORACLE_USER || "system",
          password: process.env.ORACLE_PASSWORD || "oracle",
          connectString: process.env.ORACLE_CONNECT_STRING || "localhost:1521/FREEPDB1"
        });
        const result = await conn.execute(queryDef.oracle.sql, queryDef.oracle.binds || {}, { autoCommit: true });
        return result.rows || result.outBinds;
      } finally {
        if (conn) {
          await conn.close();
        }
      }
    }

    default:
      throw new Error(`Gestor de base de datos no reconocido: ${gestor}`);
  }
}