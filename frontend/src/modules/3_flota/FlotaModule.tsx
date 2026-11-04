import React, { useState, useEffect } from "react";

interface Props {
  gestor: string;
}

interface VehiculoKanban {
  id_vehiculo: number;
  placa: string;
  tipo: string;
  modelo: string;
  capacidad: number;
  estado: "DISPONIBLE" | "EN RUTA" | "EN TALLER" | string;
}

export default function FlotaModule({ gestor }: Props) {
  // 1. Estado para el Tablero Kanban Operativo
  const [vehiculosFlota, setVehiculosFlota] = useState<VehiculoKanban[]>([]);
  const [cargandoFlota, setCargandoFlota] = useState(false);

  // 2. Estados para Auditoría de Carga (cr_auditoria_carga_trabajo_vehiculo)
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

  // 3. Estados para Disponibilidad Rápida (fn_verificar_disponibilidad_vehiculo)
  const [idVehiculoVerif, setIdVehiculoVerif] = useState("");
  const [fechaVerif, setFechaVerif] = useState(() => {
    const hoy = new Date();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");
    return `${hoy.getFullYear()}-${mm}-${dd}`;
  });
  const [turnoVerif, setTurnoVerif] = useState("MAÑANA");
  const [estadoDisponibilidad, setEstadoDisponibilidad] = useState<string | null>(null);

  // Estados de feedback
  const [datosAuditoria, setDatosAuditoria] = useState<any[] | null>(null);
  const [cargandoAccion, setCargandoAccion] = useState(false);

  // =========================================================================
  // CARGAR ESTADO EN VIVO DE LA FLOTA PARA EL TABLERO KANBAN
  // =========================================================================
  const cargarTableroFlota = async () => {
    setCargandoFlota(true);
    const entorno = localStorage.getItem("recoleccion_entorno") || "docker";

    try {
      const res = await fetch("http://localhost:4000/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-database-env": entorno,
          "x-database-engine": gestor,
        },
        body: JSON.stringify({
          gestor,
          entorno,
          sql: "SELECT id_vehiculo, placa, tipo, modelo, capacidad, UPPER(estado) as estado FROM VEHICULO ORDER BY id_vehiculo ASC;",
        }),
      });

      const data = await res.json();
      if (data.exito && Array.isArray(data.datos)) {
        setVehiculosFlota(data.datos);
      }
    } catch (err) {
      console.error("Error al cargar tablero automotor:", err);
    } finally {
      setCargandoFlota(false);
    }
  };

  useEffect(() => {
    cargarTableroFlota();
  }, [gestor]);

  // =========================================================================
  // 1. AUDITAR KILOMETRAJE CON CURSOR
  // =========================================================================
  const handleAuditarKilometraje = async () => {
    setCargandoAccion(true);
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
        throw new Error(data.error || "Error al auditar kilometraje.");
      }

      setDatosAuditoria(data.datos || []);
    } catch (error: any) {
      alert(`Error en auditoría: ${error.message}`);
    } finally {
      setCargandoAccion(false);
    }
  };

  // =========================================================================
  // 2. VERIFICAR DISPONIBILIDAD (BOOLEAN)
  // =========================================================================
  const handleVerificarDisponibilidad = async () => {
    if (!idVehiculoVerif) {
      alert("Ingresa un ID de vehículo.");
      return;
    }

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
      if (data.disponible) {
        setEstadoDisponibilidad("DISPONIBLE: Unidad libre y apta para operar.");
      } else {
        setEstadoDisponibilidad("NO DISPONIBLE: Unidad ocupada en ruta o en mantenimiento.");
      }
    } catch (error: any) {
      setEstadoDisponibilidad(`Error al verificar: ${error.message}`);
    }
  };

  // Filtrado de vehículos por columna del Kanban
  const disponibles = vehiculosFlota.filter((v) => v.estado === "DISPONIBLE");
  const enRuta = vehiculosFlota.filter((v) => v.estado === "EN RUTA");
  const enTaller = vehiculosFlota.filter((v) => v.estado === "EN TALLER" || v.estado === "MANTENIMIENTO");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* CABECERA */}
      <div
        style={{
          background: "var(--color-bg-secondary, #ffffff)",
          padding: "16px 20px",
          borderRadius: "12px",
          border: "1px solid var(--color-borde, #e2e8f0)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <h3 style={{ margin: "0 0 4px 0", fontSize: "17px", fontWeight: 700, color: "var(--color-texto, #0F2C59)" }}>
            🚛 Módulo 3: Tablero Operativo Automotor y Contingencias
          </h3>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--color-texto-muted, #64748b)" }}>
            Motor: <strong style={{ textTransform: "uppercase", color: "#2563eb" }}>{gestor}</strong> | Objetos:{" "}
            <code>sp_baja_vehiculo_y_contingencia</code>, <code>cr_auditoria_carga_trabajo_vehiculo</code>,{" "}
            <code>tg_auditoria_estado_vehiculo</code>
          </p>
        </div>
        <button
          onClick={cargarTableroFlota}
          disabled={cargandoFlota}
          style={{
            padding: "6px 14px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {cargandoFlota ? "Actualizando..." : "🔄 Refrescar Tablero"}
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TABLERO KANBAN DE FLOTA (DISPONIBLES | EN RUTA | EN TALLER)           */}
      {/* ===================================================================== */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
        {/* COLUMNA 1: DISPONIBLES */}
        <div
          style={{
            background: "var(--color-bg-secondary, #ffffff)",
            borderRadius: "10px",
            border: "1px solid #bbf7d0",
            padding: "14px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontWeight: 700, fontSize: "13px", color: "#166534" }}>🟢 DISPONIBLES</span>
            <span style={{ background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 }}>
              {disponibles.length}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "240px", overflowY: "auto" }}>
            {disponibles.length === 0 ? (
              <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", padding: "16px" }}>
                Sin unidades libres
              </div>
            ) : (
              disponibles.map((v) => (
                <div
                  key={v.id_vehiculo}
                  onClick={() => {
                    setIdVehiculoVerif(String(v.id_vehiculo));
                  }}
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #dcfce7",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    cursor: "pointer",
                    fontSize: "12px",
                    transition: "transform 0.1s ease",
                  }}
                  title="Click para cargar en el formulario de consulta"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#15803d" }}>
                    <span>#{v.id_vehiculo} - {v.placa}</span>
                    <span>{v.capacidad} Tn</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#4b5563", marginTop: "2px" }}>
                    {v.tipo} ({v.modelo || "Volvo"})
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMNA 2: EN RUTA */}
        <div
          style={{
            background: "var(--color-bg-secondary, #ffffff)",
            borderRadius: "10px",
            border: "1px solid #bfdbfe",
            padding: "14px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontWeight: 700, fontSize: "13px", color: "#1e40af" }}>🔵 EN RUTA</span>
            <span style={{ background: "#dbeafe", color: "#1e40af", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 }}>
              {enRuta.length}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "240px", overflowY: "auto" }}>
            {enRuta.length === 0 ? (
              <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", padding: "16px" }}>
                Sin camiones en ruta
              </div>
            ) : (
              enRuta.map((v) => (
                <div
                  key={v.id_vehiculo}
                  onClick={() => {
                    setIdVehiculoVerif(String(v.id_vehiculo));
                  }}
                  style={{
                    background: "#eff6ff",
                    border: "1px solid #dbeafe",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                  title="Click para seleccionar"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#1e40af" }}>
                    <span>#{v.id_vehiculo} - {v.placa}</span>
                    <span>{v.capacidad} Tn</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#4b5563", marginTop: "2px" }}>
                    {v.tipo} ({v.modelo || "Scania"})
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMNA 3: EN TALLER / BAJA */}
        <div
          style={{
            background: "var(--color-bg-secondary, #ffffff)",
            borderRadius: "10px",
            border: "1px solid #fecaca",
            padding: "14px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontWeight: 700, fontSize: "13px", color: "#991b1b" }}>🔴 EN TALLER</span>
            <span style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 }}>
              {enTaller.length}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "240px", overflowY: "auto" }}>
            {enTaller.length === 0 ? (
              <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", padding: "16px" }}>
                Sin unidades averiadas
              </div>
            ) : (
              enTaller.map((v) => (
                <div
                  key={v.id_vehiculo}
                  onClick={() => {
                    setIdVehiculoVerif(String(v.id_vehiculo));
                  }}
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fee2e2",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                  title="Click para seleccionar"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#991b1b" }}>
                    <span>#{v.id_vehiculo} - {v.placa}</span>
                    <span>{v.capacidad} Tn</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#4b5563", marginTop: "2px" }}>
                    Mantenimiento / Falla
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ACCIONES Y FORMULARIOS (Solo Consulta de Disponibilidad) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
        {/* PANEL: CONSULTA RÁPIDA DE DISPONIBILIDAD */}
        <div
          style={{
            background: "var(--color-bg-secondary, #ffffff)",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid var(--color-borde, #e2e8f0)",
          }}
        >
          <h4 style={{ margin: "0 0 14px 0", fontSize: "14px", fontWeight: 700, color: "#2563eb" }}>
            🔍 Consultar Disponibilidad de Unidad (Filtro Booleano)
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                ID Vehículo
              </label>
              <input
                type="number"
                placeholder="Ej. 1 o 2"
                value={idVehiculoVerif}
                onChange={(e) => setIdVehiculoVerif(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                Fecha Operativa
              </label>
              <input
                type="date"
                value={fechaVerif}
                onChange={(e) => setFechaVerif(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                Turno
              </label>
              <select
                value={turnoVerif}
                onChange={(e) => setTurnoVerif(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              >
                <option value="MAÑANA">Mañana</option>
                <option value="TARDE">Tarde</option>
                <option value="NOCHE">Noche</option>
              </select>
            </div>

            <button
              onClick={handleVerificarDisponibilidad}
              style={{
                marginTop: "10px",
                padding: "10px",
                borderRadius: "6px",
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Comprobar Disponibilidad (Boolean)
            </button>

            {estadoDisponibilidad && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "10px",
                  background: estadoDisponibilidad.includes("DISPONIBLE: Unidad") ? "#dcfce7" : "#fee2e2",
                  color: estadoDisponibilidad.includes("DISPONIBLE: Unidad") ? "#15803d" : "#b91c1c",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                {estadoDisponibilidad}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PANEL INFERIOR: AUDITORÍA DE KILOMETRAJE Y DESGASTE (CURSOR) */}
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
              📊 Auditoría de Carga de Trabajo y Desgaste (Cursor cr_auditoria_carga_trabajo_vehiculo)
            </h4>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--color-texto-muted, #64748b)" }}>
              Recorre el parque automotor y calcula los kilómetros acumulados frente al promedio de la flota.
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
              onClick={handleAuditarKilometraje}
              disabled={cargandoAccion}
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
              {cargandoAccion ? "Ejecutando Cursor..." : "📈 Generar Reporte con Cursor"}
            </button>
          </div>
        </div>

        {datosAuditoria && datosAuditoria.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#64748b" }}>
                  <th style={{ padding: "10px" }}>ID</th>
                  <th style={{ padding: "10px" }}>Placa</th>
                  <th style={{ padding: "10px" }}>Modelo</th>
                  <th style={{ padding: "10px" }}>Estado</th>
                  <th style={{ padding: "10px" }}>Rutas Asignadas</th>
                  <th style={{ padding: "10px" }}>Km Recorridos</th>
                  <th style={{ padding: "10px" }}>Desviación Promedio</th>
                </tr>
              </thead>
              <tbody>
                {datosAuditoria.map((v) => (
                  <tr key={v.id_vehiculo} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px", fontWeight: 600 }}>#{v.id_vehiculo}</td>
                    <td style={{ padding: "10px" }}>{v.placa}</td>
                    <td style={{ padding: "10px" }}>{v.modelo}</td>
                    <td style={{ padding: "10px" }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: v.estado === "DISPONIBLE" ? "#dcfce7" : v.estado === "EN RUTA" ? "#dbeafe" : "#fee2e2",
                          color: v.estado === "DISPONIBLE" ? "#166534" : v.estado === "EN RUTA" ? "#1e40af" : "#991b1b",
                        }}
                      >
                        {v.estado}
                      </span>
                    </td>
                    <td style={{ padding: "10px" }}>{v.total_rutas_asignadas}</td>
                    <td style={{ padding: "10px", fontWeight: 600 }}>{v.kilometraje_total_recorrido} km</td>
                    <td style={{ padding: "10px", color: Number(v.desviacion_flota_pct) > 0 ? "#b91c1c" : "#15803d", fontWeight: 700 }}>
                      {Number(v.desviacion_flota_pct) > 0 ? `+${v.desviacion_flota_pct}%` : `${v.desviacion_flota_pct}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
            Presiona el botón <strong>"📈 Generar Reporte con Cursor"</strong> para auditar la flota en el rango de fechas.
          </div>
        )}
      </div>
    </div>
  );
}