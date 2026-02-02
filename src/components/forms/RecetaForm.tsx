'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { Card, Button, Select } from '@/components/ui';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import { createReceta, updateReceta, getNextCodigoReceta } from '@/services/recetas';
import type { Receta, EstadoReceta } from '@/types/database';
import { RecetaComponentesSection } from './RecetaComponentesSection';
import Link from 'next/link';

interface RecetaFormProps {
    receta?: Receta;
    mode: 'create' | 'edit';
}

const estadoOptions = [
    { value: 'BORRADOR', label: 'Borrador' },
    { value: 'ACTIVA', label: 'Activa' },
    { value: 'INACTIVA', label: 'Inactiva' },
];

const tipoBaseOptions = [
    { value: '', label: 'Seleccionar tipo de base...' },
    { value: 'BASE_AGUA', label: 'Base Agua' },
    { value: 'BASE_SOLVENTE', label: 'Base Solvente' },
];

const unidadOptions = [
    { value: 'KG', label: 'Kilogramos (KG)' },
    { value: 'LT', label: 'Litros (LT)' },
    { value: 'UN', label: 'Unidades (UN)' },
];

export function RecetaForm({ receta, mode }: RecetaFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingCodigo, setLoadingCodigo] = useState(mode === 'create');

    // Form state
    const [formData, setFormData] = useState({
        codigo: receta?.codigo || '',
        nombre: receta?.nombre || '',
        version: receta?.version?.toString() || '1',
        tipo_base: (receta as any)?.tipo_base || '',
        peso_especifico: (receta as any)?.peso_especifico?.toString() || '',
        cantidad_producida: receta?.cantidad_producida?.toString() || '1',
        unidad_medida: receta?.unidad_medida || 'KG',
        estado: receta?.estado || 'BORRADOR',
        observaciones: receta?.observaciones || '',
    });

    // Cargar código automático
    useEffect(() => {
        async function loadData() {
            // Generar código si es nuevo
            if (mode === 'create') {
                const codigo = await getNextCodigoReceta();
                setFormData((prev) => ({ ...prev, codigo }));
                setLoadingCodigo(false);
            }
        }
        loadData();
    }, [mode]);

    function handleChange(field: string, value: string) {
        setFormData((prev) => ({ ...prev, [field]: value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const data = {
                codigo: formData.codigo,
                nombre: formData.nombre,
                version: parseInt(formData.version) || 1,
                tipo_base: formData.tipo_base || undefined,
                peso_especifico: formData.peso_especifico ? parseFloat(formData.peso_especifico) : undefined,
                cantidad_producida: parseFloat(formData.cantidad_producida) || 1,
                unidad_medida: formData.unidad_medida,
                estado: formData.estado as EstadoReceta,
                observaciones: formData.observaciones || undefined,
            };

            let result;
            if (mode === 'edit' && receta) {
                result = await updateReceta(receta.id, data);
            } else {
                result = await createReceta(data);
            }

            if (!result) {
                setError('Error al guardar la receta.');
                return;
            }

            // Si es crear, ir a editar para agregar componentes
            if (mode === 'create') {
                router.push(`/recetas/${result.id}/editar`);
            } else {
                router.push('/recetas');
            }
            router.refresh();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(`Error al guardar: ${errorMessage}`);
            console.error('Full error:', err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <PageContainer
            title={mode === 'create' ? 'Nueva Receta' : 'Editar Receta'}
            description={mode === 'create' ? 'Definir una nueva fórmula de producción' : `Editando: ${receta?.nombre}`}
        >
            <form onSubmit={handleSubmit}>
                <Card className="mb-6">
                    {error && (
                        <div className="mb-4 p-3 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 rounded-lg text-[var(--color-danger)]">
                            {error}
                        </div>
                    )}

                    {/* Sección: Datos Principales */}
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Datos de la Receta</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* Código */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Código {mode === 'create' ? '(automático)' : ''}
                            </label>
                            <input
                                type="text"
                                value={loadingCodigo ? 'Generando...' : formData.codigo}
                                onChange={(e) => handleChange('codigo', e.target.value)}
                                required
                                readOnly={mode === 'create'}
                                className={`w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)] ${mode === 'create' ? 'cursor-not-allowed opacity-70' : ''}`}
                            />
                        </div>

                        {/* Versión */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Versión
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={formData.version}
                                onChange={(e) => handleChange('version', e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                            />
                        </div>

                        {/* Estado */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Estado
                            </label>
                            <Select
                                value={formData.estado}
                                onChange={(e) => handleChange('estado', e.target.value)}
                                options={estadoOptions}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Nombre */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Nombre de la Receta *
                            </label>
                            <input
                                type="text"
                                value={formData.nombre}
                                onChange={(e) => handleChange('nombre', e.target.value)}
                                required
                                placeholder="Ej: Esmalte Sintético Blanco"
                                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
                            />
                        </div>

                        {/* Tipo de Base */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Tipo de Base
                            </label>
                            <Select
                                value={formData.tipo_base}
                                onChange={(e) => handleChange('tipo_base', e.target.value)}
                                options={tipoBaseOptions}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* Peso Específico */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Peso Específico (g/ml)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.peso_especifico}
                                onChange={(e) => handleChange('peso_especifico', e.target.value)}
                                placeholder="Ej: 1.25"
                                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
                            />
                        </div>
                    </div>

                    {/* Producción */}
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Cantidad Producida</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Cantidad que produce la receta *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={formData.cantidad_producida}
                                onChange={(e) => handleChange('cantidad_producida', e.target.value)}
                                required
                                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Unidad de Medida
                            </label>
                            <Select
                                value={formData.unidad_medida}
                                onChange={(e) => handleChange('unidad_medida', e.target.value)}
                                options={unidadOptions}
                            />
                        </div>
                    </div>

                    {/* Observaciones */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Observaciones
                        </label>
                        <textarea
                            value={formData.observaciones}
                            onChange={(e) => handleChange('observaciones', e.target.value)}
                            rows={3}
                            placeholder="Notas adicionales sobre la receta..."
                            className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)] resize-none"
                        />
                    </div>
                </Card>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <Link href="/recetas">
                        <Button type="button" variant="ghost">
                            <ArrowLeft className="w-4 h-4" /> Cancelar
                        </Button>
                    </Link>
                    <Button type="submit" disabled={loading}>
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                {mode === 'create' ? 'Crear y Agregar Componentes' : 'Guardar Cambios'}
                            </>
                        )}
                    </Button>
                </div>
            </form>

            {/* Sección de Componentes - solo en modo edición */}
            {mode === 'edit' && receta && (
                <RecetaComponentesSection recetaId={receta.id} />
            )}
        </PageContainer>
    );
}
