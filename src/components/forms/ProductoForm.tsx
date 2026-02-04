'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { Card, Button, Select } from '@/components/ui';
import { Save, ArrowLeft, Loader2, Package } from 'lucide-react';
import { createProducto, updateProducto, getNextCodigoProducto } from '@/services/productos';
import { getRecetas, linkRecetaToProducto } from '@/services/recetas'; // Importar servicio recetas
import { getListasPrecios, updatePrecioProducto } from '@/services/precios'; // Importar servicio de precios
import { getTipoCambio } from '@/services/configuracion';
import type { Producto, TipoProducto, TipoMateriaPrima, UnidadMedida, ListaPrecio } from '@/types/database'; // Importar ListaPrecio
import { TipoProductoLabels, TipoMateriaPrimaLabels, UnidadMedidaLabels, TipoProductoPrefixes } from '@/types/database';
import Link from 'next/link';
import { ProductoProveedoresSection } from './ProductoProveedoresSection';

interface ProductoFormProps {
    producto?: Producto;
    mode: 'create' | 'edit';
}

const tipoOptions = Object.entries(TipoProductoLabels).map(([value, label]) => ({
    value,
    label,
}));

const tipoMPOptions = Object.entries(TipoMateriaPrimaLabels).map(([value, label]) => ({
    value,
    label,
}));

const unidadOptions = Object.entries(UnidadMedidaLabels).map(([value, label]) => ({
    value,
    label,
}));

export function ProductoForm({ producto, mode }: ProductoFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingCodigo, setLoadingCodigo] = useState(false);
    const [tipoCambio, setTipoCambio] = useState<number>(1200);
    const [listasPrecios, setListasPrecios] = useState<ListaPrecio[]>([]); // Estado para listas
    const [recetas, setRecetas] = useState<any[]>([]); // Estado para recetas
    const [selectedRecetaId, setSelectedRecetaId] = useState<string>(''); // Receta seleccionada

    // Form state
    const [formData, setFormData] = useState({
        codigo: producto?.codigo || '',
        nombre: producto?.nombre || '',
        descripcion: producto?.descripcion || '',
        tipo: producto?.tipo || '' as TipoProducto | '',
        tipo_materia_prima: producto?.tipo_materia_prima || null as TipoMateriaPrima | null,
        unidad_medida: producto?.unidad_medida || 'KG' as UnidadMedida,
        costo_unitario: producto?.costo_unitario?.toString() || '0',
        moneda_costo: (producto as any)?.moneda_costo || 'ARS',
        lista_costo_id: producto?.lista_costo_id || '', // Estado para lista seleccionada
        stock_minimo: producto?.stock_minimo?.toString() || '0',
        stock_actual: producto?.stock_actual?.toString() || '0',
    });

    // Cargar listas, tipo de cambio y recetas al montar
    useEffect(() => {
        getTipoCambio().then(setTipoCambio);
        getListasPrecios('COSTO').then(setListasPrecios);
        getRecetas().then(data => {
            setRecetas(data);
            // Si es edición, buscar si alguna receta apunta a este producto
            if (producto) {
                const linkedReceta = data.find(r => r.producto_id === producto.id);
                if (linkedReceta) {
                    setSelectedRecetaId(linkedReceta.id);
                }
            }
        });
    }, [producto]);

    // Generar código automático cuando cambia el tipo (solo en modo crear)
    useEffect(() => {
        if (mode === 'create' && formData.tipo) {
            setLoadingCodigo(true);
            getNextCodigoProducto(formData.tipo).then((codigo) => {
                setFormData((prev) => ({ ...prev, codigo }));
                setLoadingCodigo(false);
            });
        }
    }, [mode, formData.tipo]);

    function handleChange(field: string, value: string) {
        setFormData((prev) => ({ ...prev, [field]: value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Validar que se haya seleccionado un tipo
            if (!formData.tipo) {
                setError('Debe seleccionar un tipo de producto');
                setLoading(false);
                return;
            }

            const data = {
                codigo: formData.codigo,
                nombre: formData.nombre,
                descripcion: formData.descripcion || undefined,
                tipo: formData.tipo as TipoProducto,
                tipo_materia_prima: formData.tipo === 'MP' && formData.tipo_materia_prima ? formData.tipo_materia_prima : undefined,
                unidad_medida: formData.unidad_medida,
                costo_unitario: parseFloat(formData.costo_unitario) || 0,
                moneda_costo: formData.moneda_costo,
                costo_promedio: parseFloat(formData.costo_unitario) || 0,
                stock_minimo: parseFloat(formData.stock_minimo) || 0,
                stock_actual: parseFloat(formData.stock_actual) || 0,
                lista_costo_id: formData.lista_costo_id || undefined, // Guardar la lista asignada
                activo: true,
            };

            let result;
            if (mode === 'edit' && producto) {
                result = await updateProducto(producto.id, data);
            } else {
                result = await createProducto(data as any);
            }

            if (!result) {
                setError('Error al guardar el producto. Verificá los datos e intentá nuevamente.');
                return;
            }

            // Actualizar precio en la lista histórica (Si hay lista seleccionada)
            if (formData.lista_costo_id) {
                try {
                    await updatePrecioProducto(
                        formData.lista_costo_id,
                        result.id,
                        parseFloat(formData.costo_unitario) || 0,
                        formData.moneda_costo // Pasar moneda
                        // TODO: Pasar usuario_id si estuviera disponible
                    );
                } catch (err) {
                    console.error('Error guardando precio histórico:', err);
                    // No bloqueamos el flujo principal si falla el histórico, pero logueamos
                }
            }

            // Vincular receta seleccionada (Si aplica y se seleccionó una)
            if (selectedRecetaId && (formData.tipo === 'SE' || formData.tipo === 'PT')) {
                try {
                    console.log(`Vinculando receta ${selectedRecetaId} al producto ${result.id}`);
                    await linkRecetaToProducto(selectedRecetaId, result.id);
                } catch (err) {
                    console.error('Error vinculando receta:', err);
                }
            }

            router.push('/productos');
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
            title={mode === 'create' ? 'Nuevo Producto' : 'Editar Producto'}
            description={mode === 'create' ? 'Crear un nuevo producto en el sistema' : `Editando: ${producto?.nombre}`}
        >
            <form onSubmit={handleSubmit}>
                <Card className="mb-6">
                    {error && (
                        <div className="mb-4 p-3 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 rounded-lg text-[var(--color-danger)]">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Tipo - PRIMERO para generar código */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Tipo de Producto *
                            </label>
                            <Select
                                options={[
                                    { value: '', label: 'Seleccionar tipo...' },
                                    ...tipoOptions,
                                ]}
                                value={formData.tipo}
                                onChange={(e) => handleChange('tipo', e.target.value)}
                                disabled={mode === 'edit'}
                            />
                            {mode === 'create' && (
                                <p className="mt-1 text-xs text-[var(--text-muted)]">
                                    Seleccioná el tipo para generar el código automáticamente
                                </p>
                            )}
                        </div>

                        {/* Código - generado automáticamente */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Código {mode === 'create' ? '(automático)' : '*'}
                            </label>
                            <input
                                type="text"
                                value={loadingCodigo ? 'Generando...' : formData.codigo}
                                onChange={(e) => handleChange('codigo', e.target.value)}
                                required
                                readOnly={mode === 'create'}
                                placeholder={formData.tipo ? `${TipoProductoPrefixes[formData.tipo as TipoProducto] || formData.tipo}-001` : 'Seleccione tipo primero'}
                                className={`w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)] ${mode === 'create' ? 'cursor-not-allowed opacity-70' : ''}`}
                            />
                        </div>

                        {/* Nombre */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Nombre *
                            </label>
                            <input
                                type="text"
                                value={formData.nombre}
                                onChange={(e) => handleChange('nombre', e.target.value)}
                                required
                                placeholder="Nombre del producto"
                                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
                            />
                        </div>

                        {/* Tipo Materia Prima (condicional) */}
                        {formData.tipo === 'MP' && (
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                    Categoría MP
                                </label>
                                <Select
                                    options={tipoMPOptions}
                                    value={formData.tipo_materia_prima || ''}
                                    onChange={(e) => handleChange('tipo_materia_prima', e.target.value)}
                                    placeholder="Seleccionar categoría"
                                />
                            </div>
                        )}

                        {/* Receta de Producción (Solo para SE o PT) */}
                        {(formData.tipo === 'SE' || formData.tipo === 'PT') && (
                            <div className="md:col-span-2 p-4 bg-[var(--bg-primary)]/30 rounded-lg border border-[var(--border-default)] mb-4">
                                <label className="block text-sm font-medium text-[var(--accent-gold)] mb-2 flex items-center gap-2">
                                    <Package className="w-4 h-4" /> Receta de Producción Asociada
                                </label>
                                <Select
                                    options={[
                                        { value: '', label: 'Seleccionar una receta existente...' },
                                        ...recetas
                                            .filter(r => r.estado === 'ACTIVA' || r.id === selectedRecetaId)
                                            .map(r => ({ value: r.id, label: `${r.codigo} - ${r.nombre}` }))
                                    ]}
                                    value={selectedRecetaId}
                                    onChange={(e) => {
                                        const newRecetaId = e.target.value;
                                        setSelectedRecetaId(newRecetaId);

                                        // Si selecciona receta, actualizar costo automáticamente
                                        if (newRecetaId) {
                                            const r = recetas.find(x => x.id === newRecetaId);
                                            if (r) {
                                                const costoUsd = r.costo_por_unidad_usd || 0;
                                                const costoArs = r.costo_por_unidad || 0;
                                                // Preferir USD si existe y es > 0
                                                if (costoUsd > 0) {
                                                    setFormData(prev => ({ ...prev, moneda_costo: 'USD', costo_unitario: costoUsd.toString() }));
                                                } else {
                                                    setFormData(prev => ({ ...prev, moneda_costo: 'ARS', costo_unitario: costoArs.toString() }));
                                                }
                                            }
                                        }
                                    }}
                                    placeholder="Vincular con una receta..."
                                />
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    Al seleccionar una receta, este producto tomará su costo automáticamente de ella.
                                </p>
                            </div>
                        )}

                        {/* Unidad de Medida */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Unidad de Medida *
                            </label>
                            <Select
                                options={unidadOptions}
                                value={formData.unidad_medida}
                                onChange={(e) => handleChange('unidad_medida', e.target.value)}
                            />
                        </div>

                        {/* Costo Unitario con Moneda y Lista */}
                        <div className="md:col-span-2 space-y-4 border p-4 rounded-lg bg-[var(--bg-primary)]/50">
                            <h4 className="font-medium text-[var(--accent-gold)] flex items-center gap-2">
                                <span className="text-lg">$</span> Configuración de Costos
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Lista de Costo Asignada
                                    </label>
                                    <Select
                                        options={[
                                            { value: '', label: 'Seleccionar lista de costo...' },
                                            ...listasPrecios.map(l => ({ value: l.id, label: l.nombre }))
                                        ]}
                                        value={formData.lista_costo_id}
                                        onChange={(e) => handleChange('lista_costo_id', e.target.value)}
                                        className="w-full"
                                    />
                                    {listasPrecios.length === 0 && (
                                        <p className="text-xs text-[var(--color-warning)] mt-1">
                                            No hay listas creadas. <Link href="/configuracion/listas-precios" className="underline">Crear una lista</Link>
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Costo Unitario Actual
                                        {selectedRecetaId && <span className="text-xs text-yellow-500 ml-2">(Sincronizado con Receta)</span>}
                                    </label>
                                    <div className="flex gap-2">
                                        <select
                                            value={formData.moneda_costo}
                                            onChange={(e) => handleChange('moneda_costo', e.target.value)}
                                            className="px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)] disabled:opacity-50"
                                            disabled={!!selectedRecetaId}
                                        >
                                            <option value="ARS">$AR</option>
                                            <option value="USD">USD</option>
                                        </select>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.costo_unitario}
                                            onChange={(e) => handleChange('costo_unitario', e.target.value)}
                                            className="flex-1 px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)] disabled:opacity-50"
                                            disabled={!!selectedRecetaId}
                                        />
                                    </div>
                                    {formData.moneda_costo === 'USD' && (
                                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                                            Equivalente: <span className="gold-text font-medium">
                                                ${(parseFloat(formData.costo_unitario || '0') * tipoCambio).toLocaleString('es-AR', { minimumFractionDigits: 2 })} ARS
                                            </span>
                                            <span className="text-xs ml-2">(TC: ${tipoCambio.toLocaleString('es-AR')})</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Stock Mínimo */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Stock Mínimo
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.stock_minimo}
                                onChange={(e) => handleChange('stock_minimo', e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                            />
                        </div>

                        {/* Stock Actual */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Stock Actual
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.stock_actual}
                                onChange={(e) => handleChange('stock_actual', e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                            />
                        </div>
                    </div>

                    {/* Descripción */}
                    <div className="mt-6">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Descripción
                        </label>
                        <textarea
                            value={formData.descripcion}
                            onChange={(e) => handleChange('descripcion', e.target.value)}
                            rows={3}
                            placeholder="Descripción opcional del producto..."
                            className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)] resize-none"
                        />
                    </div>
                </Card>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <Link href="/productos">
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
                                {mode === 'create' ? 'Crear Producto' : 'Guardar Cambios'}
                            </>
                        )}
                    </Button>
                </div>
            </form>

            {/* Sección de Proveedores - solo en modo edición */}
            {mode === 'edit' && producto && (
                <ProductoProveedoresSection productoId={producto.id} />
            )}
        </PageContainer>
    );
}
