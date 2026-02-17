'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout';
import { Card, Button, Input, Badge } from '@/components/ui';
import { Search, Calculator, AlertTriangle, Save, Loader2, ArrowRight } from 'lucide-react';
import { getProductos, updateProducto } from '@/services/productos';
import { getRecetas } from '@/services/recetas'; // Necesitamos saber si tienen receta
import type { Producto } from '@/types/database';
import { TipoProductoLabels } from '@/types/database';

function formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(valor);
}

export default function CostosPage() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [recetaIds, setRecetaIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTipo, setFilterTipo] = useState<'TODOS' | 'MP/INSUMOS' | 'ELABORADOS'>('TODOS');

    // Edición rápida
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [savingId, setSavingId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [prods, recetas] = await Promise.all([
                getProductos(),
                getRecetas()
            ]);
            setProductos(prods);

            // Crear Set de IDs de productos que tienen receta
            const rIds = new Set<string>();
            recetas.forEach(r => {
                if (r.producto_id && r.estado === 'ACTIVA') rIds.add(r.producto_id);
            });
            setRecetaIds(rIds);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveCosto(id: string) {
        if (!editValue) return;
        setSavingId(id);
        try {
            const nuevoCosto = parseFloat(editValue);
            if (isNaN(nuevoCosto)) return;

            const updated = await updateProducto(id, { costo_unitario: nuevoCosto });
            if (updated) {
                setProductos(prev => prev.map(p => p.id === id ? { ...p, costo_unitario: nuevoCosto } : p));
                setEditingId(null);
            }
        } catch (error) {
            console.error(error);
            alert('Error al guardar costo');
        } finally {
            setSavingId(null);
        }
    }

    const filteredProductos = useMemo(() => {
        return productos.filter(p => {
            // Filtro Texto
            const matchText =
                p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.codigo.toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchText) return false;

            // Filtro Tipo
            const isElaborado = p.tipo === 'PT' || p.tipo === 'SE';
            if (filterTipo === 'MP/INSUMOS' && isElaborado) return false;
            if (filterTipo === 'ELABORADOS' && !isElaborado) return false;

            return true;
        });
    }, [productos, searchTerm, filterTipo]);

    return (
        <PageContainer
            title="Gestión de Costos"
            description="Administra los costos de materias primas y visualiza el costo de productos elaborados."
        >
            {/* Filtros y Buscador */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="Buscar por código o nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={filterTipo === 'TODOS' ? 'primary' : 'secondary'}
                        onClick={() => setFilterTipo('TODOS')}
                        size="sm"
                    >
                        Todos
                    </Button>
                    <Button
                        variant={filterTipo === 'MP/INSUMOS' ? 'primary' : 'secondary'}
                        onClick={() => setFilterTipo('MP/INSUMOS')}
                        size="sm"
                    >
                        MP / Insumos
                    </Button>
                    <Button
                        variant={filterTipo === 'ELABORADOS' ? 'primary' : 'secondary'}
                        onClick={() => setFilterTipo('ELABORADOS')}
                        size="sm"
                    >
                        Elaborados
                    </Button>
                </div>
            </div>

            {/* Tabla */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                            <tr>
                                <th className="py-3 px-4 font-medium">Código</th>
                                <th className="py-3 px-4 font-medium">Producto</th>
                                <th className="py-3 px-4 font-medium">Tipo</th>
                                <th className="py-3 px-4 font-medium text-right">Costo Unitario (ARS)</th>
                                <th className="py-3 px-4 font-medium text-center">Estado</th>
                                <th className="py-3 px-4 font-medium text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-default)]">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--accent-gold)]" />
                                    </td>
                                </tr>
                            ) : filteredProductos.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                                        No se encontraron productos.
                                    </td>
                                </tr>
                            ) : (
                                filteredProductos.map(p => {
                                    const isElaborado = p.tipo === 'PT' || p.tipo === 'SE';
                                    const hasReceta = recetaIds.has(p.id);
                                    const warning = isElaborado && !hasReceta;

                                    return (
                                        <tr key={p.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors group">
                                            <td className="py-3 px-4 font-mono text-xs text-[var(--text-secondary)]">
                                                {p.codigo}
                                            </td>
                                            <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                                                {p.nombre}
                                            </td>
                                            <td className="py-3 px-4">
                                                <Badge variant="default" className="text-xs bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)]">
                                                    {TipoProductoLabels[p.tipo]}
                                                </Badge>
                                            </td>

                                            {/* Columna Costo */}
                                            <td className="py-3 px-4 text-right">
                                                {isElaborado ? (
                                                    <div className="flex items-center justify-end gap-2 text-[var(--text-secondary)]">
                                                        <Calculator className="w-3 h-3 text-[var(--text-muted)]" />
                                                        <span className={p.costo_unitario === 0 ? 'text-[var(--text-muted)]' : 'font-semibold'}>
                                                            {formatearMoneda(p.costo_unitario)}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    // MP/Insumos: Editable
                                                    editingId === p.id ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Input
                                                                type="number"
                                                                className="w-24 h-8 text-right py-1"
                                                                value={editValue}
                                                                onChange={e => setEditValue(e.target.value)}
                                                                onKeyDown={e => e.key === 'Enter' && handleSaveCosto(p.id)}
                                                                autoFocus
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className="cursor-pointer hover:text-[var(--accent-gold)] transition-colors font-semibold"
                                                            onClick={() => {
                                                                setEditingId(p.id);
                                                                setEditValue(p.costo_unitario.toString());
                                                            }}
                                                        >
                                                            {formatearMoneda(p.costo_unitario)}
                                                        </div>
                                                    )
                                                )}
                                            </td>

                                            {/* Columna Estado */}
                                            <td className="py-3 px-4 text-center">
                                                {warning ? (
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 text-red-500 text-xs border border-red-500/20">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Falta Fórmula
                                                    </div>
                                                ) : isElaborado ? (
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10 text-green-500 text-xs border border-green-500/20">
                                                        <Calculator className="w-3 h-3" />
                                                        Calculado
                                                    </div>
                                                ) : (
                                                    <span className="text-[var(--text-muted)] text-xs">-</span>
                                                )}
                                            </td>

                                            {/* Acciones */}
                                            <td className="py-3 px-4 text-right">
                                                {editingId === p.id ? (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSaveCosto(p.id)}
                                                        disabled={savingId === p.id}
                                                        className="bg-[var(--accent-gold)] text-black hover:bg-yellow-500 h-8 px-2"
                                                    >
                                                        {savingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                                    </Button>
                                                ) : isElaborado && warning ? (
                                                    <Link href="/recetas/nuevo">
                                                        <Button variant="ghost" size="sm" className="text-[var(--accent-gold)] h-8 px-2 hover:bg-[var(--accent-gold)]/10">
                                                            Crear Receta <ArrowRight className="w-3 h-3 ml-1" />
                                                        </Button>
                                                    </Link>
                                                ) : null}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </PageContainer>
    );
}

