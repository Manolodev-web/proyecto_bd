interface Props {
  empleados: any[][];
}

export default function VistaEmpleados({ empleados }: Props) {
  return (
    <div className="contenedor-empleados">
      <h4>Lista de empleados</h4>

      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>CI</th>
              <th>Nombre</th>
              <th>F. nacimiento</th>
              <th>Teléfono</th>
              <th>Dirección</th>
              <th>F. ingreso</th>
              <th>Salario</th>
              <th>Género</th>
            </tr>
          </thead>
          <tbody>
            {empleados.map((empleado, i) => (
              <tr key={i}>
                {empleado.map((dato, j) => (
                  <td key={j}>{String(dato ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {empleados.length === 0 && <p>No hay empleados para mostrar.</p>}
    </div>
  );
}