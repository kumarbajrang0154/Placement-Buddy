import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import './Toast.css';

export default function Toast({ id, message, type = 'info', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const icons = {
    success: <CheckCircle size={20} />,
    error: <AlertCircle size={20} />,
    warning: <AlertTriangle size={20} />,
    info: <Info size={20} />
  };

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-content">
        {icons[type]}
        <span>{message}</span>
      </div>
      <button className="toast-close" onClick={onClose}>
        <X size={18} />
      </button>
    </div>
  );
}
