'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout';
import { Card, Button, Badge } from '@/components/ui';
import { ConfirmModal } from '@/components/ui/Modal';
import { Plus, Search, FlaskConical, Eye, Edit, DollarSign, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { getRecetas, recalcularCostosMasivo, deleteReceta } from '@/services/recetas';
import type { Receta } from '@/types/database';
import { EstadoRecetaLabels } from '@/types/database';

function formatearCosto(valor: number): string {
    return `$${valor.toFixed(2)}`;
}

const estadoBadgeVariant: Record<string, 'default' | 'gold' | 'success' | 'warning'> = {
    ACTIVA: 'success',
    INACTIVA: 'default',
    BORRADOR: 'warning',
};

export default function RecetasPage() {
    const [recetas, setRecetas] = useState<Receta[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false); // Estado para actualización masiva
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; receta: Receta | null }>({
        isOpen: false,
        receta: null
    });
    const [deleting, setDeleting] = useState(false);

    // Cargar datos de Supabase
    useEffect(() => {
        loadRecetas();
    }, []);

    async function loadRecetas() {
        setLoading(true);
        const data = await getRecetas();
        setRecetas(data);
        setLoading(false);
    }

    // Filtrar recetas
    const filteredRecetas = useMemo(() => {
        return recetas.filter((r) =>
            r.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.codigo.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [recetas, searchTerm]);

    // Stats
    const stats = useMemo(() => ({
        total: recetas.length,
        activas: recetas.filter(r => r.estado === 'ACTIVA').length,
        costoPromedio: recetas.length > 0
            ? recetas.reduce((acc, r) => acc + (r.costo_por_unidad || 0), 0) / recetas.length
            : 0,
    }), [recetas]);

    async function handleRecalcularCostos() {
        if (!confirm('¿Desea recalcular los costos de TODAS las recetas basándose en las listas de precios actuales? Esto puede tomar unos momentos.')) return;

        setUpdating(true);
        try {
            const result = await recalcularCostosMasivo();
            if (result.success) {
                alert(`Actualización completada: ${result.message}`);
                await loadRecetas(); // Recargar datos para ver nuevos costos
            } else {
                alert('Hubo un error al actualizar los costos. Revise la consola.');
            }
        } catch (error) {
            console.error(error);
            alert('Error inesperado al actualizar costos.');
        } finally {
            setUpdating(false);
        }
    }

    async function handleDelete() {
        if (!deleteModal.receta) return;
        setDeleting(true);
        try {
            await deleteReceta(deleteModal.receta.id);
            await loadRecetas();
            setDeleteModal({ isOpen: false, receta: null });
        } catch (error: any) {
            alert(error.message || 'Error al eliminar la receta');
        } finally {
            setDeleting(false);
        }
    }

    return (
        <PageContainer
            title="Recetas"
            description="Definición de fórmulas y composición de productos"
            actions={
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        onClick={handleRecalcularCostos}
                        disabled={updating || loading}
                    >
                        {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        {updating ? 'Actualizando...' : 'Actualizar Costos'}
                    </Button>
                    <Link href="/recetas/nuevo">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" /> Nueva Receta
                        </Button>
                    </Link>
                </div>
            }
        >
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="text-center">
                    <p className="text-3xl font-bold text-[var(--text-primary)]">{stats.total}</p>
                    <p className="text-sm text-[var(--text-muted)]">Total Recetas</p>
                </Card>
                <Card className="text-center border-[var(--color-success)]/30">
                    <p className="text-3xl font-bold text-[var(--color-success)]">{stats.activas}</p>
                    <p className="text-sm text-[var(--text-muted)]">Activas</p>
                </Card>
                <Card className="text-center border-[var(--accent-gold)]/30">
                    <div className="flex items-center justify-center gap-2">
                        <DollarSign className="w-5 h-5 text-[var(--accent-gold)]" />
                        <p className="text-2xl font-bold gold-text">
                            {formatearCosto(stats.costoPromedio)}
                        </p>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">Costo Prom. /unidad</p>
                </Card>
            </div>

            {/* Search */}
            <Card className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="Buscar receta..."
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
                    <p className="text-[var(--text-secondary)]">Cargando recetas...</p>
                </Card>
            ) : (
                <>
                    {/* Recetas List */}
                    <div className="space-y-4">
                        {filteredRecetas.map((receta) => (
                            <Card key={receta.id} hover>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-gold)] to-[var(--accent-copper)] flex items-center justify-center">
                                            <FlaskConical className="w-6 h-6 text-[var(--bg-primary)]" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm text-[var(--accent-gold)]">{receta.codigo}</span>
                                                <Badge variant={estadoBadgeVariant[receta.estado]} size="sm">
                                                    {EstadoRecetaLabels[receta.estado]}
                                                </Badge>
                                            </div>
                                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{receta.nombre}</h3>
                                            <p className="text-sm text-[var(--text-muted)]">
                                                v{receta.version} · Produce {receta.cantidad_producida} {receta.unidad_medida}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        {/* Costo */}
                                        <div className="text-right">
                                            <p className="text-sm text-[var(--text-muted)]">Costo Total</p>
                                            <p className="text-lg font-bold gold-text">{formatearCosto(receta.costo_total || 0)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-[var(--text-muted)]">Por {receta.unidad_medida}</p>
                                            <p className="text-lg font-bold text-[var(--text-primary)]">{formatearCosto(receta.costo_por_unidad || 0)}</p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <Link
                                                href={`/recetas/${receta.id}/editar`}
                                                className="p-2 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--accent-gold)] transition-colors"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Link>
                                            <Link
                                                href={`/recetas/${receta.id}`}
                                                className="p-2 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--accent-gold)] transition-colors"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Link>
                                            <button
                                                onClick={() => setDeleteModal({ isOpen: true, receta })}
                                                className="p-2 rounded hover:bg-red-900/30 text-[var(--text-muted)] hover:text-[var(--color-danger)] transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {filteredRecetas.length === 0 && (
                        <Card className="text-center py-12">
                            <FlaskConical className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
                            <p className="text-[var(--text-secondary)]">No se encontraron recetas</p>
                        </Card>
                    )}
                </>
            )}

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, receta: null })}
                onConfirm={handleDelete}
                title="Eliminar Receta"
                message={`¿Estás seguro de eliminar la receta "${deleteModal.receta?.nombre}"?`}
                confirmText="Eliminar"
                confirmVariant="danger"
                loading={deleting}
            />
        </PageContainer>
    );
}
