import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckIcon, XIcon } from "@/Components/Icons";
import styles from "./styles.module.css";

const ToastContext = createContext(null);

const DURATION_MS = 3500;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message, type = "success") => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { id, message, type }]);
      setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (message) => show(message, "success"),
      error: (message) => show(message, "error"),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.region} aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${styles.toast} ${toast.type === "error" ? styles.error : styles.success}`}
            role={toast.type === "error" ? "alert" : "status"}
          >
            <span className={styles.icon}>
              {toast.type === "error" ? <XIcon size={16} /> : <CheckIcon size={16} />}
            </span>
            <span className={styles.message}>{toast.message}</span>
            <button
              type="button"
              className={styles.close}
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <XIcon size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
};
