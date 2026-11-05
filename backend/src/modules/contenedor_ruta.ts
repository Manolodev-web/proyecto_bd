// backend/src/modules/contenedor_ruta.ts
import { Router, Request, Response } from "express";
import { ejecutarConsulta } from "../conexiones/db.js";

const router = Router();

// =========================================================================
// MÓDULO 2: GESTIÓN DE CONTENEDORES Y MANTENIMIENTO TÉCNICO
// =========================================================================

/**
 * 1. Endpoint del Cursor Explícito de Diagnóstico Técnico
 * Objeto BD: cr_reporte_desgaste_contenedores(p_id_ruta_filtro, p_estado_filtro)
 * Recorre fila por fila los contenedores de la ruta seleccionada (o todos),
 * calculando vaciados históricos en ABARCA y el diagnóstico de mantenimiento.
 */
router.get("/desgaste/:gestor", async (req: Request, res: Response) => {
  const { gestor } = req.params;
  const { id_ruta, estado } = req.query;
  const entorno = (req.headers["x-database-env"] as string) || "docker";

  try {
    const rutaVal = id_ruta && !isNaN(Number(id_ruta)) ? Number(id_ruta) : "NULL";
    const estadoVal = estado && estado !== "TODOS" ? `'${estado}'` : "NULL";

    const sqlQuery = `SELECT * FROM cr_reporte_desgaste_contenedores(${rutaVal}, ${estadoVal});`;
    const resultado = await ejecutarConsulta(gestor, sqlQuery, entorno);

    res.json({
      success: true,
      mensaje: `Diagnóstico de contenedores obtenido correctamente desde ${gestor}`,
      data: resultado || [],
    });
  } catch (error: any) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

/**
 * 2. Endpoint de Actualización de Estado Operativo (Procedimiento Almacenado)
 * Objeto BD: sp_actualizar_estado_contenedor
 * El procedimiento solo ejecuta UPDATE en CONTENEDOR.
 * El trigger tg_historial_estado_contenedor ejecuta automáticamente el INSERT en HISTORIAL_CONTENEDOR.
 */
router.post("/actualizar-estado", async (req: Request, res: Response) => {
  const { gestor, idContenedor, idRuta, nuevoEstado } = req.body;
  const entorno = (req.headers["x-database-env"] as string) || "docker";

  if (!idContenedor || !idRuta || !nuevoEstado) {
    return res.status(400).json({
      success: false,
      mensaje: "Faltan parámetros obligatorios: idContenedor, idRuta y nuevoEstado.",
    });
  }

  try {
    const sqlQuery = `CALL sp_actualizar_estado_contenedor(${Number(idContenedor)}, ${Number(idRuta)}, '${nuevoEstado}');`;
    await ejecutarConsulta(gestor || "postgres", sqlQuery, entorno);

    res.json({
      success: true,
      codigo: 200,
      mensaje: `Estado del contenedor #${idContenedor} en Ruta #${idRuta} actualizado a '${nuevoEstado}'. Auditoría registrada vía Trigger.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

export default router;