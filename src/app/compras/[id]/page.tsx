'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { Card, Button, Badge, Select } from '@/components/ui';
import {
    ArrowLeft, Plus, Trash2, Loader2, Package, Building2,
    Calendar, Send, Check, X, DollarSign, CheckCircle2, TruckIcon,
} from 'lucide-react';
import Link from 'next/link';
import {
    getOrdenCompraById,
    addItemToOrden,
    removeItem,
    cambiarEstadoOrden,
    deleteOrdenCompra,
    registrarItemsRecibidos,
    EstadoOCLabels,
    type OrdenCompraConRelaciones,
    type EstadoOC,
} from '@/services/ordenesCompra';
import { getProductos } from '@/services/productos';
import type { Producto } from '@/types/database';

// ─── Barra de progreso de recepción por item ───────────────────────────────
function BarraProgreso({ recibido, pedido }: { recibido: number; pedido: number }) {
    const pct = pedido > 0 ? Math.min(100, (recibido / pedido) * 100) : 0;
    const color =
        pct >= 100 ? 'bg-green-500' :
            pct > 0 ? 'bg-yellow-500' :
                'bg-[var(--border-default)]';
    return (
        <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-300 ${color}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                {recibido}/{pedido}
            </span>
        </div>
    );
}

// ─── Toast de éxito ────────────────────────────────────────────────────────
function ToastExito({ mensaje, onClose }: { mensaje: string; onClose: () => void }) {
    useEffect(() => {
        const t = setTimeout(onClose, 4000);
        return () => clearTimeout(t);
    }, [onClose]);

    return (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-green-900/90 border border-green-500/40 text-green-300 px-5 py-3 rounded-xl shadow-2xl animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            <span className="text-sm font-medium">{mensaje}</span>
            <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function OrdenCompraDetallePage() {
    const params = useParams();
    const router = useRouter();
    const ordenId = params.id as string;

    const [orden, setOrden] = useState<OrdenCompraConRelaciones | null>(null);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const [newItem, setNewItem] = useState({
        producto_id: '',
        cantidad: '',
        precio_unitario: '',
    });

    // Estados para recepción
    const [isReceiving, setIsReceiving] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [receptionQuantities, setReceptionQuantities] = useState<Record<string, string>>({});
    const [closePendientes, setClosePendientes] = useState<Record<string, boolean>>({});

    const loadData = useCallback(async () => {
        setLoading(true);
        const [ordenData, productosData] = await Promise.all([
            getOrdenCompraById(ordenId),
            getProductos(),
        ]);
        setOrden(ordenData);
        setProductos(productosData);
        setLoading(false);
    }, [ordenId]);

    useEffect(() => { loadData(); }, [loadData]);

    const monedaOrden = (orden as unknown as { moneda: string })?.moneda || 'ARS';
    const tipoCambioOrden = (orden as unknown as { tipo_cambio: number })?.tipo_cambio || 1;

    const productosDisponibles = productos.filter(
        p => !orden?.items?.some(item => item.producto_id === p.id)
    );

    function getPrecioSugerido(productoId: string): number {
        const producto = productos.find(p => p.id === productoId);
        if (!producto) return 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const monedaProducto = (producto as any).moneda_costo || 'ARS';
        const costo = producto.costo_unitario || 0;
        if (monedaOrden === 'USD' && monedaProducto === 'ARS') return costo / tipoCambioOrden;
        if (monedaOrden === 'ARS' && monedaProducto === 'USD') return costo * tipoCambioOrden;
        return costo;
    }

    function handleProductoChange(productoId: string) {
        setNewItem({
            producto_id: productoId,
            cantidad: newItem.cantidad,
            precio_unitario: getPrecioSugerido(productoId).toFixed(2),
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
        const msgs: Record<EstadoOC, string> = {
            ENVIADA: '¿Confirmar envío de la orden al proveedor?',
            RECIBIDA: '¿Marcar la orden como recibida completa?',
            CANCELADA: '¿Cancelar esta orden de compra?',
            BORRADOR: '¿Volver a borrador?',
            PARCIAL: '¿Marcar como recepción parcial?',
        };
        if (!confirm(msgs[nuevoEstado] || '¿Cambiar el estado?')) return;
        await cambiarEstadoOrden(ordenId, nuevoEstado);
        await loadData();
    }

    async function handleEliminar() {
        if (!confirm('¿Eliminar esta orden de compra? Esta acción no se puede deshacer.')) return;
        await deleteOrdenCompra(ordenId);
        router.push('/compras');
    }

    // ── Recepción ────────────────────────────────────────────────────────────
    // Calcula si hay al menos un item con cantidad > 0
    const itemsConCantidad = orden?.items?.filter(item => {
        const cant = parseFloat(receptionQuantities[item.id] || '0');
        return (cant > 0 || closePendientes[item.id]) && item.estado !== 'COMPLETADO';
    }) ?? [];

    const puedeConfirmar = itemsConCantidad.length > 0;

    async function handleConfirmarRecepcion() {
        if (!puedeConfirmar) return;
        if (!confirm('¿Confirmar la recepción? Se actualizará el stock y los costos automáticamente.')) return;

        setConfirming(true);
        try {
            const itemsAProcesar = itemsConCantidad.map(item => ({
                id: item.id,
                cantidad: parseFloat(receptionQuantities[item.id] || '0'),
                cerrar_pendiente: closePendientes[item.id] || false,
            }));

            await registrarItemsRecibidos(ordenId, itemsAProcesar);

            const totalRecibido = itemsAProcesar.reduce((acc, i) => acc + i.cantidad, 0);
            setToastMsg(`✅ Recepción confirmada: ${itemsAProcesar.length} item(s) · ${totalRecibido.toLocaleString('es-AR')} unidades registradas en stock`);
            setIsReceiving(false);
            setReceptionQuantities({});
            setClosePendientes({});
            await loadData();
        } catch (error) {
            console.error('Error en recepción:', error);
            alert('Error al registrar la recepción. Revisá la consola.');
        } finally {
            setConfirming(false);
        }
    }

    function cancelarRecepcion() {
        setIsReceiving(false);
        setReceptionQuantities({});
        setClosePendientes({});
    }

    // ── Formato ──────────────────────────────────────────────────────────────
    function formatCurrency(amount: number, moneda: string = monedaOrden) {
        if (moneda === 'USD') return `USD ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        return `$${amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    }

    function formatDate(dateStr: string) {
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

    // ── Render ───────────────────────────────────────────────────────────────
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
        <>
            {/* Toast de éxito */}
            {toastMsg && (
                <ToastExito mensaje={toastMsg} onClose={() => setToastMsg(null)} />
            )}

            <PageContainer
                title={`Orden ${orden.numero}`}
                description={`Proveedor: ${orden.proveedor?.nombre || 'Sin asignar'}`}
                actions={
                    <div className="flex gap-2">
                        {isReceiving ? (
                            <>
                                <Button variant="ghost" onClick={cancelarRecepcion} disabled={confirming}>
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleConfirmarRecepcion}
                                    disabled={!puedeConfirmar || confirming}
                                    className="min-w-[160px]"
                                >
                                    {confirming
                                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
                                        : <><Check className="w-4 h-4 mr-2" /> Confirmar Recepción</>
                                    }
                                </Button>
                            </>
                        ) : (
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
                                            <TruckIcon className="w-4 h-4 mr-2" />
                                            Registrar Recepción
                                        </Button>
                                    </>
                                )}
                                {orden.estado === 'PARCIAL' && (
                                    <Button onClick={() => setIsReceiving(true)}>
                                        <TruckIcon className="w-4 h-4 mr-2" />
                                        Continuar Recepción
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                }
            >
                {/* Header Info */}
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

                {/* Panel modo recepción: banner informativo */}
                {isReceiving && (
                    <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-3">
                        <TruckIcon className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
                        <div className="flex-1">
                            <p className="font-semibold text-yellow-300 text-sm">Modo Recepción Activo</p>
                            <p className="text-xs text-yellow-400/80 mt-0.5">
                                Ingresá las cantidades recibidas en cada item. El stock y el costo promedio se actualizarán automáticamente al confirmar.
                                Tildá &quot;Cerrar&quot; para items que no recibirás más aunque quede saldo pendiente.
                            </p>
                        </div>
                        {puedeConfirmar && (
                            <div className="text-right shrink-0">
                                <p className="text-xs text-yellow-400/80">A confirmar</p>
                                <p className="font-bold text-yellow-300 text-lg">{itemsConCantidad.length} item(s)</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Items */}
                <Card className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-[var(--accent-gold)]" />
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Items de la Orden</h3>
                            <Badge variant="gold" size="sm">{orden.items?.length || 0}</Badge>
                            {isReceiving && (
                                <Badge variant="default" size="sm" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 animate-pulse">
                                    Modo Recepción
                                </Badge>
                            )}
                        </div>
                        {esEditable && !isReceiving && (
                            <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
                                <Plus className="w-4 h-4" /> Agregar Item
                            </Button>
                        )}
                    </div>

                    {/* Form Agregar Item */}
                    {showAddForm && esEditable && (
                        <div className="mb-4 p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-default)]">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Producto</label>
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
                                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)} disabled={adding}>Cancelar</Button>
                                <Button size="sm" onClick={handleAddItem} disabled={adding}>
                                    {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Agregar
                                </Button>
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
                                                <th className="text-right py-2 px-3 text-[var(--text-muted)] bg-yellow-500/5">A recibir ahora</th>
                                                <th className="text-center py-2 px-3 text-[var(--text-muted)] bg-yellow-500/5" title="Cerrar pendiente: ya no recibirás más de este item">Cerrar ✓</th>
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
                                        const recibido = item.cantidad_recibida || 0;
                                        const pedido = item.cantidad_pedida;
                                        const pendiente = Math.max(0, pedido - recibido);
                                        const isCompleted = item.estado === 'COMPLETADO';

                                        return (
                                            <tr
                                                key={item.id}
                                                className={`border-b border-[var(--border-default)]/50 transition-colors ${isCompleted ? 'opacity-50' : 'hover:bg-[var(--bg-secondary)]/30'
                                                    }`}
                                            >
                                                {/* Producto */}
                                                <td className="py-3 px-3">
                                                    <span className="font-mono text-xs text-[var(--accent-gold)]">
                                                        {item.producto?.codigo}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[var(--text-primary)]">{item.producto?.nombre}</p>
                                                        {isCompleted && (
                                                            <Badge variant="success" size="sm" className="text-[10px] h-4 px-1">
                                                                Completo
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {/* Barra de progreso (visible cuando hay estado de recepción) */}
                                                    {(isReceiving || orden.estado === 'PARCIAL' || orden.estado === 'RECIBIDA') && (
                                                        <BarraProgreso recibido={recibido} pedido={pedido} />
                                                    )}
                                                </td>

                                                {/* Cantidad pedida */}
                                                <td className="py-3 px-3 text-right text-[var(--text-primary)]">
                                                    {pedido} <span className="text-[var(--text-muted)] text-xs">{item.producto?.unidad_medida}</span>
                                                </td>

                                                {/* Cantidad recibida acumulada */}
                                                {(orden.estado === 'PARCIAL' || orden.estado === 'RECIBIDA' || isReceiving) && (
                                                    <td className="py-3 px-3 text-right font-semibold text-green-400">
                                                        {recibido}
                                                    </td>
                                                )}

                                                {/* Input recepción */}
                                                {isReceiving && (
                                                    <>
                                                        <td className="py-2 px-3 bg-yellow-500/5">
                                                            {!isCompleted ? (
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="any"
                                                                    className="w-28 text-right px-2 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:border-yellow-500 focus:outline-none transition-colors"
                                                                    placeholder={pendiente.toString()}
                                                                    value={receptionQuantities[item.id] || ''}
                                                                    onChange={(e) => setReceptionQuantities({
                                                                        ...receptionQuantities,
                                                                        [item.id]: e.target.value,
                                                                    })}
                                                                />
                                                            ) : (
                                                                <span className="text-[var(--text-muted)] text-xs px-2">—</span>
                                                            )}
                                                        </td>
                                                        <td className="py-2 px-3 text-center bg-yellow-500/5">
                                                            {!isCompleted && (
                                                                <input
                                                                    type="checkbox"
                                                                    className="w-4 h-4 rounded border-[var(--border-default)] accent-yellow-500"
                                                                    checked={closePendientes[item.id] || false}
                                                                    title="Cerrar pendiente: no se recibirá más cantidad de este item"
                                                                    onChange={(e) => setClosePendientes({
                                                                        ...closePendientes,
                                                                        [item.id]: e.target.checked,
                                                                    })}
                                                                />
                                                            )}
                                                        </td>
                                                    </>
                                                )}

                                                {/* Precio y subtotal */}
                                                {!isReceiving && (
                                                    <>
                                                        <td className="py-3 px-3 text-right text-[var(--text-secondary)]">
                                                            {formatCurrency(item.precio_unitario)}
                                                        </td>
                                                        <td className="py-3 px-3 text-right font-medium gold-text">
                                                            {formatCurrency(item.subtotal || 0)}
                                                        </td>
                                                    </>
                                                )}

                                                {/* Eliminar */}
                                                {esEditable && (
                                                    <td className="py-3 px-3 text-center">
                                                        <button
                                                            onClick={() => handleRemoveItem(item.id)}
                                                            className="p-1 rounded hover:bg-red-900/30 text-[var(--text-muted)] hover:text-[var(--color-danger)] transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Package className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-2 opacity-30" />
                            <p className="text-[var(--text-muted)]">Sin items. Agregá productos a la orden.</p>
                        </div>
                    )}

                    {/* Totales */}
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

                    {/* Panel resumen de recepción */}
                    {isReceiving && itemsConCantidad.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-yellow-500/20">
                            <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-2">
                                Resumen de esta recepción
                            </p>
                            <div className="space-y-1">
                                {itemsConCantidad.map(item => {
                                    const cant = parseFloat(receptionQuantities[item.id] || '0');
                                    const cierra = closePendientes[item.id];
                                    return (
                                        <div key={item.id} className="flex justify-between text-sm text-[var(--text-secondary)]">
                                            <span>{item.producto?.nombre}</span>
                                            <span className="font-medium text-yellow-300">
                                                {cant > 0 ? `+${cant} ${item.producto?.unidad_medida}` : ''}
                                                {cierra && cant === 0 ? ' cierre sin recepción' : ''}
                                                {cierra && cant > 0 ? ' (cerrar)' : ''}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-yellow-400/60 mt-2">
                                💡 El costo promedio ponderado de cada producto se actualizará al confirmar.
                            </p>
                        </div>
                    )}
                </Card>

                {/* Botón volver */}
                <Link href="/compras">
                    <Button variant="ghost">
                        <ArrowLeft className="w-4 h-4" /> Volver a Órdenes
                    </Button>
                </Link>

                {/* Acción alternativa si puede recibir pero no está en modo */}
                {puedeRecibir && !isReceiving && (
                    <div className="mt-6 p-4 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg flex items-center justify-between">
                        <div>
                            <p className="font-medium text-[var(--text-primary)]">¿Llegó mercadería?</p>
                            <p className="text-sm text-[var(--text-muted)]">
                                Registrá los items recibidos para actualizar el stock y los costos.
                            </p>
                        </div>
                        <Button onClick={() => setIsReceiving(true)}>
                            <TruckIcon className="w-4 h-4 mr-2" />
                            {orden.estado === 'PARCIAL' ? 'Continuar Recepción' : 'Registrar Recepción'}
                        </Button>
                    </div>
                )}
            </PageContainer>
        </>
    );
}
