'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui';
import { Loader2, Package, TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import ConsumoChart from './ConsumoChart';
import {
    getHistorialIngresos,
    getDatosGraficoProducto,
    type IngresoHistorico,
} from '@/services/alertasCompras';
import { getTipoCambio } from '@/services/configuracion';

interface ProductoInfoPanelProps {
    productoId: string;
    productoNombre?: string;
    compact?: boolean; // Para el panel lateral en OC
}

export default function ProductoInfoPanel({ productoId, productoNombre, compact = false }: ProductoInfoPanelProps) {
    const [ingresos, setIngresos] = useState<IngresoHistorico[]>([]);
    const [grafico, setGrafico] = useState<{ meses: string[]; ingresos: number[]; consumos: number[] } | null>(null);
    const [tipoCambio, setTipoCambio] = useState(1);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        const [ingresosData, graficoData, tc] = await Promise.all([
            getHistorialIngresos(productoId),
            getDatosGraficoProducto(productoId),
            getTipoCambio(),
        ]);
        setIngresos(ingresosData);
        setGrafico(graficoData);
        setTipoCambio(tc);
        setLoading(false);
    }, [productoId]);

    useEffect(() => { loadData(); }, [loadData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--accent-gold)]" />
            </div>
        );
    }

    const maxIngresos = compact ? 5 : 20;
    const ingresosVisibles = ingresos.slice(0, maxIngresos);

    function formatCurrency(n: number, moneda: string = 'ARS') {
        if (moneda === 'USD') return `USD ${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        return `$ ${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function formatDate(d: string) {
        return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }

    return (
        <div className={compact ? 'space-y-3' : 'space-y-4'}>
            {/* Título */}
            {productoNombre && !compact && (
                <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[var(--accent-gold)]" />
                    <h4 className="font-semibold text-sm text-[var(--text-primary)]">{productoNombre}</h4>
                    <Link href={`/productos/${productoId}`} className="text-[var(--accent-gold)] hover:underline">
                        <ExternalLink className="w-3 h-3" />
                    </Link>
                </div>
            )}

            {/* Gráfico */}
            {grafico && (grafico.ingresos.some(v => v > 0) || grafico.consumos.some(v => v > 0)) && (
                <div>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">
                        Ingreso vs Consumo Mensual
                    </p>
                    <ConsumoChart
                        meses={grafico.meses}
                        ingresos={grafico.ingresos}
                        consumos={grafico.consumos}
                        height={compact ? 100 : 160}
                        compact={compact}
                    />
                </div>
            )}

            {/* Historial de ingresos */}
            {ingresosVisibles.length > 0 ? (
                <div>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">
                        Últimos ingresos
                    </p>
                    <div className="overflow-x-auto">
                        <table className={`w-full ${compact ? 'text-[10px]' : 'text-xs'}`}>
                            <thead>
                                <tr className="border-b border-[var(--border-default)]">
                                    <th className="text-left py-1 px-1 text-[var(--text-muted)]">Fecha</th>
                                    {!compact && <th className="text-left py-1 px-1 text-[var(--text-muted)]">OC</th>}
                                    <th className="text-left py-1 px-1 text-[var(--text-muted)]">Proveedor</th>
                                    <th className="text-right py-1 px-1 text-[var(--text-muted)]">Cant.</th>
                                    <th className="text-right py-1 px-1 text-[var(--text-muted)]">$AR</th>
                                    <th className="text-right py-1 px-1 text-[var(--text-muted)]">USD</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ingresosVisibles.map((ing, i) => {
                                    const costoARS = ing.moneda === 'USD' ? ing.costoUnitario * tipoCambio : ing.costoUnitario;
                                    const costoUSD = ing.moneda === 'ARS' ? (tipoCambio > 0 ? ing.costoUnitario / tipoCambio : 0) : ing.costoUnitario;

                                    // Tendencia vs anterior
                                    let trend: 'up' | 'down' | 'same' | null = null;
                                    if (i < ingresosVisibles.length - 1) {
                                        const prev = ingresosVisibles[i + 1].costoUnitario;
                                        const diff = prev > 0 ? ((ing.costoUnitario - prev) / prev) * 100 : 0;
                                        trend = diff > 3 ? 'up' : diff < -3 ? 'down' : 'same';
                                    }

                                    return (
                                        <tr key={i} className="border-b border-[var(--border-default)]/30">
                                            <td className="py-1 px-1 text-[var(--text-secondary)]">{formatDate(ing.fecha)}</td>
                                            {!compact && (
                                                <td className="py-1 px-1">
                                                    <span className="font-mono text-[var(--accent-gold)]">{ing.ocNumero}</span>
                                                </td>
                                            )}
                                            <td className="py-1 px-1 text-[var(--text-primary)] truncate max-w-[100px]" title={ing.proveedorNombre}>
                                                {ing.proveedorNombre}
                                            </td>
                                            <td className="py-1 px-1 text-right text-[var(--text-primary)]">
                                                {ing.cantidad.toLocaleString('es-AR')}
                                            </td>
                                            <td className="py-1 px-1 text-right text-[var(--text-secondary)]">
                                                <span className="flex items-center justify-end gap-0.5">
                                                    {formatCurrency(costoARS, 'ARS')}
                                                    {trend === 'up' && <TrendingUp className="w-2.5 h-2.5 text-red-400" />}
                                                    {trend === 'down' && <TrendingDown className="w-2.5 h-2.5 text-green-400" />}
                                                    {trend === 'same' && <Minus className="w-2.5 h-2.5 text-[var(--text-muted)]" />}
                                                </span>
                                            </td>
                                            <td className="py-1 px-1 text-right text-[var(--text-muted)]">
                                                {formatCurrency(costoUSD, 'USD')}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {ingresos.length > maxIngresos && (
                        <p className="text-[9px] text-[var(--text-muted)] mt-1 text-right">
                            +{ingresos.length - maxIngresos} más
                        </p>
                    )}
                </div>
            ) : (
                <div className="text-center py-4">
                    <Badge variant="default" size="sm">Sin ingresos registrados</Badge>
                </div>
            )}
        </div>
    );
}
