import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  onDismiss?: () => void;
}

export default function Toast({ message, type = 'success', onDismiss }: ToastProps) {
  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-green-400" />,
    error: <AlertCircle className="w-4 h-4 text-red-400" />,
    info: <Info className="w-4 h-4 text-blue-400" />,
  };

  useEffect(() => {
    if (onDismiss) {
      const timer = setTimeout(() => onDismiss(), 3000);
      return () => clearTimeout(timer);
    }
  }, [onDismiss]);

  const bg = type === 'success' ? 'bg-green-900/80 border-green-500' : type === 'error' ? 'bg-red-900/80 border-red-500' : 'bg-blue-900/80 border-blue-500';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border ${bg}`}
      >
        {icons[type]}
        <span className="text-sm font-medium text-white">{message}</span>
      </motion.div>
    </AnimatePresence>
  );
}
