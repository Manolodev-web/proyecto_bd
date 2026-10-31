import React, { useState, useMemo } from "react";
import type { ResultadoConsulta, HistorialItem } from "../types";
import {
  formatearCelda,
  exportToCsv,
  exportToJson,
  copyTableToTsv,
} from "../utils/formatters";
import { IconSearch, IconStar, IconCopy, IconDownload } from "./Icons";

interface ResultsTableProps {
  resultado: ResultadoConsulta | null;
  error: string | null;
  gestor: string;
  historial: HistorialItem[];
  favoritas: HistorialItem[];
  onToggleFavorita: (item: HistorialItem) => void;
  onCargarConsulta: (sql: string) => void;
  onLimpiarHistorial: () => void;
  onEliminarHistorialItem: (id: string) => void;
  onMostrarToast: (msg: string, tipo?: "exito" | "info" | "advertencia" | "error") => void;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  resultado,
  error,
  gestor,
  historial,
  favoritas,
  onToggleFavorita,
  onCargarConsulta,
  onLimpiarHistorial,
  onEliminarHistorialItem,
  onMostrarToast,
}) => {
  const [pestana, setPestana] = useState<"resultados" | "historial" | "favoritas">("resultados");
  const [filtroTexto, setFiltroTexto] = useState<string>("");
  const [columnaOrden, setColumnaOrden] = useState<string | null>(null);
  const [ordenAsc, setOrdenAsc] = useState<boolean>(true);
  const [filasPorPagina, setFilasPorPagina] = useState<number>(25);
  const [paginaActual, setPaginaActual] = useState<number>(1);

  const datosOriginales = resultado?.datos;
  const columnas =
    datosOriginales && datosOriginales.length > 0 ? Object.keys(datosOriginales[0]) : [];

  const datosFiltradosYOrdenados = useMemo(() => {
    if (!datosOriginales) return [];
    let filtrados = datosOriginales;

    if (filtroTexto.trim()) {
      const q = filtroTexto.toLowerCase();
      filtrados = filtrados.filter((fila) =>
        Object.values(fila).some((val) =>
          formatearCelda(val).toLowerCase().includes(q)
        )
      );
    }

    if (columnaOrden) {
      filtrados = [...filtrados].sort((a, b) => {
        const valA = a[columnaOrden];
        const valB = b[columnaOrden];

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === "number" && typeof valB === "number") {
          return ordenAsc ? valA - valB : valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return ordenAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return filtrados;
  }, [datosOriginales, filtroTexto, columnaOrden, ordenAsc]);

  const totalPaginas =
    filasPorPagina > 0
      ? Math.max(1, Math.ceil(datosFiltradosYOrdenados.length / filasPorPagina))
      : 1;

  const datosPaginados = useMemo(() => {
    if (filasPorPagina <= 0) return datosFiltradosYOrdenados;
    const inicio = (paginaActual - 1) * filasPorPagina;
    return datosFiltradosYOrdenados.slice(inicio, inicio + filasPorPagina);
  }, [datosFiltradosYOrdenados, paginaActual, filasPorPagina]);

  const manejarOrdenar = (col: string) => {
    if (columnaOrden === col) {
      setOrdenAsc(!ordenAsc);
    } else {
      setColumnaOrden(col);
      setOrdenAsc(true);
    }
    setPaginaActual(1);
  };

  const handleExportCsv = () => {
    if (datosFiltradosYOrdenados.length === 0) return;
    exportToCsv(datosFiltradosYOrdenados, `resultado_${gestor}`);
    onMostrarToast("CSV exportado", "exito");
  };

  const handleExportJson = () => {
    if (datosFiltradosYOrdenados.length === 0) return;
    exportToJson(datosFiltradosYOrdenados, `resultado_${gestor}`);
    onMostrarToast("JSON exportado", "exito");
  };

  const handleCopyTsv = async () => {
    if (datosFiltradosYOrdenados.length === 0) return;
    const ok = await copyTableToTsv(datosFiltradosYOrdenados);
    if (ok) {
      onMostrarToast("Copiado al portapapeles (formato Excel)", "exito");
    }
  };

  return (
    <div className="results-panel-container">
      {/* Barra de Pestañas Segmentada */}
      <div className="results-tabs-bar">
        <div className="segmented-control">
          <button
            className={`segmented-btn ${
              pestana === "resultados" ? "segmented-btn-active" : ""
            }`}
            onClick={() => setPestana("resultados")}
          >
            <span>Resultados</span>
            {resultado && (
              <span className="count-tag">
                {datosFiltradosYOrdenados.length}
              </span>
            )}
          </button>

          <button
            className={`segmented-btn ${
              pestana === "historial" ? "segmented-btn-active" : ""
            }`}
            onClick={() => setPestana("historial")}
          >
            <span>Historial</span>
            <span className="count-tag">{historial.length}</span>
          </button>

          <button
            className={`segmented-btn ${
              pestana === "favoritas" ? "segmented-btn-active" : ""
            }`}
            onClick={() => setPestana("favoritas")}
          >
            <span>Favoritas</span>
            <span className="count-tag">{favoritas.length}</span>
          </button>
        </div>

        {resultado && !error && (
          <div className="query-stats-pill">
            <span className="stats-dot" />
            <span>
              {resultado.totalFilas} filas • {resultado.tiempoMs}ms
            </span>
          </div>
        )}

        {/* Acciones de la tabla */}
        {pestana === "resultados" && Boolean(datosOriginales && datosOriginales.length > 0) && (
          <div className="results-actions-group">
            {/* Buscador */}
            <div className="results-search-box">
              <IconSearch size={12} className="search-icon-svg" />
              <input
                type="text"
                className="results-search-input"
                placeholder="Buscar en datos..."
                value={filtroTexto}
                onChange={(e) => {
                  setFiltroTexto(e.target.value);
                  setPaginaActual(1);
                }}
              />
              {filtroTexto && (
                <button
                  className="search-clear-btn"
                  onClick={() => setFiltroTexto("")}
                >
                  ×
                </button>
              )}
            </div>

            {/* Paginación selector */}
            <div className="pagination-selector">
              <select
                className="pagination-select"
                value={filasPorPagina}
                onChange={(e) => {
                  setFilasPorPagina(Number(e.target.value));
                  setPaginaActual(1);
                }}
              >
                <option value={10}>10 / pág</option>
                <option value={25}>25 / pág</option>
                <option value={50}>50 / pág</option>
                <option value={100}>100 / pág</option>
                <option value={0}>Todas</option>
              </select>
            </div>

            {/* Exportar */}
            <div className="export-buttons-group">
              <button
                className="btn-export"
                onClick={handleExportCsv}
                title="Exportar a CSV"
              >
                <IconDownload size={11} />
                <span>CSV</span>
              </button>
              <button
                className="btn-export"
                onClick={handleExportJson}
                title="Exportar a JSON"
              >
                <span>JSON</span>
              </button>
              <button
                className="btn-export"
                onClick={handleCopyTsv}
                title="Copiar para Excel"
              >
                <IconCopy size={11} />
                <span>Excel</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Contenido Principal */}
      <div className="results-content-area">
        {/* Banner de Error Minimalista */}
        {error && (
          <div className="error-banner">
            <div className="error-header">
              <span className="error-bullet" />
              <strong>Error en {gestor.toUpperCase()}</strong>
            </div>
            <div className="error-message-body">{error}</div>

            {(error.toLowerCase().includes("doesn't exist") ||
              error.toLowerCase().includes("no existe")) && (
              <div className="error-diagnostic-tip">
                <strong>Diagnóstico:</strong> Los nombres de tablas son sensibles a mayúsculas en este motor.
                Mantén activo el interruptor <code>Auto-mayúsculas</code> o pulsa <code>Ordenar SQL</code>.
              </div>
            )}
          </div>
        )}

        {/* Pestaña: RESULTADOS */}
        {!error && pestana === "resultados" && (
          <>
            {!resultado ? (
              <div className="results-empty-placeholder">
                <span className="placeholder-prompt">_</span>
                <div className="placeholder-title">Consola SQL Lista</div>
                <p className="placeholder-desc">
                  Ejecuta una sentencia con <kbd className="kbd-pill">Ctrl ↵</kbd> o haz doble clic en una tabla para consultar sus registros.
                </p>
              </div>
            ) : (!datosOriginales || datosOriginales.length === 0) ? (
              <div className="results-success-nodata">
                <span className="success-bullet" />
                <span>Sentencia ejecutada correctamente en {gestor.toUpperCase()} (0 filas devueltas).</span>
              </div>
            ) : (
              <div className="table-responsive-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="th-row-num">#</th>
                      {columnas.map((col) => {
                        const estaOrdenada = columnaOrden === col;
                        return (
                          <th
                            key={col}
                            className={`th-data ${estaOrdenada ? "th-sorted" : ""}`}
                            onClick={() => manejarOrdenar(col)}
                            title={`Ordenar por "${col}"`}
                          >
                            <div className="th-content">
                              <span>{col}</span>
                              <span className="sort-arrow">
                                {estaOrdenada ? (ordenAsc ? "↑" : "↓") : ""}
                              </span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {datosPaginados.map((fila, index) => {
                      const numeroFila =
                        filasPorPagina > 0
                          ? (paginaActual - 1) * filasPorPagina + index + 1
                          : index + 1;

                      return (
                        <tr key={index} className="data-table-row">
                          <td className="td-row-num">{numeroFila}</td>
                          {columnas.map((col) => {
                            const valor = fila[col];
                            const esNull = valor === null || valor === undefined;
                            const esNumero = typeof valor === "number";

                            return (
                              <td
                                key={col}
                                className={`td-data ${esNumero ? "td-number" : ""}`}
                              >
                                {esNull ? (
                                  <span className="null-badge">null</span>
                                ) : (
                                  formatearCelda(valor)
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginador Inferior */}
            {datosFiltradosYOrdenados.length > 0 && filasPorPagina > 0 && (
              <div className="pagination-bar">
                <span className="pagination-info">
                  {Math.min((paginaActual - 1) * filasPorPagina + 1, datosFiltradosYOrdenados.length)}–
                  {Math.min(paginaActual * filasPorPagina, datosFiltradosYOrdenados.length)} de {datosFiltradosYOrdenados.length}
                </span>

                <div className="pagination-controls">
                  <button
                    className="btn-page"
                    disabled={paginaActual === 1}
                    onClick={() => setPaginaActual((p) => p - 1)}
                    title="Anterior"
                  >
                    ‹
                  </button>
                  <span className="page-current">
                    {paginaActual} / {totalPaginas}
                  </span>
                  <button
                    className="btn-page"
                    disabled={paginaActual >= totalPaginas}
                    onClick={() => setPaginaActual((p) => p + 1)}
                    title="Siguiente"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Pestaña: HISTORIAL */}
        {pestana === "historial" && (
          <div className="history-tab-container">
            <div className="history-header-actions">
              <span className="history-title">Historial de Consultas</span>
              {historial.length > 0 && (
                <button
                  className="btn-tool btn-tool-ghost-danger"
                  onClick={onLimpiarHistorial}
                >
                  Vaciar
                </button>
              )}
            </div>

            {historial.length === 0 ? (
              <div className="history-empty">
                No hay consultas registradas en esta sesión.
              </div>
            ) : (
              <div className="history-list">
                {historial.map((item) => (
                  <div key={item.id} className="history-card">
                    <div className="history-card-header">
                      <div className="history-meta">
                        <span className="history-badge-motor">
                          {item.gestor.toUpperCase()}
                        </span>
                        <span className="history-time">{item.fecha}</span>
                        {item.tiempoMs !== undefined && (
                          <span className="history-duration">
                            {item.tiempoMs}ms
                          </span>
                        )}
                        {item.filas !== undefined && (
                          <span className="history-rows">
                            {item.filas} filas
                          </span>
                        )}
                      </div>

                      <div className="history-card-actions">
                        <button
                          className={`btn-star ${
                            item.esFavorita ? "btn-star-active" : ""
                          }`}
                          onClick={() => onToggleFavorita(item)}
                          title="Guardar en Favoritas"
                        >
                          <IconStar filled={item.esFavorita} size={13} />
                        </button>
                        <button
                          className="btn-history-load"
                          onClick={() => onCargarConsulta(item.sql)}
                        >
                          Cargar
                        </button>
                        <button
                          className="btn-history-delete"
                          onClick={() => onEliminarHistorialItem(item.id)}
                          title="Eliminar"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    <pre
                      className="history-sql-code"
                      onClick={() => onCargarConsulta(item.sql)}
                      title="Clic para cargar en editor"
                    >
                      {item.sql}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pestaña: FAVORITAS */}
        {pestana === "favoritas" && (
          <div className="history-tab-container">
            <div className="history-header-actions">
              <span className="history-title">Consultas Guardadas</span>
            </div>

            {favoritas.length === 0 ? (
              <div className="history-empty">
                Sin consultas guardadas. Haz clic en la estrella de cualquier consulta del historial para fijarla aquí.
              </div>
            ) : (
              <div className="history-list">
                {favoritas.map((item) => (
                  <div key={item.id} className="history-card">
                    <div className="history-card-header">
                      <div className="history-meta">
                        <span className="history-badge-motor">
                          {item.gestor.toUpperCase()}
                        </span>
                        <span className="history-time">{item.fecha}</span>
                      </div>

                      <div className="history-card-actions">
                        <button
                          className="btn-star btn-star-active"
                          onClick={() => onToggleFavorita(item)}
                          title="Quitar de Favoritas"
                        >
                          <IconStar filled size={13} />
                        </button>
                        <button
                          className="btn-history-load"
                          onClick={() => onCargarConsulta(item.sql)}
                        >
                          Cargar
                        </button>
                      </div>
                    </div>

                    <pre
                      className="history-sql-code"
                      onClick={() => onCargarConsulta(item.sql)}
                    >
                      {item.sql}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
