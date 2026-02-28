'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getOrdenCompraById, EstadoOCLabels, type OrdenCompraConRelaciones } from '@/services/ordenesCompra';

function formatCurrencyOC(amount: number, moneda: string = 'ARS') {
    if (moneda === 'USD') return `USD ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    return `$ ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}
function formatDate(d: string) {
    return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function OrdenCompraPrintPage() {
    const params = useParams();
    const ordenId = params.id as string;
    const [orden, setOrden] = useState<OrdenCompraConRelaciones | null>(null);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        const data = await getOrdenCompraById(ordenId);
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
                <Link href="/compras" className="text-amber-600 underline">Volver</Link>
            </div>
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const moneda = (orden as any).moneda || 'ARS';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tipoCambio = (orden as any).tipo_cambio || 1;
    const fc = (n: number) => formatCurrencyOC(n, moneda);

    return (
        <>
            {/* Barra de acciones — solo en pantalla, no imprime */}
            <div className="no-print fixed top-0 left-0 right-0 z-50 flex items-center gap-3 bg-slate-900 border-b border-slate-700 px-6 py-3">
                <Link href={`/compras/${ordenId}`} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors">
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

            {/* Documento imprimible */}
            <div className="print-doc">
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #0f172a; }
                    .print-doc { width: 210mm; min-height: 297mm; margin: 80px auto 40px; background: #fff; padding: 14mm 16mm; border: 1px solid #e2e8f0; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
                    .no-print { display: flex; }
                    @media print {
                        body { background: #fff; }
                        .no-print { display: none !important; }
                        .print-doc { margin: 0; border: none; box-shadow: none; padding: 10mm 14mm; }
                    }
                    @page { size: A4; margin: 0; }
                    /* Tokens */
                    .gold { color: #b45309; }
                    .section-title { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #64748b; margin: 14px 0 6px; padding-left: 8px; border-left: 3px solid #f59e0b; }
                    .grid-info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
                    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; }
                    .info-box .label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 2px; }
                    .info-box .value { font-size: 11px; font-weight: 600; color: #0f172a; }
                    /* Tabla */
                    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 4px; }
                    thead th { background: #fef3c7; color: #92400e; font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: .5px; padding: 5px 8px; text-align: left; border-bottom: 2px solid #f59e0b; }
                    thead th.r { text-align: right; }
                    tbody tr { border-bottom: 1px solid #f1f5f9; }
                    tbody tr:last-child { border-bottom: 2px solid #e2e8f0; }
                    tbody td { padding: 5px 8px; color: #334155; vertical-align: top; }
                    tbody td.r { text-align: right; }
                    tbody td.code { font-family: monospace; font-size: 9px; color: #b45309; }
                    /* Totales */
                    .totales { margin-top: 12px; display: flex; justify-content: flex-end; }
                    .totales-box { width: 240px; }
                    .total-row { display: flex; justify-content: space-between; font-size: 10px; padding: 3px 0; color: #64748b; }
                    .total-final { display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; padding: 6px 0 0; margin-top: 4px; border-top: 2px solid #f59e0b; color: #0f172a; }
                    .total-final .gold-num { color: #b45309; }
                    /* Badge estado */
                    .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
                    .badge-ok { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
                    .badge-warn { background: #fef9c3; color: #854d0e; border: 1px solid #fde047; }
                    .badge-risk { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
                    /* Header */
                    .doc-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; margin-bottom: 14px; }
                    .doc-title { font-size: 22px; font-weight: 800; color: #b45309; letter-spacing: -0.5px; }
                    .doc-numero { font-size: 13px; font-weight: 600; color: #334155; margin-top: 3px; }
                    .footer { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; font-size: 8px; color: #94a3b8; }
                `}</style>

                {/* Encabezado */}
                <div className="doc-header">
                    <div>
                        <div className="doc-title">Orden de Compra</div>
                        <div className="doc-numero">{orden.numero}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div className={`badge ${orden.estado === 'RECIBIDA' ? 'badge-ok' : orden.estado === 'CANCELADA' ? 'badge-risk' : 'badge-warn'}`}>
                            {EstadoOCLabels[orden.estado as keyof typeof EstadoOCLabels] || orden.estado}
                        </div>
                        <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>
                            Emitida: {formatDate(orden.fecha_emision)}
                        </div>
                        {orden.fecha_entrega_estimada && (
                            <div style={{ fontSize: '9px', color: '#64748b' }}>
                                Entrega est.: {formatDate(orden.fecha_entrega_estimada)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Info proveedor y orden */}
                <div className="section-title">Datos de la orden</div>
                <div className="grid-info">
                    <div className="info-box">
                        <div className="label">Proveedor</div>
                        <div className="value">{orden.proveedor?.nombre || '-'}</div>
                        {orden.proveedor?.codigo && (
                            <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>
                                Cód. {orden.proveedor.codigo}
                            </div>
                        )}
                    </div>
                    <div className="info-box">
                        <div className="label">Moneda</div>
                        <div className="value">{moneda === 'USD' ? 'Dólares (USD)' : 'Pesos (ARS)'}</div>
                        {moneda === 'USD' && (
                            <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>
                                Tipo de cambio: ${tipoCambio.toLocaleString('es-AR')}
                            </div>
                        )}
                    </div>
                    <div className="info-box">
                        <div className="label">Fecha de Emisión</div>
                        <div className="value">{formatDate(orden.fecha_emision)}</div>
                    </div>
                </div>

                {/* Items */}
                <div className="section-title" style={{ marginTop: '14px' }}>Detalle de items</div>
                <table>
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Descripción</th>
                            <th className="r">Cant. Pedida</th>
                            <th className="r">Cant. Recibida</th>
                            <th className="r">Precio Unit.</th>
                            <th className="r">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orden.items && orden.items.length > 0 ? (
                            orden.items.map(item => (
                                <tr key={item.id}>
                                    <td className="code">{item.producto?.codigo}</td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{item.producto?.nombre}</div>
                                        <div style={{ fontSize: '9px', color: '#94a3b8' }}>
                                            {item.producto?.unidad_medida}
                                            {item.estado === 'COMPLETADO' && ' · Recibido'}
                                        </div>
                                    </td>
                                    <td className="r">{item.cantidad_pedida.toLocaleString('es-AR')}</td>
                                    <td className="r" style={{ color: item.cantidad_recibida ? '#16a34a' : '#94a3b8' }}>
                                        {item.cantidad_recibida?.toLocaleString('es-AR') || '—'}
                                    </td>
                                    <td className="r">{fc(item.precio_unitario)}</td>
                                    <td className="r" style={{ fontWeight: 600 }}>{fc(item.subtotal || 0)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '16px' }}>
                                    Sin items
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Totales */}
                <div className="totales">
                    <div className="totales-box">
                        <div className="total-row">
                            <span>Subtotal</span>
                            <span>{fc(orden.subtotal || 0)}</span>
                        </div>
                        <div className="total-row">
                            <span>IVA (21%)</span>
                            <span>{fc(orden.iva || 0)}</span>
                        </div>
                        <div className="total-final">
                            <span>Total</span>
                            <span className="gold-num">{fc(orden.total || 0)}</span>
                        </div>
                        {moneda === 'USD' && (
                            <div style={{ fontSize: '9px', color: '#94a3b8', textAlign: 'right', marginTop: '4px' }}>
                                ≈ ${((orden.total || 0) * tipoCambio).toLocaleString('es-AR', { minimumFractionDigits: 0 })} ARS
                            </div>
                        )}
                    </div>
                </div>

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
