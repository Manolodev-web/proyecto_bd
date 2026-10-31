import React from "react";
import type { ToastMessage } from "../types";

interface ToastProps {
  toasts: ToastMessage[];
  onCerrar: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onCerrar }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        let claseTipo = "toast-info";
        if (toast.tipo === "exito") {
          claseTipo = "toast-exito";
        } else if (toast.tipo === "error") {
          claseTipo = "toast-error";
        } else if (toast.tipo === "advertencia") {
          claseTipo = "toast-advertencia";
        }

        return (
          <div key={toast.id} className={`toast-card ${claseTipo}`}>
            <span className="toast-mensaje">{toast.mensaje}</span>
            <button
              className="toast-cerrar"
              onClick={() => onCerrar(toast.id)}
              title="Cerrar notificación"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
};
