import React, { useEffect, useState } from "react";

import "./PersonalModule.css";
import { ejecutarSQL } from "./sql";

import VistaEmpleados from "./VistaEmpleados";
import VistaAntiguedad from "./VistaAntiguedad";
import VistaLicencias from "./VistaLicencias";
import VistaHistorialSalarios from "./VistaHistorialSalarios";
import VistaEscalafon from "./VistaEscalafon";
import FormularioSalario from "./FormularioSalario";

interface Props {
  gestor: string;
}

export default function PersonalModule({ gestor }: Props) {
  // Vista activa por defecto: Planilla y Escalafón (Cursor)
  const [vista, setVista] = useState("escalafon");

  const [empleados, setEmpleados] = useState<any[][]>([]);
  const [antiguedades, setAntiguedades] = useState<any[][]>([]);
  const [conductores, setConductores] = useState<any[][]>([]);
  const [historial, setHistorial] = useState<any[][]>([]);
  const [escalafon, setEscalafon] = useState<any[]>([]);

  const [ciEmpleado, setCiEmpleado] = useState("");
  const [salario, setSalario] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  // 1. Cursor Explícito de Escalafón y Planilla (Vista Principal)
  const consultarEscalafonCursor = async () => {
    try {
      setCargando(true);
      setMensaje("");
      const entorno = localStorage.getItem("recoleccion_entorno") || "local";

      const res = await fetch("http://localhost:4000/api/personal/escalafon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-database-env": entorno,
          "x-database-engine": gestor,
        },
        body: JSON.stringify({ gestor, tipo_filtro: "TODOS" }),
      });

      const data = await res.json();
      if (!res.ok || !data.exito) {
        throw new Error(data.error || "Error al ejecutar el cursor de escalafón.");
      }

      setEscalafon(data.datos || []);
      setVista("escalafon");
    } catch (error: any) {
      console.error("Error en cursor escalafón:", error);
      setMensaje(error.message || "Error al ejecutar cursor de escalafón.");
    } finally {
      setCargando(false);
    }
  };

  // Cargar escalafón al montar el componente
  useEffect(() => {
    consultarEscalafonCursor();
  }, [gestor]);

  // 2. Consulta estándar de empleados
  const consultarEmpleados = async () => {
    try {
      setCargando(true);
      const datos = await ejecutarSQL(
        gestor,
        `
        SELECT
          ci,
          CONCAT(nombre, ' ', paterno, ' ', materno) as nombre,
          TO_CHAR(fechanac, 'dd/mm/yyyy') as nacimiento,
          telefono,
          direccion,
          TO_CHAR(fecha_ingreso, 'dd/mm/yyyy') as ingreso,
          salario,
          genero
        FROM EMPLEADO
        ORDER BY paterno, materno;
        `
      );

      setEmpleados(datos.map((empleado: any) => Object.values(empleado)));
      setVista("empleados");
      setMensaje("");
    } catch (error) {
      console.error("Error al consultar empleados:", error);
      setMensaje("Error al consultar empleados.");
    } finally {
      setCargando(false);
    }
  };

  // 3. Consulta de antigüedad analítica (fn_antiguedad_empleado)
  const consultarAntiguedad = async () => {
    try {
      setCargando(true);
      const datos = await ejecutarSQL(
        gestor,
        `
        SELECT 
          ci, 
          CONCAT(nombre, ' ', paterno, ' ', materno) as empleado,
          TO_CHAR(fecha_ingreso, 'dd/mm/yyyy') as fecha_ingreso,
          antiguedad_empleado(ci) as antiguedad
        FROM EMPLEADO
        ORDER BY antiguedad_empleado(ci) DESC;
        `
      );

      setAntiguedades(datos.map((empleado: any) => Object.values(empleado)));
      setVista("antiguedad");
      setMensaje("");
    } catch (error) {
      console.error("Error al consultar antigüedad:", error);
      setMensaje("Error al consultar antigüedad.");
    } finally {
      setCargando(false);
    }
  };

  // 4. Control de licencias de choferes
  const consultarLicencias = async () => {
    try {
      setCargando(true);
      const datos = await ejecutarSQL(
        gestor,
        `
        SELECT 
          e.ci,
          CONCAT(e.nombre, ' ', e.paterno, ' ', e.materno) as conductor,
          c.categoria,
          TO_CHAR(c.vencimiento_licencia, 'dd/mm/yyyy') as vencimiento,
          CASE
            WHEN c.vencimiento_licencia < CURRENT_DATE THEN 'VENCIDA'
            WHEN c.vencimiento_licencia <= CURRENT_DATE + 30 THEN 'PROXIMA A VENCER'
            ELSE 'VIGENTE'
          END as estado
        FROM EMPLEADO e
        INNER JOIN CONDUCTOR c ON c.ci = e.ci
        ORDER BY c.vencimiento_licencia ASC;
        `
      );

      setConductores(datos.map((conductor: any) => Object.values(conductor)));
      setVista("licencias");
      setMensaje("");
    } catch (error) {
      console.error("Error al consultar licencias:", error);
      setMensaje("Error al consultar licencias.");
    } finally {
      setCargando(false);
    }
  };

  // 5. Procedimiento Almacenado: Modificar Salario (UPDATE en EMPLEADO -> INSERT en HISTORIAL vía Trigger)
  const registrarSalario = async () => {
    if (!ciEmpleado || !salario) {
      setMensaje("Completa el CI y el nuevo salario.");
      return;
    }

    try {
      setCargando(true);
      setMensaje("");
      const entorno = localStorage.getItem("recoleccion_entorno") || "local";

      const res = await fetch("http://localhost:4000/api/personal/actualizar-salario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-database-env": entorno,
          "x-database-engine": gestor,
        },
        body: JSON.stringify({
          gestor,
          ci: Number(ciEmpleado),
          salario: Number(salario),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.exito) {
        throw new Error(data.error || "Error al actualizar salario vía procedimiento.");
      }

      setMensaje(data.mensaje || "Salario actualizado correctamente.");
      setCiEmpleado("");
      setSalario("");
      // Refrescar escalafón para ver el nuevo salario reflejado
      await consultarEscalafonCursor();
    } catch (error: any) {
      setMensaje(error.message || "Error al actualizar salario.");
    } finally {
      setCargando(false);
    }
  };

  // 6. Consultar Historial Salarial (Auditado exclusivamente por el Trigger)
  const consultarHistorial = async () => {
    try {
      setCargando(true);
      setMensaje("");

      const datos = await ejecutarSQL(
        gestor,
        `
        SELECT 
          h.id,
          h.ci,
          CONCAT(e.nombre, ' ', e.paterno, ' ', e.materno) as empleado,
          h.salario_anterior,
          h.salario_nuevo,
          TO_CHAR(h.fecha_cambio, 'dd/mm/yyyy HH24:MI:SS') as fecha_cambio
        FROM HISTORIAL_CAMBIO_SALARIO h
        INNER JOIN EMPLEADO e ON e.ci = h.ci
        ORDER BY h.fecha_cambio DESC, h.id DESC;
        `
      );

      setHistorial(datos.map((registro: any) => Object.values(registro)));
      setVista("historial");
    } catch (error) {
      console.error("Error al consultar historial:", error);
      setMensaje("Error al consultar historial.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="contenedor">
      <div className="tarjeta">
        <h3>Módulo 4: Gestión de Cuadrillas, Choferes y Escalafón Salarial</h3>
        <p>
          Motor activo: <strong className="motor">{gestor}</strong> | Objetos:{" "}
          <code>sp_actualizar_salario_empleado</code> (UPDATE), <code>tg_historial_cambio_salario</code> (INSERT),{" "}
          <code>cr_reporte_escalafon_personal</code>, <code>antiguedad_empleado</code>
        </p>

        {/* Acciones principales limpias (Sin botones de inserción manual) */}
        <div className="acciones">
          <button 
            className={vista === "escalafon" ? "boton1" : "boton2"} 
            onClick={consultarEscalafonCursor}
          >
            📈 Planilla y Escalafón (Cursor)
          </button>

          <button 
            className={vista === "empleados" ? "boton1" : "boton2"} 
            onClick={consultarEmpleados}
          >
            Lista de empleados
          </button>

          <button 
            className={vista === "antiguedad" ? "boton1" : "boton2"} 
            onClick={consultarAntiguedad}
          >
            Antigüedad (Función)
          </button>

          <button 
            className={vista === "licencias" ? "boton1" : "boton2"} 
            onClick={consultarLicencias}
          >
            Control de licencias
          </button>

          <button
            className={vista === "salario" ? "boton1" : "boton2"}
            onClick={() => {
              setMensaje("");
              setCiEmpleado("");
              setSalario("");
              setVista("salario");
            }}
          >
            ⚙️ Modificar salario (SP)
          </button>

          <button 
            className={vista === "historial" ? "boton1" : "boton2"} 
            onClick={consultarHistorial}
          >
            🛡️ Historial Salarial (Trigger)
          </button>
        </div>
      </div>

      <div className="desarrollo">
        {mensaje && vista !== "salario" && (
          <p className="mensaje-asignacion">{mensaje}</p>
        )}

        {cargando && <p style={{ color: "#93c5fd" }}>Cargando datos desde la base de datos...</p>}

        {vista === "escalafon" && <VistaEscalafon filas={escalafon} />}

        {vista === "empleados" && <VistaEmpleados empleados={empleados} />}

        {vista === "antiguedad" && <VistaAntiguedad antiguedades={antiguedades} />}

        {vista === "licencias" && <VistaLicencias conductores={conductores} />}

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

        {vista === "historial" && <VistaHistorialSalarios historial={historial} />}
      </div>
    </div>
  );
}