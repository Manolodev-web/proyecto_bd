import React, { useState } from "react";

interface Props {
  gestor: string;
}

export default function PersonalModule({ gestor }: Props) {
  const [ciEmpleado, setCiEmpleado] = useState("");
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
          👥 Módulo 4: Gestión de Cuadrillas, Choferes y Escalafón Salarial
        </h3>
        <p style={{ margin: 0, fontSize: "12px", color: "var(--color-texto-muted, #64748b)" }}>
          Motor activo: <strong style={{ textTransform: "uppercase", color: "#2563eb" }}>{gestor}</strong> |
          Objetos de BD: <code>sp_generar_cuadrillas_dia</code>, <code>fn_antiguedad_y_bono_empleado</code>, <code>cr_control_licencias_conductores</code>, <code>tg_historial_cambio_salario</code>
        </p>

        {/* Acciones de Personal */}
        <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="number"
            placeholder="Carnet (CI) Empleado..."
            value={ciEmpleado}
            onChange={(e) => setCiEmpleado(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid var(--color-borde, #cbd5e1)",
              fontSize: "13px",
              width: "200px",
              background: "var(--color-bg-primary, #ffffff)",
              color: "var(--color-texto, #1e293b)"
            }}
          />
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
              background: "#059669",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(5,150,105,0.2)"
            }}
          >
            ⚡ Autogenerar Cuadrillas del Día
          </button>
          <button
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              background: "#d97706",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            🪪 Control de Licencias Vencidas
          </button>
        </div>
      </div>

      {/* Espacio de Trabajo del Compañero 4 */}
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
        <div style={{ fontSize: "44px", marginBottom: "12px" }}>🧑‍🔧</div>
        <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700 }}>
          Padrón de Personal, Fichas de Antigüedad y Licencias
        </h4>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--color-texto-muted, #64748b)", maxWidth: "520px" }}>
          <strong>Compañero 4:</strong> Aquí debes implementar la vista de asignación de cuadrillas con el cursor <code>sp_generar_cuadrillas_dia</code>, la alerta de licencias por vencer y el simulador de escalafón salarial[cite: 24, 25].
        </p>
      </div>
    </div>
  );
}