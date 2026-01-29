'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    isVisible: boolean;
    onClose: () => void;
}

export function Toast({ message, type, isVisible, onClose }: ToastProps) {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-green-500" />,
        error: <AlertCircle className="w-5 h-5 text-red-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />,
    };

    const backgrounds = {
        success: 'bg-green-50 border-green-200',
        error: 'bg-red-50 border-red-200',
        info: 'bg-blue-50 border-blue-200',
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                        "fixed bottom-8 right-8 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-md",
                        backgrounds[type]
                    )}
                >
                    {icons[type]}
                    <p className="text-sm font-medium text-foreground">{message}</p>
                    <button
                        onClick={onClose}
                        className="ml-2 p-1 hover:bg-black/5 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Hook to manage toast state
export function useToast() {
    const [toast, setToast] = React.useState<{ message: string; type: ToastType } | null>(null);

    const showToast = (message: string, type: ToastType = 'info') => {
        setToast({ message, type });
    };

    const hideToast = () => {
        setToast(null);
    };

    return {
        hideToast,
        showToast,
        toast,
        ToastComponent: toast ? (
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={!!toast}
                onClose={hideToast}
            />
        ) : null,
    };
}
