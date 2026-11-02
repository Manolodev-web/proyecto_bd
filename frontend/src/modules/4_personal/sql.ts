export const ejecutarSQL = async (gestor: string, sql: string) => {
  const respuesta = await fetch("http://localhost:4000/api/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ gestor, sql }),
  });

  if (!respuesta.ok) {
    throw new Error("Error al conectar con el servidor.");
  }

  const resultado = await respuesta.json();

  if (resultado.exito === false) {
    throw new Error(resultado.mensaje || "Error al ejecutar la consulta.");
  }

  return resultado.datos || [];
};