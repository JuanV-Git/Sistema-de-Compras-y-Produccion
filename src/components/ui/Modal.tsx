'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';


interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
};

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleEscape(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === overlayRef.current && onClose()}
        >
            <div
                className={`w-full ${sizeClasses[size]} bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>
    );
}

// =====================================================
// CONFIRM MODAL
// =====================================================
interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    confirmVariant?: 'primary' | 'danger';
    loading?: boolean;
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    confirmVariant = 'primary',
    loading = false,
}: ConfirmModalProps) {
    const dangerStyles = confirmVariant === 'danger'
        ? 'bg-[var(--color-danger)] hover:bg-[var(--color-danger)]/80 text-white'
        : 'bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-copper)] text-[var(--bg-primary)] hover:from-[var(--accent-light)] hover:to-[var(--accent-gold)]';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <p className="text-[var(--text-secondary)] mb-6">{message}</p>
            <div className="flex gap-3 justify-end">
                <button
                    onClick={onClose}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50"
                >
                    Cancelar
                </button>
                <button
                    onClick={onConfirm}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 ${dangerStyles}`}
                >
                    {loading ? 'Procesando...' : confirmText}
                </button>
            </div>
        </Modal>
    );
}

