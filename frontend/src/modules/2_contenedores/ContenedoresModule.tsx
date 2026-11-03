import React, { useState } from "react";

interface Props {
  gestor: string;
}

export default function ContenedoresModule({ gestor }: Props) {
  const [idContenedor, setIdContenedor] = useState("");
  const [nuevaRuta, setNuevaRuta] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("TODOS");

  const [datosContenedores, setDatosContenedores] = useState<any[] | null>(null);
  const [mensajeAccion, setMensajeAccion] = useState("");
  const [cargando, setCargando] = useState(false);

  // Consulta real al cursor en base de datos
  const ejecutarCursorDesgaste = async () => {
    setCargando(true);
    setMensajeAccion("");
    const entorno = localStorage.getItem("recoleccion_entorno") || "docker";

    try {
      const res = await fetch(`http://localhost:4000/api/contenedores/desgaste/${gestor}`, {
        headers: {
          "x-database-env": entorno,
          "x-database-engine": gestor,
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.mensaje || "Error al obtener desgaste");
      }

      setDatosContenedores(json.data);
      setMensajeAccion(`✅ Cursor 'cr_reporte_desgaste_contenedores' ejecutado: ${json.data.length} contenedores leídos desde la BD.`);
    } catch (err: any) {
      setMensajeAccion(`❌ Error: ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  // Ejecución real del procedimiento sp_reasignar_contenedor
  const ejecutarReasignacion = async () => {
    if (!idContenedor || !nuevaRuta) {
      alert("Por favor ingresa un ID de Contenedor y una Nueva Ruta Destino.");
      return;
    }
    const entorno = localStorage.getItem("recoleccion_entorno") || "docker";

    try {
      const res = await fetch("http://localhost:4000/api/contenedores/reasignar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-database-env": entorno,
          "x-database-engine": gestor,
        },
        body: JSON.stringify({
          gestor,
          idContenedor: Number(idContenedor),
          nuevaRuta: Number(nuevaRuta),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.mensaje || "Fallo en reasignación");
      }

      setMensajeAccion(`✅ Procedimiento 'sp_reasignar_contenedor' ejecutado: Contenedor #${idContenedor} movido a la Ruta #${nuevaRuta}.`);
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
      <div style={{
        background: "var(--color-bg-secondary, #ffffff)",
        padding: "20px 24px",
        borderRadius: "12px",
        border: "1px solid var(--color-borde, #e2e8f0)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
      }}>
        <h3 style={{ margin: "0 0 6px 0", fontSize: "17px", fontWeight: 700, color: "var(--color-texto, #0F2C59)" }}>
          🗑️ Módulo 2: Gestión Inteligente y Reubicación de Contenedores
        </h3>
        <p style={{ margin: 0, fontSize: "12px", color: "var(--color-texto-muted, #64748b)" }}>
          Motor activo: <strong style={{ textTransform: "uppercase", color: "#2563eb" }}>{gestor}</strong> |
          Objetos de BD: <code>sp_reasignar_contenedor</code>, <code>cr_reporte_desgaste_contenedores</code>
        </p>

        <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="number"
            placeholder="ID Contenedor..."
            value={idContenedor}
            onChange={(e) => setIdContenedor(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid var(--color-borde, #cbd5e1)",
              fontSize: "13px",
              width: "160px",
              background: "var(--color-bg-primary, #ffffff)",
              color: "var(--color-texto, #1e293b)"
            }}
          />
          <input
            type="number"
            placeholder="Nueva Ruta Destino..."
            value={nuevaRuta}
            onChange={(e) => setNuevaRuta(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid var(--color-borde, #cbd5e1)",
              fontSize: "13px",
              width: "180px",
              background: "var(--color-bg-primary, #ffffff)",
              color: "var(--color-texto, #1e293b)"
            }}
          />
          <button
            onClick={ejecutarReasignacion}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              background: "#10b981",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            🔄 Reasignar (SP)
          </button>

          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid var(--color-borde, #cbd5e1)",
              fontSize: "13px",
              background: "var(--color-bg-primary, #ffffff)",
              color: "var(--color-texto, #1e293b)"
            }}
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="BUENO">Bueno</option>
            <option value="DANADO">Dañado</option>
            <option value="MANTENIMIENTO">En Mantenimiento</option>
            <option value="LLENO">Saturado / Lleno</option>
          </select>

          <button
            onClick={ejecutarCursorDesgaste}
            disabled={cargando}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(37,99,235,0.2)"
            }}
          >
            {cargando ? "Consultando BD..." : "📋 Ejecutar Cursor de Desgaste"}
          </button>
        </div>

        {mensajeAccion && (
          <div style={{ marginTop: "12px", padding: "8px 12px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}>
            {mensajeAccion}
          </div>
        )}
      </div>

      <div style={{
        background: "var(--color-bg-secondary, #ffffff)",
        padding: "24px",
        borderRadius: "12px",
        border: "1px solid var(--color-borde, #cbd5e1)",
        minHeight: "360px",
        display: "flex",
        flexDirection: "column",
      }}>
        <h4 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: 700 }}>
          📊 Padrón de Contenedores y Diagnóstico Técnico
        </h4>

        {!datosContenedores ? (
          <div style={{ margin: "auto", textAlign: "center" }}>
            <div style={{ fontSize: "44px", marginBottom: "12px" }}>📊</div>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--color-texto-muted, #64748b)" }}>
              Haz clic en <strong>"Ejecutar Cursor de Desgaste"</strong> para consultar el cursor en PostgreSQL.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#64748b" }}>
                  <th style={{ padding: "10px" }}>ID</th>
                  <th style={{ padding: "10px" }}>Ubicación</th>
                  <th style={{ padding: "10px" }}>Estado</th>
                  <th style={{ padding: "10px" }}>Capacidad</th>
                  <th style={{ padding: "10px" }}>Score Desgaste</th>
                  <th style={{ padding: "10px" }}>Acción Recomendada</th>
                </tr>
              </thead>
              <tbody>
                {contenedoresFiltrados.map((c) => (
                  <tr key={c.id_contenedor} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px", fontWeight: 600 }}>#{c.id_contenedor}</td>
                    <td style={{ padding: "10px" }}>{c.ubicacion}</td>
                    <td style={{ padding: "10px" }}>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 600,
                        background: c.estado === "BUENO" ? "#dcfce7" : c.estado === "DANADO" ? "#fee2e2" : "#fef3c7",
                        color: c.estado === "BUENO" ? "#166534" : c.estado === "DANADO" ? "#991b1b" : "#92400e"
                      }}>
                        {c.estado}
                      </span>
                    </td>
                    <td style={{ padding: "10px" }}>{c.capacidad} L</td>
                    <td style={{ padding: "10px", fontWeight: 700 }}>{c.score_desgaste}%</td>
                    <td style={{ padding: "10px", color: "#2563eb", fontWeight: 600 }}>{c.accion_recomendada}</td>
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