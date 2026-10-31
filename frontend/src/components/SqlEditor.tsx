import React, { useRef } from "react";
import type { TabConsulta } from "../types";
import { formatSql, toggleSqlCase, obtenerSnippet } from "../utils/sqlNormalizer";
import { copyToClipboard, downloadSqlFile } from "../utils/formatters";
import {
  IconPlay,
  IconSparkles,
  IconCopy,
  IconDownload,
  IconTrash,
  IconFileText,
} from "./Icons";

interface SqlEditorProps {
  tabs: TabConsulta[];
  tabActivaId: string;
  setTabActivaId: (id: string) => void;
  onCrearTab: () => void;
  onCerrarTab: (id: string) => void;
  sqlQuery: string;
  setSqlQuery: (sql: string | ((prev: string) => string)) => void;
  onEjecutar: () => void;
  cargando: boolean;
  gestor: string;
  autoResolverTablas: boolean;
  setAutoResolverTablas: (v: boolean) => void;
  onMostrarToast: (msg: string, tipo?: "exito" | "info" | "advertencia" | "error") => void;
}

export const SqlEditor: React.FC<SqlEditorProps> = ({
  tabs,
  tabActivaId,
  setTabActivaId,
  onCrearTab,
  onCerrarTab,
  sqlQuery,
  setSqlQuery,
  onEjecutar,
  cargando,
  gestor,
  autoResolverTablas,
  setAutoResolverTablas,
  onMostrarToast,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const manejarScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const manejarTeclas = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onEjecutar();
    } else if (e.key === "Tab") {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const nuevoTexto =
        sqlQuery.substring(0, start) + "  " + sqlQuery.substring(end);
      setSqlQuery(nuevoTexto);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
            start + 2;
        }
      }, 0);
    }
  };

  const ejecutarFormateo = () => {
    if (!sqlQuery.trim()) return;
    const formateado = formatSql(sqlQuery);
    setSqlQuery(formateado);
    onMostrarToast("SQL ordenado y estructurado con éxito", "exito");
  };

  const ejecutarAlternarMayusculas = () => {
    if (!sqlQuery.trim()) return;
    const transformado = toggleSqlCase(sqlQuery);
    setSqlQuery(transformado);
    onMostrarToast("Texto alternado entre mayúsculas y minúsculas", "info");
  };

  const ejecutarCopiar = async () => {
    if (!sqlQuery.trim()) return;
    const ok = await copyToClipboard(sqlQuery);
    if (ok) {
      onMostrarToast("Consulta copiada al portapapeles", "exito");
    }
  };

  const ejecutarDescargar = () => {
    if (!sqlQuery.trim()) return;
    downloadSqlFile(sqlQuery, `consulta_${gestor}`);
    onMostrarToast("Archivo .sql descargado", "exito");
  };

  const cargarPlantilla = (tipo: any) => {
    if (!tipo) return;
    const plantilla = obtenerSnippet(tipo, gestor);
    setSqlQuery(plantilla);
    onMostrarToast(`Plantilla cargada para ${gestor.toUpperCase()}`, "info");
  };

  const textoMuestra =
    "-- Escribe tu consulta SQL, Procedimiento, Función, Trigger o Cursor aquí\n-- Presiona Ctrl + Enter para ejecutar rápidamente\n\nSELECT * FROM EMPLEADO;";

  const lineasTotales = Math.max(
    (sqlQuery || textoMuestra).split("\n").length,
    12
  );

  return (
    <div className="sql-editor-container">
      {/* Pestañas de Consultas */}
      <div className="editor-tabs-bar">
        <div className="editor-tabs-scroll">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`editor-tab-item ${
                tab.id === tabActivaId ? "editor-tab-active" : ""
              }`}
              onClick={() => setTabActivaId(tab.id)}
            >
              <IconFileText size={12} className="tab-icon-svg" />
              <span className="tab-title">{tab.titulo}</span>
              {tabs.length > 1 && (
                <button
                  className="tab-close-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCerrarTab(tab.id);
                  }}
                  title="Cerrar pestaña"
                >
                  ×
                </button>
              )}
            </div>
          ))}

          <button
            className="btn-nueva-tab"
            onClick={onCrearTab}
            title="Abrir nueva pestaña"
          >
            + Nueva
          </button>
        </div>

        {/* Interruptor Minimalista de auto-corrección */}
        <label
          className="auto-resolve-toggle"
          title="Normaliza automáticamente tablas escritas en minúsculas para que MySQL no falle"
        >
          <input
            type="checkbox"
            checked={autoResolverTablas}
            onChange={(e) => setAutoResolverTablas(e.target.checked)}
          />
          <span className="toggle-slider" />
          <span className="toggle-label">Auto-mayúsculas (MySQL)</span>
        </label>
      </div>

      {/* Barra de Herramientas Minimalista */}
      <div className="editor-toolbar">
        {/* Lado Izquierdo: Menú desplegable elegante de plantillas */}
        <div className="toolbar-snippets-group">
          <div className="snippets-select-box">
            <span className="snippets-select-label">Plantillas:</span>
            <select
              className="snippets-select"
              defaultValue=""
              onChange={(e) => {
                cargarPlantilla(e.target.value);
                e.target.value = "";
              }}
            >
              <option value="" disabled>Seleccionar estructura...</option>
              <option value="procedimiento">Procedimiento Almacenado</option>
              <option value="funcion">Función Escalar</option>
              <option value="trigger">Trigger (Disparador)</option>
              <option value="cursor">Cursor / Bloque</option>
              <option value="join_recoleccion">JOIN Recolección (Rutas + Zonas + Contenedores)</option>
            </select>
          </div>
        </div>

        {/* Lado Derecho: Acciones Compactas y Botón de Ejecutar */}
        <div className="toolbar-actions-group">
          <button
            className="btn-tool"
            onClick={ejecutarFormateo}
            title="Ordenar código y convertir palabras clave y tablas a MAYÚSCULAS"
          >
            <IconSparkles size={12} />
            <span>Ordenar SQL</span>
          </button>

          <button
            className="btn-tool"
            onClick={ejecutarAlternarMayusculas}
            title="Alternar mayúsculas y minúsculas"
          >
            <span>Aa</span>
          </button>

          <button
            className="btn-tool"
            onClick={ejecutarCopiar}
            title="Copiar consulta"
          >
            <IconCopy size={12} />
            <span>Copiar</span>
          </button>

          <button
            className="btn-tool"
            onClick={ejecutarDescargar}
            title="Descargar script .sql"
          >
            <IconDownload size={12} />
          </button>

          <button
            className="btn-tool btn-tool-ghost-danger"
            onClick={() => setSqlQuery("")}
            title="Limpiar editor"
          >
            <IconTrash size={12} />
          </button>

          <div className="toolbar-divider" />

          {/* Botón Primario Minimalista */}
          <button
            className={`btn-ejecutar ${cargando ? "btn-ejecutar-cargando" : ""}`}
            onClick={onEjecutar}
            disabled={cargando}
            title="Ejecutar consulta (Ctrl + Enter)"
          >
            {cargando ? (
              <span className="spinner-icono" />
            ) : (
              <IconPlay size={11} />
            )}
            <span>Ejecutar</span>
            <kbd className="kbd-shortcut">Ctrl ↵</kbd>
          </button>
        </div>
      </div>

      {/* Editor y Números de Línea */}
      <div className="editor-textarea-wrapper">
        <div ref={lineNumbersRef} className="editor-line-numbers">
          {Array.from({ length: lineasTotales }).map((_, i) => (
            <div key={i} className="line-number-item">
              {i + 1}
            </div>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          className="editor-textarea"
          value={sqlQuery}
          onChange={(e) => setSqlQuery(e.target.value)}
          onKeyDown={manejarTeclas}
          onScroll={manejarScroll}
          spellCheck={false}
          placeholder={textoMuestra}
        />
      </div>
    </div>
  );
};
