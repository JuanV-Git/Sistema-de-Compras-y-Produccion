'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { Card, Button, Badge } from '@/components/ui';
import {
    Loader2, Trash2, ShoppingCart, ArrowLeft, Package,
    FileText, Building2, Plus,
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Producto, Proveedor } from '@/types/database';

// ─── Tipos ──────────────────────────────────────────

interface ListaCompraItem {
    productoId: string;
    codigo: string;
    nombre: string;
    unidad: string;
    cantidad: number;
    // Enriquecido después de cargar datos
    proveedorId?: string;
    proveedorNombre?: string;
    ultimoPrecio?: number;
}

// ═══════════════════════════════════════════════════════
export default function ListaCompraPage() {
    const router = useRouter();
    const [items, setItems] = useState<ListaCompraItem[]>([]);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [generandoOC, setGenerandoOC] = useState(false);

    // Selección para generar OC
    const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

    const loadData = useCallback(async () => {
        setLoading(true);
        const raw = JSON.parse(localStorage.getItem('listaCompra') || '[]') as ListaCompraItem[];
        if (raw.length === 0) {
            setItems([]);
            setLoading(false);
            return;
        }

        const supabase = createClient();
        const productoIds = raw.map(i => i.productoId);

        // Obtener proveedores principales
        const { data: links } = await supabase
            .from('productos_proveedores')
            .select('producto_id, proveedor_id, precio_unitario, proveedor:proveedores(id, nombre)')
            .eq('es_principal', true)
            .in('producto_id', productoIds);

        // Obtener costos unitarios por defecto
        const { data: prodsData } = await supabase
            .from('productos')
            .select('id, costo_unitario')
            .in('id', productoIds);

        // Obtener lista de proveedores para dropdown
        const { data: provs } = await supabase
            .from('proveedores')
            .select('*')
            .eq('activo', true)
            .order('nombre');

        setProveedores((provs || []) as Proveedor[]);

        // Enriquecer items
        const enriched = raw.map(item => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const link = (links || []).find((l: any) => l.producto_id === item.productoId) as any;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fallback = (prodsData || []).find((p: any) => p.id === item.productoId) as any;
            return {
                ...item,
                proveedorId: link?.proveedor?.id || '',
                proveedorNombre: link?.proveedor?.nombre || '',
                ultimoPrecio: item.ultimoPrecio !== undefined && item.ultimoPrecio !== 0 ? item.ultimoPrecio : (link?.precio_unitario || fallback?.costo_unitario || 0),
            };
        });

        setItems(enriched);
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    function handleUpdateCantidad(productoId: string, cantidad: number) {
        setItems(prev => {
            const next = prev.map(i =>
                i.productoId === productoId ? { ...i, cantidad } : i
            );
            localStorage.setItem('listaCompra', JSON.stringify(next));
            return next;
        });
    }

    function handleUpdatePrecio(productoId: string, precio: number) {
        setItems(prev => {
            const next = prev.map(i =>
                i.productoId === productoId ? { ...i, ultimoPrecio: precio } : i
            );
            localStorage.setItem('listaCompra', JSON.stringify(next));
            return next;
        });
    }

    function handleUpdateProveedor(productoId: string, proveedorId: string) {
        const prov = proveedores.find(p => p.id === proveedorId);
        setItems(prev => {
            const next = prev.map(i =>
                i.productoId === productoId
                    ? { ...i, proveedorId, proveedorNombre: prov?.nombre || '' }
                    : i
            );
            localStorage.setItem('listaCompra', JSON.stringify(next));
            return next;
        });
    }

    function handleEliminarItem(productoId: string) {
        setItems(prev => {
            const next = prev.filter(i => i.productoId !== productoId);
            localStorage.setItem('listaCompra', JSON.stringify(next));
            seleccionados.delete(productoId);
            setSeleccionados(new Set(seleccionados));
            return next;
        });
    }

    function handleLimpiarTodo() {
        if (!confirm('¿Limpiar toda la lista de compra?')) return;
        localStorage.removeItem('listaCompra');
        setItems([]);
        setSeleccionados(new Set());
    }

    function toggleSeleccion(productoId: string) {
        const next = new Set(seleccionados);
        if (next.has(productoId)) next.delete(productoId);
        else next.add(productoId);
        setSeleccionados(next);
    }

    async function handleGenerarOC() {
        const itemsSeleccionados = items.filter(i => seleccionados.has(i.productoId));
        if (itemsSeleccionados.length === 0) return;

        // Verificar que todos tengan proveedor
        const sinProveedor = itemsSeleccionados.filter(i => !i.proveedorId);
        if (sinProveedor.length > 0) {
            alert(`${sinProveedor.length} producto(s) no tienen proveedor asignado. Asignalos antes de generar la OC.`);
            return;
        }

        // Verificar que todos sean del mismo proveedor
        const proveedorIds = [...new Set(itemsSeleccionados.map(i => i.proveedorId))];
        if (proveedorIds.length > 1) {
            alert('Los productos seleccionados tienen distintos proveedores. Seleccioná solo los de un mismo proveedor para generar la OC.');
            return;
        }

        // Verificar cantidades
        const sinCantidad = itemsSeleccionados.filter(i => !i.cantidad || i.cantidad <= 0);
        if (sinCantidad.length > 0) {
            alert(`${sinCantidad.length} producto(s) no tienen cantidad. Ingresá cantidades antes de generar la OC.`);
            return;
        }

        setGenerandoOC(true);
        try {
            // Guardar datos para la página de nueva OC
            const datosOC = {
                proveedorId: proveedorIds[0],
                items: itemsSeleccionados.map(i => ({
                    productoId: i.productoId,
                    cantidad: i.cantidad,
                    precioUnitario: i.ultimoPrecio || 0,
                })),
            };
            localStorage.setItem('nuevaOC_prefill', JSON.stringify(datosOC));

            // Eliminar de la lista los items que van a la OC
            const remaining = items.filter(i => !seleccionados.has(i.productoId));
            localStorage.setItem('listaCompra', JSON.stringify(remaining));

            // Navegar a crear OC
            router.push('/compras/nueva');
        } catch (error) {
            console.error('Error generando OC:', error);
            alert('Error al generar la OC');
        } finally {
            setGenerandoOC(false);
        }
    }

    // ─── Agrupar por proveedor ────────────────────────

    const itemsPorProveedor = items.reduce((acc, item) => {
        const key = item.proveedorNombre || 'Sin proveedor';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {} as Record<string, ListaCompraItem[]>);

    // ─── Render ─────────────────────────────────────

    if (loading) {
        return (
            <PageContainer title="Lista de Compra" description="Cargando...">
                <div className="flex justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
                </div>
            </PageContainer>
        );
    }

    if (items.length === 0) {
        return (
            <PageContainer title="Lista de Compra" description="No hay productos pendientes">
                <Card className="text-center py-12">
                    <ShoppingCart className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-3 opacity-30" />
                    <p className="text-[var(--text-muted)] mb-4">La lista de compra está vacía</p>
                    <p className="text-xs text-[var(--text-muted)] mb-4">
                        Marcá productos en el <Link href="/compras/panel" className="text-[var(--accent-gold)] hover:underline">Panel de Compras</Link> y presioná &quot;Agregar a Lista&quot;
                    </p>
                    <Link href="/compras/panel">
                        <Button>
                            <ArrowLeft className="w-4 h-4 mr-1" /> Ir al Panel de Compras
                        </Button>
                    </Link>
                </Card>
            </PageContainer>
        );
    }

    const totalSeleccionados = seleccionados.size;

    return (
        <PageContainer
            title="Lista de Compra"
            description={`${items.length} producto(s) pendientes de compra`}
            actions={
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleLimpiarTodo}>
                        <Trash2 className="w-4 h-4 mr-1" /> Limpiar
                    </Button>
                    <Link href="/compras/panel">
                        <Button variant="secondary" size="sm">
                            <Plus className="w-4 h-4 mr-1" /> Agregar más
                        </Button>
                    </Link>
                </div>
            }
        >
            {/* Banner instructivo */}
            <Card className="mb-4 !py-2 !px-3 border-[var(--accent-gold)]/20 bg-amber-500/5">
                <p className="text-xs text-[var(--text-secondary)]">
                    💡 Asigná proveedor y cantidad a cada producto. Luego seleccioná los de un mismo proveedor y presioná <strong>&quot;Generar OC&quot;</strong>.
                </p>
            </Card>

            {/* Agrupado por proveedor */}
            {Object.entries(itemsPorProveedor).map(([provNombre, provItems]) => (
                <Card key={provNombre} className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Building2 className="w-4 h-4 text-[var(--accent-gold)]" />
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{provNombre}</h3>
                        <Badge variant={provNombre === 'Sin proveedor' ? 'danger' : 'gold'} size="sm">
                            {provItems.length}
                        </Badge>
                    </div>

                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-[var(--border-default)]">
                                <th className="py-1 px-2 w-8">☐</th>
                                <th className="text-left py-1 px-2 text-[var(--text-muted)]">Código</th>
                                <th className="text-left py-1 px-2 text-[var(--text-muted)]">Producto</th>
                                <th className="text-left py-1 px-2 text-[var(--text-muted)]">Proveedor</th>
                                <th className="text-right py-1 px-2 text-[var(--text-muted)]">Últ. Precio</th>
                                <th className="text-right py-1 px-2 text-[var(--text-muted)]">Cantidad</th>
                                <th className="py-1 px-2 w-8"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {provItems.map(item => (
                                <tr key={item.productoId} className="border-b border-[var(--border-default)]/30 hover:bg-[var(--bg-elevated)]/50">
                                    <td className="py-1.5 px-2">
                                        <input
                                            type="checkbox"
                                            className="rounded"
                                            checked={seleccionados.has(item.productoId)}
                                            onChange={() => toggleSeleccion(item.productoId)}
                                        />
                                    </td>
                                    <td className="py-1.5 px-2 font-mono text-[var(--accent-gold)]">{item.codigo}</td>
                                    <td className="py-1.5 px-2 text-[var(--text-primary)]">{item.nombre}</td>
                                    <td className="py-1.5 px-2">
                                        <select
                                            value={item.proveedorId || ''}
                                            onChange={e => handleUpdateProveedor(item.productoId, e.target.value)}
                                            className="px-1 py-0.5 text-[11px] rounded bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)] max-w-[140px]"
                                        >
                                            <option value="">Sin proveedor</option>
                                            {proveedores.map(p => (
                                                <option key={p.id} value={p.id}>{p.nombre}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="py-1.5 px-2 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <span className="text-[var(--text-muted)] text-xs">$</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.ultimoPrecio || ''}
                                                onChange={e => handleUpdatePrecio(item.productoId, parseFloat(e.target.value) || 0)}
                                                className="w-24 px-1 py-0.5 text-right text-xs rounded bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                                            />
                                        </div>
                                    </td>
                                    <td className="py-1.5 px-2 text-right">
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={item.cantidad || ''}
                                            onChange={e => handleUpdateCantidad(item.productoId, parseFloat(e.target.value) || 0)}
                                            className="w-20 px-1 py-0.5 text-right text-xs rounded bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                                        />
                                        <span className="text-[9px] text-[var(--text-muted)] ml-1">{item.unidad}</span>
                                    </td>
                                    <td className="py-1.5 px-2">
                                        <button
                                            onClick={() => handleEliminarItem(item.productoId)}
                                            className="text-[var(--text-muted)] hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            ))}

            {/* Barra inferior */}
            {totalSeleccionados > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-elevated)] border-t border-[var(--accent-gold)]/30 px-6 py-3 flex items-center justify-between shadow-2xl">
                    <span className="text-sm text-[var(--text-secondary)]">
                        <strong className="gold-text">{totalSeleccionados}</strong> producto(s) seleccionados
                    </span>
                    <Button onClick={handleGenerarOC} disabled={generandoOC} className="min-w-[180px]">
                        {generandoOC ? (
                            <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generando...</>
                        ) : (
                            <><FileText className="w-4 h-4 mr-1" /> Generar OC</>
                        )}
                    </Button>
                </div>
            )}
        </PageContainer>
    );
}
