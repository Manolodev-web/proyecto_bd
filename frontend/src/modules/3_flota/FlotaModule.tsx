import React, { useState } from "react";

interface Props {
  gestor: string;
}

interface FichaDisponibilidad {
  id_vehiculo: number;
  placa: string;
  estado_general: string;
  centro_base: string;
  disponible_en_turno: boolean;
  diagnostico_disponibilidad: string;
}

interface FilaAuditoriaVehiculo {
  id_vehiculo: number;
  placa: string;
  tipo: string;
  modelo: string;
  capacidad_tn: number;
  centro_base: string;
  estado_actual: string;
  rutas_cubiertas: number;
  total_servicios_vaciado: number;
}

export default function FlotaModule({ gestor }: Props) {
  // 1. Estados para Consulta de Disponibilidad (Procedimiento + Función)
  const [idVehiculoVerif, setIdVehiculoVerif] = useState("1");
  const [fechaVerif, setFechaVerif] = useState(() => {
    const hoy = new Date();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");
    return `${hoy.getFullYear()}-${mm}-${dd}`;
  });
  const [turnoVerif, setTurnoVerif] = useState("MANANA");
  const [fichaUnidad, setFichaUnidad] = useState<FichaDisponibilidad | null>(null);
  const [cargandoVerif, setCargandoVerif] = useState(false);

  // 2. Estados para Auditoría de Carga (Cursor cr_auditoria_carga_trabajo_vehiculo)
  const [fechaInicio, setFechaInicio] = useState(() => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-01-01`;
  });
  const [fechaFin, setFechaFin] = useState(() => {
    const hoy = new Date();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");
    return `${hoy.getFullYear()}-${mm}-${dd}`;
  });

  const [datosAuditoria, setDatosAuditoria] = useState<FilaAuditoriaVehiculo[] | null>(null);
  const [cargandoAuditoria, setCargandoAuditoria] = useState(false);

  // Mensajes de retroalimentación
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // =========================================================================
  // 1. PROCEDIMIENTO: VERIFICAR DISPONIBILIDAD Y FICHA DE LA UNIDAD
  // =========================================================================
  const handleVerificarDisponibilidad = async () => {
    if (!idVehiculoVerif) {
      setMensajeError("Ingresa un ID de vehículo para consultar.");
      return;
    }

    setCargandoVerif(true);
    setMensajeError(null);
    setMensajeExito(null);

    const entorno = localStorage.getItem("recoleccion_entorno") || "docker";

    try {
      const response = await fetch("http://localhost:4000/api/flota/verificar-disponibilidad", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-database-env": entorno,
          "x-database-engine": gestor,
        },
        body: JSON.stringify({
          gestor,
          entorno,
          id_vehiculo: Number(idVehiculoVerif),
          fecha: fechaVerif,
          turno: turnoVerif,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.exito) {
        throw new Error(data.error || "No se pudo consultar el vehículo.");
      }

      setFichaUnidad(data.datos);
      setMensajeExito(`Ficha del Vehículo #${idVehiculoVerif} consultada correctamente.`);
    } catch (error: any) {
      setFichaUnidad(null);
      setMensajeError(error.message || "Error al verificar disponibilidad.");
    } finally {
      setCargandoVerif(false);
    }
  };

  // =========================================================================
  // 2. CURSOR EXPLÍCITO: AUDITAR SERVICIOS EN RANGO DE FECHAS
  // =========================================================================
  const handleAuditarServicios = async () => {
    setCargandoAuditoria(true);
    setMensajeError(null);
    setMensajeExito(null);

    const entorno = localStorage.getItem("recoleccion_entorno") || "docker";

    try {
      const response = await fetch("http://localhost:4000/api/flota/auditoria-carga", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-database-env": entorno,
          "x-database-engine": gestor,
        },
        body: JSON.stringify({
          gestor,
          entorno,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.exito) {
        throw new Error(data.error || "Error al auditar servicios de flota.");
      }

      setDatosAuditoria(data.datos || []);
      setMensajeExito(`Cursor 'cr_auditoria_carga_trabajo_vehiculo': ${data.totalFilas} vehículos auditados.`);
    } catch (error: any) {
      setMensajeError(error.message || "Error en cursor de auditoría.");
    } finally {
      setCargandoAuditoria(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* CABECERA */}
      <div
        style={{
          background: "var(--color-bg-secondary, #ffffff)",
          padding: "20px 24px",
          borderRadius: "12px",
          border: "1px solid var(--color-borde, #e2e8f0)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <h3 style={{ margin: "0 0 4px 0", fontSize: "17px", fontWeight: 700, color: "var(--color-texto, #0F2C59)" }}>
          🚛 Módulo 3: Tablero Operativo Automotor y Disponibilidad
        </h3>
        <p style={{ margin: 0, fontSize: "12px", color: "var(--color-texto-muted, #64748b)" }}>
          Motor activo: <strong style={{ textTransform: "uppercase", color: "#2563eb" }}>{gestor}</strong> |{" "}
          Objetos conectados: <code>sp_consultar_disponibilidad_vehiculo</code>, <code>fn_verificar_disponibilidad_vehiculo</code>,{" "}
          <code>cr_auditoria_carga_trabajo_vehiculo</code>
        </p>
      </div>

      {/* SECCIÓN PRINCIPAL: CONSULTA ANALÍTICA DE DISPONIBILIDAD (PROCEDIMIENTO + FUNCIÓN) */}
      <div
        style={{
          background: "var(--color-bg-secondary, #ffffff)",
          padding: "20px 24px",
          borderRadius: "12px",
          border: "1px solid var(--color-borde, #e2e8f0)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <h4 style={{ margin: "0 0 10px 0", fontSize: "15px", fontWeight: 700, color: "var(--color-texto, #0F2C59)" }}>
          🔍 Consulta de Disponibilidad de Unidad (sp_consultar_disponibilidad_vehiculo)
        </h4>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
              ID Vehículo *
            </label>
            <input
              type="number"
              placeholder="Ej. 1"
              value={idVehiculoVerif}
              onChange={(e) => setIdVehiculoVerif(e.target.value)}
              style={{
                width: "120px",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--color-borde, #cbd5e1)",
                fontSize: "13px",
                background: "var(--color-bg-primary, #ffffff)",
                color: "var(--color-texto, #1e293b)",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
              Fecha Operativa *
            </label>
            <input
              type="date"
              value={fechaVerif}
              onChange={(e) => setFechaVerif(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--color-borde, #cbd5e1)",
                fontSize: "13px",
                background: "var(--color-bg-primary, #ffffff)",
                color: "var(--color-texto, #1e293b)",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
              Turno *
            </label>
            <select
              value={turnoVerif}
              onChange={(e) => setTurnoVerif(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--color-borde, #cbd5e1)",
                fontSize: "13px",
                background: "var(--color-bg-primary, #ffffff)",
                color: "var(--color-texto, #1e293b)",
              }}
            >
              <option value="MANANA">Mañana</option>
              <option value="TARDE">Tarde</option>
              <option value="NOCHE">Noche</option>
            </select>
          </div>

          <button
            onClick={handleVerificarDisponibilidad}
            disabled={cargandoVerif}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {cargandoVerif ? "Comprobando..." : "🔍 Comprobar Disponibilidad (SP)"}
          </button>
        </div>

        {/* Ficha de Respuesta del Procedimiento */}
        {fichaUnidad && (() => {
          // Reconocemos como apto si la BD dice que está disponible en turno
          // O si su estado general es DISPONIBLE u OPERATIVO (sin estar en taller)
          const esApto =
            fichaUnidad.disponible_en_turno ||
            (fichaUnidad.estado_general === "DISPONIBLE" &&
              !fichaUnidad.diagnostico_disponibilidad.includes("ASIGNADA PREVIAMENTE"));

          return (
            <div
              style={{
                marginTop: "16px",
                padding: "14px 18px",
                borderRadius: "8px",
                background: esApto ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${esApto ? "#bbf7d0" : "#fecaca"}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "14px",
                    color: esApto ? "#15803d" : "#991b1b",
                  }}
                >
                  Vehículo #{fichaUnidad.id_vehiculo} ({fichaUnidad.placa}) -{" "}
                  {esApto ? "UNIDAD LIBRE Y APTA PARA DESPACHO" : fichaUnidad.diagnostico_disponibilidad}
                </div>
                <div style={{ fontSize: "12px", color: "#475569", marginTop: "3px" }}>
                  Estado General: <strong>{fichaUnidad.estado_general}</strong> | Centro/Planta Base:{" "}
                  <strong>{fichaUnidad.centro_base || "Sin Centro Asignado"}</strong>
                </div>
              </div>

              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: esApto ? "#dcfce7" : "#fee2e2",
                  color: esApto ? "#166534" : "#991b1b",
                }}
              >
                {esApto ? "APTO PARA DESPACHO" : "NO DISPONIBLE"}
              </span>
            </div>
          );
        })()}
        {mensajeError && (
          <div style={{ marginTop: "12px", padding: "10px", background: "#fee2e2", color: "#b91c1c", borderRadius: "6px", fontSize: "12px" }}>
            ❌ {mensajeError}
          </div>
        )}
        {mensajeExito && (
          <div style={{ marginTop: "12px", padding: "10px", background: "#dcfce7", color: "#15803d", borderRadius: "6px", fontSize: "12px" }}>
            ✓ {mensajeExito}
          </div>
        )}
      </div>

      {/* PANEL INFERIOR: AUDITORÍA DE SERVICIOS CON CURSOR EXPLÍCITO */}
      <div
        style={{
          background: "var(--color-bg-secondary, #ffffff)",
          padding: "24px",
          borderRadius: "12px",
          border: "1px solid var(--color-borde, #cbd5e1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h4 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 700, color: "var(--color-texto, #0F2C59)" }}>
              📊 Auditoría de Servicios de la Flota (Cursor cr_auditoria_carga_trabajo_vehiculo)
            </h4>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--color-texto-muted, #64748b)" }}>
              Recorre el parque automotor y consolida las rutas cubiertas y los servicios registrados en <code>ABARCA</code>.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
            />
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>al</span>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
            />
            <button
              onClick={handleAuditarServicios}
              disabled={cargandoAuditoria}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                background: "#059669",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              {cargandoAuditoria ? "Ejecutando Cursor..." : "📈 Auditar Servicios con Cursor"}
            </button>
          </div>
        </div>

        {datosAuditoria && datosAuditoria.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#f8fafc", color: "#64748b" }}>
                  <th style={{ padding: "10px" }}>ID</th>
                  <th style={{ padding: "10px" }}>Placa</th>
                  <th style={{ padding: "10px" }}>Tipo</th>
                  <th style={{ padding: "10px" }}>Modelo</th>
                  <th style={{ padding: "10px" }}>Capacidad</th>
                  <th style={{ padding: "10px" }}>Centro Base</th>
                  <th style={{ padding: "10px" }}>Estado</th>
                  <th style={{ padding: "10px" }}>Rutas Atendidas</th>
                  <th style={{ padding: "10px" }}>Total Vaciados (ABARCA)</th>
                </tr>
              </thead>
              <tbody>
                {datosAuditoria.map((v) => (
                  <tr key={v.id_vehiculo} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px", fontWeight: 700, color: "#2563eb" }}>#{v.id_vehiculo}</td>
                    <td style={{ padding: "10px", fontWeight: 600 }}>{v.placa}</td>
                    <td style={{ padding: "10px" }}>{v.tipo}</td>
                    <td style={{ padding: "10px" }}>{v.modelo}</td>
                    <td style={{ padding: "10px", fontFamily: "monospace" }}>{v.capacidad_tn} Tn</td>
                    <td style={{ padding: "10px" }}>{v.centro_base || "Planta Central"}</td>
                    <td style={{ padding: "10px" }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: v.estado_actual === "DISPONIBLE" ? "#dcfce7" : v.estado_actual === "EN RUTA" ? "#dbeafe" : "#fee2e2",
                          color: v.estado_actual === "DISPONIBLE" ? "#166534" : v.estado_actual === "EN RUTA" ? "#1e40af" : "#991b1b",
                        }}
                      >
                        {v.estado_actual}
                      </span>
                    </td>
                    <td style={{ padding: "10px", fontWeight: 600, color: "#2563eb" }}>
                      {v.rutas_cubiertas} rutas
                    </td>
                    <td style={{ padding: "10px", fontWeight: 700, color: "#166534" }}>
                      {v.total_servicios_vaciado} servicios
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
            Presiona el botón <strong>"📈 Auditar Servicios con Cursor"</strong> para recorrer la actividad real de los camiones.
          </div>
        )}
      </div>
    </div>
  );
}