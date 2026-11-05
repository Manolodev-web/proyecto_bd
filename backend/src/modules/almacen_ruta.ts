// backend/src/modules/almacen_ruta.ts
import { Router, Request, Response } from "express";
import { ejecutarUniversal, QueryDefinition } from "../config/db.js";

const router = Router();

// =========================================================================
// MÓDULO 5: ALMACENES, INVENTARIO Y FISCALIZACIÓN DE EPPs
// =========================================================================

/**
 * 1. Monitoreo de Stock Actual de Insumos
 */
router.get("/insumos", async (req: Request, res: Response) => {
  const gestor = (req.query.gestor as string) || "postgres";
  const entorno = (req.headers["x-database-env"] as string) || "docker";
  try {
    const queryDef: QueryDefinition = {
      postgres: { sql: "SELECT id_insumo, nombre, descripcion, cantidad FROM INSUMO ORDER BY id_insumo ASC;", params: [] },
      mysql: { sql: "SELECT id_insumo, nombre, descripcion, cantidad FROM INSUMO ORDER BY id_insumo ASC;", params: [] },
      sqlserver: { sql: "SELECT id_insumo, nombre, descripcion, cantidad FROM INSUMO ORDER BY id_insumo ASC;" },
      oracle: { sql: "SELECT id_insumo, nombre, descripcion, cantidad FROM INSUMO ORDER BY id_insumo ASC;" }
    };
    const result = await ejecutarUniversal(gestor, queryDef, entorno);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 2. Cursor Explícito: Balance General de Existencias y Despachos
 * Objeto BD: cr_balance_general_insumos
 */
router.get("/balance-cursor", async (req: Request, res: Response) => {
  const gestor = (req.query.gestor as string) || "postgres";
  const entorno = (req.headers["x-database-env"] as string) || "docker";
  try {
    const queryDef: QueryDefinition = {
      postgres: { sql: "SELECT * FROM cr_balance_general_insumos(NULL);", params: [] },
      mysql: { sql: "CALL cr_balance_general_insumos(NULL);", params: [] },
      sqlserver: { sql: "EXEC cr_balance_general_insumos NULL;" },
      oracle: { sql: "SELECT * FROM TABLE(cr_balance_general_insumos(NULL));" }
    };
    const result = await ejecutarUniversal(gestor, queryDef, entorno);
    res.json({ success: true, data: result || [] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 3. Función Analítica: Kardex de Consumo del Trabajador
 * Objeto BD: fn_auditoria_consumo_insumos_empleado(p_ci, p_anio)
 */
router.get("/kardex/:ci", async (req: Request, res: Response) => {
  const { ci } = req.params;
  const { anio, gestor } = req.query;
  const entorno = (req.headers["x-database-env"] as string) || "docker";
  const anioActual = anio || new Date().getFullYear();

  try {
    const queryDef: QueryDefinition = {
      postgres: { sql: "SELECT * FROM fn_auditoria_consumo_insumos_empleado($1, $2);", params: [Number(ci), Number(anioActual)] },
      mysql: { sql: "SELECT * FROM fn_auditoria_consumo_insumos_empleado(?, ?);", params: [Number(ci), Number(anioActual)] },
      sqlserver: { sql: `SELECT * FROM fn_auditoria_consumo_insumos_empleado(${ci}, ${anioActual});` },
      oracle: { sql: "SELECT * FROM TABLE(fn_auditoria_consumo_insumos_empleado(:1, :2));", binds: [ci, anioActual] }
    };
    const result = await ejecutarUniversal((gestor as string) || "postgres", queryDef, entorno);
    if (!result || result.length === 0) {
      return res.status(404).json({ error: `Sin registros de consumo para el CI ${ci}.` });
    }
    res.json(result[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 4. Despacho a Operario (Activa el Trigger tg_control_y_descuento_stock_insumo)
 * El trigger intercepta la inserción en ENTREGA, valida el stock y descuenta en INSUMO.
 */
router.post("/entregas", async (req: Request, res: Response) => {
  const { id_insumo, ci, fecha, cantidad, gestor } = req.body;
  const entorno = (req.headers["x-database-env"] as string) || "docker";

  if (!id_insumo || !ci || !cantidad) {
    return res.status(400).json({ success: false, message: "Faltan parámetros de despacho." });
  }

  try {
    const queryDef: QueryDefinition = {
      postgres: {
        sql: "INSERT INTO ENTREGA (id_insumo, ci, fecha, cantidad) VALUES ($1, $2, $3::date, $4) RETURNING *;",
        params: [Number(id_insumo), Number(ci), fecha || new Date().toISOString().split("T")[0], Number(cantidad)],
      },
      mysql: {
        sql: "INSERT INTO ENTREGA (id_insumo, ci, fecha, cantidad) VALUES (?, ?, ?, ?);",
        params: [Number(id_insumo), Number(ci), fecha || new Date().toISOString().split("T")[0], Number(cantidad)],
      },
      sqlserver: {
        sql: `INSERT INTO ENTREGA (id_insumo, ci, fecha, cantidad) VALUES (${id_insumo}, ${ci}, '${fecha}', ${cantidad});`,
      },
      oracle: {
        sql: "INSERT INTO ENTREGA (id_insumo, ci, fecha, cantidad) VALUES (:1, :2, TO_DATE(:3, 'YYYY-MM-DD'), :4)",
        binds: [id_insumo, ci, fecha, cantidad],
      },
    };

    await ejecutarUniversal(gestor || "postgres", queryDef, entorno);

    res.status(201).json({
      success: true,
      mensaje: `Despacho registrado correctamente. El Trigger descontó ${cantidad} unidades del inventario.`,
    });
  } catch (error: any) {
    // Aquí capturamos la excepción arrojada por el TRIGGER (RAISE EXCEPTION)
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;