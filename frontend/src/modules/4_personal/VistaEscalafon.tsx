import React from "react";

interface Props {
  filas: any[];
}

export default function VistaEscalafon({ filas }: Props) {
  return (
    <div className="contenedor-empleados">
      <h4>Planilla de Escalafón y Antigüedad (Cursor Explícito)</h4>
      <p style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "16px" }}>
        Reporte generado fila por fila mediante el cursor <code>cr_reporte_escalafon_personal</code>, 
        evaluando antigüedad legal (<code>fn_antiguedad_empleado</code>) y bonos de escala laboral.
      </p>

      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>CI</th>
              <th>Empleado</th>
              <th>Rol Laboral</th>
              <th>Fecha Ingreso</th>
              <th>Antigüedad</th>
              <th>Salario Base</th>
              <th>Bono Escalafón</th>
              <th>Líquido Estimado</th>
              <th>Estado Licencia</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((r, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 700, color: "#93c5fd" }}>{r.ci}</td>
                <td>{r.empleado}</td>
                <td>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 600,
                      background: r.rol === "CONDUCTOR" ? "#1e3a8a" : r.rol === "AYUDANTE" ? "#064e3b" : "#374151",
                      color: "#f3f4f6",
                    }}
                  >
                    {r.rol}
                  </span>
                </td>
                <td>{r.fecha_ingreso}</td>
                <td>{r.antiguedad_anios} años</td>
                <td style={{ fontFamily: "monospace" }}>Bs. {Number(r.salario_base || 0).toLocaleString()}</td>
                <td style={{ color: "#34d399", fontWeight: 600, fontFamily: "monospace" }}>
                  +Bs. {Number(r.bono_antiguedad || 0).toLocaleString()}
                </td>
                <td style={{ color: "#fbbf24", fontWeight: 700, fontFamily: "monospace" }}>
                  Bs. {Number(r.salario_total || 0).toLocaleString()}
                </td>
                <td>
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: 700,
                      background:
                        r.estado_licencia === "VIGENTE"
                          ? "#064e3b"
                          : r.estado_licencia === "PROXIMA A VENCER"
                          ? "#78350f"
                          : r.estado_licencia === "VENCIDA"
                          ? "#7f1d1d"
                          : "transparent",
                      color:
                        r.estado_licencia === "VIGENTE"
                          ? "#a7f3d0"
                          : r.estado_licencia === "PROXIMA A VENCER"
                          ? "#fde68a"
                          : r.estado_licencia === "VENCIDA"
                          ? "#fecaca"
                          : "#9ca3af",
                    }}
                  >
                    {r.estado_licencia || "NO APLICA"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filas.length === 0 && (
        <p style={{ marginTop: "16px", color: "#9ca3af" }}>No se encontraron registros de escalafón.</p>
      )}
    </div>
  );
}