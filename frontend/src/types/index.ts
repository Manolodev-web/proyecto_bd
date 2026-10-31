export interface ColumnInfo {
  name: string;
  isPk?: boolean;
  isFk?: boolean;
  fkRef?: string;
  type?: string;
}

export interface TableInfo {
  name: string;
  description?: string;
  pk: string[];
  cols: string[];
  fks?: Record<string, string>; // column -> referenced table.column
}

export interface MotorConfig {
  id: string;
  nombre: string;
  puerto: number;
  icono: string;
  badgeColor: string;
  requiereMayusculasTablas?: boolean;
}

export interface ResultadoConsulta {
  exito: boolean;
  gestor: string;
  totalFilas: number;
  tiempoMs: number;
  datos: Record<string, any>[];
  mensaje?: string;
}

export interface HistorialItem {
  id: string;
  gestor: string;
  sql: string;
  fecha: string;
  tiempoMs?: number;
  filas?: number;
  esFavorita?: boolean;
}

export interface TabConsulta {
  id: string;
  titulo: string;
  sql: string;
  gestor: string;
}

export interface ToastMessage {
  id: string;
  tipo: "exito" | "info" | "error" | "advertencia";
  mensaje: string;
}
