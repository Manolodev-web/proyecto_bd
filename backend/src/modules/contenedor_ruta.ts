import { Router, Request, Response } from "express";
import { ejecutarConsulta } from "../conexiones/db.js";

const router = Router();

// 1. Endpoint para obtener el reporte o listado (Cursor de desgaste)
router.get("/desgaste/:gestor", async (req: Request, res: Response) => {
  const { gestor } = req.params;

  try {
    // Consulta o ejecución del cursor según el motor de base de datos
    const sqlQuery = "SELECT * FROM test_conexion;"; // O tu consulta de contenedores / cursor
    const resultado = await ejecutarConsulta(gestor, sqlQuery);

    res.json({
      success: true,
      mensaje: `Datos de desgaste obtenidos correctamente desde ${gestor}`,
      data: resultado,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

// 2. Endpoint para reasignar contenedor (Ejecuta el Procedimiento Almacenado)
router.post("/reasignar", async (req: Request, res: Response) => {
  const { gestor, idContenedor, nuevaRuta } = req.body;

  try {
    let sqlQuery = "";
    const motor = gestor.toLowerCase();

    // Sintaxis adaptada para el procedimiento almacenado según el motor seleccionado
    if (motor === "sqlserver") {
      sqlQuery = `EXEC sp_reasignar_contenedor @IdContenedor = ${idContenedor}, @NuevaRuta = ${nuevaRuta};`;
    } else if (motor === "mysql" || motor === "postgres") {
      sqlQuery = `CALL sp_reasignar_contenedor(${idContenedor}, ${nuevaRuta});`;
    } else if (motor === "oracle") {
      sqlQuery = `BEGIN sp_reasignar_contenedor(${idContenedor}, ${nuevaRuta}); END;`;
    }

    await ejecutarConsulta(gestor, sqlQuery);

    res.json({
      success: true,
      codigo: 200,
      mensaje: `Contenedor #${idContenedor} reasignado exitosamente a la ruta #${nuevaRuta}`,
      detalles: {
        contenedorId: idContenedor,
        rutaNueva: nuevaRuta,
        motorUtilizado: gestor,
        fechaActualizacion: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, mensaje: error.message });
  }
});

export default router;