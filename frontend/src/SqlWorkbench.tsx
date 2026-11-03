import { useState, useEffect, useCallback } from "react";
import "./App.css";

import { Sidebar } from "./components/Sidebar";
import { SqlEditor } from "./components/SqlEditor";
import { ResultsTable } from "./components/ResultsTable";
import { Toast } from "./components/Toast";

import type {
  ResultadoConsulta,
  HistorialItem,
  TabConsulta,
  ToastMessage,
} from "./types";
import { resolveTableNamesCase } from "./utils/sqlNormalizer";

const LOCAL_STORAGE_HISTORY_KEY = "recoleccion_sql_historial";
const LOCAL_STORAGE_FAVS_KEY = "recoleccion_sql_favoritas";
const LOCAL_STORAGE_THEME_KEY = "recoleccion_sql_tema";

interface SqlWorkbenchProps {
  entorno?: "local" | "docker";
}

export default function SqlWorkbench({ entorno: entornoProp }: SqlWorkbenchProps) {
  // 1. Estado de Tema (Modo Oscuro / Claro)
  const [modoOscuro, setModoOscuro] = useState<boolean>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
    return saved !== null ? saved === "dark" : true;
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, modoOscuro ? "dark" : "light");
  }, [modoOscuro]);

  // 2. Entorno Activo (Local vs Docker)
  const [entorno, setEntorno] = useState<"local" | "docker">(() => {
    if (entornoProp) return entornoProp;
    const guardado = localStorage.getItem("recoleccion_entorno");
    return (guardado as "local" | "docker") || "docker";
  });

  const cambiarEntorno = () => {
    const nuevo = entorno === "local" ? "docker" : "local";
    setEntorno(nuevo);
    localStorage.setItem("recoleccion_entorno", nuevo);
    mostrarToast(
      `Cambiado a ${nuevo === "docker" ? "Contenedores Docker" : "Bases de Datos Locales"}`,
      "info"
    );
  };

  // 3. Motor de Base de Datos Activo
  const [gestor, setGestor] = useState<string>("postgres");

  // 4. Comprobación de salud del Backend
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  // 5. Bandera de auto-resolución de nombres de tablas a MAYÚSCULAS para MySQL
  const [autoResolverTablas, setAutoResolverTablas] = useState<boolean>(true);

  // 6. Pestañas de Consultas (Multi-tabs)
  const [tabs, setTabs] = useState<TabConsulta[]>([
    {
      id: "tab-1",
      titulo: "Consulta 1",
      sql: "",
      gestor: "postgres",
    },
  ]);
  const [tabActivaId, setTabActivaId] = useState<string>("tab-1");

  // 7. Estado de Ejecución y Resultados
  const [cargando, setCargando] = useState<boolean>(false);
  const [resultado, setResultado] = useState<ResultadoConsulta | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 8. Notificaciones Toast Flotantes
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const mostrarToast = useCallback(
    (mensaje: string, tipo: ToastMessage["tipo"] = "info") => {
      const id = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      setToasts((prev) => [...prev, { id, tipo, mensaje }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  const cerrarToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 9. Historial y Consultas Favoritas en localStorage
  const [historial, setHistorial] = useState<HistorialItem[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [favoritas, setFavoritas] = useState<HistorialItem[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_FAVS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(historial));
    } catch (e) {
      console.error("Error guardando historial:", e);
    }
  }, [historial]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_FAVS_KEY, JSON.stringify(favoritas));
    } catch (e) {
      console.error("Error guardando favoritas:", e);
    }
  }, [favoritas]);

  // Tab activa actual
  const tabActiva = tabs.find((t) => t.id === tabActivaId) || tabs[0];
  const sqlQuery = tabActiva ? tabActiva.sql : "";

  const setSqlQuery = (nuevoSql: string | ((prev: string) => string)) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === tabActivaId) {
          const sqlFinal = typeof nuevoSql === "function" ? nuevoSql(t.sql) : nuevoSql;
          return { ...t, sql: sqlFinal };
        }
        return t;
      })
    );
  };

  // Comprobar salud al iniciar la app
  useEffect(() => {
    let cancelado = false;
    const comprobarInicial = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch("http://localhost:4000/api/health", {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!cancelado) {
          setBackendOnline(res.ok);
        }
      } catch {
        if (!cancelado) {
          setBackendOnline(false);
        }
      }
    };

    comprobarInicial();
    return () => {
      cancelado = true;
    };
  }, []);

  // 10. Lógica de Pestañas
  const handleCrearTab = () => {
    const nuevoNumero = tabs.length + 1;
    const nuevoId = `tab-${Date.now()}`;
    const nuevaTab: TabConsulta = {
      id: nuevoId,
      titulo: `Consulta ${nuevoNumero}`,
      sql: "",
      gestor,
    };
    setTabs((prev) => [...prev, nuevaTab]);
    setTabActivaId(nuevoId);
    mostrarToast(`Nueva pestaña "Consulta ${nuevoNumero}" creada`, "info");
  };

  const handleCerrarTab = (id: string) => {
    if (tabs.length <= 1) return;
    const nuevosTabs = tabs.filter((t) => t.id !== id);
    setTabs(nuevosTabs);
    if (tabActivaId === id) {
      setTabActivaId(nuevosTabs[nuevosTabs.length - 1].id);
    }
  };

  // 11. Ejecución de la Consulta SQL
  const ejecutarSQL = async () => {
    let queryOriginal = sqlQuery.trim();
    if (!queryOriginal) {
      queryOriginal = "SELECT * FROM EMPLEADO;";
    }

    setCargando(true);
    setError(null);

    let sqlParaEnviar = queryOriginal;
    if (autoResolverTablas && gestor === "mysql") {
      const sqlResuelto = resolveTableNamesCase(queryOriginal);
      if (sqlResuelto !== queryOriginal) {
        sqlParaEnviar = sqlResuelto;
      }
    }

    try {
      const res = await fetch("http://localhost:4000/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-database-engine": gestor,
          "x-database-env": entorno,
        },
        body: JSON.stringify({
          gestor,
          sql: sqlParaEnviar,
          entorno,
        }),
      });

      const data = await res.json();

      if (!data.exito) {
        setError(data.error || "Ocurrió un error al ejecutar la sentencia.");
        setResultado(null);
        mostrarToast(`Error en ${gestor.toUpperCase()}: ${data.error}`, "error");
      } else {
        setResultado(data);
        mostrarToast(
          `Consulta exitosa en ${gestor.toUpperCase()}: ${data.totalFilas} filas (${data.tiempoMs} ms)`,
          "exito"
        );

        const nuevoHistorialItem: HistorialItem = {
          id: `hist_${Date.now()}`,
          gestor,
          sql: queryOriginal,
          fecha: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          tiempoMs: data.tiempoMs,
          filas: data.totalFilas,
          esFavorita: false,
        };

        setHistorial((prev) => [nuevoHistorialItem, ...prev.slice(0, 49)]);
      }
    } catch {
      setError(
        "No se pudo conectar con el servidor Backend en http://localhost:4000. Verifica que el backend esté iniciado."
      );
      setResultado(null);
      setBackendOnline(false);
      mostrarToast("Fallo de conexión con el backend", "error");
    } finally {
      setCargando(false);
    }
  };

  // 12. Acciones del Sidebar hacia el Editor
  const insertarEnEditor = (texto: string) => {
    setSqlQuery((prev) => prev + texto);
    mostrarToast(`Insertado: "${texto.trim()}"`, "info");
  };

  const cargarConsulta = (sql: string) => {
    setSqlQuery(sql);
    mostrarToast("Consulta cargada en el editor", "info");
  };

  // 13. Manejo de Favoritas
  const toggleFavorita = (item: HistorialItem) => {
    const yaEsFavorita = favoritas.some((f) => f.id === item.id);
    if (yaEsFavorita) {
      setFavoritas((prev) => prev.filter((f) => f.id !== item.id));
      setHistorial((prev) =>
        prev.map((h) => (h.id === item.id ? { ...h, esFavorita: false } : h))
      );
      mostrarToast("Consulta eliminada de Favoritas", "info");
    } else {
      const itemFav = { ...item, esFavorita: true };
      setFavoritas((prev) => [itemFav, ...prev]);
      setHistorial((prev) =>
        prev.map((h) => (h.id === item.id ? { ...h, esFavorita: true } : h))
      );
      mostrarToast("Consulta guardada en Favoritas", "exito");
    }
  };

  const limpiarHistorial = () => {
    setHistorial([]);
    mostrarToast("Historial de consultas vaciado", "info");
  };

  const eliminarHistorialItem = (id: string) => {
    setHistorial((prev) => prev.filter((h) => h.id !== id));
  };

  return (
    <div className={`app-layout ${modoOscuro ? "" : "modo-claro"}`} style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Barra de Controles Superior del Workbench */}
      <div style={{
        padding: "8px 16px",
        background: "var(--color-bg-secondary, #1E3E62)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "12px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Selector de Gestor */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", fontSize: "11px" }}>Motor:</span>
            <select
              value={gestor}
              onChange={(e) => setGestor(e.target.value)}
              style={{
                padding: "4px 8px",
                borderRadius: "6px",
                background: "rgba(0,0,0,0.3)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <option value="postgres">🐘 PostgreSQL</option>
              <option value="mysql">🐬 MySQL 8.0</option>
              <option value="sqlserver">🪟 SQL Server</option>
              <option value="oracle">🔴 Oracle XE</option>
            </select>
          </div>

          {/* BOTÓN TOGGLE LOCAL / DOCKER */}
          <button
            onClick={cambiarEntorno}
            style={{
              padding: "4px 12px",
              borderRadius: "14px",
              background: entorno === "docker" ? "#0284c7" : "#059669",
              color: "#fff",
              border: "none",
              fontWeight: 700,
              fontSize: "11px",
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
            }}
            title="Alternar entre conexión Local y Docker"
          >
            {entorno === "docker" ? "🐳 Docker (5433/3307)" : "💻 Local (5432/3306)"}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            display: "inline-block",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: backendOnline ? "#10b981" : "#ef4444"
          }} />
          <span style={{ color: "#94a3b8", fontSize: "11px" }}>
            {backendOnline ? "API Conectada" : "Sin Conexión"}
          </span>
          <button
            onClick={() => setModoOscuro(!modoOscuro)}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff",
              borderRadius: "6px",
              padding: "2px 8px",
              fontSize: "11px",
              cursor: "pointer"
            }}
          >
            {modoOscuro ? "☀️ Claro" : "🌙 Oscuro"}
          </button>
        </div>
      </div>

      {/* Cuerpo Principal (Sidebar + Editor + Resultados) */}
      <div className="app-body" style={{ flex: 1, overflow: "hidden" }}>
        <Sidebar
          onInsertarEnEditor={insertarEnEditor}
          onCargarConsulta={cargarConsulta}
          gestor={gestor}
        />

        <main className="app-main-workspace">
          <SqlEditor
            tabs={tabs}
            tabActivaId={tabActivaId}
            setTabActivaId={setTabActivaId}
            onCrearTab={handleCrearTab}
            onCerrarTab={handleCerrarTab}
            sqlQuery={sqlQuery}
            setSqlQuery={setSqlQuery}
            onEjecutar={ejecutarSQL}
            cargando={cargando}
            gestor={gestor}
            autoResolverTablas={autoResolverTablas}
            setAutoResolverTablas={setAutoResolverTablas}
            onMostrarToast={mostrarToast}
          />

          <ResultsTable
            resultado={resultado}
            error={error}
            gestor={gestor}
            historial={historial}
            favoritas={favoritas}
            onToggleFavorita={toggleFavorita}
            onCargarConsulta={cargarConsulta}
            onLimpiarHistorial={limpiarHistorial}
            onEliminarHistorialItem={eliminarHistorialItem}
            onMostrarToast={mostrarToast}
          />
        </main>
      </div>

      <Toast toasts={toasts} onCerrar={cerrarToast} />
    </div>
  );
}