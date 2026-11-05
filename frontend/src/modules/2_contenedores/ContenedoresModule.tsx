import React, { useState } from "react";

interface Props {
  gestor: string;
}

interface ContenedorFila {
  id_contenedor: number;
  id_ruta: number;
  ubicacion: string;
  estado: string;
  capacidad: number;
  total_recolecciones: number;
  volumen_procesado_lts: number;
  diagnostico_mantenimiento: string;
}

export default function ContenedoresModule({ gestor }: Props) {
  // Parámetros de Ruta y Contenedor
  const [idRuta, setIdRuta] = useState("100");
  const [idContenedor, setIdContenedor] = useState("");
  const [nuevoEstado, setNuevoEstado] = useState("EN REPARACION");

  // Filtro opcional por estado
  const [estadoFiltro, setEstadoFiltro] = useState("TODOS");

  // Datos devueltos por la BD
  const [datosContenedores, setDatosContenedores] = useState<ContenedorFila[] | null>(null);
  const [mensajeAccion, setMensajeAccion] = useState("");
  const [cargando, setCargando] = useState(false);

  // 1. Consulta real al cursor explícito filtrando por el ID de Ruta
  const ejecutarCursorDesgaste = async () => {
    setCargando(true);
    setMensajeAccion("");
    const entorno = localStorage.getItem("recoleccion_entorno") || "docker";

    try {
      const queryParams = new URLSearchParams();
      if (idRuta.trim()) queryParams.append("id_ruta", idRuta.trim());
      if (estadoFiltro !== "TODOS") queryParams.append("estado", estadoFiltro);

      const res = await fetch(
        `http://localhost:4000/api/contenedores/desgaste/${gestor}?${queryParams.toString()}`,
        {
          headers: {
            "x-database-env": entorno,
            "x-database-engine": gestor,
          },
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.mensaje || "Error al obtener diagnóstico de contenedores");
      }

      setDatosContenedores(json.data);
      const detalleRuta = idRuta.trim() ? `en la Ruta #${idRuta}` : "en todas las rutas";
      setMensajeAccion(`✅ Cursor 'cr_reporte_desgaste_contenedores': ${json.data.length} contenedores leídos ${detalleRuta}.`);
    } catch (err: any) {
      setMensajeAccion(`❌ Error: ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  // 2. Ejecución del procedimiento sp_actualizar_estado_contenedor (el Trigger hace el INSERT)
  const ejecutarActualizacionEstado = async () => {
    if (!idContenedor || !idRuta) {
      alert("Por favor ingresa el ID del Contenedor y el ID de su Ruta.");
      return;
    }
    const entorno = localStorage.getItem("recoleccion_entorno") || "docker";

    try {
      const res = await fetch("http://localhost:4000/api/contenedores/actualizar-estado", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-database-env": entorno,
          "x-database-engine": gestor,
        },
        body: JSON.stringify({
          gestor,
          idContenedor: Number(idContenedor),
          idRuta: Number(idRuta),
          nuevoEstado,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.mensaje || "Fallo en la actualización de estado");
      }

      setMensajeAccion(`✅ Procedimiento 'sp_actualizar_estado_contenedor': Contenedor #${idContenedor} actualizado a '${nuevoEstado}'. Auditoría registrada vía Trigger.`);
      // Refrescamos automáticamente los contenedores de esa ruta para ver el cambio reflejado
      ejecutarCursorDesgaste();
    } catch (err: any) {
      setMensajeAccion(`❌ Error: ${err.message}`);
    }
  };

  const contenedoresFiltrados = datosContenedores
    ? datosContenedores.filter((c) => estadoFiltro === "TODOS" || c.estado === estadoFiltro)
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* TARJETA SUPERIOR: CONTROL DE RUTA Y OPERACIÓN */}
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
          🗑️ Módulo 2: Gestión de Contenedores y Mantenimiento Técnico
        </h3>
        <p style={{ margin: 0, fontSize: "12px", color: "var(--color-texto-muted, #64748b)" }}>
          Motor activo: <strong style={{ textTransform: "uppercase", color: "#2563eb" }}>{gestor}</strong> |{" "}
          Objetos de BD: <code>sp_actualizar_estado_contenedor</code> (UPDATE), <code>tg_historial_estado_contenedor</code> (INSERT), <code>cr_reporte_desgaste_contenedores</code>
        </p>

        {/* Formulario Integrado: Ruta, Contenedor y Estado */}
        <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
              ID Ruta *
            </label>
            <input
              type="number"
              placeholder="Ej. 100"
              value={idRuta}
              onChange={(e) => setIdRuta(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--color-borde, #cbd5e1)",
                fontSize: "13px",
                width: "120px",
                background: "var(--color-bg-primary, #ffffff)",
                color: "var(--color-texto, #1e293b)",
              }}
            />
          </div>

          <button
            onClick={ejecutarCursorDesgaste}
            disabled={cargando}
            style={{
              marginTop: "16px",
              padding: "8px 18px",
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
            {cargando ? "Leyendo..." : "📋 Consultar Ruta con Cursor"}
          </button>

          <div style={{ height: "30px", width: "1px", background: "#cbd5e1", margin: "16px 6px 0 6px" }} />

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
              # Contenedor
            </label>
            <input
              type="number"
              placeholder="Ej. 1"
              value={idContenedor}
              onChange={(e) => setIdContenedor(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--color-borde, #cbd5e1)",
                fontSize: "13px",
                width: "120px",
                background: "var(--color-bg-primary, #ffffff)",
                color: "var(--color-texto, #1e293b)",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
              Cambiar Estado a:
            </label>
            <select
              value={nuevoEstado}
              onChange={(e) => setNuevoEstado(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--color-borde, #cbd5e1)",
                fontSize: "13px",
                background: "var(--color-bg-primary, #ffffff)",
                color: "var(--color-texto, #1e293b)",
              }}
            >
              <option value="BUENO">BUENO</option>
              <option value="EN REPARACION">EN REPARACION</option>
              <option value="MALO">MALO</option>
            </select>
          </div>

          <button
            onClick={ejecutarActualizacionEstado}
            style={{
              marginTop: "16px",
              padding: "8px 16px",
              borderRadius: "8px",
              background: "#10b981",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ⚙️ Actualizar Estado (SP)
          </button>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
              Filtrar Tabla:
            </label>
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--color-borde, #cbd5e1)",
                fontSize: "13px",
                background: "var(--color-bg-primary, #ffffff)",
                color: "var(--color-texto, #1e293b)",
              }}
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="BUENO">BUENO</option>
              <option value="EN REPARACION">EN REPARACION</option>
              <option value="MALO">MALO</option>
            </select>
          </div>
        </div>

        {mensajeAccion && (
          <div
            style={{
              marginTop: "14px",
              padding: "10px 14px",
              background: mensajeAccion.includes("❌") ? "#fee2e2" : "#f0fdf4",
              border: `1px solid ${mensajeAccion.includes("❌") ? "#fecaca" : "#bbf7d0"}`,
              color: mensajeAccion.includes("❌") ? "#991b1b" : "#166534",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          >
            {mensajeAccion}
          </div>
        )}
      </div>

      {/* TARJETA INFERIOR: PUNTOS DE LA RUTA LEÍDOS CON CURSOR */}
      <div
        style={{
          background: "var(--color-bg-secondary, #ffffff)",
          padding: "24px",
          borderRadius: "12px",
          border: "1px solid var(--color-borde, #cbd5e1)",
          minHeight: "360px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--color-texto, #0F2C59)" }}>
              📊 Padrón de Contenedores en la Ruta #{idRuta || "Todas"}
            </h4>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
              Recorrido secuencial mediante cursor explícito <code>cr_reporte_desgaste_contenedores</code>
            </p>
          </div>

          {datosContenedores && (
            <span
              style={{
                fontSize: "12px",
                padding: "4px 10px",
                borderRadius: "6px",
                background: "#f1f5f9",
                color: "#475569",
                fontWeight: 600,
              }}
            >
              {contenedoresFiltrados.length} Contenedores encontrados
            </span>
          )}
        </div>

        {!datosContenedores ? (
          <div style={{ margin: "auto", textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: "44px", marginBottom: "12px" }}>📊</div>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--color-texto-muted, #64748b)" }}>
              Ingresa el <strong>ID de Ruta</strong> arriba y haz clic en <strong>"Consultar Ruta con Cursor"</strong>.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#f8fafc", color: "#64748b" }}>
                  <th style={{ padding: "10px" }}>ID</th>
                  <th style={{ padding: "10px" }}>Ruta</th>
                  <th style={{ padding: "10px" }}>Ubicación</th>
                  <th style={{ padding: "10px" }}>Capacidad</th>
                  <th style={{ padding: "10px" }}>Estado</th>
                  <th style={{ padding: "10px" }}>Vaciados (ABARCA)</th>
                  <th style={{ padding: "10px" }}>Volumen Acumulado</th>
                  <th style={{ padding: "10px" }}>Diagnóstico de Mantenimiento</th>
                </tr>
              </thead>
              <tbody>
                {contenedoresFiltrados.map((c) => (
                  <tr key={`${c.id_ruta}-${c.id_contenedor}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px", fontWeight: 700, color: "#2563eb" }}>
                      #{c.id_contenedor}
                    </td>
                    <td style={{ padding: "10px", fontWeight: 600 }}>Ruta #{c.id_ruta}</td>
                    <td style={{ padding: "10px" }}>{c.ubicacion}</td>
                    <td style={{ padding: "10px", fontFamily: "monospace" }}>{c.capacidad} L</td>
                    <td style={{ padding: "10px" }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background:
                            c.estado === "BUENO"
                              ? "#dcfce7"
                              : c.estado === "MALO"
                              ? "#fee2e2"
                              : "#fef3c7",
                          color:
                            c.estado === "BUENO"
                              ? "#166534"
                              : c.estado === "MALO"
                              ? "#991b1b"
                              : "#92400e",
                        }}
                      >
                        {c.estado}
                      </span>
                    </td>
                    <td style={{ padding: "10px", fontWeight: 600, color: "#475569" }}>
                      {c.total_recolecciones} vaciados
                    </td>
                    <td style={{ padding: "10px", fontWeight: 600, color: "#d97706" }}>
                      {Number(c.volumen_procesado_lts || 0).toLocaleString()} Lts
                    </td>
                    <td style={{ padding: "10px" }}>
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: "12px",
                          color:
                            c.diagnostico_mantenimiento === "OPERATIVO NORMAL"
                              ? "#059669"
                              : c.diagnostico_mantenimiento === "EN TALLER DE REPARACIÓN"
                              ? "#d97706"
                              : "#dc2626",
                        }}
                      >
                        {c.diagnostico_mantenimiento}
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
  );
}