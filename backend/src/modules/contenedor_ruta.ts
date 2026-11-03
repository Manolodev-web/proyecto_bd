// backend/src/modules/contenedor_ruta.ts
import { Router, Request, Response } from "express";
import { ejecutarConsulta } from "../conexiones/db.js";

const router = Router();

// Endpoint del Cursor de Desgaste
router.get("/desgaste/:gestor", async (req: Request, res: Response) => {
  const { gestor } = req.params;
  const entorno = (req.headers["x-database-env"] as string) || "docker";

  try {
    const sqlQuery = "SELECT * FROM cr_reporte_desgaste_contenedores(NULL, NULL);";
    const resultado = await ejecutarConsulta(gestor, sqlQuery, entorno);

    res.json({
      success: true,
      mensaje: `Datos de desgaste obtenidos correctamente desde ${gestor}`,
      data: resultado,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

// Endpoint de Reasignación (Procedimiento Almacenado)
router.post("/reasignar", async (req: Request, res: Response) => {
  const { gestor, idContenedor, nuevaRuta } = req.body;
  const entorno = (req.headers["x-database-env"] as string) || "docker";

  try {
    const sqlQuery = `CALL sp_reasignar_contenedor(${Number(idContenedor)}, ${Number(nuevaRuta)}, NULL, 'Reubicación por demanda');`;
    await ejecutarConsulta(gestor || "postgres", sqlQuery, entorno);

    res.json({
      success: true,
      codigo: 200,
      mensaje: `Contenedor #${idContenedor} reasignado exitosamente a la ruta #${nuevaRuta}`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

export default router;