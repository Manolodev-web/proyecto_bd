/**
 * Formatea valores individuales para visualización en celdas de la tabla
 */
export function formatearCelda(valor: any): string {
  if (valor === null || valor === undefined) {
    return "NULL";
  }
  if (typeof valor === "boolean") {
    return valor ? "TRUE" : "FALSE";
  }
  // Detectar formato ISO de fecha: YYYY-MM-DDTHH:mm:ss
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}T/.test(valor)) {
    return valor.split("T")[0];
  }
  return String(valor);
}

/**
 * Exporta el conjunto de datos a un archivo CSV descargable
 */
export function exportToCsv(datos: Record<string, any>[], nombreBase: string = "consulta"): void {
  if (!datos || datos.length === 0) return;

  const cols = Object.keys(datos[0]);
  const cabeceras = cols.map((c) => `"${c.replace(/"/g, '""')}"`).join(",");
  const filas = datos.map((fila) =>
    cols
      .map((col) => {
        const val = formatearCelda(fila[col]);
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  const contenido = "\uFEFF" + [cabeceras, ...filas].join("\n"); // BOM para caracteres especiales UTF-8 en Excel
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  descargarBlob(blob, `${nombreBase}_${Date.now()}.csv`);
}

/**
 * Exporta el conjunto de datos a un archivo JSON formateado
 */
export function exportToJson(datos: Record<string, any>[], nombreBase: string = "consulta"): void {
  if (!datos || datos.length === 0) return;

  const jsonStr = JSON.stringify(datos, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
  descargarBlob(blob, `${nombreBase}_${Date.now()}.json`);
}

/**
 * Copia los datos en formato TSV (Tab Separated Values) ideal para pegar en Excel o Google Sheets
 */
export async function copyTableToTsv(datos: Record<string, any>[]): Promise<boolean> {
  if (!datos || datos.length === 0) return false;

  const cols = Object.keys(datos[0]);
  const cabeceras = cols.join("\t");
  const filas = datos.map((fila) =>
    cols.map((col) => formatearCelda(fila[col]).replace(/\t/g, " ")).join("\t")
  );

  const tsv = [cabeceras, ...filas].join("\n");
  return copyToClipboard(tsv);
}

/**
 * Descarga el script SQL actual como archivo .sql
 */
export function downloadSqlFile(sql: string, nombreBase: string = "script_grupo4"): void {
  if (!sql.trim()) return;

  const blob = new Blob([sql], { type: "text/plain;charset=utf-8;" });
  descargarBlob(blob, `${nombreBase}_${Date.now()}.sql`);
}

/**
 * Utilidad segura para copiar al portapapeles
 */
export async function copyToClipboard(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = texto;
      textarea.style.position = "fixed";
      textarea.style.left = "-999999px";
      textarea.style.top = "-999999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const exito = document.execCommand("copy");
      document.body.removeChild(textarea);
      return exito;
    }
  } catch (err) {
    console.error("Error al copiar al portapapeles:", err);
    return false;
  }
}

function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
