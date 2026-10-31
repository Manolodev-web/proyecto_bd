import { useState, useEffect, useCallback } from "react";
import "./App.css";

import { Header } from "./components/Header";
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

export default function SqlWorkbench() {
  // 1. Estado de Tema (Modo Oscuro / Claro)
  const [modoOscuro, setModoOscuro] = useState<boolean>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
    return saved !== null ? saved === "dark" : true;
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, modoOscuro ? "dark" : "light");
  }, [modoOscuro]);

  // 2. Motor de Base de Datos Activo
  const [gestor, setGestor] = useState<string>("postgres");

  // 3. Comprobación de salud del Backend
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [comprobandoBackend, setComprobandoBackend] = useState<boolean>(false);

  // 4. Bandera de auto-resolución de nombres de tablas a MAYÚSCULAS
  // Activa por defecto para que las consultas en minúsculas funcionen siempre en MySQL
  const [autoResolverTablas, setAutoResolverTablas] = useState<boolean>(true);

  // 5. Pestañas de Consultas (Multi-tabs)
  const [tabs, setTabs] = useState<TabConsulta[]>([
    {
      id: "tab-1",
      titulo: "Consulta 1",
      sql: "",
      gestor: "postgres",
    },
  ]);
  const [tabActivaId, setTabActivaId] = useState<string>("tab-1");

  // 6. Estado de Ejecución y Resultados
  const [cargando, setCargando] = useState<boolean>(false);
  const [resultado, setResultado] = useState<ResultadoConsulta | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 7. Notificaciones Toast Flotantes
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

  // 8. Historial y Consultas Favoritas en localStorage
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

  // 9. Verificar estado del servidor Backend
  const verificarBackend = useCallback(async (silencioso: boolean = false) => {
    setComprobandoBackend(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try {
      const res = await fetch("http://localhost:4000/api/health", {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        setBackendOnline(true);
        if (!silencioso) {
          mostrarToast("Servidor Backend conectado en http://localhost:4000", "exito");
        }
      } else {
        setBackendOnline(false);
      }
    } catch {
      clearTimeout(timeoutId);
      setBackendOnline(false);
      if (!silencioso) {
        mostrarToast(
          "No se pudo conectar con el Backend en localhost:4000. Asegúrate de ejecutar npm run dev en el backend",
          "advertencia"
        );
      }
    } finally {
      setComprobandoBackend(false);
    }
  }, [mostrarToast]);

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

  // 11. Ejecución de la Consulta SQL con resolución inteligente de mayúsculas
  const ejecutarSQL = async () => {
    let queryOriginal = sqlQuery.trim();
    if (!queryOriginal) {
      // Si el editor está en blanco con el texto de muestra, ejecuta la consulta de muestra por defecto
      queryOriginal = "SELECT * FROM EMPLEADO;";
    }

    setCargando(true);
    setError(null);

    // Si la opción de auto-resolución está activa, convertimos nombres de tablas a MAYÚSCULAS
    // para que MySQL en Docker Linux no falle por case-sensitivity
    let sqlParaEnviar = queryOriginal;
    if (autoResolverTablas) {
      const sqlResuelto = resolveTableNamesCase(queryOriginal);
      if (sqlResuelto !== queryOriginal) {
        sqlParaEnviar = sqlResuelto;
      }
    }

    try {
      const res = await fetch("http://localhost:4000/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gestor, sql: sqlParaEnviar }),
      });

      const data = await res.json();

      if (!data.exito) {
        setError(data.error || "Ocurrió un error al ejecutar la sentencia.");
        setResultado(null);
        mostrarToast(`Error devuelto por ${gestor.toUpperCase()}`, "error");
      } else {
        setResultado(data);
        mostrarToast(
          `Consulta exitosa en ${gestor.toUpperCase()}: ${data.totalFilas} filas (${data.tiempoMs} ms)`,
          "exito"
        );

        // Registrar en el historial
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
    <div className={`app-layout ${modoOscuro ? "" : "modo-claro"}`}>
      {/* 1. Cabecera Institucional */}
      <Header
        gestor={gestor}
        setGestor={setGestor}
        modoOscuro={modoOscuro}
        setModoOscuro={setModoOscuro}
        backendOnline={backendOnline}
        comprobandoBackend={comprobandoBackend}
        verificarBackend={verificarBackend}
      />

      {/* 2. Cuerpo Principal (Sidebar + Editor + Resultados) */}
      <div className="app-body">
        {/* Explorador de Esquema */}
        <Sidebar
          onInsertarEnEditor={insertarEnEditor}
          onCargarConsulta={cargarConsulta}
          gestor={gestor}
        />

        {/* Zona de Trabajo Central */}
        <main className="app-main-workspace">
          {/* Editor SQL con Tabs y Formateador */}
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

          {/* Panel Inferior de Resultados, Historial y Favoritas */}
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

      {/* Notificaciones Toast Flotantes */}
      <Toast toasts={toasts} onCerrar={cerrarToast} />
    </div>
  );
}
