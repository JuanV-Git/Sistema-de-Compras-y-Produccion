'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout';
import { Card, Button, Badge } from '@/components/ui';
import { Plus, Search, Factory, Eye, CheckCircle, Clock, Play, Loader2, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import {
    getOrdenesProduccion,
    cambiarEstadoOrdenProduccion,
    deleteOrdenProduccion,
    EstadoOPLabels,
    type OrdenProduccionConRelaciones,
} from '@/services/ordenesProduccion';
import { ConfirmModal } from '@/components/ui/Modal';

// =====================================================
// PRODUCCION PAGE
// =====================================================
export default function ProduccionPage() {
    const [ordenes, setOrdenes] = useState<OrdenProduccionConRelaciones[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [estadoFilter, setEstadoFilter] = useState('');
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; orden: OrdenProduccionConRelaciones | null }>({
        isOpen: false,
        orden: null
    });
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadOrdenes();
    }, []);

    async function loadOrdenes() {
        setLoading(true);
        const data = await getOrdenesProduccion();
        setOrdenes(data);
        setLoading(false);
    }

    const filteredOrdenes = ordenes.filter((o) => {
        const matchesSearch =
            o.producto?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.numero.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesEstado = !estadoFilter || o.estado === estadoFilter;
        return matchesSearch && matchesEstado;
    });

    const stats = {
        total: ordenes.length,
        planificadas: ordenes.filter(o => o.estado === 'PLANIFICADA').length,
        enProduccion: ordenes.filter(o => o.estado === 'EN_PRODUCCION').length,
        completadas: ordenes.filter(o => o.estado === 'COMPLETADA').length,
    };

    const estadoVariant = (estado: string): 'default' | 'gold' | 'success' | 'warning' | 'danger' => {
        const variants: Record<string, 'default' | 'gold' | 'success' | 'warning' | 'danger'> = {
            PLANIFICADA: 'gold',
            EN_PRODUCCION: 'warning',
            PAUSADA: 'default',
            COMPLETADA: 'success',
            CANCELADA: 'danger',
        };
        return variants[estado] || 'default';
    };

    function formatCurrency(amount: number): string {
        return `$${amount.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
    }

    function formatVariacion(variacion: number): string {
        const sign = variacion > 0 ? '+' : '';
        return `${sign}${variacion.toFixed(1)}%`;
    }

    function getVariacionColor(variacion: number): string {
        if (variacion > 5) return 'text-[var(--color-danger)]';
        if (variacion < -5) return 'text-[var(--color-success)]';
        return 'text-[var(--text-muted)]';
    }

    async function handleIniciar(ordenId: string) {
        await cambiarEstadoOrdenProduccion(ordenId, 'EN_PRODUCCION');
        await loadOrdenes();
    }

    async function handleDelete() {
        if (!deleteModal.orden) return;
        setDeleting(true);
        try {
            await deleteOrdenProduccion(deleteModal.orden.id);
            await loadOrdenes();
            setDeleteModal({ isOpen: false, orden: null });
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            alert(error.message || 'Error al eliminar la OP');
        } finally {
            setDeleting(false);
        }
    }

    return (
        <PageContainer
            title="Órdenes de Producción"
            description="Gestión de órdenes de producción y seguimiento de consumos"
            actions={
                <Link href="/produccion/nueva">
                    <Button>
                        <Plus className="w-4 h-4" /> Nueva Orden
                    </Button>
                </Link>
            }
        >
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="text-center">
                    <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.total}</p>
                    <p className="text-sm text-[var(--text-muted)]">Total Órdenes</p>
                </Card>
                <Card className="text-center border-[var(--accent-gold)]/30">
                    <div className="flex items-center justify-center gap-2">
                        <Clock className="w-5 h-5 text-[var(--accent-gold)]" />
                        <p className="text-3xl font-bold gold-text">{stats.planificadas}</p>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">Planificadas</p>
                </Card>
                <Card className="text-center border-[var(--color-warning)]/30">
                    <div className="flex items-center justify-center gap-2">
                        <Play className="w-5 h-5 text-[var(--color-warning)]" />
                        <p className="text-3xl font-bold text-[var(--color-warning)]">{stats.enProduccion}</p>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">En Producción</p>
                </Card>
                <Card className="text-center border-[var(--color-success)]/30">
                    <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />
                        <p className="text-3xl font-bold text-[var(--color-success)]">{stats.completadas}</p>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">Completadas</p>
                </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Buscar por número o producto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setEstadoFilter('')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!estadoFilter
                                ? 'bg-[var(--accent-gold)] text-[var(--bg-primary)]'
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            Todas
                        </button>
                        <button
                            onClick={() => setEstadoFilter('PLANIFICADA')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${estadoFilter === 'PLANIFICADA'
                                ? 'bg-[var(--accent-gold)] text-[var(--bg-primary)]'
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            Planificadas
                        </button>
                        <button
                            onClick={() => setEstadoFilter('EN_PRODUCCION')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${estadoFilter === 'EN_PRODUCCION'
                                ? 'bg-[var(--color-warning)] text-[var(--bg-primary)]'
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            En Producción
                        </button>
                        <button
                            onClick={() => setEstadoFilter('COMPLETADA')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${estadoFilter === 'COMPLETADA'
                                ? 'bg-[var(--color-success)] text-[var(--bg-primary)]'
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            Completadas
                        </button>
                    </div>
                </div>
            </Card>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
                </div>
            ) : (
                <>
                    {/* Orders Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredOrdenes.map((orden) => (
                            <Card
                                key={orden.id}
                                hover
                                className={orden.estado === 'EN_PRODUCCION' ? 'border-[var(--color-warning)]/30' : orden.estado === 'PLANIFICADA' ? 'border-[var(--accent-gold)]/30' : ''}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <Link href={`/produccion/${orden.id}`} className="font-mono text-lg font-bold text-[var(--accent-gold)] hover:underline">
                                            {orden.numero}
                                        </Link>
                                        <Badge
                                            variant={estadoVariant(orden.estado)}
                                            size="sm"
                                            className="ml-2"
                                        >
                                            {EstadoOPLabels[orden.estado as keyof typeof EstadoOPLabels] || orden.estado}
                                        </Badge>
                                    </div>
                                    <div className="flex gap-1">
                                        <Link href={`/produccion/${orden.id}`}>
                                            <Button variant="ghost" size="sm">
                                                <Eye className="w-4 h-4" />
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
                                </div>

                                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                                    {orden.producto?.nombre || 'Sin producto'}
                                </h3>

                                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                    <div>
                                        <p className="text-[var(--text-muted)]">Cantidad</p>
                                        <p className="text-[var(--text-primary)] font-medium">
                                            {orden.cantidad_programada?.toLocaleString()} {orden.unidad_medida}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[var(--text-muted)]">Receta</p>
                                        <Link href={`/recetas/${orden.receta_id}`} className="text-[var(--accent-gold)] font-mono hover:underline">
                                            {orden.receta?.codigo || orden.receta_id?.slice(0, 8)}
                                        </Link>
                                    </div>
                                    <div>
                                        <p className="text-[var(--text-muted)]">Costo Teórico</p>
                                        <p className="gold-text font-medium">{formatCurrency(orden.costo_teorico_total || 0)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[var(--text-muted)]">Variación</p>
                                        <p className={`font-medium ${getVariacionColor(orden.variacion_porcentaje || 0)}`}>
                                            {orden.estado === 'COMPLETADA' ? (
                                                <span className="flex items-center gap-1">
                                                    {(orden.variacion_porcentaje || 0) > 0 && <TrendingUp className="w-3 h-3" />}
                                                    {(orden.variacion_porcentaje || 0) < 0 && <TrendingDown className="w-3 h-3" />}
                                                    {formatVariacion(orden.variacion_porcentaje || 0)}
                                                </span>
                                            ) : (
                                                <span className="text-[var(--text-muted)]">-</span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {orden.estado === 'PLANIFICADA' && (
                                        <Button variant="primary" className="flex-1" onClick={() => handleIniciar(orden.id)}>
                                            <Play className="w-4 h-4" /> Iniciar
                                        </Button>
                                    )}
                                    {orden.estado === 'EN_PRODUCCION' && (
                                        <Link href={`/produccion/${orden.id}`} className="flex-1">
                                            <Button variant="primary" className="w-full">
                                                <CheckCircle className="w-4 h-4" /> Ver Consumos
                                            </Button>
                                        </Link>
                                    )}
                                    {orden.estado === 'COMPLETADA' && (
                                        <div className="text-sm text-[var(--text-muted)] border-t border-[var(--border-default)] w-full pt-3">
                                            Cerrada • {orden.cantidad_producida?.toLocaleString()} {orden.unidad_medida} producidos
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>

                    {filteredOrdenes.length === 0 && (
                        <Card className="text-center py-12">
                            <Factory className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
                            <p className="text-[var(--text-secondary)]">No se encontraron órdenes de producción</p>
                            <Link href="/produccion/nueva" className="mt-4 inline-block">
                                <Button>
                                    <Plus className="w-4 h-4" /> Crear primera orden
                                </Button>
                            </Link>
                        </Card>
                    )}
                </>
            )}

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, orden: null })}
                onConfirm={handleDelete}
                title="Eliminar Orden de Producción"
                message={`¿Estás seguro de eliminar la orden "${deleteModal.orden?.numero}"?`}
                confirmText="Eliminar"
                confirmVariant="danger"
                loading={deleting}
            />
        </PageContainer>
    );
}
