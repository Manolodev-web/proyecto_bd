import React, { useState, useMemo } from "react";
import { ESQUEMA_BD, LISTA_TABLAS } from "../utils/schema";
import { obtenerSnippet } from "../utils/sqlNormalizer";
import {
  IconSearch,
  IconTable,
  IconKey,
  IconLink,
  IconChevronDown,
  IconChevronRight,
} from "./Icons";

interface SidebarProps {
  onInsertarEnEditor: (texto: string) => void;
  onCargarConsulta: (sql: string) => void;
  gestor: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onInsertarEnEditor,
  onCargarConsulta,
  gestor,
}) => {
  const [busqueda, setBusqueda] = useState<string>("");
  const [tablasAbiertas, setTablasAbiertas] = useState<Record<string, boolean>>({
    EMPLEADO: true,
  });

  const alternarTabla = (nombre: string) => {
    setTablasAbiertas((prev) => ({
      ...prev,
      [nombre]: !prev[nombre],
    }));
  };

  const alternarTodas = (expandir: boolean) => {
    const nuevoEstado: Record<string, boolean> = {};
    for (const t of LISTA_TABLAS) {
      nuevoEstado[t] = expandir;
    }
    setTablasAbiertas(nuevoEstado);
  };

  const tablasFiltradas = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    if (!query) return LISTA_TABLAS;

    return LISTA_TABLAS.filter((nombreTabla) => {
      if (nombreTabla.toLowerCase().includes(query)) return true;
      const info = ESQUEMA_BD[nombreTabla];
      if (info && info.cols.some((col) => col.toLowerCase().includes(query))) {
        return true;
      }
      return false;
    });
  }, [busqueda]);

  return (
    <aside className="app-sidebar">
      {/* Cabecera del Sidebar */}
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <span className="sidebar-title">ESQUEMA</span>
          <span className="sidebar-count-badge">
            {tablasFiltradas.length} tablas
          </span>
        </div>

        {/* Buscador inteligente */}
        <div className="sidebar-search-box">
          <IconSearch size={13} className="search-icon-svg" />
          <input
            type="text"
            className="sidebar-search-input"
            placeholder="Filtrar tablas o columnas..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda ? (
            <button
              className="search-clear-btn"
              onClick={() => setBusqueda("")}
              title="Limpiar"
            >
              ×
            </button>
          ) : (
            <kbd className="search-kbd">/</kbd>
          )}
        </div>

        {/* Acciones de expandir / colapsar */}
        <div className="sidebar-quick-actions">
          <button
            className="sidebar-action-btn"
            onClick={() => alternarTodas(true)}
            title="Expandir todas las tablas"
          >
            Expandir
          </button>
          <button
            className="sidebar-action-btn"
            onClick={() => alternarTodas(false)}
            title="Colapsar todas las tablas"
          >
            Colapsar
          </button>
        </div>
      </div>

      {/* Lista de Tablas */}
      <div className="sidebar-table-list">
        {tablasFiltradas.length === 0 ? (
          <div className="sidebar-empty">
            Sin resultados para &quot;{busqueda}&quot;
          </div>
        ) : (
          tablasFiltradas.map((nombreTabla) => {
            const info = ESQUEMA_BD[nombreTabla];
            const estaAbierta = Boolean(tablasAbiertas[nombreTabla] || busqueda.trim());

            return (
              <div key={nombreTabla} className="table-item-group">
                {/* Fila de la Tabla */}
                <div
                  className={`table-row ${estaAbierta ? "table-row-active" : ""}`}
                  onClick={() => alternarTabla(nombreTabla)}
                  onDoubleClick={() =>
                    onCargarConsulta(obtenerSnippet("select", gestor, nombreTabla))
                  }
                  title={`${info?.description || nombreTabla} (Doble clic para SELECT)`}
                >
                  <div className="table-name-wrapper">
                    <span className="table-chevron">
                      {estaAbierta ? (
                        <IconChevronDown size={11} />
                      ) : (
                        <IconChevronRight size={11} />
                      )}
                    </span>
                    <IconTable size={13} className="table-icon-svg" />
                    <span className="table-name">{nombreTabla}</span>
                  </div>

                  {/* Acciones flotantes en hover */}
                  <div
                    className="table-hover-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="btn-table-action"
                      onClick={() =>
                        onCargarConsulta(obtenerSnippet("select", gestor, nombreTabla))
                      }
                      title="SELECT *"
                    >
                      SELECT
                    </button>
                    <button
                      className="btn-table-action"
                      onClick={() =>
                        onCargarConsulta(obtenerSnippet("count", gestor, nombreTabla))
                      }
                      title="COUNT"
                    >
                      COUNT
                    </button>
                  </div>
                </div>

                {/* Sublista de Columnas */}
                {estaAbierta && info && (
                  <div className="column-list">
                    {info.cols.map((col) => {
                      const esPK = info.pk.includes(col);
                      const esFK = info.fks && col in info.fks;
                      const fkRef = esFK ? info.fks![col] : undefined;

                      return (
                        <div
                          key={col}
                          className="column-item"
                          onClick={() => onInsertarEnEditor(` ${col}`)}
                          title={`Insertar "${col}"${
                            esPK ? " (Clave Primaria)" : ""
                          }${esFK ? ` (FK -> ${fkRef})` : ""}`}
                        >
                          <span className="col-icon">
                            {esPK ? (
                              <IconKey size={11} className="icon-pk-svg" />
                            ) : esFK ? (
                              <IconLink size={11} className="icon-fk-svg" />
                            ) : (
                              <span className="dot-col" />
                            )}
                          </span>
                          <span className={`col-name ${esPK ? "col-pk" : ""}`}>
                            {col}
                          </span>
                          {esPK && <span className="col-tag pk-tag">PK</span>}
                          {esFK && <span className="col-tag fk-tag">FK</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="sidebar-footer">
        <span>17 tablas relacionales</span>
        <span className="sidebar-footer-hint">Doble clic: SELECT</span>
      </div>
    </aside>
  );
};
