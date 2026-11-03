export const ejecutarSQL = async (gestor: string, sql: string) => {
  const entorno = localStorage.getItem("recoleccion_entorno") || "local";

  const respuesta = await fetch("http://localhost:4000/api/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-database-engine": gestor,
      "x-database-env": entorno,
    },
    body: JSON.stringify({ gestor, entorno, sql }),
  });

  if (!respuesta.ok) {
    throw new Error("Error al conectar con el servidor.");
  }

  const resultado = await respuesta.json();

  if (resultado.exito === false) {
    throw new Error(resultado.error || resultado.mensaje || "Error al ejecutar la consulta.");
  }

  return resultado.datos || [];
};