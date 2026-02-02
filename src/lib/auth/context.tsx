'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createBrowserClient } from '@/lib/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signOut: () => Promise<void>;
    tenantId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [tenantId, setTenantId] = useState<string | null>(null);

    useEffect(() => {
        const supabase = createBrowserClient();

        // Obtener sesión inicial
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);

            // Si hay usuario, obtener su tenant_id
            if (session?.user) {
                fetchUserTenant(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Escuchar cambios de sesión
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    await fetchUserTenant(session.user.id);
                } else {
                    setTenantId(null);
                }

                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    async function fetchUserTenant(authUserId: string) {
        const supabase = createBrowserClient();

        const { data, error } = await supabase
            .from('usuarios')
            .select('tenant_id')
            .eq('auth_user_id', authUserId)
            .single();

        if (data) {
            setTenantId(data.tenant_id);
        } else {
            // Fallback al tenant demo si no hay registro
            setTenantId('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
        }

        setLoading(false);
    }

    async function signOut() {
        const supabase = createBrowserClient();
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setTenantId(null);
    }

    return (
        <AuthContext.Provider value={{ user, session, loading, signOut, tenantId }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
