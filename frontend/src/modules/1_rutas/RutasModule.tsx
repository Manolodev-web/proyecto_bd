import React, { useState } from "react";

interface Props {
  gestor: string;
}

export default function RutasModule({ gestor }: Props) {
  const [idRuta, setIdRuta] = useState("");
  const [ciOperario, setCiOperario] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Tarjeta Superior de Filtro */}
      <div style={{
        background: "var(--color-bg-secondary, #ffffff)",
        padding: "20px 24px",
        borderRadius: "12px",
        border: "1px solid var(--color-borde, #e2e8f0)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
      }}>
        <h3 style={{ margin: "0 0 6px 0", fontSize: "17px", fontWeight: 700, color: "var(--color-texto, #0F2C59)" }}>
          📍 Módulo 1: Centro de Despacho y Trazabilidad GIS (La Paz)
        </h3>
        <p style={{ margin: 0, fontSize: "12px", color: "var(--color-texto-muted, #64748b)" }}>
          Motor activo: <strong style={{ textTransform: "uppercase", color: "#2563eb" }}>{gestor}</strong> |
          Funciones conectadas: <code>fn_rastrear_ruta_operativa</code>, <code>sp_iniciar_operativo_recoleccion</code>
        </p>

        {/* Buscador Dual */}
        <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="number"
            placeholder="Buscar por ID Ruta (ej. 102)..."
            value={idRuta}
            onChange={(e) => setIdRuta(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid var(--color-borde, #cbd5e1)",
              fontSize: "13px",
              width: "220px",
              background: "var(--color-bg-primary, #ffffff)",
              color: "var(--color-texto, #1e293b)"
            }}
          />
          <input
            type="number"
            placeholder="Buscar por CI Operario..."
            value={ciOperario}
            onChange={(e) => setCiOperario(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid var(--color-borde, #cbd5e1)",
              fontSize: "13px",
              width: "220px",
              background: "var(--color-bg-primary, #ffffff)",
              color: "var(--color-texto, #1e293b)"
            }}
          />
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
            🔍 Trazar Ruta en Mapa
          </button>
        </div>
      </div>

      {/* Área del Mapa / Espacio de Trabajo del Compañero 1 */}
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
        <div style={{ fontSize: "44px", marginBottom: "12px" }}>🗺️</div>
        <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700 }}>
          Lienzo del Mapa Interactivo (La Paz)
        </h4>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--color-texto-muted, #64748b)", maxWidth: "480px" }}>
          <strong>Compañero 1:</strong> Aquí debes renderizar el mapa (Leaflet / OpenStreetMap) de los macrodistritos de La Paz y el modal para ejecutar <code>sp_iniciar_operativo_recoleccion</code>.
        </p>
      </div>
    </div>
  );
}