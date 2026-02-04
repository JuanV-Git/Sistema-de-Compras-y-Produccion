'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Package, DollarSign } from 'lucide-react';
import { Card, Button, Badge, Select } from '@/components/ui';
import { getProductos, getProductosConPrecios, type ProductoConPrecio } from '@/services/productos';
import { getTipoCambio } from '@/services/configuracion';
import {
    getComponentesByReceta,
    addComponenteToReceta,
    updateComponente,
    removeComponente,
    type RecetaComponenteConProducto,
} from '@/services/recetas';
import type { Producto } from '@/types/database';

interface RecetaComponentesSectionProps {
    recetaId: string;
    onCostosActualizados?: (costoTotal: number) => void;
}

export function RecetaComponentesSection({ recetaId, onCostosActualizados }: RecetaComponentesSectionProps) {
    const [componentes, setComponentes] = useState<RecetaComponenteConProducto[]>([]);
    const [productos, setProductos] = useState<ProductoConPrecio[]>([]); // Usar tipo enriquecido
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [tipoCambio, setTipoCambioLocal] = useState<number>(1200);

    // Form para nuevo componente
    const [showForm, setShowForm] = useState(false);
    const [newComponente, setNewComponente] = useState({
        producto_id: '',
        cantidad: '',
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editCantidad, setEditCantidad] = useState('');

    // Cargar datos
    useEffect(() => {
        loadData();
    }, [recetaId]);

    async function loadData() {
        setLoading(true);
        const [componentesData, productosData, tc] = await Promise.all([
            getComponentesByReceta(recetaId),
            getProductosConPrecios(), // Usar función enriquecida
            getTipoCambio(),
        ]);
        setComponentes(componentesData);
        setProductos(productosData);
        setTipoCambioLocal(tc);
        setLoading(false);

        // Notificar costos (ya en ARS)
        const costoTotal = componentesData.reduce((acc, c) => acc + (c.costo_subtotal || 0), 0);
        onCostosActualizados?.(costoTotal);
    }

    // Función para obtener costo en ARS (convierte si es USD)
    function getCostoEnARS(producto: ProductoConPrecio): number {
        const costoBase = producto.costo_actual || producto.costo_unitario || 0;
        const moneda = producto.moneda_costo || 'ARS';
        return moneda === 'USD' ? costoBase * tipoCambio : costoBase;
    }

    // Función para formatear costo mostrando moneda original
    function formatCostoProducto(producto: Producto): string {
        const costo = producto.costo_unitario || 0;
        const moneda = (producto as any).moneda_costo || 'ARS';
        if (moneda === 'USD') {
            return `USD ${costo.toFixed(2)} → $${(costo * tipoCambio).toLocaleString('es-AR')} ARS`;
        }
        return `$${costo.toFixed(2)} ARS`;
    }

    // Productos disponibles para agregar (no ya agregados)
    const productosDisponibles = productos.filter(
        (p) => !componentes.some((c) => c.producto_id === p.id)
    );

    async function handleAddComponente() {
        if (!newComponente.producto_id || !newComponente.cantidad) return;

        const producto = productos.find((p) => p.id === newComponente.producto_id);
        if (!producto) return;

        setAdding(true);
        try {
            // Obtener datos originales del producto
            const monedaCosto = producto.moneda_costo || 'ARS';
            const costoBase = producto.costo_actual || producto.costo_unitario || 0;

            await addComponenteToReceta({
                receta_id: recetaId,
                producto_id: newComponente.producto_id,
                cantidad: parseFloat(newComponente.cantidad),
                unidad_medida: producto.unidad_medida,
                costo_unitario: costoBase,
                moneda: monedaCosto, // Guardamos la moneda correcta
                orden: componentes.length + 1,
            });
            await loadData();
            setNewComponente({ producto_id: '', cantidad: '' });
            setShowForm(false);
        } catch (error) {
            console.error('Error adding componente:', error);
        }
        setAdding(false);
    }

    async function handleUpdateCantidad(componente: RecetaComponenteConProducto) {
        if (!editCantidad) return;

        await updateComponente(
            componente.id,
            {
                cantidad: parseFloat(editCantidad),
                costo_unitario: componente.costo_unitario,
            },
            recetaId
        );
        await loadData();
        setEditingId(null);
        setEditCantidad('');
    }

    async function handleRemoveComponente(id: string) {
        if (!confirm('¿Eliminar este componente?')) return;
        await removeComponente(id, recetaId);
        await loadData();
    }

    const costoTotal = componentes.reduce((acc, c) => acc + (c.costo_subtotal || 0), 0);

    return (
        <Card className="mt-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-[var(--accent-gold)]" />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                        Componentes de la Receta
                    </h3>
                    <Badge variant="gold" size="sm">{componentes.length}</Badge>
                </div>
                <Button size="sm" onClick={() => setShowForm(!showForm)}>
                    <Plus className="w-4 h-4" /> Agregar
                </Button>
            </div>

            {/* Formulario para agregar */}
            {showForm && (
                <div className="mb-4 p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-default)]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                Producto / Insumo (MP o Semielaborado)
                            </label>
                            <Select
                                value={newComponente.producto_id}
                                onChange={(e) => setNewComponente({ ...newComponente, producto_id: e.target.value })}
                                options={[
                                    { value: '', label: 'Seleccionar producto...' },
                                    ...productosDisponibles.map((p) => {
                                        const moneda = p.moneda_costo || 'ARS';
                                        const costoBase = p.costo_actual || p.costo_unitario || 0;
                                        const costoDisplay = moneda === 'USD' ? costoBase : (costoBase / (moneda === 'ARS' ? 1 : 1)); // Solo para display logico

                                        // Si es USD mostramos USD, si es ARS mostramos $
                                        const precioText = moneda === 'USD' ? `USD ${costoBase.toFixed(2)}` : `$${costoBase.toFixed(2)}`;

                                        return {
                                            value: p.id,
                                            label: `${p.codigo} - ${p.nombre} (${precioText}/${p.unidad_medida})`,
                                        };
                                    }),
                                ]}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                Cantidad
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={newComponente.cantidad}
                                onChange={(e) => setNewComponente({ ...newComponente, cantidad: e.target.value })}
                                placeholder="0.00"
                                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setShowForm(false);
                                setNewComponente({ producto_id: '', cantidad: '' });
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleAddComponente}
                            disabled={adding || !newComponente.producto_id || !newComponente.cantidad}
                        >
                            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Agregar'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Lista de componentes */}
            {loading ? (
                <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-gold)] mx-auto" />
                </div>
            ) : componentes.length > 0 ? (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--border-default)]">
                                    <th className="text-left py-2 px-3 text-[var(--text-muted)]">#</th>
                                    <th className="text-left py-2 px-3 text-[var(--text-muted)]">Producto</th>
                                    <th className="text-right py-2 px-3 text-[var(--text-muted)]">Cantidad</th>
                                    <th className="text-right py-2 px-3 text-[var(--text-muted)]">Costo Orig.</th>
                                    <th className="text-right py-2 px-3 text-[var(--text-muted)]">Subtotal $ARG</th>
                                    <th className="text-right py-2 px-3 text-[var(--text-muted)]">Subtotal USD</th>
                                    <th className="text-center py-2 px-3 text-[var(--text-muted)]">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {componentes.map((comp, idx) => (
                                    <tr key={comp.id} className="border-b border-[var(--border-default)]/50">
                                        <td className="py-2 px-3 text-[var(--text-muted)]">{idx + 1}</td>
                                        <td className="py-2 px-3">
                                            <span className="font-mono text-xs text-[var(--accent-gold)]">
                                                {comp.producto?.codigo}
                                            </span>
                                            <p className="text-[var(--text-primary)]">{comp.producto?.nombre}</p>
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                            {editingId === comp.id ? (
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={editCantidad}
                                                    onChange={(e) => setEditCantidad(e.target.value)}
                                                    onBlur={() => handleUpdateCantidad(comp)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateCantidad(comp)}
                                                    autoFocus
                                                    className="w-20 px-2 py-1 text-right rounded bg-[var(--bg-tertiary)] border border-[var(--accent-gold)] text-[var(--text-primary)]"
                                                />
                                            ) : (
                                                <span
                                                    onClick={() => {
                                                        setEditingId(comp.id);
                                                        setEditCantidad(comp.cantidad.toString());
                                                    }}
                                                    className="cursor-pointer hover:text-[var(--accent-gold)] text-[var(--text-primary)]"
                                                >
                                                    {comp.cantidad} {comp.unidad_medida}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-2 px-3 text-right text-[var(--text-secondary)]">
                                            <div className="flex flex-col items-end">
                                                <span>{comp.moneda === 'USD' ? 'USD' : '$'} {comp.costo_unitario?.toFixed(2)}</span>
                                                {comp.moneda === 'USD' && (
                                                    <span className="text-xs text-[var(--text-muted)]">
                                                        (${(comp.costo_unitario * tipoCambio).toLocaleString('es-AR')})
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-2 px-3 text-right font-medium text-[var(--text-primary)]">
                                            ${(comp.moneda === 'USD'
                                                ? (comp.costo_unitario * comp.cantidad * tipoCambio)
                                                : (comp.costo_unitario * comp.cantidad)
                                            ).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-2 px-3 text-right font-medium text-[var(--accent-gold)]">
                                            USD {(comp.moneda === 'USD'
                                                ? (comp.costo_unitario * comp.cantidad)
                                                : (comp.costo_unitario * comp.cantidad / tipoCambio)
                                            ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                            <button
                                                onClick={() => handleRemoveComponente(comp.id)}
                                                className="p-1 rounded hover:bg-red-900/30 text-[var(--text-muted)] hover:text-[var(--color-danger)] transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Total */}
                    <div className="flex justify-end mt-4 pt-4 border-t border-[var(--border-default)]">
                        <div className="text-right">
                            <p className="text-sm text-[var(--text-muted)]">Costo Total de la Receta</p>
                            <div className="flex flex-col items-end">
                                <p className="text-2xl font-bold text-[var(--text-primary)]">
                                    ${componentes.reduce((acc, c) => {
                                        const sub = c.costo_unitario * c.cantidad;
                                        const subArs = c.moneda === 'USD' ? sub * tipoCambio : sub;
                                        return acc + subArs;
                                    }, 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <p className="text-lg font-medium text-[var(--accent-gold)]">
                                    USD {componentes.reduce((acc, c) => {
                                        const sub = c.costo_unitario * c.cantidad;
                                        const subUsd = c.moneda === 'USD' ? sub : sub / tipoCambio;
                                        return acc + subUsd;
                                    }, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-8">
                    <Package className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-2" />
                    <p className="text-[var(--text-muted)]">Sin componentes</p>
                    <p className="text-sm text-[var(--text-muted)]">Agregá materias primas para definir la fórmula</p>
                </div>
            )}
        </Card>
    );
}
