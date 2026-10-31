import React from "react";
import { MOTORES } from "../utils/schema";
import { IconExternalLink, IconSun, IconMoon } from "./Icons";

interface HeaderProps {
  gestor: string;
  setGestor: (g: string) => void;
  modoOscuro: boolean;
  setModoOscuro: (m: boolean) => void;
  backendOnline: boolean | null;
  comprobandoBackend: boolean;
  verificarBackend: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  gestor,
  setGestor,
  modoOscuro,
  setModoOscuro,
  backendOnline,
  comprobandoBackend,
  verificarBackend,
}) => {
  return (
    <header className="app-header">
      {/* Lado Izquierdo: Branding Minimalista */}
      <div className="header-brand">
        <div className="logo-umsa-container">
          <img
            src="/logo_umsa.png"
            alt="UMSA"
            className="logo-umsa-img"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              if (e.currentTarget.parentElement) {
                e.currentTarget.parentElement.innerHTML =
                  '<span class="logo-fallback">UMSA</span>';
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

      {/* Lado Derecho: Estado Backend, Selector de Motor, PDF y Tema */}
      <div className="header-actions">
        {/* Indicador de Estado del Backend */}
        <div
          className={`status-pill ${
            backendOnline === true
              ? "status-online"
              : backendOnline === false
              ? "status-offline"
              : "status-checking"
          }`}
          onClick={verificarBackend}
          title="Verificar conexión con el Backend (http://localhost:4000)"
        >
          <span className="status-dot" />
          <span className="status-text">
            {comprobandoBackend
              ? "Verificando..."
              : backendOnline === true
              ? "API Conectada"
              : backendOnline === false
              ? "API Desconectada"
              : "Comprobar"}
          </span>
        </div>

        {/* Selector de Motor */}
        <div className="motor-selector-box">
          <select
            className="motor-select"
            value={gestor}
            onChange={(e) => setGestor(e.target.value)}
            title="Seleccionar motor de base de datos"
          >
            {MOTORES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.icono} {m.nombre} (Puerto {m.puerto})
              </option>
            ))}
          </select>
        </div>

        {/* Botón Modelo E-R */}
        <a
          href="/modelo_er.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-modelo-er"
          title="Abrir diagrama del Modelo E-R (PDF)"
        >
          <span>Modelo E-R</span>
          <IconExternalLink size={12} />
        </a>

        {/* Alternar Tema */}
        <button
          className="btn-theme-toggle"
          onClick={() => setModoOscuro(!modoOscuro)}
          title={modoOscuro ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
          aria-label="Alternar tema"
        >
          {modoOscuro ? <IconSun size={15} /> : <IconMoon size={15} />}
        </button>
      </div>
    </header>
  );
};
