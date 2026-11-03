// backend/src/config/db.ts
import { Pool as PgPool } from "pg";
import mysql from "mysql2/promise";
import sql from "mssql";
import oracledb from "oracledb";
import { obtenerConfiguracion } from "../conexiones/db.js";

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

export interface QueryDefinition {
  postgres: { sql: string; params?: any[] };
  mysql: { sql: string; params?: any[] };
  sqlserver: { sql: string; params?: any[] };
  oracle: { sql: string; binds?: any };
}

export async function ejecutarUniversal(
  gestor: string,
  queryDef: QueryDefinition,
  entorno: string = "docker"
): Promise<any> {
  const motor = (gestor || "postgres").toLowerCase();
  const cfg = obtenerConfiguracion(motor, entorno) as any;

  switch (motor) {
    case "postgres": {
      const pool = new PgPool({ ...cfg, connectionTimeoutMillis: 5000 });
      try {
        const res = await pool.query(queryDef.postgres.sql, queryDef.postgres.params || []);
        return res.rows;
      } finally {
        await pool.end();
      }
    }

    case "mysql": {
      const conexion = await mysql.createConnection({ ...cfg, connectTimeout: 5000, multipleStatements: true });
      try {
        const [rows] = await conexion.query(queryDef.mysql.sql, queryDef.mysql.params || []);
        return Array.isArray(rows) ? rows : [rows];
      } finally {
        await conexion.end();
      }
    }

    case "sqlserver": {
      const pool = await sql.connect(cfg);
      try {
        const res = await pool.request().query(queryDef.sqlserver.sql);
        return res.recordset || [{ filas_afectadas: res.rowsAffected[0] ?? 0 }];
      } finally {
        await pool.close();
      }
    }

    case "oracle": {
      const conexion = await oracledb.getConnection({
        user: cfg.user,
        password: cfg.password,
        connectString: `${cfg.host}:${cfg.port}/${cfg.service}`,
      });
      try {
        const res = await conexion.execute(queryDef.oracle.sql, queryDef.oracle.binds || {}, { autoCommit: true });
        return res.rows || [{ filas_afectadas: res.rowsAffected ?? 0 }];
      } finally {
        await conexion.close();
      }
    }

    default:
      throw new Error(`Gestor no soportado: ${gestor}`);
  }
}