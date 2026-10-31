import React, { useState } from "react";

interface Props {
  gestor: string;
}

export default function ContenedoresModule({ gestor }: Props) {
  const [idContenedor, setIdContenedor] = useState("");
  const [nuevaRuta, setNuevaRuta] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("TODOS");

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
      </div>

      {/* Espacio de Trabajo del Compañero 2 */}
      <div style={{
        background: "var(--color-bg-secondary, #ffffff)",
        padding: "40px 24px",
        borderRadius: "12px",
        border: "2px dashed var(--color-borde, #cbd5e1)",
        minHeight: "420px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center"
      }}>
        <div style={{ fontSize: "44px", marginBottom: "12px" }}>📊</div>
        <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700 }}>
          Padrón de Contenedores y Matriz de Reasignación
        </h4>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--color-texto-muted, #64748b)", maxWidth: "520px" }}>
          <strong>Compañero 2:</strong> Aquí debes renderizar la tabla de contenedores procesada por el cursor <code>cr_reporte_desgaste_contenedores</code> y el modal con el procedimiento <code>sp_reasignar_contenedor</code>.
        </p>
      </div>
    </div>
  );
}