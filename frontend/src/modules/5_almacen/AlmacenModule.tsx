import { useState, useEffect } from "react";

interface Props {
  gestor: string;
}

interface FilaBalanceCursor {
  id_insumo: number;
  nombre: string;
  stock_actual: number;
  total_entregas_registradas: number;
  unidades_despachadas: number;
  estado_inventario: string;
}

export default function AlmacenModule({ gestor }: Props) {
  // Estados de Kardex y Filtros
  const [ciOperario, setCiOperario] = useState("10035275");
  const [insumos, setInsumos] = useState<any[]>([]);
  const [balanceCursor, setBalanceCursor] = useState<FilaBalanceCursor[] | null>(null);
  const [kardexData, setKardexData] = useState<any>(null);

  // Estados para Prueba del Trigger
  const [ciDespacho, setCiDespacho] = useState("10035275");
  const [idInsumoDespacho, setIdInsumoDespacho] = useState("6");
  const [cantidadDespacho, setCantidadDespacho] = useState("2");

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  // 1. Cargar stock en vivo
  const fetchInsumos = async () => {
    try {
      const entorno = localStorage.getItem("recoleccion_entorno") || "docker";
      const res = await fetch(`http://localhost:4000/api/almacen/insumos?gestor=${gestor}`, {
        headers: { "x-database-env": entorno },
      });
      if (res.ok) {
        const data = await res.json();
        setInsumos(data.filter((i: any) => [6, 33, 14, 10, 39, 42].includes(i.id_insumo)));
      }
    } catch (error) {
      console.error("Error al cargar stock de insumos:", error);
    }
  };

  useEffect(() => {
    fetchInsumos();
  }, [gestor]);

  // 2. Cursor Explícito: cr_balance_general_insumos
  const handleEjecutarCursorBalance = async () => {
    setLoading(true);
    setMensaje({ tipo: "", texto: "" });
    const entorno = localStorage.getItem("recoleccion_entorno") || "docker";

    try {
      const res = await fetch(`http://localhost:4000/api/almacen/balance-cursor?gestor=${gestor}`, {
        headers: { "x-database-env": entorno },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Error al ejecutar cursor de balance.");

      setBalanceCursor(data.data || []);
      setMensaje({
        tipo: "success",
        texto: `Cursor 'cr_balance_general_insumos' ejecutado: ${data.data.length} ítems de inventario auditados.`,
      });
    } catch (error: any) {
      setMensaje({ tipo: "error", texto: error.message });
    } finally {
      setLoading(false);
    }
  };

  // 3. Kardex Analítico: fn_auditoria_consumo_insumos_empleado
  const handleKardex = async () => {
    if (!ciOperario.trim()) {
      setMensaje({ tipo: "error", texto: "Ingresa un CI de trabajador para consultar su Kardex." });
      return;
    }

    setLoading(true);
    setMensaje({ tipo: "", texto: "" });
    setKardexData(null);
    const entorno = localStorage.getItem("recoleccion_entorno") || "docker";

    try {
      const res = await fetch(
        `http://localhost:4000/api/almacen/kardex/${ciOperario}?anio=${new Date().getFullYear()}&gestor=${gestor}`,
        {
          headers: { "x-database-env": entorno },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Trabajador no encontrado en el registro de almacén.");

      setKardexData(data);
      setMensaje({
        tipo: "success",
        texto: `Kardex analítico recuperado para el CI ${ciOperario} mediante función 'fn_auditoria_consumo_insumos_empleado'.`,
      });
    } catch (error: any) {
      setMensaje({ tipo: "error", texto: error.message });
    } finally {
      setLoading(false);
    }
  };

  // 4. Registrar Despacho para probar el Trigger (tg_control_y_descuento_stock_insumo)
  const handleDespacharInsumo = async () => {
    if (!ciDespacho || !cantidadDespacho) {
      setMensaje({ tipo: "error", texto: "Completa el CI y la cantidad a despachar." });
      return;
    }

    setLoading(true);
    setMensaje({ tipo: "", texto: "" });
    const entorno = localStorage.getItem("recoleccion_entorno") || "docker";

    try {
      const res = await fetch("http://localhost:4000/api/almacen/entregas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-database-env": entorno,
          "x-database-engine": gestor,
        },
        body: JSON.stringify({
          gestor,
          ci: Number(ciDespacho),
          id_insumo: Number(idInsumoDespacho),
          cantidad: Number(cantidadDespacho),
          fecha: new Date().toISOString().split("T")[0],
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Excepción lanzada directamente por el Trigger
        throw new Error(data.message || "Error al registrar entrega.");
      }

      setMensaje({ tipo: "success", texto: `✅ ${data.mensaje}` });
      // Refrescar el stock en vivo para ver la reducción inmediata
      await fetchInsumos();
    } catch (error: any) {
      setMensaje({ tipo: "error", texto: `🚨 Trigger interceptó: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* TARJETA SUPERIOR: CABECERA Y KARDEX */}
      <div
        style={{
          background: "var(--color-bg-secondary, #ffffff)",
          padding: "20px 24px",
          borderRadius: "12px",
          border: "1px solid var(--color-borde, #e2e8f0)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <h3 style={{ margin: "0 0 6px 0", fontSize: "17px", fontWeight: 700, color: "var(--color-texto, #0F2C59)" }}>
          📦 Módulo 5: Almacenes, Kardex y Fiscalización de EPPs
        </h3>
        <p style={{ margin: 0, fontSize: "12px", color: "var(--color-texto-muted, #64748b)" }}>
          Motor activo: <strong style={{ textTransform: "uppercase", color: "#2563eb" }}>{gestor}</strong> |{" "}
          Objetos conectados: <code>cr_balance_general_insumos</code> (Cursor),{" "}
          <code>fn_auditoria_consumo_insumos_empleado</code> (Función),{" "}
          <code>tg_control_y_descuento_stock_insumo</code> (Trigger)
        </p>

        <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap", alignItems: "center" }}>
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
              width: "220px",
              background: "var(--color-bg-primary, #ffffff)",
              color: "var(--color-texto, #1e293b)",
            }}
          />

          <button
            onClick={handleKardex}
            disabled={loading}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 2px 4px rgba(37,99,235,0.2)",
            }}
          >
            {loading ? "Consultando..." : "🔍 Consultar Kardex (Función)"}
          </button>

          <button
            onClick={handleEjecutarCursorBalance}
            disabled={loading}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              background: "#059669",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 2px 4px rgba(5,150,105,0.2)",
            }}
          >
            📋 Balance de Inventario (Cursor)
          </button>
        </div>

        {/* Mensajes de Alerta */}
        {mensaje.texto && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              background: mensaje.tipo === "error" ? "#fee2e2" : "#dcfce7",
              color: mensaje.tipo === "error" ? "#991b1b" : "#166534",
              border: `1px solid ${mensaje.tipo === "error" ? "#f87171" : "#4ade80"}`,
            }}
          >
            {mensaje.texto}
          </div>
        )}
      </div>

      {/* SECCIÓN INTERMEDIA: RESULTADOS DEL KARDEX ANALÍTICO */}
      {kardexData && (
        <div
          style={{
            background: "var(--color-bg-secondary, #ffffff)",
            padding: "20px 24px",
            borderRadius: "12px",
            border: "1px solid var(--color-borde, #e2e8f0)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--color-texto, #0F2C59)" }}>
              📊 Kardex Analítico de Consumo (CI: {ciOperario})
            </h4>
            <button
              onClick={() => setKardexData(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "#ef4444",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              ✖ Cerrar Ficha
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", textAlign: "center", border: "1px solid #e2e8f0" }}>
              <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Total Unidades Retiradas</p>
              <p style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: "#0f172a" }}>{kardexData.total_unidades_recibidas}</p>
            </div>
            <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", textAlign: "center", border: "1px solid #e2e8f0" }}>
              <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Visitas a Almacén</p>
              <p style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: "#0f172a" }}>{kardexData.frecuencia_solicitudes}</p>
            </div>
            <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", textAlign: "center", border: "1px solid #e2e8f0" }}>
              <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Insumo Más Solicitado</p>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 800, color: "#2563eb", marginTop: "8px" }}>{kardexData.insumo_predominante}</p>
            </div>
          </div>

          <div
            style={{
              marginTop: "20px",
              padding: "14px",
              borderRadius: "8px",
              background: kardexData.clasificacion_consumo === "SOBRECONSUMO" ? "#fef2f2" : "#f0fdf4",
              border: `1px solid ${kardexData.clasificacion_consumo === "SOBRECONSUMO" ? "#fecaca" : "#bbf7d0"}`,
              textAlign: "center",
            }}
          >
            <h4
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: 800,
                color: kardexData.clasificacion_consumo === "SOBRECONSUMO" ? "#991b1b" : "#166534",
              }}
            >
              {kardexData.clasificacion_consumo === "SOBRECONSUMO" ? "🚨 SOBRECONSUMO DETECTADO" : "✅ CONSUMO ESTÁNDAR"}
            </h4>
          </div>
        </div>
      )}

      {/* SECCIÓN: MONITOR DE STOCK EN VIVO (TARJETAS) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
        {insumos.map((insumo) => {
          const porcentaje = Math.min((insumo.cantidad / 500) * 100, 100);
          return (
            <div
              key={insumo.id_insumo}
              style={{
                background: "var(--color-bg-secondary, #ffffff)",
                padding: "16px 20px",
                borderRadius: "12px",
                border: "1px solid var(--color-borde, #e2e8f0)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>{insumo.nombre}</h4>
                <span style={{ fontSize: "11px", color: "#64748b" }}>#{insumo.id_insumo}</span>
              </div>

              <div style={{ height: "10px", background: "#e2e8f0", borderRadius: "5px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${porcentaje}%`,
                    background: porcentaje < 20 ? "#ef4444" : porcentaje < 50 ? "#f59e0b" : "#22c55e",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>

              <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                Stock disponible: <strong style={{ color: "#0f172a" }}>{insumo.cantidad} uds.</strong>
              </p>
            </div>
          );
        })}
      </div>

      {/* SECCIÓN NUEVA: BANCO DE PRUEBA DEL TRIGGER (DESPACHO REACTIVO) */}
      <div
        style={{
          background: "var(--color-bg-secondary, #ffffff)",
          padding: "20px 24px",
          borderRadius: "12px",
          border: "1px solid var(--color-borde, #cbd5e1)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <h4 style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: 700, color: "var(--color-texto, #0F2C59)" }}>
          🧪 Banco de Prueba de Despacho (Trigger tg_control_y_descuento_stock_insumo)
        </h4>
        <p style={{ margin: "0 0 16px 0", fontSize: "12px", color: "#64748b" }}>
          Prueba de fuego para la defensa: al despachar una cantidad válida, el <strong>Trigger</strong> es el único agente que descuenta el stock en la tarjeta superior. Si pides una cantidad que excede el stock, el <strong>Trigger</strong> cancela la transacción con una excepción.
        </p>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
              CI Empleado *
            </label>
            <input
              type="number"
              value={ciDespacho}
              onChange={(e) => setCiDespacho(e.target.value)}
              placeholder="Ej. 10035275"
              style={{
                width: "150px",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
              Insumo / EPP *
            </label>
            <select
              value={idInsumoDespacho}
              onChange={(e) => setIdInsumoDespacho(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
              }}
            >
              <option value="6">Guantes de nitrilo talla M (#6)</option>
              <option value="10">Botas de goma punta de acero M (#10)</option>
              <option value="14">Overol naranja talla M (#14)</option>
              <option value="33">Barbijo descartable (#33)</option>
              <option value="39">Escoba de barrido (#39)</option>
              <option value="42">Pala de mano (#42)</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
              Cantidad a Despachar *
            </label>
            <input
              type="number"
              value={cantidadDespacho}
              onChange={(e) => setCantidadDespacho(e.target.value)}
              placeholder="Ej. 2 o 99999"
              style={{
                width: "140px",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
              }}
            />
          </div>

          <button
            onClick={handleDespacharInsumo}
            disabled={loading}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              background: "#0f172a",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Procesando..." : "⚡ Ejecutar Despacho (Trigger)"}
          </button>
        </div>
      </div>

      {/* SECCIÓN INFERIOR: BALANCE DE INVENTARIO CON CURSOR EXPLÍCITO */}
      {balanceCursor && (
        <div
          style={{
            background: "var(--color-bg-secondary, #ffffff)",
            padding: "24px",
            borderRadius: "12px",
            border: "1px solid var(--color-borde, #cbd5e1)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--color-texto, #0F2C59)" }}>
                📋 Balance General de Inventario (Cursor cr_balance_general_insumos)
              </h4>
              <p style={{ margin: "3px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                Recorrido secuencial de insumos consolidando existencias físicas frente al total de salidas registradas en <code>ENTREGA</code>.
              </p>
            </div>
            <span
              style={{
                fontSize: "12px",
                padding: "4px 10px",
                borderRadius: "6px",
                background: "#f1f5f9",
                color: "#475569",
                fontWeight: 600,
              }}
            >
              {balanceCursor.length} Insumos Auditados
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#f8fafc", color: "#64748b" }}>
                  <th style={{ padding: "10px" }}>ID</th>
                  <th style={{ padding: "10px" }}>Nombre del Insumo / EPP</th>
                  <th style={{ padding: "10px" }}>Stock en Almacén</th>
                  <th style={{ padding: "10px" }}>Entregas Realizadas</th>
                  <th style={{ padding: "10px" }}>Unidades Despachadas</th>
                  <th style={{ padding: "10px" }}>Estado de Inventario</th>
                </tr>
              </thead>
              <tbody>
                {balanceCursor.map((b) => (
                  <tr key={b.id_insumo} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px", fontWeight: 700, color: "#2563eb" }}>#{b.id_insumo}</td>
                    <td style={{ padding: "10px", fontWeight: 600 }}>{b.nombre}</td>
                    <td style={{ padding: "10px", fontFamily: "monospace", fontWeight: 700 }}>{b.stock_actual} uds</td>
                    <td style={{ padding: "10px", color: "#475569" }}>{b.total_entregas_registradas} despachos</td>
                    <td style={{ padding: "10px", color: "#d97706", fontWeight: 600 }}>{b.unidades_despachadas} uds</td>
                    <td style={{ padding: "10px" }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background:
                            b.estado_inventario === "ABASTECIDO NORMAL"
                              ? "#dcfce7"
                              : b.estado_inventario === "CRÍTICO / REABASTECER"
                              ? "#fee2e2"
                              : "#fef3c7",
                          color:
                            b.estado_inventario === "ABASTECIDO NORMAL"
                              ? "#166534"
                              : b.estado_inventario === "CRÍTICO / REABASTECER"
                              ? "#991b1b"
                              : "#92400e",
                        }}
                      >
                        {b.estado_inventario}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}