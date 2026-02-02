'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { Card, Button, Badge, Select } from '@/components/ui';
import { ArrowLeft, Plus, Trash2, Loader2, Package, Building2, Calendar, Send, Check, X, DollarSign } from 'lucide-react';
import Link from 'next/link';
import {
    getOrdenCompraById,
    addItemToOrden,
    removeItem,
    cambiarEstadoOrden,
    deleteOrdenCompra,
    EstadoOCLabels,
    type OrdenCompraConRelaciones,
    type OrdenCompraItemConProducto,
    type EstadoOC,
} from '@/services/ordenesCompra';
import { getProductos } from '@/services/productos';
import type { Producto } from '@/types/database';

export default function OrdenCompraDetallePage() {
    const params = useParams();
    const router = useRouter();
    const ordenId = params.id as string;

    const [orden, setOrden] = useState<OrdenCompraConRelaciones | null>(null);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    const [newItem, setNewItem] = useState({
        producto_id: '',
        cantidad: '',
        precio_unitario: '',
    });

    // Estados para recepción
    const [isReceiving, setIsReceiving] = useState(false);
    const [receptionQuantities, setReceptionQuantities] = useState<Record<string, string>>({});
    const [closePendientes, setClosePendientes] = useState<Record<string, boolean>>({});

    useEffect(() => {
        loadData();
    }, [ordenId]);

    async function loadData() {
        setLoading(true);
        const [ordenData, productosData] = await Promise.all([
            getOrdenCompraById(ordenId),
            getProductos(),
        ]);
        setOrden(ordenData);
        setProductos(productosData);
        setLoading(false);
    }

    // Moneda y tipo de cambio de la orden
    const monedaOrden = (orden as any)?.moneda || 'ARS';
    const tipoCambioOrden = (orden as any)?.tipo_cambio || 1;

    // Productos disponibles (no ya agregados)
    const productosDisponibles = productos.filter(
        p => !orden?.items?.some(item => item.producto_id === p.id)
    );

    // Obtener precio sugerido del producto
    function getPrecioSugerido(productoId: string): number {
        const producto = productos.find(p => p.id === productoId);
        if (!producto) return 0;

        const monedaProducto = (producto as any).moneda_costo || 'ARS';
        const costo = producto.costo_unitario || 0;

        // Si la orden es en USD y el producto está en ARS, convertir
        if (monedaOrden === 'USD' && monedaProducto === 'ARS') {
            return costo / tipoCambioOrden;
        }
        // Si la orden es en ARS y el producto está en USD, convertir
        if (monedaOrden === 'ARS' && monedaProducto === 'USD') {
            return costo * tipoCambioOrden;
        }
        // Misma moneda
        return costo;
    }

    // Cuando cambia el producto, sugerir el precio
    function handleProductoChange(productoId: string) {
        const precioSugerido = getPrecioSugerido(productoId);
        setNewItem({
            producto_id: productoId,
            cantidad: newItem.cantidad,
            precio_unitario: precioSugerido.toFixed(2),
        });
    }

    async function handleAddItem() {
        if (!newItem.producto_id || !newItem.cantidad || !newItem.precio_unitario) return;

        setAdding(true);
        await addItemToOrden({
            orden_compra_id: ordenId,
            producto_id: newItem.producto_id,
            cantidad_pedida: parseFloat(newItem.cantidad),
            precio_unitario: parseFloat(newItem.precio_unitario),
        });
        await loadData();
        setNewItem({ producto_id: '', cantidad: '', precio_unitario: '' });
        setShowAddForm(false);
        setAdding(false);
    }

    async function handleRemoveItem(itemId: string) {
        if (!confirm('¿Eliminar este item?')) return;
        await removeItem(itemId, ordenId);
        await loadData();
    }

    async function handleCambiarEstado(nuevoEstado: EstadoOC) {
        const confirmMsg = nuevoEstado === 'ENVIADA'
            ? '¿Confirmar envío de la orden al proveedor?'
            : nuevoEstado === 'RECIBIDA'
                ? '¿Marcar la orden como recibida completa?'
                : nuevoEstado === 'CANCELADA'
                    ? '¿Cancelar esta orden de compra?'
                    : '¿Cambiar el estado de la orden?';

        if (!confirm(confirmMsg)) return;

        await cambiarEstadoOrden(ordenId, nuevoEstado);
        await loadData();
    }

    async function handleEliminar() {
        if (!confirm('¿Eliminar esta orden de compra? Esta acción no se puede deshacer.')) return;
        await deleteOrdenCompra(ordenId);
        router.push('/compras');
    }

    function formatCurrency(amount: number, moneda: string = monedaOrden): string {
        if (moneda === 'USD') {
            return `USD ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        }
        return `$${amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    }

    function formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('es-AR');
    }

    function getEstadoBadgeVariant(estado: string): 'gold' | 'success' | 'danger' | 'default' {
        switch (estado) {
            case 'BORRADOR': return 'gold';
            case 'ENVIADA': return 'default';
            case 'PARCIAL': return 'gold';
            case 'RECIBIDA': return 'success';
            case 'CANCELADA': return 'danger';
            default: return 'default';
        }
    }

    async function handleConfirmarRecepcion() {
        if (!confirm('¿Confirmar la recepción de estos items? Se actualizará el stock.')) return;

        const itemsAProcesar = orden?.items?.filter(item => {
            const key = item.id;
            const cantidad = parseFloat(receptionQuantities[key] || '0');
            const cerrar = closePendientes[key] || false;
            return cantidad > 0 || cerrar;
        }).map(item => ({
            id: item.id,
            cantidad: parseFloat(receptionQuantities[item.id] || '0'),
            cerrar_pendiente: closePendientes[item.id] || false
        })) || [];

        if (itemsAProcesar.length === 0) {
            alert('No hay items para recibir o cerrar.');
            return;
        }

        const { registrarItemsRecibidos } = await import('@/services/ordenesCompra');
        await registrarItemsRecibidos(ordenId, itemsAProcesar);

        setIsReceiving(false);
        setReceptionQuantities({});
        setClosePendientes({});
        await loadData();
    }

    if (loading) {
        return (
            <PageContainer title="Orden de Compra" description="Cargando...">
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
                </div>
            </PageContainer>
        );
    }

    if (!orden) {
        return (
            <PageContainer title="Orden no encontrada" description="">
                <Card className="text-center py-12">
                    <p className="text-[var(--text-muted)]">La orden de compra no existe</p>
                    <Link href="/compras" className="mt-4 inline-block">
                        <Button>Volver a Órdenes</Button>
                    </Link>
                </Card>
            </PageContainer>
        );
    }

    const esEditable = orden.estado === 'BORRADOR';
    const puedeRecibir = orden.estado === 'ENVIADA' || orden.estado === 'PARCIAL';

    return (
        <PageContainer
            title={`Orden ${orden.numero}`}
            description={`Proveedor: ${orden.proveedor?.nombre || 'Sin asignar'}`}
            actions={
                <div className="flex gap-2">
                    {/* Modo Recepción Activado */}
                    {isReceiving ? (
                        <>
                            <Button variant="ghost" onClick={() => setIsReceiving(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleConfirmarRecepcion}>
                                <Check className="w-4 h-4 mr-2" />
                                Confirmar Recepción
                            </Button>
                        </>
                    ) : (
                        // Acciones Normales
                        <>
                            {esEditable && (
                                <>
                                    <Button variant="ghost" onClick={handleEliminar}>
                                        <Trash2 className="w-4 h-4" /> Eliminar
                                    </Button>
                                    <Button onClick={() => handleCambiarEstado('ENVIADA')}>
                                        <Send className="w-4 h-4" /> Enviar al Proveedor
                                    </Button>
                                </>
                            )}
                            {orden.estado === 'ENVIADA' && (
                                <>
                                    <Button variant="ghost" onClick={() => handleCambiarEstado('CANCELADA')}>
                                        <X className="w-4 h-4" /> Cancelar
                                    </Button>
                                    <Button onClick={() => setIsReceiving(true)}>
                                        <Package className="w-4 h-4 mr-2" />
                                        Registrar Recepción
                                    </Button>
                                </>
                            )}
                            {orden.estado === 'PARCIAL' && (
                                <Button onClick={() => setIsReceiving(true)}>
                                    <Package className="w-4 h-4 mr-2" />
                                    Continuar Recepción
                                </Button>
                            )}
                        </>
                    )}
                </div>
            }
        >
            {/* Header Info (Igual que antes) */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <Card>
                    <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-[var(--accent-gold)]" />
                        <div>
                            <p className="text-sm text-[var(--text-muted)]">Proveedor</p>
                            <p className="font-medium text-[var(--text-primary)]">{orden.proveedor?.nombre}</p>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-[var(--accent-gold)]" />
                        <div>
                            <p className="text-sm text-[var(--text-muted)]">Fecha Emisión</p>
                            <p className="font-medium text-[var(--text-primary)]">{formatDate(orden.fecha_emision)}</p>
                        </div>
                    </div>
                </Card>
                {/* ... Resto de cards iguales ... */}
                <Card>
                    <div className="flex items-center gap-3">
                        <DollarSign className="w-5 h-5 text-[var(--accent-gold)]" />
                        <div>
                            <p className="text-sm text-[var(--text-muted)]">Moneda</p>
                            <p className="font-medium text-[var(--text-primary)]">
                                {monedaOrden === 'USD' ? 'Dólares (USD)' : 'Pesos (ARS)'}
                            </p>
                            {monedaOrden === 'USD' && (
                                <p className="text-xs text-[var(--text-muted)]">TC: ${tipoCambioOrden.toLocaleString('es-AR')}</p>
                            )}
                        </div>
                    </div>
                </Card>
                <Card>
                    <p className="text-sm text-[var(--text-muted)]">Estado</p>
                    <Badge variant={getEstadoBadgeVariant(orden.estado)} size="sm" className="mt-1">
                        {EstadoOCLabels[orden.estado as keyof typeof EstadoOCLabels] || orden.estado}
                    </Badge>
                </Card>
                <Card className="text-right">
                    <p className="text-sm text-[var(--text-muted)]">Total</p>
                    <p className="text-2xl font-bold gold-text">{formatCurrency(orden.total || 0)}</p>
                    {monedaOrden === 'USD' && (
                        <p className="text-sm text-[var(--text-muted)]">
                            ≈ ${((orden.total || 0) * tipoCambioOrden).toLocaleString('es-AR', { minimumFractionDigits: 0 })} ARS
                        </p>
                    )}
                </Card>
            </div>

            {/* Items */}
            <Card className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-[var(--accent-gold)]" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Items de la Orden</h3>
                        <Badge variant="gold" size="sm">{orden.items?.length || 0}</Badge>
                        {isReceiving && <Badge variant="default" size="sm" className="animate-pulse">Modo Recepción</Badge>}
                    </div>
                    {esEditable && !isReceiving && (
                        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
                            <Plus className="w-4 h-4" /> Agregar Item
                        </Button>
                    )}
                </div>

                {/* Form Agregar Item (Solo si editable) */}
                {showAddForm && esEditable && (
                    <div className="mb-4 p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-default)]">
                        {/* ... Mismo form de agregar ... */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Product</label>
                                <Select
                                    value={newItem.producto_id}
                                    onChange={(e) => handleProductoChange(e.target.value)}
                                    options={[
                                        { value: '', label: 'Seleccionar producto...' },
                                        ...productosDisponibles.map(p => ({
                                            value: p.id,
                                            label: `${p.codigo} - ${p.nombre}`,
                                        })),
                                    ]}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Cantidad</label>
                                <input
                                    type="number"
                                    value={newItem.cantidad}
                                    onChange={(e) => setNewItem({ ...newItem, cantidad: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Precio Unit.</label>
                                <input
                                    type="number"
                                    value={newItem.precio_unitario}
                                    onChange={(e) => setNewItem({ ...newItem, precio_unitario: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)]"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Cancelar</Button>
                            <Button size="sm" onClick={handleAddItem}>Agregar</Button>
                        </div>
                    </div>
                )}

                {/* Lista de items */}
                {orden.items && orden.items.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--border-default)]">
                                    <th className="text-left py-2 px-3 text-[var(--text-muted)]">Producto</th>
                                    <th className="text-right py-2 px-3 text-[var(--text-muted)]">Cant. Pedida</th>
                                    {(orden.estado === 'PARCIAL' || orden.estado === 'RECIBIDA' || isReceiving) && (
                                        <th className="text-right py-2 px-3 text-[var(--text-muted)]">Recibido</th>
                                    )}
                                    {isReceiving && (
                                        <>
                                            <th className="text-right py-2 px-3 text-[var(--text-muted)] bg-[var(--bg-tertiary)]/50">A Recibir</th>
                                            <th className="text-center py-2 px-3 text-[var(--text-muted)] bg-[var(--bg-tertiary)]/50">Cerrar</th>
                                        </>
                                    )}
                                    {!isReceiving && (
                                        <>
                                            <th className="text-right py-2 px-3 text-[var(--text-muted)]">Precio Unit.</th>
                                            <th className="text-right py-2 px-3 text-[var(--text-muted)]">Subtotal</th>
                                        </>
                                    )}
                                    {esEditable && <th className="text-center py-2 px-3"></th>}
                                </tr>
                            </thead>
                            <tbody>
                                {orden.items.map(item => {
                                    const pendiente = Math.max(0, item.cantidad_pedida - (item.cantidad_recibida || 0));
                                    const isCompleted = item.estado === 'COMPLETADO';

                                    return (
                                        <tr key={item.id} className={`border-b border-[var(--border-default)]/50 ${isCompleted ? 'opacity-60 bg-[var(--bg-tertiary)]/20' : ''}`}>
                                            <td className="py-2 px-3">
                                                <span className="font-mono text-xs text-[var(--accent-gold)]">
                                                    {item.producto?.codigo}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[var(--text-primary)]">{item.producto?.nombre}</p>
                                                    {isCompleted && <Badge variant="success" size="sm" className="text-[10px] h-4 px-1">OK</Badge>}
                                                </div>
                                            </td>
                                            <td className="py-2 px-3 text-right text-[var(--text-primary)]">
                                                {item.cantidad_pedida} {item.producto?.unidad_medida}
                                            </td>

                                            {/* Columnas de Recepción */}
                                            {(orden.estado === 'PARCIAL' || orden.estado === 'RECIBIDA' || isReceiving) && (
                                                <td className="py-2 px-3 text-right font-medium text-[var(--color-success)]">
                                                    {item.cantidad_recibida || 0}
                                                </td>
                                            )}

                                            {isReceiving && (
                                                <>
                                                    <td className="py-2 px-3 bg-[var(--bg-tertiary)]/30">
                                                        {!isCompleted && (
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={pendiente} // Sugerencia visual
                                                                className="w-24 text-right px-2 py-1 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                                                                placeholder={pendiente.toString()}
                                                                value={receptionQuantities[item.id] || ''}
                                                                onChange={(e) => setReceptionQuantities({
                                                                    ...receptionQuantities,
                                                                    [item.id]: e.target.value
                                                                })}
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-3 text-center bg-[var(--bg-tertiary)]/30">
                                                        {!isCompleted && (
                                                            <input
                                                                type="checkbox"
                                                                className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-primary)] accent-[var(--accent-gold)]"
                                                                checked={closePendientes[item.id] || false}
                                                                onChange={(e) => setClosePendientes({
                                                                    ...closePendientes,
                                                                    [item.id]: e.target.checked
                                                                })}
                                                                title="Cerrar pendiente (ya no se recibirá más)"
                                                            />
                                                        )}
                                                    </td>
                                                </>
                                            )}

                                            {!isReceiving && (
                                                <>
                                                    <td className="py-2 px-3 text-right text-[var(--text-secondary)]">
                                                        {formatCurrency(item.precio_unitario)}
                                                    </td>
                                                    <td className="py-2 px-3 text-right font-medium gold-text">
                                                        {formatCurrency(item.subtotal || 0)}
                                                    </td>
                                                </>
                                            )}

                                            {esEditable && (
                                                <td className="py-2 px-3 text-center">
                                                    <button
                                                        onClick={() => handleRemoveItem(item.id)}
                                                        className="p-1 rounded hover:bg-red-900/30 text-[var(--text-muted)] hover:text-[var(--color-danger)] transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    // Empty state...
                    <div className="text-center py-8">
                        <p className="text-[var(--text-muted)]">Sin items</p>
                    </div>
                )}

                {/* Totales (Solo visible si no estamos recepcionando para limpiar vista) */}
                {!isReceiving && orden.items && orden.items.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
                        <div className="flex justify-end">
                            <div className="w-80 space-y-2">
                                <div className="flex justify-between text-lg font-bold">
                                    <span className="text-[var(--text-primary)]">Total:</span>
                                    <span className="gold-text">{formatCurrency(orden.total || 0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Back button */}
            <Link href="/compras">
                <Button variant="ghost">
                    <ArrowLeft className="w-4 h-4" /> Volver a Órdenes
                </Button>
            </Link>
        </PageContainer>
    );
}
