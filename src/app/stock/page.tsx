'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout';
import { Card, Button, Badge } from '@/components/ui';
import {
    Search,
    Package,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    ArrowDownRight,
    DollarSign,
    History,
    Filter,
    Warehouse,
} from 'lucide-react';
import { TipoProductoLabels, TipoMateriaPrimaLabels } from '@/types';
import { formatearCosto } from '@/types/recetas';
import {
    ProductoStock,
    MovimientoStock,
    getResumenStock,
    getNivelStockColor,
    TipoMovimientoLabels,
    OrigenMovimientoLabels,
    getTipoMovimientoColor,
    formatCantidadMovimiento,
} from '@/types/stock';

// =====================================================
// COMPONENTES INTERNOS
// =====================================================

function NivelIndicator({ producto }: { producto: ProductoStock }) {
    const color = getNivelStockColor(producto.nivelStock);

    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                        width: `${producto.porcentajeNivel}%`,
                        backgroundColor: color,
                    }}
                />
            </div>
            <span className="text-xs font-medium w-10 text-right" style={{ color }}>
                {producto.porcentajeNivel}%
            </span>
        </div>
    );
}

function StockBadge({ nivel }: { nivel: ProductoStock['nivelStock'] }) {
    const variants: Record<string, 'default' | 'gold' | 'success' | 'warning'> = {
        CRITICO: 'warning',
        BAJO: 'warning',
        NORMAL: 'success',
        ALTO: 'gold',
    };
    const labels: Record<string, string> = {
        CRITICO: 'Crítico',
        BAJO: 'Bajo',
        NORMAL: 'Normal',
        ALTO: 'Alto',
    };
    return (
        <Badge variant={variants[nivel]} size="sm">
            {labels[nivel]}
        </Badge>
    );
}

function MovimientoRow({ mov }: { mov: MovimientoStock }) {
    const color = getTipoMovimientoColor(mov.tipoMovimiento);

    return (
        <tr className="border-b border-[var(--border-default)]/50 hover:bg-[var(--bg-tertiary)]/50">
            <td className="py-3 px-3 text-[var(--text-muted)] text-sm">
                {mov.fecha} {mov.hora}
            </td>
            <td className="py-3 px-3">
                <Link href={`/productos/${mov.productoId}`} className="font-mono text-[var(--accent-gold)] hover:underline text-sm">
                    {mov.productoCodigo}
                </Link>
            </td>
            <td className="py-3 px-3 text-[var(--text-primary)] text-sm">{mov.productoNombre}</td>
            <td className="py-3 px-3">
                <span className="flex items-center gap-1 text-sm font-medium" style={{ color }}>
                    {mov.tipoMovimiento.includes('ENTRADA') || mov.tipoMovimiento.includes('POSITIVO')
                        ? <ArrowUpRight className="w-3 h-3" />
                        : <ArrowDownRight className="w-3 h-3" />
                    }
                    {formatCantidadMovimiento(mov.cantidad, mov.tipoMovimiento)} {mov.unidadMedida}
                </span>
            </td>
            <td className="py-3 px-3 text-[var(--text-secondary)] text-sm">
                {mov.stockAnterior} → {mov.stockPosterior}
            </td>
            <td className="py-3 px-3">
                <Badge variant="default" size="sm">{OrigenMovimientoLabels[mov.origen]}</Badge>
            </td>
            <td className="py-3 px-3">
                {mov.documentoNumero ? (
                    <Link
                        href={mov.origen === 'REMITO_COMPRA' ? `/compras/${mov.documentoId}` : `/produccion/${mov.documentoId}`}
                        className="text-[var(--accent-gold)] hover:underline text-sm"
                    >
                        {mov.documentoNumero}
                    </Link>
                ) : (
                    <span className="text-[var(--text-muted)] text-sm">-</span>
                )}
            </td>
        </tr>
    );
}

// =====================================================
// PAGE COMPONENT
// =====================================================
// =====================================================
// PAGE COMPONENT
// =====================================================
export default function StockPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [tipoFilter, setTipoFilter] = useState('');
    const [nivelFilter, setNivelFilter] = useState('');
    const [activeTab, setActiveTab] = useState<'stock' | 'movimientos'>('stock');

    const [productos, setProductos] = useState<ProductoStock[]>([]);
    const [movimientos, setMovimientos] = useState<MovimientoStock[]>([]);
    const [loading, setLoading] = useState(true);

    // Cargar datos reales
    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);

                // 1. Cargar Productos
                const { getProductos } = await import('@/services/productos');
                const productosDb = await getProductos();

                // Transformar a ProductoStock (calculando niveles)
                const { calcularNivelStock } = await import('@/types/stock');

                const productosProcesados: ProductoStock[] = productosDb.map(p => {
                    const { nivel, porcentaje } = calcularNivelStock(p.stock_actual, p.stock_minimo, p.stock_maximo);
                    return {
                        id: p.id,
                        codigo: p.codigo,
                        nombre: p.nombre,
                        tipo: p.tipo,
                        tipoMateriaPrima: p.tipo_materia_prima || undefined,
                        unidadMedida: p.unidad_medida,
                        stockActual: p.stock_actual,
                        stockMinimo: p.stock_minimo,
                        stockMaximo: p.stock_maximo,
                        nivelStock: nivel,
                        porcentajeNivel: porcentaje,
                        costoUnitario: p.costo_unitario || p.costo_promedio || 0,
                        valorizado: p.stock_actual * (p.costo_unitario || p.costo_promedio || 0),
                    };
                });

                setProductos(productosProcesados);

                // 2. Cargar Movimientos
                const { getMovimientosStock } = await import('@/services/stock');
                const movimientosDb = await getMovimientosStock({ limit: 50 }); // Últimos 50

                // Transformar Movimientos
                const movimientosProcesados: MovimientoStock[] = movimientosDb.map(m => ({
                    id: m.id,
                    fecha: new Date(m.created_at).toLocaleDateString('es-AR'),
                    hora: new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
                    productoId: m.producto_id,
                    productoCodigo: m.producto?.codigo || '???',
                    productoNombre: m.producto?.nombre || 'Desconocido',
                    tipoMovimiento: m.tipo_movimiento,
                    origen: m.origen,
                    documentoId: m.documento_id,
                    documentoNumero: m.documento_numero,
                    cantidad: m.cantidad,
                    unidadMedida: m.producto?.unidad_medida || 'u',
                    stockAnterior: m.stock_anterior,
                    stockPosterior: m.stock_posterior,
                    usuario: 'Usuario Sistema', // TODO: Obtener usuario real si estuviera disponible
                    observaciones: m.observaciones
                }));

                setMovimientos(movimientosProcesados);

            } catch (error) {
                console.error('Error cargando datos de stock:', error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    // Filtrar productos
    const filteredProductos = useMemo(() => {
        return productos.filter(p => {
            const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.codigo.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesTipo = !tipoFilter || p.tipo === tipoFilter;
            const matchesNivel = !nivelFilter || p.nivelStock === nivelFilter;
            return matchesSearch && matchesTipo && matchesNivel;
        });
    }, [productos, searchTerm, tipoFilter, nivelFilter]);

    // Resumen de stock
    const resumen = useMemo(() => getResumenStock(productos), [productos]);

    // Productos con alerta (críticos y bajos)
    const productosAlerta = useMemo(() =>
        productos.filter(p => p.nivelStock === 'CRITICO' || p.nivelStock === 'BAJO'),
        [productos]);

    if (loading) {
        return (
            <PageContainer title="Control de Stock" description="Cargando inventario...">
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-gold)]"></div>
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer
            title="Control de Stock"
            description="Inventario y movimientos de productos"
        >
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <Card className="text-center">
                    <p className="text-sm text-[var(--text-muted)]">Total Productos</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{resumen.total}</p>
                </Card>
                <Card className={`text-center ${resumen.criticos > 0 ? 'border-[var(--color-danger)]/50' : ''}`}>
                    <p className="text-sm text-[var(--text-muted)]">Críticos</p>
                    <p className={`text-2xl font-bold ${resumen.criticos > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--text-muted)]'}`}>
                        {resumen.criticos}
                    </p>
                </Card>
                <Card className={`text-center ${resumen.bajos > 0 ? 'border-[var(--color-warning)]/50' : ''}`}>
                    <p className="text-sm text-[var(--text-muted)]">Stock Bajo</p>
                    <p className={`text-2xl font-bold ${resumen.bajos > 0 ? 'text-[var(--color-warning)]' : 'text-[var(--text-muted)]'}`}>
                        {resumen.bajos}
                    </p>
                </Card>
                <Card className="text-center border-[var(--color-success)]/30">
                    <p className="text-sm text-[var(--text-muted)]">Normales</p>
                    <p className="text-2xl font-bold text-[var(--color-success)]">{resumen.normales}</p>
                </Card>
                <Card className="text-center border-[var(--accent-gold)]/30">
                    <p className="text-sm text-[var(--text-muted)]">Valor Total</p>
                    <p className="text-xl font-bold gold-text">{formatearCosto(resumen.valorTotal)}</p>
                </Card>
            </div>

            {/* Alertas de Stock */}
            {productosAlerta.length > 0 && (
                <div className="mb-6 p-4 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded-lg">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-[var(--color-warning)] mt-0.5" />
                        <div className="flex-1">
                            <p className="font-medium text-[var(--color-warning)] mb-2">
                                ¡Atención! {productosAlerta.length} producto(s) requieren reposición
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {productosAlerta.map(p => (
                                    <Link
                                        key={p.id}
                                        href={`/productos/${p.id}`}
                                        className="px-2 py-1 bg-[var(--bg-tertiary)] rounded text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                                    >
                                        <span className="font-mono text-[var(--accent-gold)]">{p.codigo}</span>
                                        <span className="mx-1">·</span>
                                        <span>{p.stockActual} / {p.stockMinimo} {p.unidadMedida}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('stock')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'stock'
                        ? 'bg-[var(--accent-gold)] text-[var(--bg-primary)]'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                >
                    <Warehouse className="w-4 h-4" /> Stock Actual
                </button>
                <button
                    onClick={() => setActiveTab('movimientos')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'movimientos'
                        ? 'bg-[var(--accent-gold)] text-[var(--bg-primary)]'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                >
                    <History className="w-4 h-4" /> Movimientos
                </button>
                <div className="flex-1" />
                <Link href="/stock/ajuste">
                    <Button variant="primary" size="sm">
                        <TrendingDown className="w-4 h-4 mr-1" />
                        Ajuste / Devolución
                    </Button>
                </Link>
            </div>

            {/* Tab: Stock Actual */}
            {activeTab === 'stock' && (
                <>
                    {/* Filters */}
                    <Card className="mb-6">
                        {/* ... Filtros iguales que antes ... */}
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                                <input
                                    type="text"
                                    placeholder="Buscar por código o nombre..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
                                />
                            </div>
                            <select
                                value={tipoFilter}
                                onChange={(e) => setTipoFilter(e.target.value)}
                                className="px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                            >
                                <option value="">Todos los tipos</option>
                                <option value="MP">Materia Prima</option>
                                <option value="SE">Semielaborado</option>
                                <option value="PT">Prod. Terminado</option>
                                <option value="ENVASE">Envase</option>
                                <option value="ETIQUETA">Etiqueta</option>
                            </select>
                            <select
                                value={nivelFilter}
                                onChange={(e) => setNivelFilter(e.target.value)}
                                className="px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                            >
                                <option value="">Todos los niveles</option>
                                <option value="CRITICO">Crítico</option>
                                <option value="BAJO">Bajo</option>
                                <option value="NORMAL">Normal</option>
                                <option value="ALTO">Alto</option>
                            </select>
                        </div>
                    </Card>

                    {/* Stock Table */}
                    <Card>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border-default)]">
                                        <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">Código</th>
                                        <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">Producto</th>
                                        <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">Tipo</th>
                                        <th className="text-right py-3 px-3 text-[var(--text-muted)] font-medium">Stock</th>
                                        <th className="text-center py-3 px-3 text-[var(--text-muted)] font-medium">Mín / Máx</th>
                                        <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium w-32">Nivel</th>
                                        <th className="text-center py-3 px-3 text-[var(--text-muted)] font-medium">Estado</th>
                                        <th className="text-right py-3 px-3 text-[var(--text-muted)] font-medium">Valorizado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProductos.map((producto) => (
                                        <tr
                                            key={producto.id}
                                            className={`border-b border-[var(--border-default)]/50 hover:bg-[var(--bg-tertiary)]/50 ${producto.nivelStock === 'CRITICO' ? 'bg-[var(--color-danger)]/5' : ''
                                                }`}
                                        >
                                            <td className="py-3 px-3">
                                                <Link href={`/productos/${producto.id}`} className="font-mono text-[var(--accent-gold)] hover:underline">
                                                    {producto.codigo}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-3 text-[var(--text-primary)]">{producto.nombre}</td>
                                            <td className="py-3 px-3">
                                                <Badge variant={producto.tipo === 'MP' ? 'default' : producto.tipo === 'SE' ? 'gold' : 'success'} size="sm">
                                                    {TipoProductoLabels[producto.tipo]}
                                                </Badge>
                                                {producto.tipoMateriaPrima && (
                                                    <span className="ml-1 text-xs text-[var(--text-muted)]">
                                                        ({TipoMateriaPrimaLabels[producto.tipoMateriaPrima]})
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-right font-medium text-[var(--text-primary)]">
                                                {producto.stockActual.toLocaleString()} {producto.unidadMedida}
                                            </td>
                                            <td className="py-3 px-3 text-center text-[var(--text-muted)]">
                                                {producto.stockMinimo} / {producto.stockMaximo || '-'}
                                            </td>
                                            <td className="py-3 px-3">
                                                <NivelIndicator producto={producto} />
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <StockBadge nivel={producto.nivelStock} />
                                            </td>
                                            <td className="py-3 px-3 text-right font-medium gold-text">
                                                {formatearCosto(producto.valorizado)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {filteredProductos.length === 0 && (
                            <div className="text-center py-12">
                                <Package className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
                                <p className="text-[var(--text-secondary)]">No se encontraron productos</p>
                            </div>
                        )}
                    </Card>
                </>
            )}

            {/* Tab: Movimientos */}
            {activeTab === 'movimientos' && (
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Historial de Movimientos</h3>
                        <Badge variant="default" size="sm">Últimos 50</Badge>
                    </div>
                    {movimientos.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border-default)]">
                                        <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">Fecha</th>
                                        <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">Código</th>
                                        <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">Producto</th>
                                        <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">Movimiento</th>
                                        <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">Stock</th>
                                        <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">Origen</th>
                                        <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">Documento</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {movimientos.map((mov) => (
                                        <MovimientoRow key={mov.id} mov={mov} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <History className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
                            <p className="text-[var(--text-secondary)]">No hay movimientos registrados</p>
                        </div>
                    )}
                </Card>
            )}
        </PageContainer>
    );
}
