interface Props {
  ciEmpleado: string;
  salario: string;
  mensaje: string;
  cargando: boolean;
  onCiChange: (ci: string) => void;
  onSalarioChange: (salario: string) => void;
  onRegistrar: () => void;
}

export default function FormularioSalario({
  ciEmpleado,
  salario,
  mensaje,
  cargando,
  onCiChange,
  onSalarioChange,
  onRegistrar,
}: Props) {
  return (
    <div className="contenedor-empleados">
      <h4>Modificar salario de empleado</h4>

      <div className="formulario-asignacion">
        <div className="campo-asignacion">
          <label>CI del empleado</label>
          <input
            className="input1"
            type="number"
            value={ciEmpleado}
            onChange={(e) => onCiChange(e.target.value)}
            placeholder="Ingrese el CI"
          />
        </div>

        <div className="campo-asignacion">
          <label>Nuevo salario</label>
          <input
            className="input1"
            type="number"
            min="0"
            step="0.01"
            value={salario}
            onChange={(e) => onSalarioChange(e.target.value)}
            placeholder="Ingrese el nuevo salario"
          />
        </div>
      </div>

      {mensaje && <p className="mensaje-asignacion">{mensaje}</p>}

      <button
        className="boton1"
        disabled={cargando}
        onClick={onRegistrar}
      >
        {cargando ? "Guardando..." : "Actualizar salario"}
      </button>
    </div>
  );
}