import React, { useState } from "react";

interface Props {
  gestor: string;
}

export default function RutasModule({ gestor }: Props) {
  // Estados para búsqueda de ruta
  const [idRutaBusqueda, setIdRutaBusqueda] = useState("");
  const [ciBusqueda, setCiBusqueda] = useState("");
  const [rutaInfo, setRutaInfo] = useState<any>(null);
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);

  // Estados para despacho de operativo
  const [idRutaDespacho, setIdRutaDespacho] = useState("");
  const [idVehiculo, setIdVehiculo] = useState("");
  const [ciConductor, setCiConductor] = useState("");
  const [ayudantesTexto, setAyudantesTexto] = useState("");
  const [turno, setTurno] = useState("MAÑANA");
  const [cargandoDespacho, setCargandoDespacho] = useState(false);

  // Mensajes de respuesta
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // 1. Rastrear ruta (Llama a fn_rastrear_ruta_operativa en el Backend)
  const handleRastrear = async () => {
    if (!idRutaBusqueda && !ciBusqueda) {
      setMensajeError("Ingresa un ID de Ruta o un CI de Operario para buscar.");
      return;
    }

    setCargandoBusqueda(true);
    setMensajeError(null);
    setMensajeExito(null);

    const entorno = localStorage.getItem("recoleccion_entorno") || "docker";

    try {
      const res = await fetch("http://localhost:4000/api/rutas/rastrear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-database-env": entorno,
          "x-database-engine": gestor,
        },
        body: JSON.stringify({
          gestor,
          entorno,
          id_ruta: idRutaBusqueda ? Number(idRutaBusqueda) : null,
          ci: ciBusqueda ? Number(ciBusqueda) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.exito) {
        throw new Error(data.error || "No se encontró la ruta en la base de datos.");
      }

      setRutaInfo(data.datos);
      setMensajeExito("Ruta recuperada correctamente desde la Base de Datos.");
    } catch (err: any) {
      setRutaInfo(null);
      setMensajeError(err.message || "Error al rastrear ruta.");
    } finally {
      setCargandoBusqueda(false);
    }
  };

  // 2. Iniciar operativo (Llama a sp_iniciar_operativo_recoleccion)
  const handleDespachar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idRutaDespacho || !idVehiculo || !ciConductor) {
      setMensajeError("Completa los campos obligatorios: ID Ruta, ID Vehículo y CI Conductor.");
      return;
    }

    setCargandoDespacho(true);
    setMensajeError(null);
    setMensajeExito(null);

    const listaAyudantes = ayudantesTexto
      ? ayudantesTexto
          .split(",")
          .map((c) => Number(c.trim()))
          .filter((n) => !isNaN(n))
      : [];

    const entorno = localStorage.getItem("recoleccion_entorno") || "docker";

    try {
      const res = await fetch("http://localhost:4000/api/rutas/iniciar-operativo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-database-env": entorno,
          "x-database-engine": gestor,
        },
        body: JSON.stringify({
          gestor,
          entorno,
          id_ruta: Number(idRutaDespacho),
          id_vehiculo: Number(idVehiculo),
          ci_conductor: Number(ciConductor),
          ayudantes: listaAyudantes,
          turno,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.exito) {
        throw new Error(data.error || "Error al ejecutar el despacho.");
      }

      setMensajeExito(data.mensaje || "Operativo iniciado exitosamente.");
      setIdRutaDespacho("");
      setIdVehiculo("");
      setCiConductor("");
      setAyudantesTexto("");
    } catch (err: any) {
      setMensajeError(err.message || "Error al iniciar operativo.");
    } finally {
      setCargandoDespacho(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* TARJETA SUPERIOR: BÚSQUEDA Y RASTREO */}
      <div
        style={{
          background: "var(--color-bg-secondary, #ffffff)",
          padding: "20px 24px",
          borderRadius: "12px",
          border: "1px solid var(--color-borde, #e2e8f0)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <h3
          style={{
            margin: "0 0 6px 0",
            fontSize: "17px",
            fontWeight: 700,
            color: "var(--color-texto, #0F2C59)",
          }}
        >
          📍 Módulo 1: Centro de Despacho y Trazabilidad GIS (La Paz)
        </h3>
        <p style={{ margin: 0, fontSize: "12px", color: "var(--color-texto-muted, #64748b)" }}>
          Motor activo: <strong style={{ textTransform: "uppercase", color: "#2563eb" }}>{gestor}</strong> |{" "}
          Objetos conectados: <code>fn_rastrear_ruta_operativa</code>, <code>sp_iniciar_operativo_recoleccion</code>
        </p>

        {/* Buscador Dual */}
        <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="number"
            placeholder="Buscar por ID Ruta (ej. 101)..."
            value={idRutaBusqueda}
            onChange={(e) => setIdRutaBusqueda(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid var(--color-borde, #cbd5e1)",
              fontSize: "13px",
              width: "210px",
              background: "var(--color-bg-primary, #ffffff)",
              color: "var(--color-texto, #1e293b)",
            }}
          />
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>o</span>
          <input
            type="number"
            placeholder="Buscar por CI Chofer/Ayudante..."
            value={ciBusqueda}
            onChange={(e) => setCiBusqueda(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid var(--color-borde, #cbd5e1)",
              fontSize: "13px",
              width: "230px",
              background: "var(--color-bg-primary, #ffffff)",
              color: "var(--color-texto, #1e293b)",
            }}
          />
          <button
            onClick={handleRastrear}
            disabled={cargandoBusqueda}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {cargandoBusqueda ? "Buscando..." : "🔍 Rastrear Ruta"}
          </button>
        </div>

        {/* Alertas */}
        {mensajeError && (
          <div
            style={{
              marginTop: "12px",
              padding: "10px 14px",
              borderRadius: "8px",
              background: "#fee2e2",
              color: "#b91c1c",
              fontSize: "12px",
            }}
          >
            ❌ {mensajeError}
          </div>
        )}
        {mensajeExito && (
          <div
            style={{
              marginTop: "12px",
              padding: "10px 14px",
              borderRadius: "8px",
              background: "#dcfce7",
              color: "#15803d",
              fontSize: "12px",
            }}
          >
            ✓ {mensajeExito}
          </div>
        )}
      </div>

      {/* CUERPO: FICHA DE LA RUTA + FORMULARIO DE DESPACHO */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* PANEL IZQUIERDO: DETALLE DE LA RUTA ENCONTRADA */}
        <div
          style={{
            background: "var(--color-bg-secondary, #ffffff)",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid var(--color-borde, #e2e8f0)",
          }}
        >
          <h4
            style={{
              margin: "0 0 14px 0",
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--color-texto, #0F2C59)",
            }}
          >
            🗺️ Hoja de Ruta Operativa
          </h4>

          {rutaInfo ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              <div>
                <strong>Ruta:</strong> #{rutaInfo.id_ruta} - {rutaInfo.nombre_ruta}
              </div>
              <div>
                <strong>Distancia estimada:</strong> {rutaInfo.distancia_km} km
              </div>
              <div>
                <strong>Vehículo:</strong>{" "}
                <span style={{ color: "#2563eb", fontWeight: 600 }}>{rutaInfo.placa_vehiculo}</span>
              </div>
              <div>
                <strong>Conductor asignado:</strong> {rutaInfo.conductor}
              </div>
              <div>
                <strong>Contenedores en el tramo:</strong> {rutaInfo.total_contenedores} puntos
              </div>

              <div style={{ marginTop: "10px" }}>
                <strong>Contenedores vinculados:</strong>
                <div
                  style={{
                    maxHeight: "160px",
                    overflowY: "auto",
                    marginTop: "6px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                  }}
                >
                  {rutaInfo.geojson_contenedores && rutaInfo.geojson_contenedores.length > 0 ? (
                    rutaInfo.geojson_contenedores.map((c: any, idx: number) => (
                      <div
                        key={idx}
                        style={{ padding: "6px 10px", borderBottom: "1px solid #f1f5f9", fontSize: "12px" }}
                      >
                        #{c.id_contenedor} - {c.ubicacion} ({c.estado})
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: "10px", color: "#94a3b8", fontSize: "12px" }}>
                      Sin contenedores asignados en esta ruta.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: "50px 10px",
                textAlign: "center",
                color: "var(--color-texto-muted, #94a3b8)",
                fontSize: "13px",
              }}
            >
              Ingresa un ID de ruta (ej. 101) o carnet de chofer arriba para consultar.
            </div>
          )}
        </div>

        {/* PANEL DERECHO: FORMULARIO DE DESPACHO */}
        <div
          style={{
            background: "var(--color-bg-secondary, #ffffff)",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid var(--color-borde, #e2e8f0)",
          }}
        >
          <h4
            style={{
              margin: "0 0 14px 0",
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--color-texto, #0F2C59)",
            }}
          >
            🚛 Despachar Operativo (Procedimiento Atómico)
          </h4>

          <form onSubmit={handleDespachar} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                ID Ruta *
              </label>
              <input
                type="number"
                placeholder="Ej. 101"
                value={idRutaDespacho}
                onChange={(e) => setIdRutaDespacho(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-borde, #cbd5e1)",
                  fontSize: "12px",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                ID Vehículo *
              </label>
              <input
                type="number"
                placeholder="Ej. 1"
                value={idVehiculo}
                onChange={(e) => setIdVehiculo(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-borde, #cbd5e1)",
                  fontSize: "12px",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                CI Conductor Principal *
              </label>
              <input
                type="number"
                placeholder="Ej. 7884210"
                value={ciConductor}
                onChange={(e) => setCiConductor(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-borde, #cbd5e1)",
                  fontSize: "12px",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                CIs Ayudantes (separados por coma)
              </label>
              <input
                type="text"
                placeholder="Ej. 6543210, 9876540"
                value={ayudantesTexto}
                onChange={(e) => setAyudantesTexto(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-borde, #cbd5e1)",
                  fontSize: "12px",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                Turno
              </label>
              <select
                value={turno}
                onChange={(e) => setTurno(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-borde, #cbd5e1)",
                  fontSize: "12px",
                }}
              >
                <option value="MAÑANA">Mañana</option>
                <option value="TARDE">Tarde</option>
                <option value="NOCHE">Noche</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={cargandoDespacho}
              style={{
                marginTop: "10px",
                padding: "9px",
                borderRadius: "6px",
                background: "#059669",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              {cargandoDespacho ? "Despachando..." : "⚡ Iniciar Operativo de Recolección"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}