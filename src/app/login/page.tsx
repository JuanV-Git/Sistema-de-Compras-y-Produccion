'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase';
import { Button } from '@/components/ui';
import { LogIn, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('redirectTo') || '/';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const supabase = createBrowserClient();

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message === 'Invalid login credentials'
                ? 'Email o contraseña incorrectos'
                : error.message
            );
            setLoading(false);
            return;
        }

        router.push(redirectTo);
        router.refresh();
    }

    return (
        <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)] p-8">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">
                Iniciar Sesión
            </h2>

            {error && (
                <div className="mb-4 p-3 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 rounded-lg flex items-center gap-2 text-[var(--color-danger)]">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
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
                            placeholder="••••••••"
                            required
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
                            <LogIn className="w-5 h-5" />
                            Ingresar
                        </>
                    )}
                </Button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-sm text-[var(--text-muted)]">
                    ¿No tenés cuenta?{' '}
                    <Link
                        href="/registro"
                        className="text-[var(--accent-gold)] hover:underline"
                    >
                        Registrate
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent-gold)] to-[var(--accent-copper)] mb-4">
                        <span className="text-2xl font-bold text-[var(--bg-primary)]">P</span>
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Pinturas</h1>
                    <p className="text-sm text-[var(--text-muted)]">Sistema de Gestión</p>
                </div>

                <Suspense fallback={
                    <div className="flex justify-center p-8">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
                    </div>
                }>
                    <LoginForm />
                </Suspense>

                {/* Footer */}
                <p className="text-center text-xs text-[var(--text-muted)] mt-6">
                    © 2026 Sistema de Gestión de Producción
                </p>
            </div>
        </div>
    );
}
