'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout';
import { Card, Button, Badge } from '@/components/ui';
import { Plus, Search, Building2, Phone, Mail, MapPin, Edit, Eye, Loader2 } from 'lucide-react';
import { getProveedores } from '@/services/proveedores';
import type { Proveedor } from '@/types/database';

export default function ProveedoresPage() {
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Cargar datos de Supabase
    useEffect(() => {
        async function loadProveedores() {
            setLoading(true);
            const data = await getProveedores();
            setProveedores(data);
            setLoading(false);
        }
        loadProveedores();
    }, []);

    // Filtrar proveedores
    const filteredProveedores = useMemo(() => {
        return proveedores.filter((p) =>
            p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [proveedores, searchTerm]);

    // Stats
    const stats = useMemo(() => ({
        total: proveedores.length,
        activos: proveedores.filter(p => p.activo).length,
    }), [proveedores]);

    return (
        <PageContainer
            title="Proveedores"
            description="Gestión de proveedores de materias primas"
            actions={
                <Link href="/proveedores/nuevo">
                    <Button>
                        <Plus className="w-4 h-4" /> Nuevo Proveedor
                    </Button>
                </Link>
            }
        >
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="text-center">
                    <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.total}</p>
                    <p className="text-sm text-[var(--text-muted)]">Total Proveedores</p>
                </Card>
                <Card className="text-center border-[var(--color-success)]/30">
                    <p className="text-3xl font-bold text-[var(--color-success)]">{stats.activos}</p>
                    <p className="text-sm text-[var(--text-muted)]">Activos</p>
                </Card>
                <Card className="text-center border-[var(--accent-gold)]/30">
                    <p className="text-3xl font-bold gold-text">0</p>
                    <p className="text-sm text-[var(--text-muted)]">Órdenes Activas</p>
                </Card>
            </div>

            {/* Search */}
            <Card className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="Buscar proveedor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
                    />
                </div>
            </Card>

            {/* Loading */}
            {loading ? (
                <Card className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)] mx-auto mb-3" />
                    <p className="text-[var(--text-secondary)]">Cargando proveedores...</p>
                </Card>
            ) : (
                <>
                    {/* Providers Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredProveedores.map((proveedor) => (
                            <Card key={proveedor.id} hover className={!proveedor.activo ? 'opacity-60' : ''}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-gold)] to-[var(--accent-copper)] flex items-center justify-center">
                                            <Building2 className="w-6 h-6 text-[var(--bg-primary)]" />
                                        </div>
                                        <div>
                                            <span className="font-mono text-sm text-[var(--accent-gold)]">{proveedor.codigo}</span>
                                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{proveedor.nombre}</h3>
                                        </div>
                                    </div>
                                    <Badge variant={proveedor.activo ? 'success' : 'default'} size="sm">
                                        {proveedor.activo ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                </div>

                                <div className="space-y-2 text-sm mb-4">
                                    {proveedor.telefono && (
                                        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                                            <Phone className="w-4 h-4" />
                                            <span>{proveedor.telefono}</span>
                                        </div>
                                    )}
                                    {proveedor.email && (
                                        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                                            <Mail className="w-4 h-4" />
                                            <span>{proveedor.email}</span>
                                        </div>
                                    )}
                                    {proveedor.direccion && (
                                        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                                            <MapPin className="w-4 h-4" />
                                            <span>{proveedor.direccion}</span>
                                        </div>
                                    )}
                                    {proveedor.condicion_pago && (
                                        <div className="p-2 bg-[var(--bg-tertiary)] rounded-lg">
                                            <span className="text-xs text-[var(--text-muted)]">Pago: </span>
                                            <span className="text-sm text-[var(--text-primary)]">{proveedor.condicion_pago}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <Link href={`/proveedores/${proveedor.id}/editar`} className="flex-1">
                                        <Button variant="secondary" size="sm" className="w-full">
                                            <Edit className="w-4 h-4" /> Editar
                                        </Button>
                                    </Link>
                                    <Link href={`/proveedores/${proveedor.id}`}>
                                        <Button variant="ghost" size="sm">
                                            <Eye className="w-4 h-4" /> Ver
                                        </Button>
                                    </Link>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {filteredProveedores.length === 0 && (
                        <Card className="text-center py-12">
                            <Building2 className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
                            <p className="text-[var(--text-secondary)]">No se encontraron proveedores</p>
                        </Card>
                    )}
                </>
            )}
        </PageContainer>
    );
}
