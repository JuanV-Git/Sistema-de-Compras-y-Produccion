'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { Card, Button, Select } from '@/components/ui';
import { Save, ArrowLeft, Loader2, DollarSign } from 'lucide-react';
import { createOrdenCompra, getNextNumeroOC, addItemToOrden } from '@/services/ordenesCompra';
import { getProveedores } from '@/services/proveedores';
import { getTipoCambio } from '@/services/configuracion';
import type { Proveedor } from '@/types/database';
import Link from 'next/link';

export default function NuevaOrdenCompraPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [tipoCambioGlobal, setTipoCambioGlobal] = useState(1200);

    const [prefilledItems, setPrefilledItems] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        numero: '',
        proveedor_id: '',
        fecha_emision: new Date().toISOString().split('T')[0],
        fecha_entrega_estimada: '',
        moneda: 'ARS' as 'ARS' | 'USD',
        tipo_cambio: '1200',
        observaciones: '',
    });

    async function loadInitialData() {
        setLoadingData(true);
        try {
            const [numeroOC, proveedoresData, tc] = await Promise.all([
                getNextNumeroOC(), // Changed from getProximoNumeroOrden() to getNextNumeroOC() to match existing import
                getProveedores(),
                getTipoCambio()
            ]);

            // Comprobar si hay info pre-cargada desde la Lista de Compras
            let provPrefill = '';
            let itemsPrefill = [];
            const prefillStr = localStorage.getItem('nuevaOC_prefill');
            if (prefillStr) {
                try {
                    const parsed = JSON.parse(prefillStr);
                    provPrefill = parsed.proveedorId || '';
                    itemsPrefill = parsed.items || [];
                } catch (e) {
                    console.error('Error parseando prefill:', e);
                }
            }

            setPrefilledItems(itemsPrefill);

            setFormData(prev => ({
                ...prev,
                numero: numeroOC,
                tipo_cambio: tc.toString(),
                proveedor_id: provPrefill,
            }));
            setProveedores(proveedoresData);
            setTipoCambioGlobal(tc);
        } catch (err) {
            console.error('Error cargando datos iniciales:', err);
            setError('Error al cargar datos iniciales');
        } finally {
            setLoadingData(false);
        }
    }

    useEffect(() => {
        loadInitialData();
    }, []);

    function handleChange(field: string, value: string) {
        setFormData(prev => ({ ...prev, [field]: value }));
    }

    // Al cambiar a USD, sugerir el tipo de cambio global
    function handleMonedaChange(moneda: string) {
        setFormData(prev => ({
            ...prev,
            moneda: moneda as 'ARS' | 'USD',
            tipo_cambio: moneda === 'USD' ? tipoCambioGlobal.toString() : '1',
        }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!formData.proveedor_id) {
            setError('Debe seleccionar un proveedor');
            setLoading(false);
            return;
        }

        try {
            const result = await createOrdenCompra({
                numero: formData.numero,
                proveedor_id: formData.proveedor_id,
                fecha_emision: formData.fecha_emision,
                fecha_entrega_estimada: formData.fecha_entrega_estimada || undefined,
                moneda: formData.moneda,
                tipo_cambio: parseFloat(formData.tipo_cambio) || 1,
                observaciones: formData.observaciones || undefined,
            });

            if (result) {
                // Si había items pre-cargados, los agregamos ahora
                if (prefilledItems.length > 0) {
                    await Promise.all(
                        prefilledItems.map(item =>
                            addItemToOrden({
                                orden_compra_id: result.id,
                                producto_id: item.productoId,
                                cantidad_pedida: item.cantidad,
                                precio_unitario: item.precioUnitario,
                            })
                        )
                    );
                    localStorage.removeItem('nuevaOC_prefill'); // Limpiar pre-fill
                }

                router.push(`/compras/${result.id}`);
            } else {
                setError('Error al crear la orden de compra');
            }
        } catch {
            setError('Error al crear la orden');
        } finally {
            setLoading(false);
        }
    }

    const proveedorOptions = [
        { value: '', label: 'Seleccionar proveedor...' },
        ...proveedores.map(p => ({
            value: p.id,
            label: `${p.codigo} - ${p.nombre}`,
        })),
    ];

    const monedaOptions = [
        { value: 'ARS', label: 'Pesos Argentinos ($AR)' },
        { value: 'USD', label: 'Dólares (USD)' },
    ];

    if (loadingData) {
        return (
            <PageContainer title="Nueva Orden de Compra" description="Cargando datos...">
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer
            title="Nueva Orden de Compra"
            description="Crear una nueva orden de compra a proveedor"
        >
            <form onSubmit={handleSubmit}>
                <Card className="mb-6">
                    {error && (
                        <div className="mb-4 p-3 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 rounded-lg text-[var(--color-danger)]">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Número de OC */}
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

                        {/* Proveedor */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Proveedor *
                            </label>
                            <Select
                                value={formData.proveedor_id}
                                onChange={(e) => handleChange('proveedor_id', e.target.value)}
                                options={proveedorOptions}
                            />
                        </div>

                        {/* Fecha Emisión */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Fecha de Emisión *
                            </label>
                            <input
                                type="date"
                                value={formData.fecha_emision}
                                onChange={(e) => handleChange('fecha_emision', e.target.value)}
                                required
                                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                            />
                        </div>

                        {/* Fecha Entrega Estimada */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Fecha Entrega Estimada
                            </label>
                            <input
                                type="date"
                                value={formData.fecha_entrega_estimada}
                                onChange={(e) => handleChange('fecha_entrega_estimada', e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                            />
                        </div>
                    </div>

                    {/* Sección Moneda */}
                    <div className="mt-6 pt-6 border-t border-[var(--border-default)]">
                        <div className="flex items-center gap-2 mb-4">
                            <DollarSign className="w-5 h-5 text-[var(--accent-gold)]" />
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Moneda de la Orden</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Moneda */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                    Moneda *
                                </label>
                                <Select
                                    value={formData.moneda}
                                    onChange={(e) => handleMonedaChange(e.target.value)}
                                    options={monedaOptions}
                                />
                            </div>

                            {/* Tipo de Cambio (solo si es USD) */}
                            {formData.moneda === 'USD' && (
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Tipo de Cambio (1 USD =)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.tipo_cambio}
                                            onChange={(e) => handleChange('tipo_cambio', e.target.value)}
                                            className="w-full pl-8 pr-16 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">ARS</span>
                                    </div>
                                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                                        TC Global: ${tipoCambioGlobal.toLocaleString('es-AR')} - Podés ajustarlo para esta OC
                                    </p>
                                </div>
                            )}
                        </div>

                        {formData.moneda === 'USD' && (
                            <div className="mt-4 p-3 bg-[var(--accent-gold)]/10 rounded-lg">
                                <p className="text-sm text-[var(--text-secondary)]">
                                    <strong>Nota:</strong> Los precios de esta orden se ingresarán en <span className="gold-text font-bold">USD</span>.
                                    Los totales se mostrarán también en ARS usando el TC de ${parseFloat(formData.tipo_cambio).toLocaleString('es-AR')}.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Observaciones */}
                    <div className="mt-6">
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
                </Card>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <Link href="/compras">
                        <Button type="button" variant="ghost">
                            <ArrowLeft className="w-4 h-4" /> Volver
                        </Button>
                    </Link>
                    <Button type="submit" disabled={loading || !formData.proveedor_id}>
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <Save className="w-4 h-4" /> Crear y Agregar Items
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </PageContainer>
    );
}
