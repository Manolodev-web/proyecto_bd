interface Props {
  conductores: any[][];
}

export default function VistaLicencias({ conductores }: Props) {
  return (
    <div className="contenedor-empleados">
      <h4>Control de licencias de conductores</h4>

      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>CI</th>
              <th>Conductor</th>
              <th>Categoría</th>
              <th>Vencimiento</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {conductores.map((conductor, i) => (
              <tr key={i}>
                {conductor.map((dato, j) => (
                  <td key={j}>{String(dato ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {conductores.length === 0 && (
        <p>No hay conductores para mostrar.</p>
      )}
    </div>
  );
}