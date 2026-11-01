import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { probarConexion, ejecutarConsulta } from "./conexiones/db.js";
import contenedoresRouter from "./modules/contenedor_ruta.js";

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
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Servidor Backend Grupo 4 activo en http://localhost:${PORT}`);
  console.log(`====================================================`);
});
