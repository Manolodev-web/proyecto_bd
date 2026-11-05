// backend/src/server.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { probarConexion, ejecutarConsulta } from "./conexiones/db.js";

// Enrutadores modulares separados
import contenedoresRouter from "./modules/contenedor_ruta.js";
import almacenRouter from "./modules/almacen_ruta.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// =========================================================================
// 1. ENDPOINTS DE SALUD Y CONTROL DE CONEXIÓN
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
// 2. ENDPOINT SQL ABIERTO (Workbench y Consultas de Lectura)
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
// 3. MÓDULO 1: CENTRO DE DESPACHO Y TRAZABILIDAD DE RUTAS
// =========================================================================

/**
 * Endpoint 1: Trazabilidad General de la Ruta
 * Procedimiento: sp_consultar_trazabilidad_ruta
 * Parámetros en BD: 2 IN + 6 OUT = 8 parámetros en total.
 * En PostgreSQL, CALL requiere pasar los 2 valores IN y 6 NULLs para los OUT.
 */
app.post("/api/rutas/trazabilidad", async (req, res) => {
  const { gestor, id_ruta, fecha } = req.body;
  const env = (req.headers["x-database-env"] as string) || "local";

  if (!id_ruta) {
    return res.status(400).json({ exito: false, error: "Debe ingresar un ID de Ruta válido." });
  }

  try {
    const fechaVal = fecha ? `'${fecha}'::date` : "CURRENT_DATE";
    // 2 valores IN + 6 NULLs para los parámetros OUT = 8 argumentos exactos
    const sqlQuery = `CALL sp_consultar_trazabilidad_ruta(${Number(id_ruta)}, ${fechaVal}, NULL, NULL, NULL, NULL, NULL, NULL);`;
    const filas = await ejecutarConsulta(gestor || "postgres", sqlQuery, env);

    if (!filas || filas.length === 0) {
      return res.status(404).json({ exito: false, error: `Ruta #${id_ruta} no encontrada.` });
    }

    res.json({ exito: true, datos: filas[0] });
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

/**
 * Endpoint 2: Detalle Secuencial de Contenedores en el Tramo
 * Objeto BD: cr_recorrer_contenedores_ruta(p_id_ruta) (Cursor Explícito)
 */
app.post("/api/rutas/contenedores-tramo", async (req, res) => {
  const { gestor, id_ruta } = req.body;
  const env = (req.headers["x-database-env"] as string) || "local";

  if (!id_ruta) {
    return res.status(400).json({ exito: false, error: "Debe ingresar un ID de Ruta válido." });
  }

  try {
    const sqlQuery = `SELECT * FROM cr_recorrer_contenedores_ruta(${Number(id_ruta)});`;
    const filas = await ejecutarConsulta(gestor || "postgres", sqlQuery, env);

    res.json({ exito: true, totalFilas: filas ? filas.length : 0, datos: filas || [] });
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// =========================================================================
// 4. MÓDULO 3: FLOTA AUTOMOTORA Y DISPONIBILIDAD
// =========================================================================

/**
 * Endpoint 1: Ficha Operativa y Disponibilidad de Unidad
 * Procedimiento: sp_consultar_disponibilidad_vehiculo
 * Parámetros en BD: 3 IN + 6 OUT = 9 parámetros en total.
 * En PostgreSQL, CALL requiere pasar los 3 valores IN y 6 NULLs para los OUT.
 */
app.post("/api/flota/verificar-disponibilidad", async (req, res) => {
  const { gestor, id_vehiculo, fecha, turno } = req.body;
  const env = (req.headers["x-database-env"] as string) || "local";

  if (!id_vehiculo) {
    return res.status(400).json({ exito: false, error: "Debe ingresar un ID de Vehículo válido." });
  }

  try {
    const fechaVal = fecha ? `'${fecha}'::date` : "CURRENT_DATE";
    const turnoVal = turno ? `'${turno}'::varchar` : "'MANANA'::varchar";

    // 3 valores IN + 6 NULLs para los parámetros OUT = 9 argumentos exactos
    const sqlQuery = `CALL sp_consultar_disponibilidad_vehiculo(${Number(id_vehiculo)}, ${fechaVal}, ${turnoVal}, NULL, NULL, NULL, NULL, NULL, NULL);`;
    const filas = await ejecutarConsulta(gestor || "postgres", sqlQuery, env);

    if (!filas || filas.length === 0) {
      return res.status(404).json({ exito: false, error: `Vehículo #${id_vehiculo} no encontrado.` });
    }

    res.json({ exito: true, datos: filas[0] });
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

/**
 * Endpoint 2: Cursor Explícito de Auditoría de Servicios de la Flota
 * Objeto BD: cr_auditoria_carga_trabajo_vehiculo(fecha_inicio, fecha_fin)
 */
app.post("/api/flota/auditoria-carga", async (req, res) => {
  const { gestor, fecha_inicio, fecha_fin } = req.body;
  const env = (req.headers["x-database-env"] as string) || "local";

  try {
    const inicio = fecha_inicio ? `'${fecha_inicio}'::date` : "'2026-01-01'::date";
    const fin = fecha_fin ? `'${fecha_fin}'::date` : "CURRENT_DATE";

    const sqlQuery = `SELECT * FROM cr_auditoria_carga_trabajo_vehiculo(${inicio}, ${fin});`;
    const filas = await ejecutarConsulta(gestor || "postgres", sqlQuery, env);

    res.json({ exito: true, totalFilas: filas ? filas.length : 0, datos: filas || [] });
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// =========================================================================
// 5. MÓDULO 4: PERSONAL, ESCALAFÓN Y AUDITORÍA SALARIAL
// =========================================================================

/**
 * Endpoint 1: Actualización de Salario (Procedimiento Almacenado)
 * Objeto BD: sp_actualizar_salario_empleado(ci, nuevo_salario)
 */
app.post("/api/personal/actualizar-salario", async (req, res) => {
  const { gestor, ci, salario } = req.body;
  const env = (req.headers["x-database-env"] as string) || "local";

  if (!ci || !salario) {
    return res.status(400).json({ exito: false, error: "Debe ingresar CI y nuevo salario." });
  }

  try {
    const sqlQuery = `CALL sp_actualizar_salario_empleado(${Number(ci)}, ${Number(salario)});`;
    await ejecutarConsulta(gestor || "postgres", sqlQuery, env);

    res.json({
      exito: true,
      mensaje: `Salario del empleado con CI ${ci} actualizado a Bs. ${salario}. Auditoría insertada vía Trigger.`,
    });
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

/**
 * Endpoint 2: Cursor Explícito de Escalafón Salarial y Antigüedad
 * Objeto BD: cr_reporte_escalafon_personal(p_tipo_filtro)
 */
app.post("/api/personal/escalafon", async (req, res) => {
  const { gestor, tipo_filtro } = req.body;
  const env = (req.headers["x-database-env"] as string) || "local";

  try {
    const filtroVal = tipo_filtro && tipo_filtro !== "TODOS" ? `'${tipo_filtro}'` : "NULL";
    const sqlQuery = `SELECT * FROM cr_reporte_escalafon_personal(${filtroVal});`;
    const filas = await ejecutarConsulta(gestor || "postgres", sqlQuery, env);

    res.json({ exito: true, totalFilas: filas ? filas.length : 0, datos: filas || [] });
  } catch (error: any) {
    res.status(500).json({ exito: false, error: error.message });
  }
});

// =========================================================================
// 6. ENRUTADORES MODULARES (CONTENEDORES Y ALMACÉN)
// =========================================================================
app.use("/api/contenedores", contenedoresRouter);
app.use("/api/almacen", almacenRouter);

// =========================================================================
// 7. INICIO DEL SERVIDOR
// =========================================================================
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Servidor Backend Grupo 4 activo en http://localhost:${PORT}`);
  console.log(`📡 Módulos sincronizados: Rutas (1), Contenedores (2), Flota (3), Personal (4), Almacén (5)`);
  console.log(`====================================================`);
});