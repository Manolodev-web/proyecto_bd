import React from "react";
import { MOTORES } from "../utils/schema";
import { IconExternalLink, IconSun, IconMoon } from "./Icons";

interface HeaderProps {
  gestor: string;
  setGestor: (g: string) => void;
  entorno: "local" | "docker";
  setEntorno: (e: "local" | "docker") => void;
  modoOscuro: boolean;
  setModoOscuro: (m: boolean) => void;
  backendOnline: boolean | null;
  comprobandoBackend: boolean;
  verificarBackend: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  gestor,
  setGestor,
  entorno,
  setEntorno,
  modoOscuro,
  setModoOscuro,
  backendOnline,
  comprobandoBackend,
  verificarBackend,
}) => {
  return (
    <header className="app-header">
      {/* Lado Izquierdo: Branding UMSA */}
      <div className="header-brand">
        <div className="logo-umsa-container">
          <img
            src="/logo_umsa.png"
            alt="UMSA"
            className="logo-umsa-img"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              if (e.currentTarget.parentElement) {
                e.currentTarget.parentElement.innerHTML = '<span class="logo-fallback">UMSA</span>';
              }
            }}
          />
        </div>
        <div className="header-titles">
          <div className="header-breadcrumb">
            <span className="breadcrumb-subtle">UMSA</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-subtle">Informática</span>
            <span className="breadcrumb-separator">/</span>
            <span className="badge-grupo">Grupo 4</span>
          </div>
          <h1 className="header-project-title">
            Gestión y Recolección de Residuos Sólidos
          </h1>
        </div>
      </div>

      {/* Lado Derecho: Controles */}
      <div className="header-actions">
        {/* BOTÓN TOGGLE: LOCAL vs DOCKER */}
        <button
          onClick={() => setEntorno(entorno === "local" ? "docker" : "local")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            border: "1px solid var(--color-borde, #cbd5e1)",
            background: entorno === "docker" ? "#0284c7" : "#059669",
            color: "#ffffff",
            transition: "all 0.2s ease",
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
          }}
          title={`Click para alternar entre puertos Locales y Contenedores Docker`}
        >
          <span>{entorno === "docker" ? "🐳 Docker" : "💻 Local"}</span>
          <span style={{ fontSize: "10px", opacity: 0.85 }}>
            ({entorno === "docker" ? "P: 5433/3307" : "P: 5432/3306"})
          </span>
        </button>

        {/* Estado del Backend */}
        <div
          className={`status-pill ${
            backendOnline === true ? "status-online" : backendOnline === false ? "status-offline" : "status-checking"
          }`}
          onClick={verificarBackend}
          title="Verificar conexión con el Backend (http://localhost:4000)"
        >
          <span className="status-dot" />
          <span className="status-text">
            {comprobandoBackend ? "Verificando..." : backendOnline === true ? "API Conectada" : "API Desconectada"}
          </span>
        </div>

        {/* Selector de Gestor */}
        <div className="motor-selector-box">
          <select
            className="motor-select"
            value={gestor}
            onChange={(e) => setGestor(e.target.value)}
          >
            {MOTORES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.icono} {m.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Botón Modelo E-R */}
        <a href="/modelo_er.pdf" target="_blank" rel="noopener noreferrer" className="btn-modelo-er">
          <span>Modelo E-R</span>
          <IconExternalLink size={12} />
        </a>

        {/* Modo Noche */}
        <button
          className="btn-theme-toggle"
          onClick={() => setModoOscuro(!modoOscuro)}
          title="Alternar tema claro/oscuro"
        >
          {modoOscuro ? <IconSun size={15} /> : <IconMoon size={15} />}
        </button>
      </div>
    </header>
  );
};