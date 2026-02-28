'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
    getOrdenProduccionById,
    EstadoOPLabels,
    type OrdenProduccionConRelaciones,
} from '@/services/ordenesProduccion';

function formatCurrency(n: number) {
    return `$ ${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}
function formatDate(d: string) {
    return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function OrdenProduccionPrintPage() {
    const params = useParams();
    const ordenId = params.id as string;
    const [orden, setOrden] = useState<OrdenProduccionConRelaciones | null>(null);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        const data = await getOrdenProduccionById(ordenId);
        setOrden(data);
        setLoading(false);
    }, [ordenId]);

    useEffect(() => { loadData(); }, [loadData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-white">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            </div>
        );
    }

    if (!orden) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <p className="text-gray-500">Orden no encontrada</p>
                <Link href="/produccion" className="text-amber-600 underline">Volver</Link>
            </div>
        );
    }

    const costoRealTotal = orden.consumos?.reduce((acc, c) => acc + (c.costo_real || 0), 0) || 0;
    const variacion = orden.costo_teorico_total > 0
        ? ((costoRealTotal - orden.costo_teorico_total) / orden.costo_teorico_total) * 100
        : 0;
    const completada = orden.estado === 'COMPLETADA';

    return (
        <>
            {/* Barra de acciones */}
            <div className="no-print fixed top-0 left-0 right-0 z-50 flex items-center gap-3 bg-slate-900 border-b border-slate-700 px-6 py-3">
                <Link href={`/produccion/${ordenId}`} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Volver
                </Link>
                <div className="flex-1" />
                <span className="text-slate-400 text-sm">Vista previa de impresión</span>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                    <Printer className="w-4 h-4" />
                    Imprimir / Guardar PDF
                </button>
            </div>

            {/* Documento */}
            <div className="print-doc">
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #0f172a; }
                    .print-doc { width: 210mm; min-height: 297mm; margin: 80px auto 40px; background: #fff; padding: 14mm 16mm; border: 1px solid #e2e8f0; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
                    .no-print { display: flex; }
                    @media print {
                        body { background:#fff; }
                        .no-print { display:none !important; }
                        .print-doc { margin:0; border:none; box-shadow:none; padding:10mm 14mm; }
                    }
                    @page { size: A4; margin: 0; }
                    .doc-header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #f59e0b; padding-bottom:10px; margin-bottom:14px; }
                    .doc-title { font-size:22px; font-weight:800; color:#b45309; letter-spacing:-0.5px; }
                    .doc-numero { font-size:13px; font-weight:600; color:#334155; margin-top:3px; }
                    .section-title { font-size:8px; font-weight:700; text-transform:uppercase; letter-spacing:1.2px; color:#64748b; margin:14px 0 6px; padding-left:8px; border-left:3px solid #f59e0b; }
                    .grid-info { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
                    .info-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 10px; }
                    .info-box .label { font-size:9px; color:#64748b; text-transform:uppercase; letter-spacing:.5px; margin-bottom:2px; }
                    .info-box .value { font-size:11px; font-weight:600; color:#0f172a; }
                    table { width:100%; border-collapse:collapse; font-size:10px; margin-top:4px; }
                    thead th { background:#fef3c7; color:#92400e; font-weight:700; font-size:9px; text-transform:uppercase; letter-spacing:.5px; padding:5px 8px; text-align:left; border-bottom:2px solid #f59e0b; }
                    thead th.r { text-align:right; }
                    tbody tr { border-bottom:1px solid #f1f5f9; }
                    tbody tr:last-child { border-bottom:2px solid #e2e8f0; }
                    tbody td { padding:5px 8px; color:#334155; vertical-align:top; }
                    tbody td.r { text-align:right; }
                    tbody td.code { font-family:monospace; font-size:9px; color:#b45309; }
                    .totales { margin-top:12px; display:flex; justify-content:flex-end; }
                    .totales-box { width:260px; }
                    .total-row { display:flex; justify-content:space-between; font-size:10px; padding:3px 0; color:#64748b; }
                    .total-final { display:flex; justify-content:space-between; font-size:14px; font-weight:700; padding:6px 0 0; margin-top:4px; border-top:2px solid #f59e0b; color:#0f172a; }
                    .gold-num { color:#b45309; }
                    .badge { display:inline-block; padding:2px 8px; border-radius:20px; font-size:9px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; }
                    .badge-ok { background:#dcfce7; color:#166534; border:1px solid #86efac; }
                    .badge-warn { background:#fef9c3; color:#854d0e; border:1px solid #fde047; }
                    .badge-blue { background:#dbeafe; color:#1e40af; border:1px solid #93c5fd; }
                    .result-box { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-top:6px; }
                    .result-item { background:#f0fdf4; border:1px solid #86efac; border-radius:6px; padding:8px 10px; }
                    .result-item .label { font-size:9px; color:#166534; text-transform:uppercase; letter-spacing:.5px; margin-bottom:2px; }
                    .result-item .value { font-size:13px; font-weight:700; color:#166534; }
                    .footer { margin-top:20px; border-top:1px solid #e2e8f0; padding-top:8px; display:flex; justify-content:space-between; font-size:8px; color:#94a3b8; }
                    .var-pos { color:#dc2626; }
                    .var-neg { color:#16a34a; }
                    .var-ok { color:#64748b; }
                `}</style>

                {/* Encabezado */}
                <div className="doc-header">
                    <div>
                        <div className="doc-title">Orden de Producción</div>
                        <div className="doc-numero">{orden.numero}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div className={`badge ${orden.estado === 'COMPLETADA' ? 'badge-ok' :
                                orden.estado === 'EN_PRODUCCION' ? 'badge-warn' :
                                    orden.estado === 'CANCELADA' ? '' : 'badge-blue'
                            }`} style={orden.estado === 'CANCELADA' ? { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' } : {}}>
                            {EstadoOPLabels[orden.estado as keyof typeof EstadoOPLabels] || orden.estado}
                        </div>
                        <div style={{ fontSize: '9px', color: '#64748b', marginTop: '5px' }}>
                            Creada: {formatDate(orden.fecha_creacion || orden.created_at)}
                        </div>
                        {orden.fecha_cierre && (
                            <div style={{ fontSize: '9px', color: '#64748b' }}>
                                Cerrada: {formatDate(orden.fecha_cierre)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Info general */}
                <div className="section-title">Datos de la orden</div>
                <div className="grid-info">
                    <div className="info-box">
                        <div className="label">Producto a fabricar</div>
                        <div className="value">{orden.producto?.nombre || '—'}</div>
                        {orden.producto?.codigo && (
                            <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>
                                Cód. {orden.producto.codigo}
                            </div>
                        )}
                    </div>
                    <div className="info-box">
                        <div className="label">Receta</div>
                        <div className="value">{orden.receta?.codigo || '—'}</div>
                        {orden.receta?.nombre && (
                            <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>
                                {orden.receta.nombre}
                            </div>
                        )}
                    </div>
                    <div className="info-box">
                        <div className="label">Cantidad programada</div>
                        <div className="value">{orden.cantidad_programada?.toLocaleString('es-AR')} {orden.unidad_medida}</div>
                        {completada && (
                            <div style={{ fontSize: '9px', color: '#16a34a', marginTop: '2px', fontWeight: 600 }}>
                                Producido: {orden.cantidad_producida?.toLocaleString('es-AR')} {orden.unidad_medida}
                            </div>
                        )}
                    </div>
                </div>

                {/* Consumos */}
                <div className="section-title" style={{ marginTop: '14px' }}>Consumos de materia prima</div>
                <table>
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Descripción</th>
                            <th className="r">Cant. Teórica</th>
                            <th className="r">Cant. Real</th>
                            <th className="r">Costo Unit.</th>
                            <th className="r">Costo Teórico</th>
                            <th className="r">Costo Real</th>
                            <th className="r">Var. %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orden.consumos && orden.consumos.length > 0 ? (
                            orden.consumos.map(c => {
                                const varClass = (c.variacion_cantidad || 0) > 5 ? 'var-pos' : (c.variacion_cantidad || 0) < -5 ? 'var-neg' : 'var-ok';
                                return (
                                    <tr key={c.id}>
                                        <td className="code">{c.producto?.codigo}</td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{c.producto?.nombre}</div>
                                            <div style={{ fontSize: '9px', color: '#94a3b8' }}>{c.producto?.unidad_medida}</div>
                                        </td>
                                        <td className="r">{c.cantidad_teorica?.toFixed(3)}</td>
                                        <td className="r" style={{ color: c.cantidad_real ? '#0f172a' : '#94a3b8' }}>
                                            {c.cantidad_real?.toFixed(3) || '—'}
                                        </td>
                                        <td className="r">{formatCurrency(c.costo_unitario || 0)}</td>
                                        <td className="r">{formatCurrency(c.costo_teorico || 0)}</td>
                                        <td className="r" style={{ fontWeight: 600 }}>{formatCurrency(c.costo_real || 0)}</td>
                                        <td className={`r ${varClass}`}>
                                            {c.variacion_cantidad
                                                ? `${c.variacion_cantidad > 0 ? '+' : ''}${c.variacion_cantidad.toFixed(1)}%`
                                                : '—'}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: '16px' }}>
                                    Sin consumos
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Totales costos */}
                <div className="totales">
                    <div className="totales-box">
                        <div className="total-row">
                            <span>Costo Teórico Total</span>
                            <span>{formatCurrency(orden.costo_teorico_total || 0)}</span>
                        </div>
                        <div className="total-row">
                            <span>Costo Real Total</span>
                            <span style={{ fontWeight: 600 }}>{formatCurrency(costoRealTotal)}</span>
                        </div>
                        <div className="total-final">
                            <span>Variación</span>
                            <span className={variacion > 5 ? 'var-pos' : variacion < -5 ? 'var-neg gold-num' : 'var-ok'}>
                                {variacion > 0 ? '+' : ''}{variacion.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Resultado si completada */}
                {completada && (
                    <>
                        <div className="section-title">Resultado de producción</div>
                        <div className="result-box">
                            <div className="result-item">
                                <div className="label">Producido</div>
                                <div className="value">{orden.cantidad_producida?.toLocaleString('es-AR')} {orden.unidad_medida}</div>
                            </div>
                            <div className="result-item">
                                <div className="label">Costo real unitario</div>
                                <div className="value" style={{ fontSize: '11px' }}>
                                    {orden.cantidad_producida && orden.cantidad_producida > 0
                                        ? formatCurrency((orden.costo_real_total || 0) / orden.cantidad_producida)
                                        : '—'}
                                </div>
                            </div>
                            <div className="result-item">
                                <div className="label">Fecha cierre</div>
                                <div className="value" style={{ fontSize: '11px' }}>
                                    {orden.fecha_cierre ? formatDate(orden.fecha_cierre) : '—'}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Observaciones */}
                {orden.observaciones && (
                    <>
                        <div className="section-title">Observaciones</div>
                        <div style={{ fontSize: '10px', color: '#475569', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
                            {orden.observaciones}
                        </div>
                    </>
                )}

                {/* Footer */}
                <div className="footer">
                    <span>Sistema de Compras y Producción</span>
                    <span>Generado: {new Date().toLocaleString('es-AR')}</span>
                </div>
            </div>
        </>
    );
}
