'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { Card, Button, Badge } from '@/components/ui';
import { ArrowLeft, Trash2, Loader2, Package, Factory, Calendar, Play, Check, X, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import {
    getOrdenProduccionById,
    cambiarEstadoOrdenProduccion,
    updateConsumoReal,
    registrarProduccion,
    deleteOrdenProduccion,
    EstadoOPLabels,
    type OrdenProduccionConRelaciones,
    type EstadoOP,
} from '@/services/ordenesProduccion';

export default function OrdenProduccionDetallePage() {
    const params = useParams();
    const router = useRouter();
    const ordenId = params.id as string;

    const [orden, setOrden] = useState<OrdenProduccionConRelaciones | null>(null);
    const [loading, setLoading] = useState(true);
    const [cantidadProducida, setCantidadProducida] = useState('');

    const loadData = useCallback(async () => {
        // setLoading(true); // Initial state is already true
        const ordenData = await getOrdenProduccionById(ordenId);
        setOrden(ordenData);
        if (ordenData) {
            setCantidadProducida(ordenData.cantidad_producida?.toString() || '0');
        }
        setLoading(false);
    }, [ordenId]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadData();
        }, 0);
        return () => clearTimeout(timer);
    }, [loadData]);

    async function handleCambiarEstado(nuevoEstado: EstadoOP) {
        // Confirmación inicial
        const confirmMsg = nuevoEstado === 'EN_PRODUCCION'
            ? '¿Iniciar la producción de esta orden?'
            : nuevoEstado === 'COMPLETADA'
                ? '¿Marcar la orden como completada?'
                : nuevoEstado === 'CANCELADA'
                    ? '¿Cancelar esta orden de producción?'
                    : '¿Cambiar el estado de la orden?';

        if (!confirm(confirmMsg)) return;

        // Intentar cambio de estado
        const result = await cambiarEstadoOrdenProduccion(ordenId, nuevoEstado);

        // Si fue exitoso
        if (result.success) {
            await loadData();
            return;
        }

        // Si hubo error de stock (solo ocurre al intentar iniciar)
        if (result.error === 'STOCK_INSUFICIENTE' && result.faltantes) {
            const listaFaltantes = result.faltantes.faltantes
                .map(f => `- ${f.nombre}: Faltan ${f.faltante.toLocaleString()} ${f.unidad}`)
                .join('\n'); // Formato de lista

            const alertMsg = `⚠️ NO HAY STOCK SUFICIENTE PARA INICIAR\n\n${listaFaltantes}\n\n¿Desea FORZAR el inicio de producción?\n(Esto generará saldo negativo en stock)`;

            if (confirm(alertMsg)) {
                await cambiarEstadoOrdenProduccion(ordenId, nuevoEstado, true); // Forzar inicio
                await loadData();
            }
        } else if (result.error) {
            // Otros errores
            alert(`Error: ${result.error}`);
        }
    }

    async function handleEliminar() {
        if (!confirm('¿Eliminar esta orden de producción? Esta acción no se puede deshacer.')) return;
        await deleteOrdenProduccion(ordenId);
        router.push('/produccion');
    }

    async function handleUpdateConsumoReal(consumoId: string, cantidadReal: number) {
        await updateConsumoReal(consumoId, cantidadReal);
        await loadData();
    }

    async function handleGuardarProduccion() {
        await registrarProduccion(ordenId, parseFloat(cantidadProducida));
        await loadData();
    }

    function formatCurrency(amount: number): string {
        return `$${amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    }

    function formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('es-AR');
    }

    function getEstadoBadgeVariant(estado: string): 'gold' | 'success' | 'danger' | 'warning' | 'default' {
        switch (estado) {
            case 'PLANIFICADA': return 'gold';
            case 'EN_PRODUCCION': return 'warning';
            case 'PAUSADA': return 'default';
            case 'COMPLETADA': return 'success';
            case 'CANCELADA': return 'danger';
            default: return 'default';
        }
    }

    function getVariacionColor(variacion: number): string {
        if (variacion > 5) return 'text-[var(--color-danger)]';
        if (variacion < -5) return 'text-[var(--color-success)]';
        return 'text-[var(--text-muted)]';
    }

    if (loading) {
        return (
            <PageContainer title="Orden de Producción" description="Cargando...">
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
                    <p className="text-[var(--text-muted)]">La orden de producción no existe</p>
                    <Link href="/produccion" className="mt-4 inline-block">
                        <Button>Volver a Órdenes</Button>
                    </Link>
                </Card>
            </PageContainer>
        );
    }

    const esEditable = orden.estado === 'PLANIFICADA';
    const enProduccion = orden.estado === 'EN_PRODUCCION';
    const completada = orden.estado === 'COMPLETADA';

    // Calcular costo real total de consumos
    const costoRealTotal = orden.consumos?.reduce((acc, c) => acc + (c.costo_real || 0), 0) || 0;
    const variacionCosto = orden.costo_teorico_total > 0
        ? ((costoRealTotal - orden.costo_teorico_total) / orden.costo_teorico_total) * 100
        : 0;

    return (
        <PageContainer
            title={`Orden ${orden.numero}`}
            description={`Producto: ${orden.producto?.nombre || 'Sin asignar'}`}
            actions={
                <div className="flex gap-2">
                    {esEditable && (
                        <>
                            <Button variant="ghost" onClick={handleEliminar}>
                                <Trash2 className="w-4 h-4" /> Eliminar
                            </Button>
                            <Button onClick={() => handleCambiarEstado('EN_PRODUCCION')}>
                                <Play className="w-4 h-4" /> Iniciar Producción
                            </Button>
                        </>
                    )}
                    {enProduccion && (
                        <>
                            <Button variant="ghost" onClick={() => handleCambiarEstado('CANCELADA')}>
                                <X className="w-4 h-4" /> Cancelar
                            </Button>
                            <Button onClick={() => handleCambiarEstado('COMPLETADA')}>
                                <Check className="w-4 h-4" /> Completar
                            </Button>
                        </>
                    )}
                </div>
            }
        >
            {/* Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <Card>
                    <div className="flex items-center gap-3">
                        <Factory className="w-5 h-5 text-[var(--accent-gold)]" />
                        <div>
                            <p className="text-sm text-[var(--text-muted)]">Receta</p>
                            <Link href={`/recetas/${orden.receta_id}`} className="font-medium text-[var(--accent-gold)] hover:underline">
                                {orden.receta?.codigo || 'Ver receta'}
                            </Link>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-[var(--accent-gold)]" />
                        <div>
                            <p className="text-sm text-[var(--text-muted)]">Cantidad</p>
                            <p className="font-medium text-[var(--text-primary)]">
                                {orden.cantidad_programada?.toLocaleString()} {orden.unidad_medida}
                            </p>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-[var(--accent-gold)]" />
                        <div>
                            <p className="text-sm text-[var(--text-muted)]">Creada</p>
                            <p className="font-medium text-[var(--text-primary)]">
                                {formatDate(orden.fecha_creacion || orden.created_at)}
                            </p>
                        </div>
                    </div>
                </Card>
                <Card>
                    <p className="text-sm text-[var(--text-muted)]">Estado</p>
                    <Badge variant={getEstadoBadgeVariant(orden.estado)} size="sm" className="mt-1">
                        {EstadoOPLabels[orden.estado as keyof typeof EstadoOPLabels] || orden.estado}
                    </Badge>
                </Card>
                <Card className="text-right">
                    <p className="text-sm text-[var(--text-muted)]">Costo Teórico</p>
                    <p className="text-2xl font-bold gold-text">{formatCurrency(orden.costo_teorico_total || 0)}</p>
                </Card>
            </div>

            {/* Producción (solo en producción) */}
            {enProduccion && (
                <Card className="mb-6 border-[var(--color-warning)]/30">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertCircle className="w-5 h-5 text-[var(--color-warning)]" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Registrar Producción</h3>
                    </div>
                    <div className="flex items-end gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Cantidad Producida
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={cantidadProducida}
                                    onChange={(e) => setCantidadProducida(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                                    {orden.unidad_medida}
                                </span>
                            </div>
                        </div>
                        <Button onClick={handleGuardarProduccion}>
                            Guardar
                        </Button>
                    </div>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                        Programado: {orden.cantidad_programada?.toLocaleString()} {orden.unidad_medida}
                    </p>
                </Card>
            )}

            {/* Consumos */}
            <Card className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-[var(--accent-gold)]" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Consumos de Materia Prima</h3>
                        <Badge variant="gold" size="sm">{orden.consumos?.length || 0}</Badge>
                    </div>
                </div>

                {orden.consumos && orden.consumos.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--border-default)]">
                                    <th className="text-left py-2 px-3 text-[var(--text-muted)]">Producto</th>
                                    <th className="text-right py-2 px-3 text-[var(--text-muted)]">Cant. Teórica</th>
                                    <th className="text-right py-2 px-3 text-[var(--text-muted)]">Cant. Real</th>
                                    <th className="text-right py-2 px-3 text-[var(--text-muted)]">Costo Unit.</th>
                                    <th className="text-right py-2 px-3 text-[var(--text-muted)]">Costo Teórico</th>
                                    <th className="text-right py-2 px-3 text-[var(--text-muted)]">Costo Real</th>
                                    <th className="text-right py-2 px-3 text-[var(--text-muted)]">Variación</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orden.consumos.map(consumo => (
                                    <tr key={consumo.id} className="border-b border-[var(--border-default)]/50">
                                        <td className="py-2 px-3">
                                            <span className="font-mono text-xs text-[var(--accent-gold)]">
                                                {consumo.producto?.codigo}
                                            </span>
                                            <p className="text-[var(--text-primary)]">{consumo.producto?.nombre}</p>
                                        </td>
                                        <td className="py-2 px-3 text-right text-[var(--text-secondary)]">
                                            {consumo.cantidad_teorica?.toFixed(2)} {consumo.producto?.unidad_medida}
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                            {enProduccion ? (
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    defaultValue={consumo.cantidad_real || 0}
                                                    onBlur={(e) => handleUpdateConsumoReal(consumo.id, parseFloat(e.target.value) || 0)}
                                                    className="w-20 px-2 py-1 text-right rounded bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                                                />
                                            ) : (
                                                <span className="text-[var(--text-primary)]">
                                                    {consumo.cantidad_real?.toFixed(2) || '-'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-2 px-3 text-right text-[var(--text-secondary)]">
                                            {formatCurrency(consumo.costo_unitario || 0)}
                                        </td>
                                        <td className="py-2 px-3 text-right text-[var(--text-secondary)]">
                                            {formatCurrency(consumo.costo_teorico || 0)}
                                        </td>
                                        <td className="py-2 px-3 text-right font-medium gold-text">
                                            {formatCurrency(consumo.costo_real || 0)}
                                        </td>
                                        <td className={`py-2 px-3 text-right font-medium ${getVariacionColor(consumo.variacion_cantidad || 0)}`}>
                                            {consumo.variacion_cantidad ? (
                                                <span className="flex items-center justify-end gap-1">
                                                    {consumo.variacion_cantidad > 0 && <TrendingUp className="w-3 h-3" />}
                                                    {consumo.variacion_cantidad < 0 && <TrendingDown className="w-3 h-3" />}
                                                    {consumo.variacion_cantidad > 0 ? '+' : ''}{consumo.variacion_cantidad.toFixed(1)}%
                                                </span>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <Package className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-2" />
                        <p className="text-[var(--text-muted)]">Sin consumos definidos</p>
                    </div>
                )}

                {/* Totales */}
                {orden.consumos && orden.consumos.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
                        <div className="flex justify-end">
                            <div className="w-80 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--text-muted)]">Costo Teórico Total:</span>
                                    <span className="text-[var(--text-primary)]">{formatCurrency(orden.costo_teorico_total || 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--text-muted)]">Costo Real Total:</span>
                                    <span className="gold-text font-medium">{formatCurrency(costoRealTotal)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold pt-2 border-t border-[var(--border-default)]">
                                    <span className="text-[var(--text-muted)]">Variación:</span>
                                    <span className={getVariacionColor(variacionCosto)}>
                                        {variacionCosto > 0 && <TrendingUp className="w-4 h-4 inline mr-1" />}
                                        {variacionCosto < 0 && <TrendingDown className="w-4 h-4 inline mr-1" />}
                                        {variacionCosto > 0 ? '+' : ''}{variacionCosto.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Resultado (solo si completada) */}
            {completada && (
                <Card className="mb-6 border-[var(--color-success)]/30">
                    <div className="flex items-center gap-2 mb-4">
                        <Check className="w-5 h-5 text-[var(--color-success)]" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Resultado de Producción</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-[var(--text-muted)]">Cantidad Producida</p>
                            <p className="text-xl font-bold text-[var(--color-success)]">
                                {orden.cantidad_producida?.toLocaleString()} {orden.unidad_medida}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-[var(--text-muted)]">Costo Real Total</p>
                            <p className="text-xl font-bold gold-text">
                                {formatCurrency(orden.costo_real_total || 0)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-[var(--text-muted)]">Variación Final</p>
                            <p className={`text-xl font-bold ${getVariacionColor(orden.variacion_porcentaje || 0)}`}>
                                {(orden.variacion_porcentaje || 0) > 0 ? '+' : ''}{orden.variacion_porcentaje?.toFixed(1)}%
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-[var(--text-muted)]">Fecha Cierre</p>
                            <p className="text-[var(--text-primary)] font-medium">
                                {orden.fecha_cierre ? formatDate(orden.fecha_cierre) : '-'}
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Back button */}
            <Link href="/produccion">
                <Button variant="ghost">
                    <ArrowLeft className="w-4 h-4" /> Volver a Órdenes
                </Button>
            </Link>
        </PageContainer>
    );
}
