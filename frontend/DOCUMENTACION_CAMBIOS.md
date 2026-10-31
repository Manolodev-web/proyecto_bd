# Documentación Técnica de Cambios y Mejoras - Frontend
**Proyecto:** Sistema de Gestión y Recolección de Residuos Sólidos  
**Institución:** Universidad Mayor de San Andrés (UMSA) - Carrera de Informática  
**Equipo:** Grupo 4  
**Fecha:** Octubre 2026  

---

## 1. Resumen Ejecutivo de la Intervención

El frontend original era una aplicación funcional básica, concentrada en un único bloque de código con estilos estáticos y sin modularización. Presentaba problemas críticos de compatibilidad (como el fallo en MySQL al escribir consultas en minúsculas) y una interfaz con oportunidades de mejora en experiencia de usuario (UX) y diseño visual (UI).

Se llevó a cabo una **refactorización integral** sin perder ninguna funcionalidad previa, dividiendo el proyecto en componentes limpios y reutilizables bajo **TypeScript + React + Vite**, resolviendo de forma transparente la sensibilidad a mayúsculas de MySQL, y elevando la interfaz a un estándar profesional minimalista (estilo *Linear / Vercel*).

---

## 2. Comparativa: Código Original vs. Código Actual

| Aspecto | Estado Original | Estado Actual Refactorizado |
| :--- | :--- | :--- |
| **Sensibilidad a Mayúsculas (MySQL)** | Fallaba con error `Table doesn't exist` si las tablas se escribían en minúsculas (`empleado` vs `EMPLEADO`). | **Resolución automática transparente:** Detecta tablas en minúsculas y las normaliza a mayúsculas antes de enviarlas al motor sin alterar cadenas `'...'` ni comentarios. |
| **Arquitectura de Código** | Código concentrado en un archivo monolítico con lógica, interfaz y estilos mezclados. | **Arquitectura modular y escalable:** Separación en `components/`, `utils/`, y `types/` estrictamente tipados. |
| **Diseño y Estética (UI/UX)** | Colores planos, elementos apiñados, iconos duplicados en los motores de base de datos. | **Diseño Minimalista Profesional:** Paleta equilibrada en modo oscuro y claro, tipografía moderna (*Inter* y *JetBrains Mono*), espaciados limpios y un solo icono por motor. |
| **Editor de Consultas** | Textarea simple con texto inicial estático que requería borrarse manualmente. | **Editor Avanzado con Multi-pestañas:** Pestañas independientes, números de línea sincronizados, placeholder fantasma (se borra solo al escribir) y botón "Ordenar SQL". |
| **Explorador de Esquema** | Lista básica de tablas sin información de relaciones ni búsqueda. | **Sidebar Interactivo:** Buscador en tiempo real de tablas y columnas, tags de claves primarias (`PK`) y foráneas (`FK`), inserción con un clic y doble clic para `SELECT *`. |
| **Visualización de Resultados** | Tabla HTML simple sin paginación, sin ordenamiento ni filtros. | **Panel de Datos Interactivo:** Búsqueda en vivo en la tabla, ordenamiento por columnas (ASC/DESC), paginación (10, 25, 50, 100), historial completo y consultas favoritas. |
| **Exportación de Datos** | Sin opciones avanzadas de exportación. | **Exportación Multi-formato:** Descarga en CSV con UTF-8 BOM (abre perfecto en Excel sin caracteres rotos), JSON y copiado TSV al portapapeles. |
| **Estado del Backend** | No se sabía si el backend en puerto 4000 estaba respondiendo hasta que fallaba una consulta. | **Píldora de Monitoreo en Vivo:** Indicador en el encabezado (`● API Conectada` / `● API Desconectada`) con verificación automática al iniciar. |

---

## 3. Detalle de Cambios por Módulo y Archivo

```
frontend/src/
├── types/
│   └── index.ts                 # Contratos y tipos TypeScript
├── utils/
│   ├── schema.ts                # Esquema de las 17 tablas relacionales y motores
│   ├── sqlNormalizer.ts         # Tokenizador de SQL, mayúsculas y formateo
│   └── formatters.ts            # Exportadores (CSV, JSON, TSV, .sql)
├── components/
│   ├── Icons.tsx                # Iconografía SVG inline ligera
│   ├── Header.tsx               # Encabezado, branding UMSA, selector y tema
│   ├── Sidebar.tsx              # Árbol de tablas con búsqueda y PK/FK
│   ├── SqlEditor.tsx            # Editor multi-tab con números de línea
│   ├── ResultsTable.tsx         # Tabla paginada, historial y favoritas
│   └── Toast.tsx                # Notificaciones flotantes
├── App.tsx                      # Estado central y orquestación
└── App.css                      # Sistema de diseño con variables CSS
```

### A. Tipado Centralizado (`src/types/index.ts`)
* Se definieron interfaces estrictas:
  * `TableInfo`: Metadatos de cada tabla, descripción, lista de columnas, PKs y mapa de FKs (`fks: Record<string, string>`).
  * `MotorConfig`: Identificador, nombre legible, puerto Docker (`5433`, `3307`, `1433`, `1521`), icono y banderas de compatibilidad.
  * `ResultadoConsulta`, `HistorialItem`, `TabConsulta`, `ToastMessage`.

### B. Diccionario del Esquema Relacional (`src/utils/schema.ts`)
* Se catalogaron las **17 tablas relacionales** del proyecto de recolección de residuos:
  * `DISTRITO`, `ZONA`, `RUTA`, `E_ZONA_RUTA`, `CONTENEDOR`, `EMPLEADO`, `LIMPIADOR`, `CONDUCTOR`, `AYUDANTE`, `INSUMO`, `ENTREGA`, `CENTRO_DESTINO`, `VEHICULO`, `E_LIM_RUTA`, `CONDUCE`, `ASIGNA_AYUDANTE`, `ABARCA`.
* Cada tabla incluye sus campos exactos, llaves primarias compuestas y relaciones foráneas para alimentar visualmente el sidebar y el autocompletado.

### C. Normalizador Inteligente de SQL (`src/utils/sqlNormalizer.ts`)
* **Solución al problema de mayúsculas de MySQL:**
  * En Linux/Docker, MySQL tiene por defecto `lower_case_table_names=0`, haciendo que los nombres de tablas sean sensibles a mayúsculas.
  * Se implementó `resolveTableNamesCase(sql: string)`: analiza el SQL mediante expresiones regulares seguras para identificar referencias a tablas después de cláusulas clave (`FROM`, `JOIN`, `INTO`, `UPDATE`, `TABLE`), convirtiendo únicamente el nombre de la tabla a mayúsculas.
  * **Seguridad:** Respeta estrictamente los textos dentro de comillas simples `'...'` y comentarios `--`, evitando alterar datos o filtros del usuario.
* **Función `formatSql(sql)`**:
  * Limpia sangrías y capitaliza palabras clave del estándar SQL (`SELECT`, `FROM`, `WHERE`, `GROUP BY`, `ORDER BY`, `LEFT JOIN`, etc.).
* **Generador de Snippets (`obtenerSnippet`)**:
  * Provee plantillas sintácticamente correctas para Procedimientos Almacenados, Funciones, Triggers y Cursores adaptados a cada motor (PostgreSQL, MySQL, SQL Server u Oracle).

### D. Exportadores y Utilidades (`src/utils/formatters.ts`)
* **Exportación CSV con BOM (`\uFEFF`)**: Resuelve el problema común de Excel en Windows donde caracteres acentuados o la letra `ñ` se veían corruptos.
* **Copiado TSV**: Permite hacer clic en "Copiar para Excel" y pegar directamente en cualquier celda de Microsoft Excel o Google Sheets conservando las columnas intactas.

### E. Encabezado Minimalista (`src/components/Header.tsx`)
* **Branding Institucional**: Migas de pan limpias `UMSA / Informática / Grupo 4`.
* **Corrección de Icono Único**: Se eliminó el badge exterior redundante que generaba el efecto de icono duplicado (`[🐘] 🐘 PostgreSQL...`). Ahora el selector muestra exactamente un único icono integrado junto al nombre del gestor.
* **Monitor de Salud en Vivo**: Consulta `GET /api/health` al iniciar para avisar de forma inmediata si el backend en `http://localhost:4000` está encendido o apagado.
* **Enlace Directo al Modelo E-R**: Botón con apertura en nueva pestaña hacia `/modelo_er.pdf`.

### F. Explorador de Tablas y Columnas (`src/components/Sidebar.tsx`)
* **Buscador en tiempo real**: Filtra instantáneamente tanto por nombre de tabla como por nombre de columna.
* **Metadatos visuales**:
  * Icono de llave dorada y etiqueta `PK` para claves primarias.
  * Icono de enlace y etiqueta `FK` para claves foráneas con tooltip de la tabla referenciada.
* **Interacción ágil**:
  * Al hacer clic en cualquier columna, su nombre se inserta directamente en la posición del cursor en el editor.
  * Doble clic en una tabla genera automáticamente una consulta `SELECT * FROM TABLA;`.
  * Botones flotantes al pasar el cursor: `SELECT` y `COUNT`.

### G. Editor SQL Avanzado (`src/components/SqlEditor.tsx`)
* **Sistema de Múltiples Pestañas**: Permite abrir `Consulta 1`, `Consulta 2`, etc., facilitando trabajar en varias consultas simultáneamente sin perder el código previo.
* **Texto de Inicio como Placeholder Fantasma**:
  * A diferencia del código previo que insertaba texto real editable en el textarea obligando a borrarlo a mano, ahora utiliza el atributo `placeholder` nativo con alineación vertical idéntica a los números de línea.
  * **Al presionar la primera tecla, el texto de muestra desaparece completamente.**
  * Si se limpia el editor, el texto de guía vuelve a mostrarse.
* **Renombrado Intuitivo**: El botón antes llamado *"Formatear"* fue rebautizado como **"Ordenar SQL"** con icono de destello (`✨`), eliminando la confusión de que pudiera "borrar" o "resetear" el código.
* **Sincronización de Scroll y Números de Línea**: El contador lateral se sincroniza pixel a pixel con el área de texto mediante `line-height: 20px`.
* **Atajos de Teclado**:
  * `Ctrl + Enter` (o `Cmd + Enter` en Mac) para ejecutar de inmediato.
  * `Tab` inserta 2 espacios en lugar de desenfocar el campo.

### H. Tabla de Resultados e Historial (`src/components/ResultsTable.tsx`)
* **Filtro Rápido en Vivo**: Permite escribir cualquier término en la barra de búsqueda de resultados para filtrar todas las filas sin tener que re-ejecutar la consulta.
* **Ordenamiento por Columnas**: Clic en cualquier encabezado para ordenar ascendente o descendente (reconoce números y cadenas alfabéticas).
* **Paginación Inteligente**: Selector de 10, 25, 50, 100 o Todas las filas por página.
* **Pestaña de Historial**: Guarda automáticamente cada consulta ejecutada en `localStorage` con fecha, hora, duración en milisegundos y filas obtenidas, con botón para re-ejecutar con 1 clic.
* **Pestaña de Favoritas**: Permite marcar con una estrella (`★`) las consultas clave del proyecto para tenerlas siempre a mano.

### I. Sistema de Estilos (`src/App.css`)
* Diseñado completamente con **CSS Nativo (Vanilla CSS)** mediante variables CSS personalizadas (`--bg-app`, `--bg-surface`, `--text-primary`, `--accent-primary`, etc.), sin introducir dependencias pesadas ni alterar la configuración del proyecto.
* Soporte completo para **Modo Oscuro** (paleta oscura con contraste óptimo) y **Modo Claro** (tonos neutros limpios y descansados para la vista).

---

## 4. Estado de Validación y Calidad de Código
* **Compilación TypeScript (`tsc -b`)**: Exitosa, sin errores de tipado.
* **Empaquetado Vite (`vite build`)**: Salida limpia, archivos optimizados en `dist/`.
* **Análisis Estático (`oxlint`)**: 0 errores y 0 advertencias sobre la totalidad del código fuente.

---
*Documento generado para el control de versiones y memoria técnica del proyecto.*
