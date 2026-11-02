interface Props {
  antiguedades: any[][];
}

export default function VistaAntiguedad({ antiguedades }: Props) {
  return (
    <div className="contenedor-empleados">
      <h4>Antigüedad de empleados</h4>

      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>CI</th>
              <th>Empleado</th>
              <th>Fecha de ingreso</th>
              <th>Antigüedad</th>
            </tr>
          </thead>
          <tbody>
            {antiguedades.map((empleado, i) => (
              <tr key={i}>
                <td>{empleado[0]}</td>
                <td>{empleado[1]}</td>
                <td>{empleado[2]}</td>
                <td>{empleado[3]} años</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {antiguedades.length === 0 && (
        <p>No hay empleados para mostrar.</p>
      )}
    </div>
  );
}