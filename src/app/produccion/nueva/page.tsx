'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { Card, Button, Select } from '@/components/ui';
import { ArrowLeft, Loader2, Factory, Info } from 'lucide-react';
import { createOrdenProduccion, getNextNumeroOP, generarConsumosTeoricos } from '@/services/ordenesProduccion';
import { getRecetas } from '@/services/recetas';
import type { Receta } from '@/types/database';
import Link from 'next/link';

export default function NuevaOrdenProduccionPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recetas, setRecetas] = useState<Receta[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [selectedReceta, setSelectedReceta] = useState<Receta | null>(null);

    const [formData, setFormData] = useState({
        numero: '',
        receta_id: '',
        cantidad_programada: '1',
        observaciones: '',
    });

    async function loadInitialData() {
        setLoadingData(true);
        const [numeroOP, recetasData] = await Promise.all([
            getNextNumeroOP(),
            getRecetas(),
        ]);
        setFormData(prev => ({ ...prev, numero: numeroOP }));
        setRecetas(recetasData.filter(r => r.estado === 'ACTIVA'));
        setLoadingData(false);
    }

    useEffect(() => {
        // eslint-disable-next-line
        loadInitialData();
    }, []);

    function handleChange(field: string, value: string) {
        setFormData(prev => ({ ...prev, [field]: value }));
    }

    function handleRecetaChange(recetaId: string) {
        setFormData(prev => ({ ...prev, receta_id: recetaId }));
        const receta = recetas.find(r => r.id === recetaId);
        setSelectedReceta(receta || null);
    }

    // Calcular costo teórico total basado en receta y cantidad
    const costoTeoricoTotal = selectedReceta
        ? (selectedReceta.costo_por_unidad || 0) * parseFloat(formData.cantidad_programada || '0')
        : 0;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!formData.receta_id) {
            setError('Debe seleccionar una receta');
            setLoading(false);
            return;
        }

        if (!selectedReceta) {
            setError('Receta no encontrada');
            setLoading(false);
            return;
        }

        try {
            const result = await createOrdenProduccion({
                numero: formData.numero,
                receta_id: formData.receta_id,
                producto_id: selectedReceta.producto_id || undefined,
                cantidad_programada: parseFloat(formData.cantidad_programada),
                unidad_medida: selectedReceta.unidad_medida,
                costo_teorico_total: costoTeoricoTotal,
                observaciones: formData.observaciones || undefined,
            });

            if (result) {
                // Generar consumos teóricos basados en la receta
                await generarConsumosTeoricos(
                    result.id,
                    formData.receta_id,
                    parseFloat(formData.cantidad_programada)
                );
                router.push(`/produccion/${result.id}`);
            } else {
                setError('Error al crear la orden de producción');
            }
        } catch (error) {
            console.error('Error creating production order:', error);
            setError('Error inesperado al crear la orden');
        }

        setLoading(false);
    }

    const recetaOptions = [
        { value: '', label: 'Seleccionar receta...' },
        ...recetas.map(r => ({
            value: r.id,
            label: `${r.codigo} - ${r.nombre} (${r.cantidad_producida} ${r.unidad_medida})`,
        })),
    ];

    if (loadingData) {
        return (
            <PageContainer title="Nueva Orden de Producción" description="Cargando datos...">
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer
            title="Nueva Orden de Producción"
            description="Crear una nueva orden basada en receta"
        >
            <form onSubmit={handleSubmit}>
                <Card className="mb-6">
                    {error && (
                        <div className="mb-4 p-3 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 rounded-lg text-[var(--color-danger)]">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Número de OP */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Número de Orden (automático)
                            </label>
                            <input
                                type="text"
                                value={formData.numero}
                                readOnly
                                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] opacity-70 cursor-not-allowed"
                            />
                        </div>

                        {/* Receta */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Receta Base *
                            </label>
                            <Select
                                value={formData.receta_id}
                                onChange={(e) => handleRecetaChange(e.target.value)}
                                options={recetaOptions}
                            />
                        </div>

                        {/* Cantidad a Producir */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Cantidad a Producir *
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={formData.cantidad_programada}
                                    onChange={(e) => handleChange('cantidad_programada', e.target.value)}
                                    required
                                    className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                                />
                                {selectedReceta && (
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                                        {selectedReceta.unidad_medida}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Costo Teórico (calculado) */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Costo Teórico Total
                            </label>
                            <div className="px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
                                <span className="text-xl font-bold gold-text">
                                    ${costoTeoricoTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        {/* Observaciones */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Observaciones
                            </label>
                            <textarea
                                value={formData.observaciones}
                                onChange={(e) => handleChange('observaciones', e.target.value)}
                                rows={3}
                                placeholder="Notas adicionales..."
                                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)] resize-none"
                            />
                        </div>
                    </div>

                    {/* Info de la receta seleccionada */}
                    {selectedReceta && (
                        <div className="mt-6 p-4 bg-[var(--accent-gold)]/10 rounded-lg border border-[var(--accent-gold)]/30">
                            <div className="flex items-center gap-2 mb-3">
                                <Info className="w-5 h-5 text-[var(--accent-gold)]" />
                                <h3 className="font-semibold text-[var(--text-primary)]">Información de la Receta</h3>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <p className="text-[var(--text-muted)]">Produce</p>
                                    <p className="text-[var(--text-primary)] font-medium">
                                        {selectedReceta.cantidad_producida} {selectedReceta.unidad_medida}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[var(--text-muted)]">Costo por Unidad</p>
                                    <p className="gold-text font-medium">
                                        ${selectedReceta.costo_por_unidad?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[var(--text-muted)]">Costo Total Receta</p>
                                    <p className="text-[var(--text-primary)] font-medium">
                                        ${selectedReceta.costo_total?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[var(--text-muted)]">Factor Multiplicador</p>
                                    <p className="text-[var(--text-primary)] font-medium">
                                        x{(parseFloat(formData.cantidad_programada || '0') / (selectedReceta.cantidad_producida || 1)).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                            <p className="mt-3 text-sm text-[var(--text-muted)]">
                                Al crear la orden, se generarán automáticamente los consumos teóricos basados en los componentes de la receta.
                            </p>
                        </div>
                    )}
                </Card>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <Link href="/produccion">
                        <Button type="button" variant="ghost">
                            <ArrowLeft className="w-4 h-4" /> Volver
                        </Button>
                    </Link>
                    <Button type="submit" disabled={loading || !formData.receta_id}>
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <Factory className="w-4 h-4" /> Crear Orden de Producción
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </PageContainer>
    );
}
