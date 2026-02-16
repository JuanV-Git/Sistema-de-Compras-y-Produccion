'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout';
import { Card, Button, Badge } from '@/components/ui';
import { Plus, Search, ShoppingCart, Eye, CheckCircle, Clock, Building2, Loader2, Trash2 } from 'lucide-react';
import { getOrdenesCompra, deleteOrdenCompra, type OrdenCompraConRelaciones, EstadoOCLabels } from '@/services/ordenesCompra';
import { ConfirmModal } from '@/components/ui/Modal';

export default function ComprasPage() {
    const [ordenes, setOrdenes] = useState<OrdenCompraConRelaciones[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [estadoFilter, setEstadoFilter] = useState('');
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; orden: OrdenCompraConRelaciones | null }>({
        isOpen: false,
        orden: null
    });
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadOrdenes();
    }, []);

    async function loadOrdenes() {
        setLoading(true);
        const data = await getOrdenesCompra();
        setOrdenes(data);
        setLoading(false);
    }

    const filteredOrdenes = ordenes.filter((o) => {
        const matchesSearch =
            o.proveedor?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.numero.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesEstado = !estadoFilter || o.estado === estadoFilter;
        return matchesSearch && matchesEstado;
    });

    const stats = {
        total: ordenes.length,
        pendientes: ordenes.filter(o => o.estado === 'BORRADOR' || o.estado === 'ENVIADA').length,
        recibidas: ordenes.filter(o => o.estado === 'RECIBIDA').length,
    };

    function getEstadoBadgeVariant(estado: string): 'gold' | 'success' | 'danger' | 'default' {
        switch (estado) {
            case 'BORRADOR': return 'gold';
            case 'ENVIADA': return 'default';
            case 'PARCIAL': return 'gold';
            case 'RECIBIDA': return 'success';
            case 'CANCELADA': return 'danger';
            default: return 'default';
        }
    }

    function formatCurrency(amount: number, moneda = 'ARS'): string {
        if (moneda === 'USD') {
            return `USD ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        }
        return `$${amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    }

    function formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('es-AR');
    }

    async function handleDelete() {
        if (!deleteModal.orden) return;
        setDeleting(true);
        try {
            await deleteOrdenCompra(deleteModal.orden.id);
            await loadOrdenes();
            setDeleteModal({ isOpen: false, orden: null });
        } catch (error: any) {
            alert(error.message || 'Error al eliminar la orden');
        } finally {
            setDeleting(false);
        }
    }

    return (
        <PageContainer
            title="Órdenes de Compra"
            description="Gestión de compras de materias primas"
            actions={
                <Link href="/compras/nueva">
                    <Button>
                        <Plus className="w-4 h-4" /> Nueva Orden
                    </Button>
                </Link>
            }
        >
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="text-center">
                    <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.total}</p>
                    <p className="text-sm text-[var(--text-muted)]">Total Órdenes</p>
                </Card>
                <Card className="text-center border-[var(--color-warning)]/30">
                    <div className="flex items-center justify-center gap-2">
                        <Clock className="w-5 h-5 text-[var(--color-warning)]" />
                        <p className="text-3xl font-bold text-[var(--color-warning)]">
                            {stats.pendientes}
                        </p>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">Pendientes</p>
                </Card>
                <Card className="text-center border-[var(--color-success)]/30">
                    <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />
                        <p className="text-3xl font-bold text-[var(--color-success)]">
                            {stats.recibidas}
                        </p>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">Recibidas</p>
                </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Buscar por número o proveedor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setEstadoFilter('')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!estadoFilter ? 'bg-[var(--accent-gold)] text-[var(--bg-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}
                        >
                            Todas
                        </button>
                        <button
                            onClick={() => setEstadoFilter('BORRADOR')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${estadoFilter === 'BORRADOR' ? 'bg-[var(--color-warning)] text-[var(--bg-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}
                        >
                            Borradores
                        </button>
                        <button
                            onClick={() => setEstadoFilter('ENVIADA')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${estadoFilter === 'ENVIADA' ? 'bg-blue-600 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}
                        >
                            Enviadas
                        </button>
                        <button
                            onClick={() => setEstadoFilter('RECIBIDA')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${estadoFilter === 'RECIBIDA' ? 'bg-[var(--color-success)] text-[var(--bg-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}
                        >
                            Recibidas
                        </button>
                    </div>
                </div>
            </Card>

            {/* Orders Table */}
            <Card>
                {loading ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--accent-gold)]" />
                        <p className="text-[var(--text-muted)] mt-2">Cargando órdenes...</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border-default)]">
                                        <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Número</th>
                                        <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Proveedor</th>
                                        <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">Fecha</th>
                                        <th className="text-right py-3 px-4 text-[var(--text-muted)] font-medium">Subtotal</th>
                                        <th className="text-right py-3 px-4 text-[var(--text-muted)] font-medium">Total</th>
                                        <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">Estado</th>
                                        <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrdenes.map((orden) => (
                                        <tr key={orden.id} className="border-b border-[var(--border-default)]/50 hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                                            <td className="py-3 px-4">
                                                <Link href={`/compras/${orden.id}`} className="font-mono text-[var(--accent-gold)] hover:underline">
                                                    {orden.numero}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-[var(--text-muted)]" />
                                                    <span className="text-[var(--text-primary)]">
                                                        {orden.proveedor?.nombre || 'Sin proveedor'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-center text-[var(--text-secondary)]">
                                                {formatDate(orden.fecha_emision)}
                                            </td>
                                            <td className="py-3 px-4 text-right text-[var(--text-secondary)]">
                                                {formatCurrency(orden.subtotal || 0)}
                                            </td>
                                            <td className="py-3 px-4 text-right text-[var(--text-primary)] font-medium">
                                                {formatCurrency(orden.total || 0)}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <Badge variant={getEstadoBadgeVariant(orden.estado)} size="sm">
                                                    {EstadoOCLabels[orden.estado as keyof typeof EstadoOCLabels] || orden.estado}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Link href={`/compras/${orden.id}`}>
                                                        <Button variant="ghost" size="sm">
                                                            <Eye className="w-4 h-4" /> Ver
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="hover:text-[var(--color-danger)] hover:bg-red-900/10"
                                                        onClick={() => setDeleteModal({ isOpen: true, orden })}
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {filteredOrdenes.length === 0 && (
                            <div className="text-center py-12">
                                <ShoppingCart className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
                                <p className="text-[var(--text-secondary)]">No se encontraron órdenes</p>
                                <Link href="/compras/nueva" className="mt-4 inline-block">
                                    <Button>
                                        <Plus className="w-4 h-4" /> Crear primera orden
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </>
                )}
            </Card>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, orden: null })}
                onConfirm={handleDelete}
                title="Eliminar Orden de Compra"
                message={`¿Estás seguro de eliminar la orden "${deleteModal.orden?.numero}"?`}
                confirmText="Eliminar"
                confirmVariant="danger"
                loading={deleting}
            />
        </PageContainer>
    );
}
