'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { Card, Button, Badge, Select } from '@/components/ui';
import { ArrowLeft, Trash2, Loader2, Plus, Edit2, Save, Package, Calculator, X } from 'lucide-react';
import Link from 'next/link';
import {
    getRecetaById,
    getComponentesByReceta,
    addComponenteToReceta,
    removeComponente,
    updateRecetaCostos,
    type RecetaComponenteConProducto,
} from '@/services/recetas';
import { getProductos } from '@/services/productos';
import type { Receta, Producto } from '@/types/database';

export default function RecetaDetallePage() {
    const params = useParams();
    const router = useRouter();
    const recetaId = params.id as string;

    const [receta, setReceta] = useState<Receta | null>(null);
    const [componentes, setComponentes] = useState<RecetaComponenteConProducto[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [adding, setAdding] = useState(false);

    // Form para nuevo componente
    const [newComponente, setNewComponente] = useState({
        producto_id: '',
        cantidad: '',
    });

    useEffect(() => {
        loadData();
    }, [recetaId]);

    async function loadData() {
        setLoading(true);
        const [recetaData, componentesData, productosData] = await Promise.all([
            getRecetaById(recetaId),
            getComponentesByReceta(recetaId),
            getProductos(),
        ]);
        setReceta(recetaData);
        setComponentes(componentesData);
        // Filtrar productos que pueden ser componentes (no productos terminados)
        const tiposValidos = ['MATERIA_PRIMA', 'MP', 'INSUMO', 'ENVASE', 'ETIQUETA'];
        setProductos(productosData.filter(p => tiposValidos.includes(p.tipo)));
        setLoading(false);
    }

    async function handleAddComponente(e: React.FormEvent) {
        e.preventDefault();
        if (!newComponente.producto_id || !newComponente.cantidad) return;

        setAdding(true);
        const producto = productos.find(p => p.id === newComponente.producto_id);
        if (!producto) {
            setAdding(false);
            return;
        }

        try {
            const result = await addComponenteToReceta({
                receta_id: recetaId,
                producto_id: newComponente.producto_id,
                cantidad: parseFloat(newComponente.cantidad),
                unidad_medida: producto.unidad_medida,
                costo_unitario: producto.costo_unitario || 0,
            });
            console.log('Componente agregado:', result);

            setNewComponente({ producto_id: '', cantidad: '' });
            setShowAddForm(false);
            await loadData();
        } catch (error: any) {
            console.error('Error adding componente:', error);
            alert(`Error al guardar: ${error.message}`);
        }

        setAdding(false);
    }

    async function handleRemoveComponente(id: string) {
        if (!confirm('¿Eliminar este componente de la receta?')) return;
        await removeComponente(id, recetaId);
        await loadData();
    }

    function formatCurrency(amount: number): string {
        return `$${amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    }

    function getEstadoBadgeVariant(estado: string): 'gold' | 'success' | 'danger' | 'default' {
        switch (estado) {
            case 'ACTIVA': return 'success';
            case 'BORRADOR': return 'gold';
            case 'INACTIVA': return 'danger';
            default: return 'default';
        }
    }

    // Productos disponibles (no ya agregados)
    const productosDisponibles = productos.filter(
        p => !componentes.find(c => c.producto_id === p.id)
    );

    const productosOptions = [
        { value: '', label: 'Seleccionar materia prima...' },
        ...productosDisponibles.map(p => ({
            value: p.id,
            label: `${p.codigo} - ${p.nombre} (${p.unidad_medida})`,
        })),
    ];

    if (loading) {
        return (
            <PageContainer title="Receta" description="Cargando...">
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
                </div>
            </PageContainer>
        );
    }

    if (!receta) {
        return (
            <PageContainer title="Receta no encontrada" description="">
                <Card className="text-center py-12">
                    <p className="text-[var(--text-muted)]">La receta no existe</p>
                    <Link href="/recetas" className="mt-4 inline-block">
                        <Button>Volver a Recetas</Button>
                    </Link>
                </Card>
            </PageContainer>
        );
    }

    return (
        <PageContainer
            title={`${receta.codigo} - ${receta.nombre}`}
            description={`Versión ${receta.version || 1}`}
            actions={
                <Link href={`/recetas/${recetaId}/editar`}>
                    <Button variant="ghost">
                        <Edit2 className="w-4 h-4" /> Editar
                    </Button>
                </Link>
            }
        >
            {/* Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <p className="text-sm text-[var(--text-muted)]">Estado</p>
                    <Badge variant={getEstadoBadgeVariant(receta.estado)} size="sm" className="mt-1">
                        {receta.estado}
                    </Badge>
                </Card>
                <Card>
                    <p className="text-sm text-[var(--text-muted)]">Produce</p>
                    <p className="font-medium text-[var(--text-primary)]">
                        {receta.cantidad_producida?.toLocaleString()} {receta.unidad_medida}
                    </p>
                </Card>
                <Card>
                    <p className="text-sm text-[var(--text-muted)]">Costo Total</p>
                    <p className="text-xl font-bold gold-text">{formatCurrency(receta.costo_total || 0)}</p>
                </Card>
                <Card>
                    <p className="text-sm text-[var(--text-muted)]">Costo por Unidad</p>
                    <p className="text-xl font-bold gold-text">{formatCurrency(receta.costo_por_unidad || 0)}</p>
                </Card>
            </div>

            {/* Componentes */}
            <Card className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-[var(--accent-gold)]" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Componentes de la Receta</h3>
                        <Badge variant="gold" size="sm">{componentes.length}</Badge>
                    </div>
                    {receta.estado !== 'INACTIVA' && (
                        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
                            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {showAddForm ? 'Cancelar' : 'Agregar Componente'}
                        </Button>
                    )}
                </div>

                {/* Form agregar componente */}
                {showAddForm && (
                    <form onSubmit={handleAddComponente} className="mb-4 p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-default)]">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                    Materia Prima *
                                </label>
                                <Select
                                    value={newComponente.producto_id}
                                    onChange={(e) => setNewComponente(prev => ({ ...prev, producto_id: e.target.value }))}
                                    options={productosOptions}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                    Cantidad *
                                </label>
                                <input
                                    type="number"
                                    step="0.001"
                                    min="0.001"
                                    value={newComponente.cantidad}
                                    onChange={(e) => setNewComponente(prev => ({ ...prev, cantidad: e.target.value }))}
                                    placeholder="0.00"
                                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end mt-3">
                            <Button type="submit" size="sm" disabled={adding || !newComponente.producto_id || !newComponente.cantidad}>
                                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Agregar
                            </Button>
                        </div>
                    </form>
                )}

                {/* Tabla de componentes */}
                {componentes.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--border-default)]">
                                    <th className="text-left py-2 px-3 text-[var(--text-muted)]">Código</th>
                                    <th className="text-left py-2 px-3 text-[var(--text-muted)]">Materia Prima</th>
                                    <th className="text-right py-2 px-3 text-[var(--text-muted)]">Cantidad</th>
                                    <th className="text-right py-2 px-3 text-[var(--text-muted)]">Costo Unit.</th>
                                    <th className="text-right py-2 px-3 text-[var(--text-muted)]">Subtotal</th>
                                    <th className="text-center py-2 px-3 text-[var(--text-muted)]">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {componentes.map(comp => (
                                    <tr key={comp.id} className="border-b border-[var(--border-default)]/50">
                                        <td className="py-2 px-3">
                                            <span className="font-mono text-xs text-[var(--accent-gold)]">
                                                {comp.producto?.codigo}
                                            </span>
                                        </td>
                                        <td className="py-2 px-3 text-[var(--text-primary)]">
                                            {comp.producto?.nombre}
                                        </td>
                                        <td className="py-2 px-3 text-right text-[var(--text-secondary)]">
                                            {comp.cantidad?.toFixed(3)} {comp.unidad_medida}
                                        </td>
                                        <td className="py-2 px-3 text-right text-[var(--text-secondary)]">
                                            {formatCurrency(comp.costo_unitario || 0)}
                                        </td>
                                        <td className="py-2 px-3 text-right font-medium gold-text">
                                            {formatCurrency(comp.costo_subtotal || 0)}
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                            {receta.estado !== 'INACTIVA' && (
                                                <button
                                                    onClick={() => handleRemoveComponente(comp.id)}
                                                    className="text-[var(--color-danger)] hover:text-[var(--color-danger)]/70"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t border-[var(--border-default)]">
                                    <td colSpan={4} className="py-3 px-3 text-right font-medium text-[var(--text-secondary)]">
                                        Costo Total de la Receta:
                                    </td>
                                    <td className="py-3 px-3 text-right text-xl font-bold gold-text">
                                        {formatCurrency(receta.costo_total || 0)}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <Calculator className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-2" />
                        <p className="text-[var(--text-muted)]">Sin componentes definidos</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                            Agregá materias primas para calcular costos y generar consumos en producción
                        </p>
                    </div>
                )}
            </Card>

            {/* Observaciones */}
            {receta.observaciones && (
                <Card className="mb-6">
                    <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">Observaciones</h3>
                    <p className="text-[var(--text-secondary)]">{receta.observaciones}</p>
                </Card>
            )}

            {/* Back button */}
            <Link href="/recetas">
                <Button variant="ghost">
                    <ArrowLeft className="w-4 h-4" /> Volver a Recetas
                </Button>
            </Link>
        </PageContainer>
    );
}
