import React, { useState, useEffect } from "react";
import "./App.css";

// Header institucional original que ya tienen en el proyecto
import { Header } from "./components/Header";

// Módulos independientes de los 5 integrantes
import RutasModule from "./modules/1_rutas/RutasModule";
import ContenedoresModule from "./modules/2_contenedores/ContenedoresModule";
import FlotaModule from "./modules/3_flota/FlotaModule";
import PersonalModule from "./modules/4_personal/PersonalModule";
import AlmacenModule from "./modules/5_almacen/AlmacenModule";

// Consola SQL Workbench anterior
import SqlWorkbench from "./SqlWorkbench";

export type ModuloId = "rutas" | "contenedores" | "flota" | "personal" | "almacen";

export default function App() {
  // 1. Modo Claro / Oscuro (Persistente)
  const [modoOscuro, setModoOscuro] = useState<boolean>(() => {
    const saved = localStorage.getItem("recoleccion_tema");
    return saved !== null ? saved === "dark" : false;
  });

  useEffect(() => {
    localStorage.setItem("recoleccion_tema", modoOscuro ? "dark" : "light");
  }, [modoOscuro]);

  // 2. Control de Vistas: Sistema Operativo vs Consola SQL
  const [vistaActual, setVistaActual] = useState<"operativo" | "sql_workbench">("operativo");

  // 3. Módulo Seleccionado
  const [moduloActivo, setModuloActivo] = useState<ModuloId>("rutas");

  // 4. Gestor de Base de Datos Activo
  const [gestor, setGestor] = useState<string>("postgres");

  // 5. Salud del Backend
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [comprobandoBackend, setComprobandoBackend] = useState<boolean>(false);

  const verificarBackend = async (silencioso = false) => {
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
    verificarBackend(true);
  }, [gestor]);

  // Si se presiona "Abrir Consola SQL Multigestor"
  if (vistaActual === "sql_workbench") {
    return (
      <div className={`app-layout ${modoOscuro ? "" : "modo-claro"}`} style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{
          background: "var(--color-bg-secondary, #0F2C59)",
          color: "#ffffff",
          padding: "8px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          fontSize: "13px"
        }}>
          <span style={{ fontWeight: 600, color: "#10b981" }}>
            MODO DBA: Consola SQL Multigestor & Explorador de Esquema
          </span>
          <button
            onClick={() => setVistaActual("operativo")}
            className="btn btn-primario"
            style={{ padding: "6px 14px", fontSize: "12px", cursor: "pointer" }}
          >
            ← Volver al Panel de Módulos
          </button>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <SqlWorkbench />
        </div>
      </div>
    );
  }

  // Vista Principal: Dashboard con Sidebar a la Izquierda y Contenido a la Derecha
  return (
    <div className={`app-layout ${modoOscuro ? "" : "modo-claro"}`} style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* 1. Header Institucional (Logo UMSA, Grupo 4, Gestor, Modo Noche) */}
      <Header
        gestor={gestor}
        setGestor={setGestor}
        modoOscuro={modoOscuro}
        setModoOscuro={setModoOscuro}
        backendOnline={backendOnline}
        comprobandoBackend={comprobandoBackend}
        verificarBackend={() => verificarBackend(false)}
      />

      {/* 2. Cuerpo del Dashboard (Sidebar Izquierda + Contenido Derecha) */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        
        {/* SIDEBAR IZQUIERDO */}
        <aside style={{
          width: "280px",
          background: "var(--color-bg-secondary, #0F2C59)",
          color: "var(--color-texto, #ffffff)",
          borderRight: "1px solid var(--color-borde, rgba(255,255,255,0.1))",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "16px 12px"
        }}>
          <div>
            <div style={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "1px",
              color: "var(--color-texto-muted, #94a3b8)",
              padding: "8px 12px",
              fontWeight: 700
            }}>
              Módulos del Sistema
            </div>

            <nav style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
              <button
                onClick={() => setModuloActivo("rutas")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                  background: moduloActivo === "rutas" ? "#2563eb" : "transparent",
                  color: moduloActivo === "rutas" ? "#ffffff" : "var(--color-texto, #e2e8f0)"
                }}
              >
                <span style={{ fontSize: "16px" }}>📍</span>
                <span>1. Rutas y Despacho (GIS)</span>
              </button>

              <button
                onClick={() => setModuloActivo("contenedores")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                  background: moduloActivo === "contenedores" ? "#2563eb" : "transparent",
                  color: moduloActivo === "contenedores" ? "#ffffff" : "var(--color-texto, #e2e8f0)"
                }}
              >
                <span style={{ fontSize: "16px" }}>🗑️</span>
                <span>2. Contenedores</span>
              </button>

              <button
                onClick={() => setModuloActivo("flota")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                  background: moduloActivo === "flota" ? "#2563eb" : "transparent",
                  color: moduloActivo === "flota" ? "#ffffff" : "var(--color-texto, #e2e8f0)"
                }}
              >
                <span style={{ fontSize: "16px" }}>🚛</span>
                <span>3. Flota y Contingencias</span>
              </button>

              <button
                onClick={() => setModuloActivo("personal")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                  background: moduloActivo === "personal" ? "#2563eb" : "transparent",
                  color: moduloActivo === "personal" ? "#ffffff" : "var(--color-texto, #e2e8f0)"
                }}
              >
                <span style={{ fontSize: "16px" }}>👥</span>
                <span>4. Cuadrillas y RRHH</span>
              </button>

              <button
                onClick={() => setModuloActivo("almacen")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                  background: moduloActivo === "almacen" ? "#2563eb" : "transparent",
                  color: moduloActivo === "almacen" ? "#ffffff" : "var(--color-texto, #e2e8f0)"
                }}
              >
                <span style={{ fontSize: "16px" }}>📦</span>
                <span>5. Almacén y EPPs</span>
              </button>
            </nav>
          </div>

          {/* Botón Inferior: Saltar al Multigestor */}
          <div style={{
            borderTop: "1px solid var(--color-borde, rgba(255,255,255,0.1))",
            paddingTop: "14px"
          }}>
            <button
              onClick={() => setVistaActual("sql_workbench")}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "rgba(0,0,0,0.25)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "8px",
                color: "#f8fafc",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              <span style={{ color: "#fbbf24" }}>&gt;_</span>
              <span>Abrir SQL Multigestor</span>
            </button>
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL DERECHA */}
        <main style={{
          flex: 1,
          overflowY: "auto",
          background: "var(--color-bg-primary, #f1f5f9)",
          padding: "24px",
          color: "var(--color-texto, #1e293b)"
        }}>
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