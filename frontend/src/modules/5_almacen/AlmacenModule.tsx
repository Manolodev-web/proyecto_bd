import { useState, useEffect } from "react";

interface Props {
  gestor: string;
}

export default function AlmacenModule({ gestor }: Props) {
  const [ciOperario, setCiOperario] = useState("");
  const [turno, setTurno] = useState("MAÑANA");
  const [incluirHerramientas, setIncluirHerramientas] = useState(false);
  
  const [insumos, setInsumos] = useState<any[]>([]);
  const [kardexData, setKardexData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  
  const fetchInsumos = async () => {
    try {
      const res = await fetch(`http://localhost:4000/api/almacen/insumos?gestor=${gestor}`);
      if (res.ok) {
        const data = await res.json();
        setInsumos(data.filter((i: any) => [6, 33, 14, 10, 39, 42].includes(i.id_insumo)));
      }
    } catch (error) {
      console.error("Error cargando insumos", error);
    }
  };

  useEffect(() => { fetchInsumos(); }, []);


  const handleDistribuir = async () => {
    setLoading(true); setMensaje({ tipo: '', texto: '' });
    try {
      const res = await fetch("http://localhost:4000/api/almacen/distribuir-turno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        fecha: new Date().toISOString().split('T')[0],
        turno: turno,
        incluirHerramientas: incluirHerramientas,
        gestor: gestor 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      setMensaje({ tipo: 'success', texto: `${data.mensaje} Se dotaron ${data.operarios} operarios y se entregaron ${data.unidades} unidades.` });
      fetchInsumos(); 
    } catch (error: any) {
      setMensaje({ tipo: 'error', texto: error.message });
    } finally {
      setLoading(false);
    }
  };


  const handleKardex = async () => {
    if (!ciOperario) return;
    setLoading(true); setMensaje({ tipo: '', texto: '' }); setKardexData(null);
    try {
      const res = await fetch(`http://localhost:4000/api/almacen/kardex/${ciOperario}?anio=${new Date().getFullYear()}&gestor=${gestor}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Empleado no encontrado");
      setKardexData(data);
    } catch (error: any) {
      setMensaje({ tipo: 'error', texto: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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

        <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={turno}
            onChange={(e) => setTurno(e.target.value)}
            style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid var(--color-borde, #cbd5e1)", fontSize: "13px", background: "var(--color-bg-primary, #ffffff)", color: "var(--color-texto, #1e293b)" }}
          >
            <option value="MAÑANA">Turno Mañana</option>
            <option value="TARDE">Turno Tarde</option>
            <option value="NOCHE">Turno Noche</option>
          </select>
          
          <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "13px", color: "var(--color-texto, #1e293b)", cursor: "pointer" }}>
            <input type="checkbox" checked={incluirHerramientas} onChange={(e) => setIncluirHerramientas(e.target.checked)} />
            Incluir Herramientas
          </label>

          <button onClick={handleDistribuir} disabled={loading} style={{ padding: "8px 18px", borderRadius: "8px", background: loading ? "#ccc" : "#4f46e5", color: "#ffffff", border: "none", fontSize: "13px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 2px 4px rgba(79,70,229,0.2)" }}>
            🎁 Distribuir Kits EPPs al Turno
          </button>

          <input
            type="number"
            placeholder="Kardex por CI Trabajador..."
            value={ciOperario}
            onChange={(e) => setCiOperario(e.target.value)}
            style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid var(--color-borde, #cbd5e1)", fontSize: "13px", width: "210px", background: "var(--color-bg-primary, #ffffff)", color: "var(--color-texto, #1e293b)" }}
          />
          
          <button onClick={handleKardex} disabled={loading} style={{ padding: "8px 18px", borderRadius: "8px", background: loading ? "#ccc" : "#2563eb", color: "#ffffff", border: "none", fontSize: "13px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}>
            🔍 Consultar Consumo
          </button>
        </div>


        {mensaje.texto && (
          <div style={{ marginTop: "16px", padding: "12px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, background: mensaje.tipo === 'error' ? '#fee2e2' : '#dcfce7', color: mensaje.tipo === 'error' ? '#991b1b' : '#166534', border: `1px solid ${mensaje.tipo === 'error' ? '#f87171' : '#4ade80'}` }}>
            {mensaje.tipo === 'error' ? '⚠️ ' : '✅ '} {mensaje.texto}
          </div>
        )}
      </div>


      <div style={{ display: "grid", gridTemplateColumns: kardexData ? "1fr" : "1fr 1fr", gap: "20px" }}>
        
        {!kardexData && insumos.map((insumo) => {
          const porcentaje = Math.min((insumo.cantidad / 500) * 100, 100);
          return (
            <div key={insumo.id_insumo} style={{ background: "var(--color-bg-secondary, #ffffff)", padding: "20px", borderRadius: "12px", border: "1px solid var(--color-borde, #e2e8f0)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: 700 }}>{insumo.nombre}</h4>
              <div style={{ height: "12px", background: "#e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${porcentaje}%`, background: porcentaje < 20 ? "#ef4444" : "#22c55e", transition: "width 0.5s" }}></div>
              </div>
              <p style={{ margin: "8px 0 0 0", fontSize: "13px", color: "#64748b" }}>Stock disponible: <strong>{insumo.cantidad} uds.</strong></p>
            </div>
          );
        })}

        {kardexData && (
          <div style={{ background: "var(--color-bg-secondary, #ffffff)", padding: "20px 24px", borderRadius: "12px", border: "1px solid var(--color-borde, #e2e8f0)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h4 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>📊 Resultados del Kardex (CI: {ciOperario})</h4>
              <button onClick={() => setKardexData(null)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}>✖ Cerrar</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "20px" }}>
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Total Unidades</p>
                <p style={{ margin: 0, fontSize: "28px", fontWeight: 800, color: "#0f172a" }}>{kardexData.total_unidades_recibidas}</p>
              </div>
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Visitas a Almacén</p>
                <p style={{ margin: 0, fontSize: "28px", fontWeight: 800, color: "#0f172a" }}>{kardexData.frecuencia_solicitudes}</p>
              </div>
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Insumo Principal</p>
                <p style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#0f172a", marginTop: "10px" }}>{kardexData.insumo_predominante}</p>
              </div>
            </div>

            <div>
              <div style={{ marginBottom: "15px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 600, marginBottom: "5px" }}>
                  <span>Consumo del Empleado</span>
                  <span>{kardexData.total_unidades_recibidas} uds</span>
                </div>
                <div style={{ height: "12px", background: "#e2e8f0", borderRadius: "6px" }}>
                  <div style={{ height: "100%", width: `${(kardexData.total_unidades_recibidas / Math.max(kardexData.total_unidades_recibidas, kardexData.promedio_operarios_area, 1)) * 100}%`, background: kardexData.clasificacion_consumo === 'SOBRECONSUMO' ? '#ef4444' : '#22c55e', borderRadius: "6px" }}></div>
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 600, marginBottom: "5px" }}>
                  <span>Promedio de Compañeros</span>
                  <span>{kardexData.promedio_operarios_area} uds</span>
                </div>
                <div style={{ height: "12px", background: "#e2e8f0", borderRadius: "6px" }}>
                  <div style={{ height: "100%", width: `${(kardexData.promedio_operarios_area / Math.max(kardexData.total_unidades_recibidas, kardexData.promedio_operarios_area, 1)) * 100}%`, background: "#3b82f6", borderRadius: "6px" }}></div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "20px", padding: "16px", borderRadius: "8px", background: kardexData.clasificacion_consumo === 'SOBRECONSUMO' ? '#fef2f2' : '#f0fdf4', border: `1px solid ${kardexData.clasificacion_consumo === 'SOBRECONSUMO' ? '#fecaca' : '#bbf7d0'}`, textAlign: "center" }}>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: kardexData.clasificacion_consumo === 'SOBRECONSUMO' ? '#991b1b' : '#166534' }}>
                {kardexData.clasificacion_consumo === 'SOBRECONSUMO' ? '🚨 SOBRECONSUMO DETECTADO' : '✅ CONSUMO ESTÁNDAR'}
              </h3>
            </div>
          </div>
        )}
      </div>
      
<div style={{ marginTop: "20px", padding: "20px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
  <h4 style={{ margin: "0 0 15px 0", fontSize: "16px", fontWeight: 700 }}>🧪 Registrar Entrega Individual (Prueba Trigger)</h4>
  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
    <input type="number" id="ci-prueba" placeholder="CI Empleado (ej. 123)" style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "150px" }} />
    
    <select id="insumo-prueba" style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "200px" }}>
      <option value="6">Guantes Nitrilo M</option>
      <option value="33">Barbijo</option>
      <option value="14">Overol M</option>
    </select>
    
    <input type="number" id="cantidad-prueba" placeholder="Cantidad (ej. 99999)" defaultValue="1" style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "100px" }} />
    
    <button 
      onClick={async () => {
        const ci = (document.getElementById('ci-prueba') as HTMLInputElement).value;
        const id_insumo = (document.getElementById('insumo-prueba') as HTMLSelectElement).value;
        const cantidad = (document.getElementById('cantidad-prueba') as HTMLInputElement).value;
        
        try {
          const res = await fetch('http://localhost:4000/api/almacen/entregas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_insumo, ci, fecha: new Date().toISOString().split('T')[0], cantidad, gestor })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message);
          setMensaje({ tipo: 'success', texto: 'Entrega registrada correctamente.' });
          fetchInsumos(); 
        } catch (error: any) {
          setMensaje({ tipo: 'error', texto: error.message });
        }
      }}
      style={{ padding: "8px 18px", borderRadius: "6px", background: "#0f172a", color: "white", fontWeight: 600, cursor: "pointer", border: "none" }}
    >
      Despachar
    </button>
  </div>
</div>
    </div>
  );
}
