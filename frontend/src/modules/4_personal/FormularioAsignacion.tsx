interface Props {
  tipoAsignacion: string;
  fecha: string;
  turno: string;
  idVehiculo: string;
  ciEmpleado: string;
  vehiculos: any[];
  empleadosDisponibles: any[];
  empleadosSeleccionados: string[];
  mensaje: string;
  cargando: boolean;
  onFechaChange: (fecha: string) => void;
  onTurnoChange: (turno: string) => void;
  onVehiculoChange: (id: string) => void;
  onEmpleadoChange: (ci: string) => void;
  onSeleccionarAyudante: (ci: string) => void;
  onRegistrar: () => void;
}

export default function FormularioAsignacion(props: Props) {
  const esConductor = props.tipoAsignacion === "conductor";

  return (
    <div className="contenedor-empleados">
      <h4>{esConductor ? "Asignar conductor" : "Asignar ayudantes"}</h4>

      <div className="formulario-asignacion">
        <div className="campo-asignacion">
          <label>Fecha</label>
          <input
            type="date"
            className="input1"
            value={props.fecha}
            onChange={(e) => props.onFechaChange(e.target.value)}
          />
        </div>

        <div className="campo-asignacion">
          <label>Turno</label>
          <select
            className="select1"
            value={props.turno}
            onChange={(e) => props.onTurnoChange(e.target.value)}
          >
            <option value="MANANA">Mañana</option>
            <option value="TARDE">Tarde</option>
            <option value="NOCHE">Noche</option>
          </select>
        </div>
      </div>

      <div className="campo-asignacion">
        <label>Seleccionar vehículo</label>
        <select
          className="select1"
          value={props.idVehiculo}
          onChange={(e) => props.onVehiculoChange(e.target.value)}
        >
          <option value="">Seleccionar vehículo</option>
          {props.vehiculos.map((vehiculo) => (
            <option
              key={vehiculo.id_vehiculo}
              value={vehiculo.id_vehiculo}
            >
              {vehiculo.placa} - {vehiculo.tipo} - {vehiculo.modelo}
            </option>
          ))}
        </select>
      </div>

      <h4>{esConductor ? "Conductores disponibles" : "Ayudantes disponibles"}</h4>

      <div className="lista-disponibles">
        {props.empleadosDisponibles.map((empleado) => (
          <label className="empleado-disponible" key={empleado.ci}>
            <input
              type={esConductor ? "radio" : "checkbox"}
              name="personal"
              checked={
                esConductor
                  ? props.ciEmpleado === String(empleado.ci)
                  : props.empleadosSeleccionados.includes(String(empleado.ci))
              }
              onChange={() =>
                esConductor
                  ? props.onEmpleadoChange(String(empleado.ci))
                  : props.onSeleccionarAyudante(String(empleado.ci))
              }
            />
            <span>
              {empleado.nombre} - CI: {empleado.ci}
            </span>
          </label>
        ))}
      </div>

      {props.mensaje && (
        <p className="mensaje-asignacion">{props.mensaje}</p>
      )}

      <div className="acciones">
        <button
          className="boton1"
          disabled={props.cargando}
          onClick={props.onRegistrar}
        >
          {props.cargando ? "Procesando..." : "Registrar"}
        </button>
      </div>
    </div>
  );
}