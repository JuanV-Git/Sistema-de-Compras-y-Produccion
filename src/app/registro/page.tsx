'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase';
import { notifyAdminNewLead } from '@/actions/notify-admin'; // Acción unificada
import { Button } from '@/components/ui';
import { UserPlus, Mail, Lock, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function RegistroPage() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nombre, setNombre] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const supabase = createBrowserClient();

        // 1. Crear usuario en Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    nombre,
                },
            },
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        if (!authData.user) {
            setError('Error al crear usuario');
            setLoading(false);
            return;
        }

        // 2. Crear registro en tabla usuarios (Sin tenant_id)
        const { error: userError } = await supabase
            .from('usuarios')
            .insert({
                auth_user_id: authData.user.id,
                email,
                nombre,
                rol: 'USUARIO',
            });

        if (userError) {
            console.error('Error creating user record:', userError);
            // No es crítico, el usuario puede acceder igual
        }

        // 3. Enviar notificación al administrador (Lead) - Email + Telegram
        try {
            await notifyAdminNewLead({
                nombre,
                email,
                empresa: 'Empresa Principal' // Default para Single Tenant
            });
        } catch (err) {
            console.error('Error enviando notificación de lead:', err);
        }

        setSuccess(true);
        setLoading(false);

        // Redirigir después de 2 segundos
        setTimeout(() => {
            router.push('/');
            router.refresh();
        }, 2000);
    }

    if (success) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
                <div className="w-full max-w-md text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-success)]/20 mb-4">
                        <CheckCircle className="w-8 h-8 text-[var(--color-success)]" />
                    </div>
                    <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                        ¡Registro exitoso!
                    </h2>
                    <p className="text-[var(--text-secondary)]">
                        Redirigiendo al sistema...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent-gold)] to-[var(--accent-copper)] mb-4">
                        <span className="text-2xl font-bold text-[var(--bg-primary)]">E</span>
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Eureka</h1>
                    <p className="text-sm text-[var(--text-muted)]">Consultoría Industrial</p>
                </div>

                {/* Form */}
                <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)] p-8">
                    <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                        Solicitar Acceso de Prueba
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] mb-6">
                        Completa tus datos para comenzar tu prueba gratuita de 30 días.
                    </p>

                    {error && (
                        <div className="mb-4 p-3 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 rounded-lg flex items-center gap-2 text-[var(--color-danger)]">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-4">
                        {/* Nombre */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Nombre
                            </label>
                            <input
                                type="text"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                placeholder="Tu nombre"
                                required
                                className="w-full px-4 py-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tu@email.com"
                                    required
                                    className="w-full pl-11 pr-4 py-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                    required
                                    minLength={6}
                                    className="w-full pl-11 pr-4 py-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full py-3"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    Comenzar Prueba Gratis
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-[var(--text-muted)]">
                            ¿Ya tenés cuenta?{' '}
                            <Link
                                href="/login"
                                className="text-[var(--accent-gold)] hover:underline"
                            >
                                Iniciar Sesión
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-[var(--text-muted)] mt-6">
                    © 2026 Sistema de Gestión de Producción
                </p>
            </div>
        </div>
    );
}
