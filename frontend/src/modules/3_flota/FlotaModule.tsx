import React, { useState } from "react";

interface Props {
  gestor: string;
}

export default function FlotaModule({ gestor }: Props) {
  const [idVehiculo, setIdVehiculo] = useState("");
  const [fechaAuditoria, setFechaAuditoria] = useState("");

  // =========================================================================

  const [resultadoBaja, setResultadoBaja] = useState<any>(null);
  const [datosAuditoria, setDatosAuditoria] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Función para declarar baja y enviar a taller (Conexión con SP)
  const handleDeclararBajaYTaller = async () => {
    if (!idVehiculo) {
      alert("Por favor ingrese un ID de vehículo.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:4000/api/flota/baja-contingencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gestor: gestor,
          id_vehiculo: Number(idVehiculo),
          id_centro_destino: 1,
          motivo_mantenimiento: "Falla mecánica",
          kilometraje_actual: 45000
        })
      });
      const data = await response.json();
      setResultadoBaja(data);
    } catch (error) {
      console.error("Error al declarar baja:", error);
      alert("Error de conexión con el servidor backend.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Función para auditar el kilometraje (Conexión con Cursor)
  const handleAuditarKilometraje = async () => {
    if (!fechaAuditoria) {
      alert("Por favor seleccione una fecha para la auditoría.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:4000/api/flota/auditoria-carga", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gestor: gestor,
          fecha_inicio: fechaAuditoria,
          fecha_fin: fechaAuditoria
        })
      });
      const data = await response.json();
      setDatosAuditoria(data.datos || []);
    } catch (error) {
      console.error("Error al auditar:", error);
      alert("Error de conexión con el servidor backend.");
    } finally {
      setLoading(false);
    }
  };
  
  const [turno, setTurno] = useState("Mañana");
  const [estadoDisponibilidad, setEstadoDisponibilidad] = useState<string | null>(null);

  // 3. Función para verificar disponibilidad (Conexión con fn_verificar_disponibilidad_vehiculo)
  const handleVerificarDisponibilidad = async () => {
    if (!idVehiculo || !fechaAuditoria) {
      alert("Por favor ingrese un ID de vehículo y seleccione una fecha.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:4000/api/flota/verificar-disponibilidad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gestor: gestor,
          id_vehiculo: Number(idVehiculo),
          fecha: fechaAuditoria,
          turno: turno
        })
      });
      const data = await response.json();
      
      if (data.exito) {
        setEstadoDisponibilidad(data.disponible ? "✅ Vehículo Disponible" : "❌ Vehículo Ocupado / No Disponible");
      } else {
        setEstadoDisponibilidad("⚠️ Error al verificar");
      }
    } catch (error) {
      console.error("Error al verificar disponibilidad:", error);
    } finally {
      setLoading(false);
    }
  };
  // =========================================================================

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
          Objetos de BD: <code>sp_baja_vehiculo_y_contingencia</code>, <code>fn_verificar_disponibilidad_vehiculo</code>, <code>cr_auditoria_carga_trabajo_vehiculo</code>, <code>tg_auditoria_estado_vehiculo</code>[cite: 5, 6, 7, 8]
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
            onClick={handleDeclararBajaYTaller}
            disabled={loading}
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
            {loading ? "Procesando..." : "🚨 Declarar Baja / Enviar a Taller"}
          </button>
          <button
            onClick={handleAuditarKilometraje}
            disabled={loading}
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
            {loading ? "Auditando..." : "📈 Auditar Kilometraje (Cursor)"}
          </button>
        </div>

        {/* Alerta de Resultado de SP */}
        {resultadoBaja && (
          <div style={{ marginTop: "12px", padding: "8px 12px", background: "#fef2f2", color: "#991b1b", borderRadius: "6px", fontSize: "12px" }}>
            <strong>Respuesta:</strong> {resultadoBaja.mensaje || resultadoBaja.error}
          </div>
        )}
      </div>

      {/* Tablero Kanban y Resultados de Flota */}
      <div style={{
        background: "var(--color-bg-secondary, #ffffff)",
        padding: "24px",
        borderRadius: "12px",
        border: "1px solid var(--color-borde, #e2e8f0)",
        minHeight: "420px",
        display: "flex",
        flexDirection: "column",
        gap: "20px"
      }}>
        <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--color-texto, #0F2C59)" }}>
          📋 Tablero Operativo del Parque Automotor
        </h4>

        {/* Columnas Kanban: Disponibles, En Ruta, En Taller */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          
          {/* Columna 1: Disponibles */}
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <h5 style={{ margin: "0 0 12px 0", color: "#166534", fontSize: "14px" }}>🟢 Disponibles</h5>
            <div style={{ fontSize: "12px", color: "#64748b" }}>Unidades listas para asignación de ruta.</div>
          </div>

          {/* Columna 2: En Ruta */}
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <h5 style={{ margin: "0 0 12px 0", color: "#2563eb", fontSize: "14px" }}>🚚 En Ruta</h5>
            <div style={{ fontSize: "12px", color: "#64748b" }}>Unidades operando en turnos activos.</div>
          </div>

          {/* Columna 3: En Taller */}
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <h5 style={{ margin: "0 0 12px 0", color: "#dc2626", fontSize: "14px" }}>🔧 En Taller / Contingencia</h5>
            <div style={{ fontSize: "12px", color: "#64748b" }}>Unidades en mantenimiento o con rutas reasignadas.</div>
          </div>

        </div>

        {/* Sección de Resultados del Cursor de Auditoría */}
        {datosAuditoria.length > 0 && (
          <div style={{ width: "100%", overflowX: "auto", marginTop: "10px" }}>
            <h5 style={{ marginBottom: "10px", color: "#0F2C59" }}>Resultados de Auditoría de Carga (Cursor)[cite: 7]</h5>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", color: "#475569" }}>
                  <th style={{ padding: "8px", textAlign: "left" }}>ID</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Placa</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Estado</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Rutas</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Km Total</th>
                </tr>
              </thead>
              <tbody>
                {datosAuditoria.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "8px" }}>{item.id_vehiculo}</td>
                    <td style={{ padding: "8px" }}>{item.placa}</td>
                    <td style={{ padding: "8px" }}>{item.estado}</td>
                    <td style={{ padding: "8px" }}>{item.total_rutas_asignadas}</td>
                    <td style={{ padding: "8px" }}>{item.kilometraje_total_recorrido} km</td>
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