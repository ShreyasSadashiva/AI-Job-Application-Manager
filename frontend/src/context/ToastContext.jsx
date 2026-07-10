import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

let nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = "info") => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg) => add(msg, "success"),
    error: (msg) => add(msg, "error"),
    info: (msg) => add(msg, "info"),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onRemove }) {
  const icons = {
    success: <CheckCircle size={16} />,
    error: <XCircle size={16} />,
    info: <Info size={16} />,
  };
  return (
    <div className={`toast toast-${toast.type}`}>
      {icons[toast.type]}
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: "2px", display: "flex" }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export const useToast = () => useContext(ToastContext);
