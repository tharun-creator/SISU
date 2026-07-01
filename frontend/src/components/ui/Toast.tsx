import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  show: (message: string, type?: ToastType) => void;
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ show: showToast, showToast }}>
      {children}
      {/* Toast Portal */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((toast) => {
          const typeStyles = {
            success: 'bg-emerald-50 text-emerald-800 border-emerald-200 icon-green',
            error: 'bg-rose-50 text-rose-800 border-rose-200 icon-red',
            info: 'bg-sky-50 text-sky-800 border-sky-200 icon-blue',
            warning: 'bg-amber-50 text-amber-800 border-amber-200 icon-orange',
          };

          const icons = {
            success: <CheckCircle className="text-emerald-500" size={18} />,
            error: <AlertCircle className="text-rose-500" size={18} />,
            info: <Info className="text-sky-500" size={18} />,
            warning: <AlertCircle className="text-amber-500" size={18} />,
          };

          return (
            <div
              key={toast.id}
              className={`flex items-start gap-3 p-4 border rounded-xl shadow-lg transition-all duration-300 animate-in slide-in-from-bottom-5 ${typeStyles[toast.type]}`}
            >
              <div className="mt-0.5">{icons[toast.type]}</div>
              <p className="text-xs font-semibold flex-1">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
