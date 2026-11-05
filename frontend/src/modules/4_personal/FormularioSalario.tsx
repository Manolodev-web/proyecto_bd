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
      <h4>Modificar Salario de Empleado (Procedimiento Almacenado)</h4>
      <p style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "16px" }}>
        Esta acción ejecuta el procedimiento <code>sp_actualizar_salario_empleado</code> (UPDATE). 
        El registro en la tabla de auditoría <code>HISTORIAL_CAMBIO_SALARIO</code> se inserta automáticamente mediante el trigger <code>tg_historial_cambio_salario</code>.
      </p>

      <div className="formulario-asignacion">
        <div className="campo-asignacion">
          <label>CI del Empleado *</label>
          <input
            className="input1"
            type="number"
            value={ciEmpleado}
            onChange={(e) => onCiChange(e.target.value)}
            placeholder="Ej. 1000001"
          />
        </div>

        <div className="campo-asignacion">
          <label>Nuevo Salario (Bs.) *</label>
          <input
            className="input1"
            type="number"
            min="0"
            step="0.01"
            value={salario}
            onChange={(e) => onSalarioChange(e.target.value)}
            placeholder="Ej. 4500"
          />
        </div>
      </div>

      {mensaje && <p className="mensaje-asignacion">{mensaje}</p>}

      <button
        className="boton1"
        disabled={cargando}
        onClick={onRegistrar}
      >
        {cargando ? "Ejecutando Procedimiento..." : "⚙️ Actualizar Salario (SP)"}
      </button>
    </div>
  );
}