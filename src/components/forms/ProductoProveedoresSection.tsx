'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import { Plus, Trash2, Star, Edit2, Save, X, Building2, Loader2 } from 'lucide-react';
import { getProveedores, type Proveedor } from '@/services/proveedores';
import {
    getProveedoresByProducto,
    addProveedorToProducto,
    updateProductoProveedor,
    removeProveedorFromProducto,
    setProveedorPrincipal,
    type ProductoProveedorConProveedor,
} from '@/services/productosProveedores';

interface Props {
    productoId: string;
}

export function ProductoProveedoresSection({ productoId }: Props) {
    const [productosProveedores, setProductosProveedores] = useState<ProductoProveedorConProveedor[]>([]);
    const [proveedoresDisponibles, setProveedoresDisponibles] = useState<Proveedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form para agregar nuevo proveedor
    const [showAddForm, setShowAddForm] = useState(false);
    const [newProveedor, setNewProveedor] = useState({
        proveedor_id: '',
        codigo_alternativo: '',
        precio_unitario: '',
    });

    // Form para editar
    const [editForm, setEditForm] = useState({
        codigo_alternativo: '',
        precio_unitario: '',
    });

    // Cargar datos
    useEffect(() => {
        loadData();
    }, [productoId]);

    async function loadData() {
        setLoading(true);
        try {
            const [ppData, provData] = await Promise.all([
                getProveedoresByProducto(productoId),
                getProveedores(),
            ]);
            setProductosProveedores(ppData);
            setProveedoresDisponibles(provData);
        } catch (error) {
            console.error('Error loading data:', error);
        }
        setLoading(false);
    }

    // Proveedores que aún no están asociados
    const proveedoresNoAsociados = proveedoresDisponibles.filter(
        p => !productosProveedores.some(pp => pp.proveedor_id === p.id)
    );

    async function handleAddProveedor() {
        if (!newProveedor.proveedor_id) return;

        setAdding(true);
        try {
            await addProveedorToProducto({
                producto_id: productoId,
                proveedor_id: newProveedor.proveedor_id,
                codigo_alternativo: newProveedor.codigo_alternativo || undefined,
                precio_unitario: newProveedor.precio_unitario ? parseFloat(newProveedor.precio_unitario) : undefined,
            });

            setNewProveedor({ proveedor_id: '', codigo_alternativo: '', precio_unitario: '' });
            setShowAddForm(false);
            await loadData();
        } catch (error) {
            console.error('Error adding proveedor:', error);
            alert('Error al agregar proveedor');
        }
        setAdding(false);
    }

    async function handleRemove(id: string) {
        if (!confirm('¿Eliminar este proveedor del producto?')) return;

        const success = await removeProveedorFromProducto(id);
        if (success) {
            await loadData();
        } else {
            alert('Error al eliminar');
        }
    }

    async function handleSetPrincipal(id: string) {
        const success = await setProveedorPrincipal(productoId, id);
        if (success) {
            await loadData();
        } else {
            alert('Error al establecer como principal');
        }
    }

    function startEdit(pp: ProductoProveedorConProveedor) {
        setEditingId(pp.id);
        setEditForm({
            codigo_alternativo: pp.codigo_alternativo || '',
            precio_unitario: pp.precio_unitario?.toString() || '',
        });
    }

    async function handleSaveEdit() {
        if (!editingId) return;

        const updated = await updateProductoProveedor(editingId, {
            codigo_alternativo: editForm.codigo_alternativo || undefined,
            precio_unitario: editForm.precio_unitario ? parseFloat(editForm.precio_unitario) : undefined,
        });

        if (updated) {
            setEditingId(null);
            await loadData();
        } else {
            alert('Error al actualizar');
        }
    }

    if (loading) {
        return (
            <Card className="mt-6">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-gold)]" />
                    <span className="ml-2 text-[var(--text-secondary)]">Cargando proveedores...</span>
                </div>
            </Card>
        );
    }

    return (
        <Card className="mt-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[var(--accent-gold)]" />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                        Proveedores del Producto
                    </h3>
                    <Badge variant="default" size="sm">{productosProveedores.length}</Badge>
                </div>

                {!showAddForm && proveedoresNoAsociados.length > 0 && (
                    <Button size="sm" onClick={() => setShowAddForm(true)}>
                        <Plus className="w-4 h-4" /> Agregar
                    </Button>
                )}
            </div>

            {/* Form para agregar proveedor */}
            {showAddForm && (
                <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg mb-4 border border-[var(--border-default)]">
                    <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Agregar Proveedor</h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <div>
                            <label className="block text-xs text-[var(--text-muted)] mb-1">Proveedor *</label>
                            <select
                                value={newProveedor.proveedor_id}
                                onChange={(e) => setNewProveedor({ ...newProveedor, proveedor_id: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
                            >
                                <option value="">Seleccionar...</option>
                                {proveedoresNoAsociados.map(p => (
                                    <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs text-[var(--text-muted)] mb-1">Código Alternativo</label>
                            <input
                                type="text"
                                value={newProveedor.codigo_alternativo}
                                onChange={(e) => setNewProveedor({ ...newProveedor, codigo_alternativo: e.target.value })}
                                placeholder="Ej: TIO2-WHITE"
                                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-[var(--text-muted)] mb-1">Precio Unitario ($)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={newProveedor.precio_unitario}
                                onChange={(e) => setNewProveedor({ ...newProveedor, precio_unitario: e.target.value })}
                                placeholder="0.00"
                                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddProveedor} disabled={adding || !newProveedor.proveedor_id}>
                            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Agregar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                            <X className="w-4 h-4" /> Cancelar
                        </Button>
                    </div>
                </div>
            )}

            {/* Lista de proveedores asociados */}
            {productosProveedores.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-muted)]">
                    <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No hay proveedores asociados</p>
                    <p className="text-sm">Agregá proveedores para definir códigos alternativos y precios</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--border-default)]">
                                <th className="text-left py-2 px-2 text-[var(--text-muted)] font-medium">Proveedor</th>
                                <th className="text-left py-2 px-2 text-[var(--text-muted)] font-medium">Código Alternativo</th>
                                <th className="text-right py-2 px-2 text-[var(--text-muted)] font-medium">Precio</th>
                                <th className="text-center py-2 px-2 text-[var(--text-muted)] font-medium">Principal</th>
                                <th className="text-right py-2 px-2 text-[var(--text-muted)] font-medium">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productosProveedores.map((pp) => (
                                <tr key={pp.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]">
                                    <td className="py-3 px-2">
                                        <span className="font-mono text-xs text-[var(--accent-gold)]">{pp.proveedor?.codigo}</span>
                                        <span className="ml-2 text-[var(--text-primary)]">{pp.proveedor?.nombre}</span>
                                    </td>

                                    <td className="py-3 px-2">
                                        {editingId === pp.id ? (
                                            <input
                                                type="text"
                                                value={editForm.codigo_alternativo}
                                                onChange={(e) => setEditForm({ ...editForm, codigo_alternativo: e.target.value })}
                                                className="w-full px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--accent-gold)] text-[var(--text-primary)] text-sm"
                                            />
                                        ) : (
                                            <span className="font-mono text-[var(--text-secondary)]">
                                                {pp.codigo_alternativo || '-'}
                                            </span>
                                        )}
                                    </td>

                                    <td className="py-3 px-2 text-right">
                                        {editingId === pp.id ? (
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={editForm.precio_unitario}
                                                onChange={(e) => setEditForm({ ...editForm, precio_unitario: e.target.value })}
                                                className="w-24 px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--accent-gold)] text-[var(--text-primary)] text-sm text-right"
                                            />
                                        ) : (
                                            <span className="text-[var(--text-primary)]">
                                                {pp.precio_unitario ? `$${pp.precio_unitario.toFixed(2)}` : '-'}
                                            </span>
                                        )}
                                    </td>

                                    <td className="py-3 px-2 text-center">
                                        {pp.es_principal ? (
                                            <Badge variant="warning" size="sm">
                                                <Star className="w-3 h-3 fill-current" /> Principal
                                            </Badge>
                                        ) : (
                                            <button
                                                onClick={() => handleSetPrincipal(pp.id)}
                                                className="text-[var(--text-muted)] hover:text-[var(--accent-gold)] transition-colors"
                                                title="Marcar como principal"
                                            >
                                                <Star className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>

                                    <td className="py-3 px-2 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {editingId === pp.id ? (
                                                <>
                                                    <button
                                                        onClick={handleSaveEdit}
                                                        className="p-1 text-[var(--color-success)] hover:bg-[var(--color-success)]/10 rounded"
                                                    >
                                                        <Save className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingId(null)}
                                                        className="p-1 text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] rounded"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => startEdit(pp)}
                                                        className="p-1 text-[var(--text-muted)] hover:text-[var(--accent-gold)] hover:bg-[var(--bg-tertiary)] rounded"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemove(pp.id)}
                                                        className="p-1 text-[var(--text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 rounded"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
}
