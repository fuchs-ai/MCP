/**
 * Hook für Toast-Benachrichtigungen
 */
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { message } from 'antd';

// Context für Toasts
interface ToastContextType {
  showToast: (type: 'success' | 'error' | 'info' | 'warning', content: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Provider-Komponente für Toast-Benachrichtigungen
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [messageApi, contextHolder] = message.useMessage();

  /**
   * Zeigt eine Toast-Benachrichtigung an
   */
  const showToast = (
    type: 'success' | 'error' | 'info' | 'warning',
    content: string,
    duration: number = 3
  ) => {
    messageApi[type](content, duration);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {contextHolder}
      {children}
    </ToastContext.Provider>
  );
};

/**
 * Hook für die Verwendung von Toast-Benachrichtigungen
 */
export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast muss innerhalb eines ToastProviders verwendet werden');
  }
  
  return context;
}; 