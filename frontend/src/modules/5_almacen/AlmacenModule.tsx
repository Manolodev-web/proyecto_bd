import React, { useState } from "react";

interface Props {
  gestor: string;
}

export default function AlmacenModule({ gestor }: Props) {
  const [ciOperario, setCiOperario] = useState("");
  const [turno, setTurno] = useState("MAÑANA");

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
          📦 Módulo 5: Almacenes y Dotación Automatizada de EPPs / Insumos
        </h3>
        <p style={{ margin: 0, fontSize: "12px", color: "var(--color-texto-muted, #64748b)" }}>
          Motor activo: <strong style={{ textTransform: "uppercase", color: "#2563eb" }}>{gestor}</strong> |
          Objetos de BD: <code>sp_distribuir_insumos_turno</code>, <code>tg_control_y_descuento_stock_insumo</code>, <code>fn_auditoria_consumo_insumos_empleado</code>
        </p>

        {/* Acciones de Almacén */}
        <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={turno}
            onChange={(e) => setTurno(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid var(--color-borde, #cbd5e1)",
              fontSize: "13px",
              background: "var(--color-bg-primary, #ffffff)",
              color: "var(--color-texto, #1e293b)"
            }}
          >
            <option value="MAÑANA">Turno Mañana</option>
            <option value="TARDE">Turno Tarde</option>
            <option value="NOCHE">Turno Noche</option>
          </select>

          <button
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              background: "#4f46e5",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(79,70,229,0.2)"
            }}
          >
            🎁 Distribuir Kits EPPs al Turno
          </button>

          <input
            type="number"
            placeholder="Kardex por CI Trabajador..."
            value={ciOperario}
            onChange={(e) => setCiOperario(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid var(--color-borde, #cbd5e1)",
              fontSize: "13px",
              width: "210px",
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
              cursor: "pointer"
            }}
          >
            🔍 Consultar Consumo
          </button>
        </div>
      </div>

      {/* Espacio de Trabajo del Compañero 5 */}
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
        <div style={{ fontSize: "44px", marginBottom: "12px" }}>🧤</div>
        <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700 }}>
          Inventario en Tiempo Real y Kardex de Dotaciones
        </h4>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--color-texto-muted, #64748b)", maxWidth: "520px" }}>
          <strong>Compañero 5:</strong> Aquí debes conectar la barra de stock de guantes, bolsas y mascarillas con descuento automático por el trigger <code>tg_control_y_descuento_stock_insumo</code> y el cursor de distribución por turno[cite: 22, 23, 25].
        </p>
      </div>
    </div>
  );
}