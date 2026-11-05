import React, { useState } from "react";

interface Props {
  gestor: string;
}

interface ContenedorTramo {
  id_contenedor: number;
  ubicacion: string;
  capacidad: number;
  estado: string;
}

interface TrazabilidadInfo {
  id_ruta: number;
  nombre_ruta: string;
  distancia_km: number;
  placa_vehiculo: string;
  conductor: string;
  total_contenedores: number;
  capacidad_total_litros: number;
}

export default function RutasModule({ gestor }: Props) {
  // Filtros de búsqueda operativa
  const [idRutaBusqueda, setIdRutaBusqueda] = useState("100");
  const [fechaOperativa, setFechaOperativa] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Estados de datos devueltos por la BD
  const [trazabilidad, setTrazabilidad] = useState<TrazabilidadInfo | null>(null);
  const [contenedores, setContenedores] = useState<ContenedorTramo[]>([]);
  const [cargando, setCargando] = useState(false);

  // Mensajes de retroalimentación
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  const handleConsultar = async () => {
    if (!idRutaBusqueda) {
      setMensajeError("Ingresa un ID de Ruta válido para consultar.");
      return;
    }

    setCargando(true);
    setMensajeError(null);
    setMensajeExito(null);

    const entorno = localStorage.getItem("recoleccion_entorno") || "docker";

    try {
      // 1. Procedimiento Coordinador: sp_consultar_trazabilidad_ruta
      const resProc = await fetch("http://localhost:4000/api/rutas/trazabilidad", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-database-env": entorno,
          "x-database-engine": gestor,
        },
        body: JSON.stringify({
          gestor,
          entorno,
          id_ruta: Number(idRutaBusqueda),
          fecha: fechaOperativa,
        }),
      });

      const dataProc = await resProc.json();
      if (!resProc.ok || !dataProc.exito) {
        throw new Error(dataProc.error || "No se encontró la ruta en la base de datos.");
      }

      setTrazabilidad(dataProc.datos);

      // 2. Función con Cursor Explícito: cr_recorrer_contenedores_ruta
      const resCursor = await fetch("http://localhost:4000/api/rutas/contenedores-tramo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-database-env": entorno,
          "x-database-engine": gestor,
        },
        body: JSON.stringify({
          gestor,
          entorno,
          id_ruta: Number(idRutaBusqueda),
        }),
      });

      const dataCursor = await resCursor.json();
      if (resCursor.ok && dataCursor.exito) {
        setContenedores(dataCursor.datos || []);
      }

      setMensajeExito(`Diagnóstico de la Ruta #${idRutaBusqueda} recuperado exitosamente.`);
    } catch (err: any) {
      setTrazabilidad(null);
      setContenedores([]);
      setMensajeError(err.message || "Error al consultar trazabilidad de ruta.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* TARJETA SUPERIOR: PANEL DE CONSULTA Y ESTADO */}
      <div
        style={{
          background: "var(--color-bg-secondary, #ffffff)",
          padding: "20px 24px",
          borderRadius: "12px",
          border: "1px solid var(--color-borde, #e2e8f0)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <h3
          style={{
            margin: "0 0 6px 0",
            fontSize: "17px",
            fontWeight: 700,
            color: "var(--color-texto, #0F2C59)",
          }}
        >
          📍 Módulo 1: Centro de Despacho y Trazabilidad GIS (La Paz)
        </h3>
        <p style={{ margin: 0, fontSize: "12px", color: "var(--color-texto-muted, #64748b)" }}>
          Motor activo: <strong style={{ textTransform: "uppercase", color: "#2563eb" }}>{gestor}</strong> |{" "}
          Objetos conectados: <code>sp_consultar_trazabilidad_ruta</code>, <code>cr_recorrer_contenedores_ruta</code>
        </p>

        {/* Barra de Filtros */}
        <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="number"
            placeholder="ID Ruta (ej. 100)..."
            value={idRutaBusqueda}
            onChange={(e) => setIdRutaBusqueda(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid var(--color-borde, #cbd5e1)",
              fontSize: "13px",
              width: "180px",
              background: "var(--color-bg-primary, #ffffff)",
              color: "var(--color-texto, #1e293b)",
            }}
          />

          <input
            type="date"
            value={fechaOperativa}
            onChange={(e) => setFechaOperativa(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid var(--color-borde, #cbd5e1)",
              fontSize: "13px",
              background: "var(--color-bg-primary, #ffffff)",
              color: "var(--color-texto, #1e293b)",
            }}
          />

          <button
            onClick={handleConsultar}
            disabled={cargando}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(37,99,235,0.2)",
            }}
          >
            {cargando ? "Consultando..." : "🔍 Consultar Trazabilidad"}
          </button>
        </div>

        {/* Alertas de Notificación */}
        {mensajeError && (
          <div
            style={{
              marginTop: "12px",
              padding: "10px 14px",
              borderRadius: "8px",
              background: "#fee2e2",
              color: "#b91c1c",
              fontSize: "12px",
            }}
          >
            ❌ {mensajeError}
          </div>
        )}
        {mensajeExito && (
          <div
            style={{
              marginTop: "12px",
              padding: "10px 14px",
              borderRadius: "8px",
              background: "#dcfce7",
              color: "#15803d",
              fontSize: "12px",
            }}
          >
            ✓ {mensajeExito}
          </div>
        )}
      </div>

      {/* CUERPO: GRILLA DE DIAGNÓSTICO OPERATIVO */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* PANEL IZQUIERDO: RESUMEN DE TRAZABILIDAD (PROCEDIMIENTO + 3 FUNCIONES) */}
        <div
          style={{
            background: "var(--color-bg-secondary, #ffffff)",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid var(--color-borde, #e2e8f0)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h4
            style={{
              margin: "0 0 14px 0",
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--color-texto, #0F2C59)",
            }}
          >
            🗺️ Hoja de Ruta y Diagnóstico Operativo
          </h4>

          {trazabilidad ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
              <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <strong>Ruta:</strong> #{trazabilidad.id_ruta} - {trazabilidad.nombre_ruta}
              </div>

              <div>
                <strong>Vehículo de Turno:</strong>{" "}
                <span style={{ color: "#2563eb", fontWeight: 700 }}>
                  {trazabilidad.placa_vehiculo || "SIN ASIGNAR"}
                </span>
              </div>

              <div>
                <strong>Conductor Asignado:</strong>{" "}
                <span>{trazabilidad.conductor || "Sin conductor"}</span>
                <span style={{ marginLeft: "8px", fontSize: "11px", color: "#059669", fontFamily: "monospace" }}>
                  (fn_obtener_conductor_ruta)
                </span>
              </div>

              <div>
                <strong>Puntos de Acopio:</strong>{" "}
                <strong>{trazabilidad.total_contenedores} contenedores</strong>
                <span style={{ marginLeft: "8px", fontSize: "11px", color: "#2563eb", fontFamily: "monospace" }}>
                  (fn_contar_contenedores_ruta)
                </span>
              </div>

              <div>
                <strong>Carga Estimada de Basura:</strong>{" "}
                <strong style={{ color: "#d97706" }}>
                  {Number(trazabilidad.capacidad_total_litros || 0).toLocaleString()} Litros
                </strong>
                <span style={{ marginLeft: "8px", fontSize: "11px", color: "#d97706", fontFamily: "monospace" }}>
                  (fn_calcular_capacidad_ruta)
                </span>
              </div>

              <div style={{ marginTop: "8px", padding: "10px", background: "#eff6ff", borderRadius: "8px", fontSize: "12px", color: "#1e40af" }}>
                ℹ️ <em>Datos orquestados mediante el procedimiento almacenado <code>sp_consultar_trazabilidad_ruta</code>.</em>
              </div>
            </div>
          ) : (
            <div
              style={{
                margin: "auto",
                padding: "60px 10px",
                textAlign: "center",
                color: "var(--color-texto-muted, #94a3b8)",
                fontSize: "13px",
              }}
            >
              <div style={{ fontSize: "40px", marginBottom: "8px" }}>🗺️</div>
              Ingresa un ID de ruta (ej. 100) y haz clic en <strong>"Consultar Trazabilidad"</strong>.
            </div>
          )}
        </div>

        {/* PANEL DERECHO: PUNTOS EN EL TRAMO (RECORRIDOS CON CURSOR EXPLÍCITO) */}
        <div
          style={{
            background: "var(--color-bg-secondary, #ffffff)",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid var(--color-borde, #e2e8f0)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h4
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: 700,
                color: "var(--color-texto, #0F2C59)",
              }}
            >
              📦 Contenedores en el Tramo (Cursor)
            </h4>
            {contenedores.length > 0 && (
              <span
                style={{
                  fontSize: "11px",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: "#f1f5f9",
                  color: "#475569",
                  fontWeight: 600,
                }}
              >
                {contenedores.length} Puntos
              </span>
            )}
          </div>

          {contenedores.length === 0 ? (
            <div
              style={{
                margin: "auto",
                padding: "60px 10px",
                textAlign: "center",
                color: "var(--color-texto-muted, #94a3b8)",
                fontSize: "13px",
              }}
            >
              <div style={{ fontSize: "40px", marginBottom: "8px" }}>📦</div>
              Sin datos de tramo. Los puntos se leerán fila por fila con el cursor explícito <code>cr_recorrer_contenedores_ruta</code>.
            </div>
          ) : (
            <div
              style={{
                maxHeight: "340px",
                overflowY: "auto",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#f8fafc", color: "#64748b" }}>
                    <th style={{ padding: "8px 10px" }}>ID</th>
                    <th style={{ padding: "8px 10px" }}>Ubicación</th>
                    <th style={{ padding: "8px 10px" }}>Capacidad</th>
                    <th style={{ padding: "8px 10px" }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {contenedores.map((c) => (
                    <tr key={c.id_contenedor} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "#2563eb" }}>
                        #{c.id_contenedor}
                      </td>
                      <td style={{ padding: "8px 10px" }}>{c.ubicacion}</td>
                      <td style={{ padding: "8px 10px", fontFamily: "monospace" }}>{c.capacidad} L</td>
                      <td style={{ padding: "8px 10px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: 700,
                            background:
                              c.estado === "BUENO"
                                ? "#dcfce7"
                                : c.estado === "DANADO"
                                ? "#fee2e2"
                                : "#fef3c7",
                            color:
                              c.estado === "BUENO"
                                ? "#166534"
                                : c.estado === "DANADO"
                                ? "#991b1b"
                                : "#92400e",
                          }}
                        >
                          {c.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}