interface Props {
  historial: any[][];
}

export default function VistaHistorialSalarios({ historial }: Props) {
  return (
    <div className="contenedor-empleados">
      <h4>Historial de cambios salariales</h4>

      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>ID</th>
              <th>CI</th>
              <th>Empleado</th>
              <th>Salario anterior</th>
              <th>Salario nuevo</th>
              <th>Fecha del cambio</th>
            </tr>
          </thead>
          <tbody>
            {historial.map((registro, i) => (
              <tr key={i}>
                {registro.map((dato, j) => (
                  <td key={j}>{String(dato ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {historial.length === 0 && (
        <p>No hay cambios salariales registrados.</p>
      )}
    </div>
  );
}