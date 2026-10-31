import React, { useState } from "react";

interface Props {
  gestor: string;
}

export default function FlotaModule({ gestor }: Props) {
  const [idVehiculo, setIdVehiculo] = useState("");
  const [fechaAuditoria, setFechaAuditoria] = useState("");

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
          🚛 Módulo 3: Control Operativo de Flota, Talleres y Contingencias
        </h3>
        <p style={{ margin: 0, fontSize: "12px", color: "var(--color-texto-muted, #64748b)" }}>
          Motor activo: <strong style={{ textTransform: "uppercase", color: "#2563eb" }}>{gestor}</strong> |
          Objetos de BD: <code>sp_baja_vehiculo_y_contingencia</code>, <code>fn_verificar_disponibilidad_vehiculo</code>, <code>cr_auditoria_carga_trabajo_vehiculo</code>
        </p>

        {/* Acciones de Flota */}
        <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="number"
            placeholder="ID Vehículo / Camión..."
            value={idVehiculo}
            onChange={(e) => setIdVehiculo(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid var(--color-borde, #cbd5e1)",
              fontSize: "13px",
              width: "190px",
              background: "var(--color-bg-primary, #ffffff)",
              color: "var(--color-texto, #1e293b)"
            }}
          />
          <input
            type="date"
            value={fechaAuditoria}
            onChange={(e) => setFechaAuditoria(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid var(--color-borde, #cbd5e1)",
              fontSize: "13px",
              background: "var(--color-bg-primary, #ffffff)",
              color: "var(--color-texto, #1e293b)"
            }}
          />
          <button
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              background: "#dc2626",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(220,38,38,0.2)"
            }}
          >
            🚨 Declarar Baja / Enviar a Taller
          </button>
          <button
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            📈 Auditar Kilometraje (Cursor)
          </button>
        </div>
      </div>

      {/* Espacio de Trabajo del Compañero 3 */}
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
        <div style={{ fontSize: "44px", marginBottom: "12px" }}>🛠️</div>
        <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700 }}>
          Tablero Kanban del Parque Automotor y Contingencias
        </h4>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--color-texto-muted, #64748b)", maxWidth: "520px" }}>
          <strong>Compañero 3:</strong> Aquí debes maquetar las columnas de camiones (Disponibles, En Ruta, En Taller), la gráfica de desgaste por cursor y la reasignación automática de rutas por falla mecánica[cite: 20, 24].
        </p>
      </div>
    </div>
  );
}