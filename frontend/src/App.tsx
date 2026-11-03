// frontend/src/App.tsx
import React, { useState, useEffect } from "react";
import "./App.css";

import { Header } from "./components/Header";
import RutasModule from "./modules/1_rutas/RutasModule";
import ContenedoresModule from "./modules/2_contenedores/ContenedoresModule";
import FlotaModule from "./modules/3_flota/FlotaModule";
import PersonalModule from "./modules/4_personal/PersonalModule";
import AlmacenModule from "./modules/5_almacen/AlmacenModule";
import SqlWorkbench from "./SqlWorkbench";

export type ModuloId = "rutas" | "contenedores" | "flota" | "personal" | "almacen";

export default function App() {
  const [modoOscuro, setModoOscuro] = useState<boolean>(() => {
    return localStorage.getItem("recoleccion_tema") === "dark";
  });

  // Estado del entorno (Local o Docker)
  const [entorno, setEntorno] = useState<"local" | "docker">(() => {
    const guardado = localStorage.getItem("recoleccion_entorno");
    return (guardado as "local" | "docker") || "docker";
  });

  useEffect(() => {
    localStorage.setItem("recoleccion_tema", modoOscuro ? "dark" : "light");
  }, [modoOscuro]);

  useEffect(() => {
    localStorage.setItem("recoleccion_entorno", entorno);
  }, [entorno]);

  const [vistaActual, setVistaActual] = useState<"operativo" | "sql_workbench">("operativo");
  const [moduloActivo, setModuloActivo] = useState<ModuloId>("rutas");
  const [gestor, setGestor] = useState<string>("postgres");
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [comprobandoBackend, setComprobandoBackend] = useState<boolean>(false);

  const verificarBackend = async () => {
    setComprobandoBackend(true);
    try {
      const res = await fetch("http://localhost:4000/api/health");
      setBackendOnline(res.ok);
    } catch {
      setBackendOnline(false);
    } finally {
      setComprobandoBackend(false);
    }
  };

  useEffect(() => {
    verificarBackend();
  }, [gestor, entorno]);

  // Si estamos en la Consola SQL Workbench
  if (vistaActual === "sql_workbench") {
    return (
      <div className={`app-layout ${modoOscuro ? "" : "modo-claro"}`} style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Barra superior de retorno que incluye el botón de DOCKER / LOCAL */}
        <div style={{
          background: "#0F2C59",
          color: "#fff",
          padding: "8px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          fontSize: "13px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span style={{ fontWeight: 600, color: "#10b981" }}>
              MODO DBA: Consola SQL Multigestor
            </span>

            {/* BOTÓN CONMUTADOR DENTRO DEL WORKBENCH */}
            <button
              onClick={() => setEntorno(entorno === "local" ? "docker" : "local")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                borderRadius: "16px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
                background: entorno === "docker" ? "#0284c7" : "#059669",
                color: "#ffffff"
              }}
            >
              <span>{entorno === "docker" ? "🐳 Docker (P: 5433/3307)" : "💻 Local (P: 5432/3306)"}</span>
            </button>
          </div>

          <button
            onClick={() => setVistaActual("operativo")}
            className="btn btn-primario"
            style={{ padding: "6px 14px", fontSize: "12px", cursor: "pointer" }}
          >
            ← Volver al Panel de Módulos
          </button>
        </div>

        <div style={{ flex: 1, overflow: "hidden" }}>
          <SqlWorkbench entorno={entorno} />
        </div>
      </div>
    );
  }

  // Vista Principal de Módulos
  return (
    <div className={`app-layout ${modoOscuro ? "" : "modo-claro"}`} style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Header
        gestor={gestor}
        setGestor={setGestor}
        entorno={entorno}
        setEntorno={setEntorno}
        modoOscuro={modoOscuro}
        setModoOscuro={setModoOscuro}
        backendOnline={backendOnline}
        comprobandoBackend={comprobandoBackend}
        verificarBackend={verificarBackend}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <aside style={{ width: "280px", background: "#0F2C59", color: "#fff", borderRight: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "16px 12px" }}>
          <div>
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "#94a3b8", padding: "8px 12px", fontWeight: 700 }}>
              Módulos del Sistema
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
              <button onClick={() => setModuloActivo("rutas")} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, border: "none", cursor: "pointer", textAlign: "left", background: moduloActivo === "rutas" ? "#2563eb" : "transparent", color: "#fff" }}>
                <span>📍</span> 1. Rutas y Despacho (GIS)
              </button>
              <button onClick={() => setModuloActivo("contenedores")} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, border: "none", cursor: "pointer", textAlign: "left", background: moduloActivo === "contenedores" ? "#2563eb" : "transparent", color: "#fff" }}>
                <span>🗑️</span> 2. Contenedores
              </button>
              <button onClick={() => setModuloActivo("flota")} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, border: "none", cursor: "pointer", textAlign: "left", background: moduloActivo === "flota" ? "#2563eb" : "transparent", color: "#fff" }}>
                <span>🚛</span> 3. Flota y Contingencias
              </button>
              <button onClick={() => setModuloActivo("personal")} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, border: "none", cursor: "pointer", textAlign: "left", background: moduloActivo === "personal" ? "#2563eb" : "transparent", color: "#fff" }}>
                <span>👥</span> 4. Cuadrillas y RRHH
              </button>
              <button onClick={() => setModuloActivo("almacen")} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, border: "none", cursor: "pointer", textAlign: "left", background: moduloActivo === "almacen" ? "#2563eb" : "transparent", color: "#fff" }}>
                <span>📦</span> 5. Almacén y EPPs
              </button>
            </nav>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "14px" }}>
            <button onClick={() => setVistaActual("sql_workbench")} style={{ width: "100%", padding: "10px 14px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#f8fafc", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <span style={{ color: "#fbbf24" }}>&gt;_</span>
              <span>Abrir SQL Multigestor</span>
            </button>
          </div>
        </aside>

        <main style={{ flex: 1, overflowY: "auto", background: "var(--color-bg-primary, #f1f5f9)", padding: "24px" }}>
          {moduloActivo === "rutas" && <RutasModule gestor={gestor} />}
          {moduloActivo === "contenedores" && <ContenedoresModule gestor={gestor} />}
          {moduloActivo === "flota" && <FlotaModule gestor={gestor} />}
          {moduloActivo === "personal" && <PersonalModule gestor={gestor} />}
          {moduloActivo === "almacen" && <AlmacenModule gestor={gestor} />}
        </main>
      </div>
    </div>
  );
}