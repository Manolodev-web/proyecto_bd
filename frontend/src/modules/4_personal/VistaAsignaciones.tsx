interface Props {
  asignaciones: any[];
  fechaBusqueda: string;
  cargando: boolean;
  onFechaChange: (fecha: string) => void;
  onBuscar: () => void;
}

export default function VistaAsignaciones({
  asignaciones,
  fechaBusqueda,
  cargando,
  onFechaChange,
  onBuscar,
}: Props) {
  return (
    <div className="contenedor-empleados">
      <h4>Asignaciones de vehículos</h4>

      <div className="formulario-asignacion">
        <div className="campo-asignacion">
          <label>Buscar asignaciones por fecha</label>
          <input
            type="date"
            className="input1"
            value={fechaBusqueda}
            onChange={(e) => onFechaChange(e.target.value)}
          />
        </div>

        <button className="boton1" disabled={cargando} onClick={onBuscar}>
          {cargando ? "Buscando..." : "Buscar"}
        </button>
      </div>

      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Turno</th>
              <th>Vehículo</th>
              <th>Conductor</th>
              <th>Ayudantes</th>
            </tr>
          </thead>
          <tbody>
            {asignaciones.map((asignacion, i) => (
              <tr key={i}>
                <td>{asignacion.fecha}</td>
                <td>{asignacion.turno}</td>
                <td>{asignacion.placa}</td>
                <td>{asignacion.conductor}</td>
                <td>{asignacion.ayudantes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {asignaciones.length === 0 && (
        <p>No hay asignaciones para esta fecha.</p>
      )}
    </div>
  );
}