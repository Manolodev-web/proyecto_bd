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

  const ejecutarCursorDesgaste = () => {
    setDatosContenedores([
      { id: 101, zona: "Sopocachi", estado: "BUENO", desgaste: "12%", saturacion: "45%" },
      { id: 102, zona: "Calacoto", estado: "LLENO", desgaste: "88%", saturacion: "95%" },
      { id: 103, zona: "Miraflores", estado: "MANTENIMIENTO", desgaste: "65%", saturacion: "10%" },
      { id: 104, zona: "San Pedro", estado: "DAÑADO", desgaste: "90%", saturacion: "70%" },
    ]);
    setMensajeAccion("✅ Cursor 'cr_reporte_desgaste_contenedores' ejecutado correctamente.");
  };

  const ejecutarReasignacion = () => {
    if (!idContenedor || !nuevaRuta) {
      alert("Por favor ingresa un ID de Contenedor y una Nueva Ruta Destino.");
      return;
    }
    setMensajeAccion(` Procedimiento 'sp_reasignar_contenedor' ejecutado: Contenedor #${idContenedor} movido a la Ruta #${nuevaRuta}.`);
  };

  const contenedoresFiltrados = datosContenedores
    ? datosContenedores.filter(c => estadoFiltro === "TODOS" || c.estado === estadoFiltro)
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Tarjeta Superior de Filtro y Operaciones */}
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
          Objetos de BD: <code>sp_reasignar_contenedor</code>, <code>cr_reporte_desgaste_contenedores</code>, <code>fn_indice_saturacion_ruta</code>
        </p>

        {/* Barra de Acciones Rápidas */}
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
            📋 Ejecutar Cursor de Desgaste
          </button>
        </div>

        {mensajeAccion && (
          <div style={{ marginTop: "12px", padding: "8px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", fontSize: "13px", color: "#166534" }}>
            {mensajeAccion}
          </div>
        )}
      </div>

      {/* Espacio de Trabajo: Tabla de Datos Interactiva */}
      <div style={{
        background: "var(--color-bg-secondary, #ffffff)",
        padding: "24px",
        borderRadius: "12px",
        border: "1px solid var(--color-borde, #cbd5e1)",
        minHeight: "420px",
        display: "flex",
        flexDirection: "column",
      }}>
        <h4 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: 700 }}>
          📊 Padrón de Contenedores y Matriz de Reasignación
        </h4>

        {!datosContenedores ? (
          <div style={{ margin: "auto", textAlign: "center" }}>
            <div style={{ fontSize: "44px", marginBottom: "12px" }}>📊</div>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--color-texto-muted, #64748b)", maxWidth: "520px" }}>
              Haz clic en <strong>"Ejecutar Cursor de Desgaste"</strong> para cargar los datos procesados por la base de datos y mostrarlos en esta tabla.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#64748b" }}>
                  <th style={{ padding: "10px" }}>ID Contenedor</th>
                  <th style={{ padding: "10px" }}>Zona</th>
                  <th style={{ padding: "10px" }}>Estado</th>
                  <th style={{ padding: "10px" }}>Desgaste</th>
                  <th style={{ padding: "10px" }}>Saturación</th>
                </tr>
              </thead>
              <tbody>
                {contenedoresFiltrados.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px", fontWeight: 600 }}>#{c.id}</td>
                    <td style={{ padding: "10px" }}>{c.zona}</td>
                    <td style={{ padding: "10px" }}>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 600,
                        background: c.estado === "BUENO" ? "#dcfce7" : c.estado === "LLENO" ? "#fee2e2" : "#fef3c7",
                        color: c.estado === "BUENO" ? "#166534" : c.estado === "LLENO" ? "#991b1b" : "#92400e"
                      }}>
                        {c.estado}
                      </span>
                    </td>
                    <td style={{ padding: "10px" }}>{c.desgaste}</td>
                    <td style={{ padding: "10px" }}>{c.saturacion}</td>
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