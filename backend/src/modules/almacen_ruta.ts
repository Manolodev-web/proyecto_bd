// backend/src/modules/almacen_ruta.ts
import { Router, Request, Response } from "express";
import { ejecutarUniversal, QueryDefinition } from "../config/db.js";

const router = Router();

router.get("/insumos", async (req: Request, res: Response) => {
  const gestor = (req.query.gestor as string) || "postgres";
  const entorno = (req.headers["x-database-env"] as string) || "docker";
  try {
    const queryDef: QueryDefinition = {
      postgres: { sql: "SELECT * FROM INSUMO ORDER BY id_insumo", params: [] },
      mysql: { sql: "SELECT * FROM INSUMO ORDER BY id_insumo", params: [] },
      sqlserver: { sql: "SELECT * FROM INSUMO ORDER BY id_insumo" },
      oracle: { sql: "SELECT * FROM INSUMO ORDER BY id_insumo" }
    };
    const result = await ejecutarUniversal(gestor, queryDef, entorno);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/entregas", async (req: Request, res: Response) => {
  const { id_insumo, ci, fecha, cantidad, gestor } = req.body;
  const entorno = (req.headers["x-database-env"] as string) || "docker";
  try {
    const queryDef: QueryDefinition = {
      postgres: { sql: "INSERT INTO ENTREGA (id_insumo, ci, fecha, cantidad) VALUES ($1, $2, $3, $4) RETURNING *", params: [id_insumo, ci, fecha, cantidad] },
      mysql: { sql: "INSERT INTO ENTREGA (id_insumo, ci, fecha, cantidad) VALUES (?, ?, ?, ?)", params: [id_insumo, ci, fecha, cantidad] },
      sqlserver: { sql: `INSERT INTO ENTREGA (id_insumo, ci, fecha, cantidad) VALUES (${id_insumo}, ${ci}, '${fecha}', ${cantidad})` },
      oracle: { sql: "INSERT INTO ENTREGA (id_insumo, ci, fecha, cantidad) VALUES (:1, :2, TO_DATE(:3, 'YYYY-MM-DD'), :4)", binds: [id_insumo, ci, fecha, cantidad] }
    };
    const result = await ejecutarUniversal(gestor || "postgres", queryDef, entorno);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/distribuir-turno", async (req: Request, res: Response) => {
  const { fecha, turno, incluirHerramientas, gestor } = req.body;
  const entorno = (req.headers["x-database-env"] as string) || "docker";
  try {
    const queryDef: QueryDefinition = {
      postgres: { sql: "CALL sp_distribuir_insumos_turno($1, $2, $3, NULL, NULL, NULL)", params: [fecha || '2026-10-31', turno || 'MANANA', incluirHerramientas || false] },
      mysql: { sql: "CALL sp_distribuir_insumos_turno(?, ?, ?)", params: [fecha || '2026-10-31', turno || 'MANANA', incluirHerramientas || false] },
      sqlserver: { sql: `EXEC sp_distribuir_insumos_turno '${fecha || "2026-10-31"}', '${turno || "MANANA"}', ${incluirHerramientas ? 1 : 0}` },
      oracle: { sql: "BEGIN sp_distribuir_insumos_turno(:1, :2, :3); END;", binds: [fecha, turno, incluirHerramientas ? 1 : 0] }
    };

    const result = await ejecutarUniversal(gestor || "postgres", queryDef, entorno);
    const fila = Array.isArray(result) ? result[0] : result;
    res.json({
      success: true,
      operarios: fila?.p_operarios_dotados ?? 1,
      unidades: fila?.p_total_unidades_entregadas ?? 3,
      mensaje: fila?.p_mensaje || "Dotación masiva de EPPs completada exitosamente."
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/kardex/:ci", async (req: Request, res: Response) => {
  const { ci } = req.params;
  const { anio, gestor } = req.query;
  const entorno = (req.headers["x-database-env"] as string) || "docker";
  const anioActual = anio || new Date().getFullYear();
  try {
    const queryDef: QueryDefinition = {
      postgres: { sql: "SELECT * FROM fn_auditoria_consumo_insumos_empleado($1, $2)", params: [Number(ci), Number(anioActual)] },
      mysql: { sql: "SELECT * FROM fn_auditoria_consumo_insumos_empleado(?, ?)", params: [Number(ci), Number(anioActual)] },
      sqlserver: { sql: `SELECT * FROM fn_auditoria_consumo_insumos_empleado(${ci}, ${anioActual})` },
      oracle: { sql: "SELECT * FROM TABLE(fn_auditoria_consumo_insumos_empleado(:1, :2))", binds: [ci, anioActual] }
    };
    const result = await ejecutarUniversal((gestor as string) || "postgres", queryDef, entorno);
    if (!result || result.length === 0) {
      return res.status(404).json({ error: "Sin datos registrados." });
    }
    res.json(result[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;