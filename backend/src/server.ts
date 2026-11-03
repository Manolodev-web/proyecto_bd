// backend/src/server.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { probarConexion, ejecutarConsulta } from "./conexiones/db.js";

// Enrutadores de módulos
import contenedoresRouter from "./modules/contenedor_ruta.js";
import almacenRouter from "./modules/almacen_ruta.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// =========================================================================
// 1. ENDPOINTS DE SALUD Y CONEXIÓN
// =========================================================================
app.get("/api/health", (_req, res) => {
  res.json({ estado: "OK", mensaje: "Servidor Backend Grupo 4 activo", puerto: PORT });
});

app.post("/api/conectar", async (req, res) => {
  const { gestor, entorno } = req.body;
  const env = (req.headers["x-database-env"] as string) || entorno || "local";
  try {
    const resultado = await probarConexion(gestor, env);
    res.json({ exito: true, resultado });
  } catch (error: any) {
    res.status(500).json({ exito: false, gestor, entorno: env, error: error.message });
  }
});

// =========================================================================
// 2. ENDPOINT SQL ABIERTO (Usado por Daniel - Personal y por el Workbench)
// =========================================================================
app.post("/api/query", async (req, res) => {
  const { gestor, sql, entorno } = req.body;
  const env = (req.headers["x-database-env"] as string) || entorno || "local";

  if (!gestor || !sql) {
    return res.status(400).json({ exito: false, error: "Debe proporcionar 'gestor' y 'sql'" });
  }

  const tiempoInicio = Date.now();
  try {
    const filas = await ejecutarConsulta(gestor, sql, env);
    const duracion = Date.now() - tiempoInicio;

    res.json({
      exito: true,
      gestor,
      entorno: env,
      totalFilas: Array.isArray(filas) ? filas.length : 1,
      tiempoMs: duracion,
      datos: filas,
    });
  } catch (error: any) {
    res.status(500).json({
      exito: false,
      gestor,
      entorno: env,
      error: error.message || "Error al ejecutar la sentencia SQL",
    });
  }
});

// =========================================================================
// 3. MÓDULO 1: RUTAS (JOEL - Resuelto)
// =========================================================================
app.post("/api/rutas/rastrear", async (req, res) => {
  const { gestor, id_ruta, ci } = req.body;
  const env = (req.headers["x-database-env"] as string) || "local";
  const idRutaVal = id_ruta ? Number(id_ruta) : "NULL";
  const ciVal = ci ? Number(ci) : "NULL";

  try {
    const sqlQuery = `SELECT * FROM fn_rastrear_ruta_operativa(${idRutaVal}, ${ciVal}, CURRENT_DATE);`;
    const filas = await ejecutarConsulta(gestor || "postgres", sqlQuery, env);
    
    if (!filas || filas.length === 0) {
      return res.status(404).json({ exito: false, error: "Ruta u operario no encontrado" });
    }
    res.json({ exito: true, datos: filas[0] });
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

app.post("/api/rutas/iniciar-operativo", async (req, res) => {
  const { gestor, id_ruta, id_vehiculo, ci_conductor, ayudantes, turno } = req.body;
  const env = (req.headers["x-database-env"] as string) || "local";

  if (!id_ruta || !id_vehiculo || !ci_conductor) {
    return res.status(400).json({ exito: false, error: "Faltan campos obligatorios" });
  }

  try {
    const arrayAyudantes = ayudantes && ayudantes.length > 0 
      ? `ARRAY[${ayudantes.join(",")}]::INT[]` 
      : `ARRAY[]::INT[]`;

    const sqlQuery = `CALL sp_iniciar_operativo_recoleccion(${Number(id_ruta)}, ${Number(id_vehiculo)}, ${Number(ci_conductor)}, ${arrayAyudantes}, CURRENT_DATE, '${turno || "MAÑANA"}', NULL, NULL, NULL);`;
    
    await ejecutarConsulta(gestor || "postgres", sqlQuery, env);
    res.json({ exito: true, mensaje: `Operativo Ruta #${id_ruta} iniciado con éxito.` });
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// =========================================================================
// 4. MÓDULO 3: FLOTA, TALLERES Y CONTINGENCIAS (KEIKO - Descomentado)
// =========================================================================
app.post("/api/flota/baja-contingencia", async (req, res) => {
  const { gestor, id_vehiculo, id_centro_destino, motivo_mantenimiento, kilometraje_actual } = req.body;
  const env = (req.headers["x-database-env"] as string) || "local";

  if (!id_vehiculo) {
    return res.status(400).json({ exito: false, error: "Falta id_vehiculo" });
  }

  try {
    const sqlQuery = `CALL sp_baja_vehiculo_y_contingencia(${id_vehiculo}, ${id_centro_destino || 1}, '${motivo_mantenimiento || "Falla mecánica"}', ${kilometraje_actual || 0}, NULL, NULL, NULL);`;
    await ejecutarConsulta(gestor || "postgres", sqlQuery, env);

    res.json({
      exito: true,
      mensaje: `Vehículo #${id_vehiculo} enviado a taller. Rutas reasignadas por algoritmo greedy.`
    });
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

app.post("/api/flota/auditoria-carga", async (req, res) => {
  const { gestor, fecha_inicio, fecha_fin } = req.body;
  const env = (req.headers["x-database-env"] as string) || "local";

  try {
    const sqlQuery = `SELECT * FROM cr_auditoria_carga_trabajo_vehiculo('${fecha_inicio || "2026-01-01"}', '${fecha_fin || "2026-12-31"}');`;
    const filas = await ejecutarConsulta(gestor || "postgres", sqlQuery, env);

    res.json({ exito: true, totalFilas: filas.length, datos: filas });
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

app.post("/api/flota/verificar-disponibilidad", async (req, res) => {
  const { gestor, id_vehiculo, fecha, turno } = req.body;
  const env = (req.headers["x-database-env"] as string) || "local";

  try {
    const sqlQuery = `SELECT fn_verificar_disponibilidad_vehiculo(${id_vehiculo}, '${fecha}', '${turno}') AS disponible;`;
    const filas = await ejecutarConsulta(gestor || "postgres", sqlQuery, env);

    res.json({ exito: true, disponible: filas[0]?.disponible ?? false });
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// =========================================================================
// 5. MÓDULOS CON ENRUTADOR SEPARADO: CONTENEDORES Y ALMACÉN
// =========================================================================
app.use("/api/contenedores", contenedoresRouter);
app.use("/api/almacen", almacenRouter);

// =========================================================================
// 6. INICIO DEL SERVIDOR
// =========================================================================
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Servidor Backend Grupo 4 activo en http://localhost:${PORT}`);
  console.log(`📡 Módulos: Rutas (Joel), Contenedores (Emit), Flota (Keiko), Personal (Daniel), Almacén (Andy)`);
  console.log(`====================================================`);
});