import React, { useEffect, useState } from "react";

import "./PersonalModule.css";
import { ejecutarSQL } from "./sql";

import VistaEmpleados from "./VistaEmpleados";
import VistaAsignaciones from "./VistaAsignaciones";
import VistaAntiguedad from "./VistaAntiguedad";
import VistaLicencias from "./VistaLicencias";
import VistaHistorialSalarios from "./VistaHistorialSalarios";

import FormularioAsignacion from "./FormularioAsignacion";
import FormularioSalario from "./FormularioSalario";

interface Props {
  gestor: string;
}

export default function PersonalModule({ gestor }: Props) {
  const obtenerFechaActual = () => {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
  };

  const [vista, setVista] = useState("empleados");

  const [empleados, setEmpleados] = useState<any[][]>([]);
  const [antiguedades, setAntiguedades] = useState<any[][]>([]);
  const [conductores, setConductores] = useState<any[][]>([]);
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[][]>([]);

  const [tipoAsignacion, setTipoAsignacion] = useState("");
  const [fecha, setFecha] = useState(obtenerFechaActual());
  const [fechaBusqueda, setFechaBusqueda] = useState(obtenerFechaActual());
  const [turno, setTurno] = useState("MANANA");

  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [empleadosDisponibles, setEmpleadosDisponibles] = useState<any[]>([]);

  const [idVehiculo, setIdVehiculo] = useState("");
  const [ciEmpleado, setCiEmpleado] = useState("");
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<string[]>([]);

  const [salario, setSalario] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  const consultarEmpleados = async () => {
    try {
      const datos = await ejecutarSQL(
        gestor,
        `
        select
        ci,concat(nombre, ' ', paterno, ' ', materno) as nombre,
        to_char(fechanac, 'dd/mm/yyyy') as nacimiento,telefono,direccion,
        to_char(fecha_ingreso, 'dd/mm/yyyy') as ingreso,salario,genero
        from empleado
        order by paterno, materno;
        `
      );

      setEmpleados(datos.map((empleado: any) => Object.values(empleado)));
    } catch (error) {
      console.error("Error:", error);
      setMensaje("Error");
    }
  };

  useEffect(() => {
    consultarEmpleados();
  }, [gestor]);



  useEffect(() => {
    if (vista !== "formulario") return;

    const cargarDatos = async () => {
      try {
        setCargando(true);
        setMensaje("");

        const filtroVehiculo =
          tipoAsignacion === "conductor"
            ? "AND c.ci IS NULL"
            : "AND c.ci IS NOT NULL";

        const datosVehiculos = await ejecutarSQL(
          gestor,
          `
          select v.id_vehiculo, v.placa,v.tipo,v.modelo,c.ci,
          concat(e.nombre, ' ', e.paterno, ' ', e.materno) as conductor
          from vehiculo v
          left join conduce c on c.id_vehiculo = v.id_vehiculo
          and c.fecha = '${fecha}'::date and c.turno = '${turno}'
          left join empleado e on e.ci = c.ci
          where 1 = 1
          ${filtroVehiculo}
          order by v.placa;
          `
        );

        setVehiculos(datosVehiculos);

        let datosEmpleados: any[] = [];

        if (tipoAsignacion === "conductor") {
          datosEmpleados = await ejecutarSQL(
            gestor,
            `
            select e.ci,concat(e.nombre, ' ', e.paterno, ' ', e.materno) as nombre
            from empleado e
            inner join conductor c on c.ci = e.ci
            where not exists (
            select 1
            from conduce co
            where co.ci = e.ci
            and co.fecha = '${fecha}'::date and co.turno = '${turno}'
            )
            and not exists (
            select 1
            from asigna_ayudante a
            where a.ci = e.ci
            and a.fecha = '${fecha}'::date
            and a.turno = '${turno}'
            )
            order by e.paterno, e.materno;
          
          `);
        } else {
          datosEmpleados = await ejecutarSQL(
            gestor,
            `
            select e.ci, concat(e.nombre, ' ', e.paterno, ' ', e.materno) as nombre
            from empleado e
            inner join ayudante a on a.ci = e.ci
            where not exists (
            select 1
            from conduce c
            where c.ci = e.ci and c.fecha = '${fecha}'::date and c.turno = '${turno}'
            )
            and not exists (
            select 1
            from asigna_ayudante aa
            where aa.ci = e.ci and aa.fecha = '${fecha}'::date and aa.turno = '${turno}'
            )
            order by e.paterno, e.materno;
          `);
        }

        setEmpleadosDisponibles(datosEmpleados);
      } catch (error) {
        console.error("Error:", error);
        setMensaje("Error");
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, [vista, tipoAsignacion, fecha, turno, gestor]);

  const consultarAntiguedad = async () => {
    try {
      setCargando(true);

      const datos = await ejecutarSQL(
        gestor,
        `
        select ci, concat(nombre, ' ', paterno, ' ', materno) as empleado,
        to_char(fecha_ingreso, 'dd/mm/yyyy') as fecha_ingreso,
        antiguedad_empleado(ci) as antiguedad
        from empleado
        order by antiguedad_empleado(ci) desc;
        `
      );

      setAntiguedades(datos.map((empleado: any) => Object.values(empleado)));
      setVista("antiguedad");
      setMensaje("");
    } catch (error) {
      console.error("Error :", error);
      setMensaje("Error");
    } finally {
      setCargando(false);
    }
  };

  const consultarLicencias = async () => {
    try {
      setCargando(true);

      const datos = await ejecutarSQL(
        gestor,
        `
        select e.ci,concat(e.nombre, ' ', e.paterno, ' ', e.materno) as conductor,c.categoria,
        to_char(c.vencimiento_licencia, 'dd/mm/yyyy') as vencimiento,
        case
        when c.vencimiento_licencia < current_date then 'vencida'
        when c.vencimiento_licencia <= current_date + 30 then 'proxima a vencer'
        else 'vigente'
        end as estado
        from empleado e
        inner join conductor c on c.ci = e.ci
        order by c.vencimiento_licencia asc;
        `
      );

      setConductores(datos.map((conductor: any) => Object.values(conductor)));
      setVista("licencias");
      setMensaje("");
    } catch (error) {
      console.error("Error:", error);
      setMensaje("Error");
    } finally {
      setCargando(false);
    }
  };


  const consultarAsignaciones = async (fechaConsulta: string) => {
    if (!fechaConsulta) {
      setMensaje("Selecciona una fecha.");
      return;
    }

    try {
      setCargando(true);
      setMensaje("");

      const datos = await ejecutarSQL(
        gestor,
        `
        select
        to_char(c.fecha, 'dd/mm/yyyy') as fecha,c.turno,v.placa,
        concat(e.nombre, ' ', e.paterno, ' ', e.materno) as conductor,
        string_agg(
        distinct concat(ea.nombre, ' ', ea.paterno, ' ', ea.materno),
        ', '
        ) as ayudantes
        from conduce c
        inner join vehiculo v on v.id_vehiculo = c.id_vehiculo
        inner join empleado e on e.ci = c.ci
        left join asigna_ayudante a on a.id_vehiculo = c.id_vehiculo
        and a.fecha = c.fecha and a.turno = c.turno
        left join empleado ea on ea.ci = a.ci
        where c.fecha = '${fechaConsulta}'::date
        group byc.fecha,c.turno,v.placa,e.nombre,e.paterno,e.materno
        order by c.turno, v.placa;
        `
      );

      setAsignaciones(datos);
      setFechaBusqueda(fechaConsulta);
      setVista("asignaciones");
    } catch (error) {
      console.error("Error asignacion:", error);
      setMensaje("Error");
    } finally {
      setCargando(false);
    }
  };

  const abrirAsignacion = (tipo: string) => {
    setTipoAsignacion(tipo);
    setVista("formulario");
    setIdVehiculo("");
    setCiEmpleado("");
    setEmpleadosSeleccionados([]);
    setMensaje("");
  };

  const seleccionarEmpleado = (ci: string) => {
    setEmpleadosSeleccionados((actuales) => {
      if (actuales.includes(ci)) {
        return actuales.filter((item) => item !== ci);
      }

      return [...actuales, ci];
    });
  };

  const registrarConductor = async () => {
    if (!ciEmpleado || !idVehiculo || !fecha) {
      setMensaje("Completa");
      return;
    }

    try {
      setCargando(true);
      setMensaje("");

      await ejecutarSQL(
        gestor,
        `
        select asigna_conductor(
          ${Number(ciEmpleado)},
          ${Number(idVehiculo)},
          '${fecha}'::DATE,
          '${turno}'
        );
        `
      );

      setMensaje("Conductor asignado");
      setCiEmpleado("");
    } catch (error: any) {
      setMensaje(error.message || "Error");
    } finally {
      setCargando(false);
    }
  };

  const registrarAyudantes = async () => {
    if (!idVehiculo || empleadosSeleccionados.length === 0 || !fecha) {
      setMensaje("Selecciona un vehículo y un ayudante");
      return;
    }

    try {
      setCargando(true);
      setMensaje("");

      for (const ci of empleadosSeleccionados) {
        await ejecutarSQL(
          gestor,
          `
          select asigna_ayudante(
            ${Number(ci)},
            ${Number(idVehiculo)},
            '${fecha}'::DATE,
            '${turno}'
          );
          `
        );
      }

      setMensaje("Ayudantes asignados");
      setEmpleadosSeleccionados([]);
    } catch (error: any) {
      setMensaje(error.message || "Error");
    } finally {
      setCargando(false);
    }
  };

  const registrarSalario = async () => {
    if (!ciEmpleado || !salario) {
      setMensaje("Completa todos los campos.");
      return;
    }

    try {
      setCargando(true);
      setMensaje("");

      await ejecutarSQL(
        gestor,
        `
        update empleado
        set salario = ${Number(salario)}
        where ci = ${Number(ciEmpleado)};
        `
      );

      setMensaje("Salario actualizado");
      setCiEmpleado("");
      setSalario("");

      await consultarEmpleados();
    } catch (error: any) {
      setMensaje(error.message || "Error");
    } finally {
      setCargando(false);
    }
  };

  const consultarHistorial = async () => {
    try {
      setCargando(true);
      setMensaje("");

      const datos = await ejecutarSQL(
        gestor,
        `
        select h.id,h.ci,
        concat(e.nombre, ' ', e.paterno, ' ', e.materno) as empleado,
        h.salario_anterior,
        h.salario_nuevo,
        to_char(h.fecha_cambio, 'dd/mm/yyyy') as fecha_cambio
        from historial_cambio_salario h
        inner join empleado e on e.ci = h.ci
        order by h.fecha_cambio desc, h.id desc;

        `
      );

      setHistorial(datos.map((registro: any) => Object.values(registro)));
      setVista("historial");
    } catch (error) {
      console.error("Error historial:", error);
      setMensaje("Error");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="contenedor">
      <div className="tarjeta">
        <h3>
          Módulo 4: Gestión de Cuadrillas, Choferes y Escalafón Salarial
        </h3>

        <p>
          Motor activo: <strong className="motor">{gestor}</strong>
        </p>

        <div className="acciones">
          <button
            className="boton1"
            onClick={() => consultarAsignaciones(obtenerFechaActual())}
          >
            Asignaciones de hoy
          </button>

          <button
            className="boton1"
            onClick={() => abrirAsignacion("conductor")}
          >
            Asignar conductor
          </button>

          <button
            className="boton1"
            onClick={() => abrirAsignacion("ayudante")}
          >
            Asignar ayudantes
          </button>

          <button className="boton1" onClick={consultarAntiguedad}>
            Antigüedad
          </button>

          <button className="boton1" onClick={consultarLicencias}>
            Control de licencias
          </button>

          <button
            className="boton1"
            onClick={() => {
              setMensaje("");
              setCiEmpleado("");
              setSalario("");
              setVista("salario");
            }}
          >
            Modificar salario
          </button>

          <button className="boton2" onClick={consultarHistorial}>
            Historial salarial
          </button>
        </div>
      </div>

      <div className="desarrollo">
        {mensaje && vista !== "formulario" && vista !== "salario" && (
          <p className="mensaje-asignacion">{mensaje}</p>
        )}

        {vista === "empleados" && (
          <VistaEmpleados empleados={empleados} />
        )}

        {vista === "formulario" && (
          <FormularioAsignacion
            tipoAsignacion={tipoAsignacion}
            fecha={fecha}
            turno={turno}
            idVehiculo={idVehiculo}
            ciEmpleado={ciEmpleado}
            vehiculos={vehiculos}
            empleadosDisponibles={empleadosDisponibles}
            empleadosSeleccionados={empleadosSeleccionados}
            mensaje={mensaje}
            cargando={cargando}
            onFechaChange={(nuevaFecha) => {
              setFecha(nuevaFecha);
              setIdVehiculo("");
              setCiEmpleado("");
              setEmpleadosSeleccionados([]);
            }}
            onTurnoChange={(nuevoTurno) => {
              setTurno(nuevoTurno);
              setIdVehiculo("");
              setCiEmpleado("");
              setEmpleadosSeleccionados([]);
            }}
            onVehiculoChange={setIdVehiculo}
            onEmpleadoChange={setCiEmpleado}
            onSeleccionarAyudante={seleccionarEmpleado}
            onRegistrar={
              tipoAsignacion === "conductor"
                ? registrarConductor
                : registrarAyudantes
            }
          />
        )}

        {vista === "asignaciones" && (
          <VistaAsignaciones
            asignaciones={asignaciones}
            fechaBusqueda={fechaBusqueda}
            cargando={cargando}
            onFechaChange={setFechaBusqueda}
            onBuscar={() => consultarAsignaciones(fechaBusqueda)}
          />
        )}

        {vista === "antiguedad" && (
          <VistaAntiguedad antiguedades={antiguedades} />
        )}

        {vista === "licencias" && (
          <VistaLicencias conductores={conductores} />
        )}

        {vista === "salario" && (
          <FormularioSalario
            ciEmpleado={ciEmpleado}
            salario={salario}
            mensaje={mensaje}
            cargando={cargando}
            onCiChange={setCiEmpleado}
            onSalarioChange={setSalario}
            onRegistrar={registrarSalario}
          />
        )}

        {vista === "historial" && (
          <VistaHistorialSalarios historial={historial} />
        )}
      </div>
    </div>
  );
}