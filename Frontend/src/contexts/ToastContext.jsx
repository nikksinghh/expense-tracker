import { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BsCheckCircleFill, BsExclamationCircleFill, BsInfoCircleFill, BsXCircleFill, BsX } from 'react-icons/bs';

const ToastContext = createContext(null);

const icons = {
  success: <BsCheckCircleFill color="var(--rm-green)" />,
  error: <BsXCircleFill color="var(--rm-red)" />,
  warning: <BsExclamationCircleFill color="var(--rm-orange)" />,
  info: <BsInfoCircleFill color="var(--rm-blue)" />
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'info', title = '') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, title }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className="rm-toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`rm-toast ${t.type}`}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 2 }}>{icons[t.type]}</span>
              <div style={{ flex: 1 }}>
                {t.title && <h6>{t.title}</h6>}
                <p style={{ margin: 0, fontSize: '0.8rem' }}>{t.message}</p>
              </div>
              <button onClick={() => remove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
                <BsX size={16} />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
