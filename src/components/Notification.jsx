// src/components/Notification.jsx
import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const Notification = ({ message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation to complete
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-6 h-6" />;
      case 'error':
        return <XCircle className="w-6 h-6" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6" />;
      default:
        return <Info className="w-6 h-6" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-gradient-to-r from-green-500 to-green-600 text-white';
      case 'error':
        return 'bg-gradient-to-r from-red-500 to-red-600 text-white';
      case 'warning':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white';
      default:
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
    }
  };

  return (
    <div className={`fixed top-6 right-6 z-50 transform transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'
    }`}>
      <div className={`${getStyles()} p-4 rounded-2xl shadow-2xl backdrop-blur-lg border border-white/20 max-w-sm`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-relaxed">
              {message}
            </p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="flex-shrink-0 ml-2 p-1 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Progress bar */}
        <div className="mt-3 w-full bg-white/20 rounded-full h-1">
          <div 
            className="bg-white h-1 rounded-full transition-all duration-4000 ease-linear"
            style={{
              width: isVisible ? '0%' : '100%',
              transition: isVisible ? 'width 4s linear' : 'none'
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default Notification;