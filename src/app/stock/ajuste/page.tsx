'use client';

import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout';
import { Card, Button } from '@/components/ui';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, RotateCcw, Save } from 'lucide-react';
import Link from 'next/link';
import { getProductos } from '@/services/productos';
import { crearMovimientoStock, type OrigenMovimiento, type TipoMovimiento } from '@/services/stock';
import type { Producto } from '@/types/database';

// Tipos de ajuste disponibles
const TIPOS_AJUSTE = [
    { value: 'AJUSTE_POSITIVO', label: 'Ajuste Positivo (+)', tipo: 'ENTRADA' as TipoMovimiento, icon: ArrowUpRight, color: 'var(--color-success)' },
    { value: 'AJUSTE_NEGATIVO', label: 'Ajuste Negativo (-)', tipo: 'SALIDA' as TipoMovimiento, icon: ArrowDownRight, color: 'var(--color-danger)' },
    { value: 'DEVOLUCION_PROVEEDOR', label: 'Devolución a Proveedor', tipo: 'SALIDA' as TipoMovimiento, icon: RotateCcw, color: 'var(--color-warning)' },
];

export default function AjusteStockPage() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form state
    const [form, setForm] = useState({
        producto_id: '',
        tipo_ajuste: 'AJUSTE_POSITIVO',
        cantidad: '',
        observaciones: '',
    });

    useEffect(() => {
        loadProductos();
    }, []);

    async function loadProductos() {
        try {
            const data = await getProductos();
            setProductos(data);
        } catch (err) {
            console.error('Error loading productos:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!form.producto_id || !form.cantidad) {
            setError('Debe seleccionar un producto e ingresar la cantidad');
            return;
        }

        const cantidad = parseFloat(form.cantidad);
        if (isNaN(cantidad) || cantidad <= 0) {
            setError('La cantidad debe ser un número positivo');
            return;
        }

        setSaving(true);

        try {
            const tipoAjuste = TIPOS_AJUSTE.find(t => t.value === form.tipo_ajuste);
            if (!tipoAjuste) throw new Error('Tipo de ajuste inválido');

            const producto = productos.find(p => p.id === form.producto_id);

            await crearMovimientoStock({
                producto_id: form.producto_id,
                tipo_movimiento: tipoAjuste.tipo,
                origen: form.tipo_ajuste as OrigenMovimiento,
                cantidad,
                costo_unitario: producto?.costo_unitario,
                observaciones: form.observaciones || undefined,
            });

            setSuccess(`Movimiento registrado correctamente. ${tipoAjuste.tipo === 'ENTRADA' ? 'Se sumaron' : 'Se restaron'} ${cantidad} ${producto?.unidad_medida || 'unidades'} de ${producto?.nombre}`);

            // Reset form
            setForm({
                producto_id: '',
                tipo_ajuste: 'AJUSTE_POSITIVO',
                cantidad: '',
                observaciones: '',
            });
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            setError(error.message || 'Error al procesar el ajuste');
        } finally {
            setSaving(false);
        }
    }

    const selectedTipo = TIPOS_AJUSTE.find(t => t.value === form.tipo_ajuste);
    const selectedProducto = productos.find(p => p.id === form.producto_id);

    return (
        <PageContainer
            title="Ajuste de Stock"
            description="Registrar ajustes, mermas y devoluciones"
        >
            <div className="max-w-2xl">
                {/* Back button */}
                <Link
                    href="/stock"
                    className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver a Stock
                </Link>

                <Card>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Tipo de Ajuste */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                                Tipo de Movimiento
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {TIPOS_AJUSTE.map((tipo) => {
                                    const Icon = tipo.icon;
                                    const isSelected = form.tipo_ajuste === tipo.value;
                                    return (
                                        <button
                                            key={tipo.value}
                                            type="button"
                                            onClick={() => setForm({ ...form, tipo_ajuste: tipo.value })}
                                            className={`p-4 rounded-lg border-2 transition-all ${isSelected
                                                ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                                                : 'border-[var(--border-default)] hover:border-[var(--border-subtle)]'
                                                }`}
                                        >
                                            <Icon
                                                className="w-6 h-6 mx-auto mb-2"
                                                style={{ color: isSelected ? tipo.color : 'var(--text-muted)' }}
                                            />
                                            <p className={`text-sm font-medium ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                                                {tipo.label}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Producto */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Producto *
                            </label>
                            <select
                                value={form.producto_id}
                                onChange={(e) => setForm({ ...form, producto_id: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                                disabled={loading}
                            >
                                <option value="">Seleccionar producto...</option>
                                {productos.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.codigo} - {p.nombre} ({p.unidad_medida}) | Stock: {p.stock_actual}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Cantidad */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Cantidad *
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={form.cantidad}
                                    onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                                    placeholder="0.00"
                                    className="flex-1 px-4 py-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)] text-lg"
                                />
                                {selectedProducto && (
                                    <span className="text-[var(--text-muted)] text-lg">
                                        {selectedProducto.unidad_medida}
                                    </span>
                                )}
                            </div>
                            {selectedProducto && (
                                <p className="mt-2 text-sm text-[var(--text-muted)]">
                                    Stock actual: <span className="font-medium text-[var(--text-primary)]">{selectedProducto.stock_actual} {selectedProducto.unidad_medida}</span>
                                </p>
                            )}
                        </div>

                        {/* Preview */}
                        {selectedProducto && form.cantidad && parseFloat(form.cantidad) > 0 && (
                            <div className="p-4 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
                                <p className="text-sm text-[var(--text-secondary)] mb-2">Vista previa del movimiento:</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-[var(--text-primary)]">{selectedProducto.stock_actual}</span>
                                    <span className="text-[var(--text-muted)]">→</span>
                                    <span
                                        className="font-bold text-lg"
                                        style={{ color: selectedTipo?.color }}
                                    >
                                        {selectedTipo?.tipo === 'ENTRADA'
                                            ? selectedProducto.stock_actual + parseFloat(form.cantidad)
                                            : selectedProducto.stock_actual - parseFloat(form.cantidad)
                                        }
                                    </span>
                                    <span className="text-[var(--text-muted)]">{selectedProducto.unidad_medida}</span>
                                    <span
                                        className="ml-2 text-sm font-medium"
                                        style={{ color: selectedTipo?.color }}
                                    >
                                        ({selectedTipo?.tipo === 'ENTRADA' ? '+' : '-'}{form.cantidad})
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Observaciones */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Observaciones
                            </label>
                            <textarea
                                value={form.observaciones}
                                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                                placeholder="Motivo del ajuste, número de remito de devolución, etc."
                                rows={3}
                                className="w-full px-4 py-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)] resize-none"
                            />
                        </div>

                        {/* Messages */}
                        {error && (
                            <div className="p-4 rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 text-[var(--color-danger)]">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="p-4 rounded-lg bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 text-[var(--color-success)]">
                                {success}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            <Button
                                type="submit"
                                loading={saving}
                                className="flex-1"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Registrar Movimiento
                            </Button>
                            <Link href="/stock">
                                <Button type="button" variant="secondary">
                                    Cancelar
                                </Button>
                            </Link>
                        </div>
                    </form>
                </Card>
            </div>
        </PageContainer>
    );
}
