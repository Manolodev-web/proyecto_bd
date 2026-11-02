import { Router, Request, Response } from "express";
import { ejecutarUniversal, QueryDefinition } from "../config/db.js"; 

const router = Router();

router.get("/insumos", async (req: Request, res: Response) => {
  const gestor = (req.query.gestor as string) || "postgres";
  try {
    const queryDef: QueryDefinition = {
      postgres: { sql: "SELECT * FROM INSUMO ORDER BY id_insumo", params: [] },
      mysql: { sql: "SELECT * FROM INSUMO ORDER BY id_insumo", params: [] },
      sqlserver: { sql: "SELECT * FROM INSUMO ORDER BY id_insumo" },
      oracle: { sql: "SELECT * FROM INSUMO ORDER BY id_insumo" }
    };
    const result = await ejecutarUniversal(gestor, queryDef);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/entregas", async (req: Request, res: Response) => {
  const { id_insumo, ci, fecha, cantidad, gestor } = req.body;
  try {
    const queryDef: QueryDefinition = {
      postgres: { sql: "INSERT INTO ENTREGA (id_insumo, ci, fecha, cantidad) VALUES ($1, $2, $3, $4) RETURNING *", params: [id_insumo, ci, fecha, cantidad] },
      mysql: { sql: "INSERT INTO ENTREGA (id_insumo, ci, fecha, cantidad) VALUES (?, ?, ?, ?)", params: [id_insumo, ci, fecha, cantidad] },
      sqlserver: { sql: `INSERT INTO ENTREGA (id_insumo, ci, fecha, cantidad) VALUES (${id_insumo}, ${ci}, '${fecha}', ${cantidad})` },
      oracle: { sql: "INSERT INTO ENTREGA (id_insumo, ci, fecha, cantidad) VALUES (:1, :2, TO_DATE(:3, 'YYYY-MM-DD'), :4)", binds: [id_insumo, ci, fecha, cantidad] }
    };
    const result = await ejecutarUniversal(gestor || "postgres", queryDef);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/distribuir-turno", async (req: Request, res: Response) => {
  const { fecha, turno, incluirHerramientas, gestor } = req.body;
  try {
    const queryDef: QueryDefinition = {
      postgres: { sql: "CALL sp_distribuir_insumos_turno($1, $2, $3, NULL, NULL, NULL)", params: [fecha, turno, incluirHerramientas] },
      mysql: { sql: "CALL sp_distribuir_insumos_turno(?, ?, ?)", params: [fecha, turno, incluirHerramientas] },
      sqlserver: { sql: `EXEC sp_distribuir_insumos_turno '${fecha}', '${turno}', ${incluirHerramientas ? 1 : 0}` },
      oracle: { sql: "BEGIN sp_distribuir_insumos_turno(:1, :2, :3); END;", binds: [fecha, turno, incluirHerramientas ? 1 : 0] }
    };
    

    const result = await ejecutarUniversal(gestor || "postgres", queryDef);
    
    const filaResultado = Array.isArray(result) ? result[0] : result;
    
    res.json({ 
      success: true, 
      operarios: filaResultado?.p_operarios_dotados || 0, 
      unidades: filaResultado?.p_total_unidades_entregadas || 0, 
      mensaje: filaResultado?.p_mensaje || "Dotación completada" 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});


router.get("/kardex/:ci", async (req: Request, res: Response) => {
  const { ci } = req.params;
  const { anio, gestor } = req.query;
  const anioActual = anio || new Date().getFullYear();
  try {
    const queryDef: QueryDefinition = {
      postgres: { sql: "SELECT * FROM fn_auditoria_consumo_insumos_empleado($1, $2)", params: [ci, anioActual] },
      mysql: { sql: "SELECT * FROM fn_auditoria_consumo_insumos_empleado(?, ?)", params: [ci, anioActual] },
      sqlserver: { sql: `SELECT * FROM fn_auditoria_consumo_insumos_empleado(${ci}, ${anioActual})` },
      oracle: { sql: "SELECT * FROM TABLE(fn_auditoria_consumo_insumos_empleado(:1, :2))", binds: [ci, anioActual] }
    };
    const result = await ejecutarUniversal((gestor as string) || "postgres", queryDef);
    
    if (!result || result.length === 0) {
      return res.status(404).json({ error: "Sin datos." });
    }
    res.json(result[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
