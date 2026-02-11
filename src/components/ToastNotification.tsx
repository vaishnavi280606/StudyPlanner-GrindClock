import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, MessageCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'message';

interface ToastProps {
    message: string;
    type?: ToastType;
    duration?: number;
    onClose: () => void;
    action?: {
        label: string;
        onClick: () => void;
    };
    avatarUrl?: string;
    senderName?: string;
}

export function ToastNotification({
    message,
    type = 'info',
    duration = 3000,
    onClose,
    action,
    avatarUrl,
    senderName
}: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        const timer = setTimeout(() => setIsVisible(true), 10);

        // Auto close timer
        const closeTimer = setTimeout(() => {
            setIsVisible(false);
            // Allow exit animation to finish before unmounting
            setTimeout(onClose, 300);
        }, duration);

        return () => {
            clearTimeout(timer);
            clearTimeout(closeTimer);
        };
    }, [duration, onClose]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300);
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle className="text-green-500" size={24} />;
            case 'error':
                return <AlertCircle className="text-red-500" size={24} />;
            case 'message':
                return <MessageCircle className="text-blue-500" size={24} />;
            default:
                return <Info className="text-blue-500" size={24} />;
        }
    };

    const getBgColor = () => {
        switch (type) {
            case 'success': return 'bg-white border-green-500/20';
            case 'error': return 'bg-white border-red-500/20';
            case 'message': return 'bg-white border-blue-500/20';
            default: return 'bg-white border-slate-200';
        }
    };

    return (
        <div
            className={`fixed top-6 right-6 z-[1000] flex items-start gap-4 p-4 rounded-xl shadow-2xl border transition-all duration-300 transform ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
                } ${getBgColor()} max-w-sm w-full backdrop-blur-md dark:bg-slate-800 dark:border-slate-700`}
        >
            {type === 'message' && avatarUrl ? (
                <img
                    src={avatarUrl}
                    alt={senderName}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-600"
                />
            ) : (
                <div className={`p-2 rounded-full bg-slate-100 dark:bg-slate-700`}>
                    {getIcon()}
                </div>
            )}

            <div className="flex-1 min-w-0 pt-0.5">
                {senderName && (
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-0.5">
                        {senderName}
                    </h4>
                )}
                <p className={`text-sm leading-relaxed ${senderName ? 'text-slate-600 dark:text-slate-300' : 'text-slate-800 dark:text-slate-200 font-medium'}`}>
                    {message}
                </p>
                {action && (
                    <button
                        onClick={action.onClick}
                        className="mt-2 text-sm font-bold text-amber-600 dark:text-amber-500 hover:text-amber-700 transition-colors"
                    >
                        {action.label}
                    </button>
                )}
            </div>

            <button
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
            >
                <X size={18} />
            </button>
        </div>
    );
}

// Add global styles for animations if needed
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);
