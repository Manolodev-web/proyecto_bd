import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { probarConexion, ejecutarConsulta } from "./conexiones/db.js";
import contenedoresRouter from "./modules/contenedor_ruta.js";
import almacenRouter from "./modules/almacen_ruta.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Endpoint de estado del servidor
app.get("/api/health", (req, res) => {
  res.json({ estado: "OK", mensaje: "Servidor Backend Grupo 4 activo" });
});

// Endpoint de prueba de conexión general
app.post("/api/conectar", async (req, res) => {
  const { gestor } = req.body;
  try {
    const resultado = await probarConexion(gestor);
    res.json({ exito: true, resultado });
  } catch (error: any) {
    res.status(500).json({ exito: false, gestor, error: error.message });
  }
});

// Endpoint de ejecución de consultas SQL generales
app.post("/api/query", async (req, res) => {
  const { gestor, sql } = req.body;

  if (!gestor || !sql) {
    return res.status(400).json({
      exito: false,
      error: "Debe proporcionar el 'gestor' y la sentencia 'sql'",
    });
  }

  const tiempoInicio = Date.now();
  try {
    const filas = await ejecutarConsulta(gestor, sql);
    const duracion = Date.now() - tiempoInicio;

    res.json({
      exito: true,
      gestor,
      totalFilas: filas.length,
      tiempoMs: duracion,
      datos: filas,
    });
  } catch (error: any) {
    res.status(500).json({
      exito: false,
      gestor,
      error: error.message || "Error al ejecutar la sentencia SQL",
    });
  }
});

app.use("/api/contenedores", contenedoresRouter);
app.use("/api/almacen", almacenRouter);
/*
// ENDPOINTS PARA EL MÓDULO 3 (Flota, Talleres y Contingencias)


// 1. Endpoint para ejecutar sp_baja_vehiculo_y_contingencia
app.post("/api/flota/baja-contingencia", async (req, res) => {
  const { gestor, id_vehiculo, id_centro_destino, motivo_mantenimiento, kilometraje_actual } = req.body;
  
  if (!gestor || !id_vehiculo) {
    return res.status(400).json({ exito: false, error: "Faltan parámetros requeridos (gestor, id_vehiculo)" });
  }

  try {
    // Como tu proyecto usa una función centralizada de ejecución de consultas (ejecutarConsulta), 
    // puedes invocar el procedimiento almacenado mediante CALL o SELECT según soporte el motor.
    const sqlQuery = `CALL sp_baja_vehiculo_y_contingencia(${id_vehiculo}, ${id_centro_destino || 1}, '${motivo_mantenimiento || "Mantenimiento"}', ${kilometraje_actual || 0}, NULL, NULL, NULL);`;
    
    await ejecutarConsulta(gestor, sqlQuery);

    res.json({
      exito: true,
      mensaje: `Vehículo ${id_vehiculo} enviado a taller exitosamente. Rutas reasignadas por algoritmo greedy.`
    });
  } catch (error: any) {
    res.status(500).json({
      exito: false,
      error: error.message || "Error al procesar la baja y contingencia del vehículo"
    });
  }
});

// 2. Endpoint para ejecutar cr_auditoria_carga_trabajo_vehiculo (Cursor)
app.post("/api/flota/auditoria-carga", async (req, res) => {
  const { gestor, fecha_inicio, fecha_fin } = req.body;

  if (!gestor || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ exito: false, error: "Debe proporcionar gestor, fecha_inicio y fecha_fin" });
  }

  try {
    // Invoca la función que encapsula el cursor de auditoría
    const sqlQuery = `SELECT * FROM cr_auditoria_carga_trabajo_vehiculo('${fecha_inicio}', '${fecha_fin}');`;
    const filas = await ejecutarConsulta(gestor, sqlQuery);

    res.json({
      exito: true,
      totalFilas: filas.length,
      datos: filas
    });
  } catch (error: any) {
    res.status(500).json({
      exito: false,
      error: error.message || "Error al ejecutar la auditoría de carga por cursor"
    });
  }
});

// Endpoint adicional para verificar disponibilidad en server.ts
app.post("/api/flota/verificar-disponibilidad", async (req, res) => {
  const { gestor, id_vehiculo, fecha, turno } = req.body;

  try {
    // Invoca directamente la función creada en PostgreSQL
    const sqlQuery = `SELECT fn_verificar_disponibilidad_vehiculo(${id_vehiculo}, '${fecha}', '${turno}') AS disponible;`;
    const filas = await ejecutarConsulta(gestor, sqlQuery);

    res.json({
      exito: true,
      disponible: filas[0]?.disponible ?? false
    });
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

//termina flota
*/

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Servidor Backend Grupo 4 activo en http://localhost:${PORT}`);
  console.log(`====================================================`);
});


