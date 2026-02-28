'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageContainer } from '@/components/layout';
import { Card, Button, Badge } from '@/components/ui';
import {
    Loader2, Package, ShoppingCart, TrendingUp, TrendingDown,
    Minus, ArrowUpDown, Filter, ExternalLink, ChevronDown, ChevronUp,
} from 'lucide-react';
import Link from 'next/link';
import {
    getResumenPanelCompras,
    type ResumenProductoCompras,
    type StockValorizadoGrupo,
} from '@/services/alertasCompras';

// ─── Constantes ─────────────────────────────────────

type SortKey =
    | 'codigo' | 'nombre' | 'tipo' | 'stock' | 'stockARS' | 'stockUSD'
    | 'pendiente' | 'consumoMes' | 'max24' | 'consumo3M' | 'diasStock';

const TIPO_LABELS: Record<string, string> = {
    MP: 'MP', ENVASE: 'ENV', ETIQUETA: 'ETIQ',
    RESINA: 'Resina', PIGMENTO: 'Pigm.', CARGA: 'Carga',
    SOLVENTE: 'Solv.', ADITIVO: 'Adit.',
};

const TIPO_FILTROS = ['Todos', 'MP', 'ENVASE', 'ETIQUETA', 'RESINA', 'PIGMENTO', 'CARGA', 'SOLVENTE', 'ADITIVO'];

// ─── Helpers ────────────────────────────────────────

function fc(n: number, decimals = 0): string {
    return `$ ${n.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}
function fu(n: number): string {
    return `USD ${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function fn(n: number, dec = 0): string {
    return n.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

// ─── Componente Card de stock ─────────────────────────

function StockCard({ grupo }: { grupo: StockValorizadoGrupo }) {
    return (
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">{grupo.label}</p>
            <p className="text-sm font-bold gold-text">{fc(grupo.totalARS)}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{fu(grupo.totalUSD)}</p>
        </div>
    );
}

// ─── Tipo para items de la lista de compra ─────────

interface ListaCompraItem {
    productoId: string;
    codigo: string;
    nombre: string;
    unidad: string;
    cantidad: number;
}

// ═══════════════════════════════════════════════════════
export default function PanelComprasPage() {
    const [loading, setLoading] = useState(true);
    const [productos, setProductos] = useState<ResumenProductoCompras[]>([]);
    const [stockGrupos, setStockGrupos] = useState<StockValorizadoGrupo[]>([]);
    const [stockSubtipos, setStockSubtipos] = useState<StockValorizadoGrupo[]>([]);

    // Filtro y ordenamiento
    const [filtroTipo, setFiltroTipo] = useState('Todos');
    const [filtroBusqueda, setFiltroBusqueda] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('diasStock');
    const [sortAsc, setSortAsc] = useState(true);

    // Selección para lista de compra
    const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
    const [cantidades, setCantidades] = useState<Record<string, string>>({});

    const loadData = useCallback(async () => {
        setLoading(true);
        const data = await getResumenPanelCompras();
        setProductos(data.productos);
        setStockGrupos(data.stockPorGrupo);
        setStockSubtipos(data.stockMPPorSubtipo);
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // ─── Filtrado ────────────────────────────────────

    const productosFiltrados = useMemo(() => {
        let result = productos;

        // Filtro tipo
        if (filtroTipo !== 'Todos') {
            if (['MP', 'ENVASE', 'ETIQUETA'].includes(filtroTipo)) {
                result = result.filter(p => p.producto.tipo === filtroTipo);
            } else {
                // Subtipo MP
                result = result.filter(p => p.producto.tipo === 'MP' && p.producto.tipo_materia_prima === filtroTipo);
            }
        }

        // Filtro búsqueda
        if (filtroBusqueda) {
            const term = filtroBusqueda.toLowerCase();
            result = result.filter(p =>
                p.producto.codigo.toLowerCase().includes(term) ||
                p.producto.nombre.toLowerCase().includes(term)
            );
        }

        // Ordenamiento
        result = [...result].sort((a, b) => {
            let av: number | string = 0, bv: number | string = 0;
            switch (sortKey) {
                case 'codigo': av = a.producto.codigo; bv = b.producto.codigo; break;
                case 'nombre': av = a.producto.nombre; bv = b.producto.nombre; break;
                case 'tipo': av = (a.producto.tipo_materia_prima || a.producto.tipo); bv = (b.producto.tipo_materia_prima || b.producto.tipo); break;
                case 'stock': av = a.producto.stock_actual; bv = b.producto.stock_actual; break;
                case 'stockARS': av = a.stockValorizadoARS; bv = b.stockValorizadoARS; break;
                case 'stockUSD': av = a.stockValorizadoUSD; bv = b.stockValorizadoUSD; break;
                case 'pendiente': av = a.pendienteEntrega; bv = b.pendienteEntrega; break;
                case 'consumoMes': av = a.consumoMesEstacional; bv = b.consumoMesEstacional; break;
                case 'max24': av = a.consumoMaxMensual; bv = b.consumoMaxMensual; break;
                case 'consumo3M': av = a.consumo3MAnoAnterior; bv = b.consumo3MAnoAnterior; break;
                case 'diasStock': av = a.diasStock; bv = b.diasStock; break;
            }
            if (typeof av === 'string') return sortAsc ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
            return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
        });

        return result;
    }, [productos, filtroTipo, filtroBusqueda, sortKey, sortAsc]);

    // ─── Handlers ─────────────────────────────────────

    function handleSort(key: SortKey) {
        if (sortKey === key) {
            setSortAsc(!sortAsc);
        } else {
            setSortKey(key);
            setSortAsc(key === 'diasStock'); // diasStock: asc por defecto (los críticos primero)
        }
    }

    function toggleSeleccion(prodId: string) {
        const next = new Set(seleccionados);
        if (next.has(prodId)) {
            next.delete(prodId);
        } else {
            next.add(prodId);
        }
        setSeleccionados(next);
    }

    function handlePasarALista() {
        // Armar items para localStorage
        const items: ListaCompraItem[] = [];
        for (const pid of seleccionados) {
            const prod = productos.find(p => p.producto.id === pid);
            if (!prod) continue;
            items.push({
                productoId: pid,
                codigo: prod.producto.codigo,
                nombre: prod.producto.nombre,
                unidad: prod.producto.unidad_medida,
                cantidad: parseFloat(cantidades[pid] || '0') || 0,
            });
        }

        // Agregar a lista existente en localStorage
        const existente = JSON.parse(localStorage.getItem('listaCompra') || '[]') as ListaCompraItem[];
        for (const item of items) {
            const idx = existente.findIndex(e => e.productoId === item.productoId);
            if (idx >= 0) {
                existente[idx].cantidad += item.cantidad; // Sumar si ya existe
            } else {
                existente.push(item);
            }
        }
        localStorage.setItem('listaCompra', JSON.stringify(existente));
        setSeleccionados(new Set());
        setCantidades({});
        alert(`✅ ${items.length} producto(s) agregados a la Lista de Compra`);
    }

    // ─── Header sortable ──────────────────────────────

    function SortHeader({ label, sortId, align = 'left' }: { label: string; sortId: SortKey; align?: 'left' | 'right' }) {
        const isActive = sortKey === sortId;
        return (
            <th
                className={`py-1.5 px-1.5 text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)] select-none whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'}`}
                onClick={() => handleSort(sortId)}
            >
                <span className="inline-flex items-center gap-0.5">
                    {label}
                    {isActive ? (
                        sortAsc ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />
                    ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 opacity-30" />
                    )}
                </span>
            </th>
        );
    }

    // ─── Render ─────────────────────────────────────

    if (loading) {
        return (
            <PageContainer title="Panel de Compras" description="Cargando datos...">
                <div className="flex justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
                </div>
            </PageContainer>
        );
    }

    const totalSeleccionados = seleccionados.size;

    return (
        <PageContainer
            title="Panel de Compras"
            description={`${productos.length} insumos · Datos actualizados`}
            actions={
                totalSeleccionados > 0 ? (
                    <Button onClick={handlePasarALista} className="min-w-[200px]">
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        Agregar {totalSeleccionados} a Lista ({fn(Object.values(cantidades).reduce((a, b) => a + (parseFloat(b) || 0), 0))} unid.)
                    </Button>
                ) : (
                    <Link href="/compras/lista">
                        <Button variant="secondary" size="sm">
                            <ShoppingCart className="w-4 h-4 mr-1" /> Ver Lista de Compra
                        </Button>
                    </Link>
                )
            }
        >
            {/* ─── Cards de Stock Valorizado ──────────────── */}
            <div className="mb-4">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-2">
                    Stock Valorizado por Tipo
                </p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                    {stockGrupos.map(g => <StockCard key={g.label} grupo={g} />)}
                </div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-2">
                    Desglose Materia Prima
                </p>
                <div className="grid grid-cols-5 gap-2">
                    {stockSubtipos.map(g => <StockCard key={g.label} grupo={g} />)}
                </div>
            </div>

            {/* ─── Filtros ───────────────────────────────── */}
            <Card className="mb-3 !py-2 !px-3">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        {TIPO_FILTROS.map(t => (
                            <button
                                key={t}
                                onClick={() => setFiltroTipo(t)}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${filtroTipo === t
                                        ? 'bg-[var(--accent-gold)] text-black'
                                        : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                {TIPO_LABELS[t] || t}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1" />
                    <input
                        type="text"
                        placeholder="Buscar por código o nombre..."
                        value={filtroBusqueda}
                        onChange={e => setFiltroBusqueda(e.target.value)}
                        className="px-2 py-1 text-xs rounded bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)] w-48"
                    />
                    <span className="text-[10px] text-[var(--text-muted)]">
                        {productosFiltrados.length} de {productos.length}
                    </span>
                </div>
            </Card>

            {/* ─── Tabla Principal ───────────────────────── */}
            <Card className="!p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-[11px] leading-tight">
                        <thead>
                            <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-default)]">
                                <th className="py-1.5 px-1.5 w-8">
                                    <input
                                        type="checkbox"
                                        className="rounded"
                                        checked={totalSeleccionados > 0 && totalSeleccionados === productosFiltrados.length}
                                        onChange={() => {
                                            if (totalSeleccionados === productosFiltrados.length) {
                                                setSeleccionados(new Set());
                                            } else {
                                                setSeleccionados(new Set(productosFiltrados.map(p => p.producto.id)));
                                            }
                                        }}
                                    />
                                </th>
                                <SortHeader label="Código" sortId="codigo" />
                                <SortHeader label="Producto" sortId="nombre" />
                                <SortHeader label="Tipo" sortId="tipo" />
                                <SortHeader label="Stock" sortId="stock" align="right" />
                                <SortHeader label="$ Stock" sortId="stockARS" align="right" />
                                <SortHeader label="USD Stock" sortId="stockUSD" align="right" />
                                <SortHeader label="Pendiente" sortId="pendiente" align="right" />
                                <th className="py-1.5 px-1.5 text-[var(--text-muted)] text-left whitespace-nowrap">OC</th>
                                <SortHeader label="Consumo/Mes" sortId="consumoMes" align="right" />
                                <SortHeader label="Máx 24m" sortId="max24" align="right" />
                                <SortHeader label="3M Año Ant." sortId="consumo3M" align="right" />
                                <SortHeader label="Días Stock" sortId="diasStock" align="right" />
                                <th className="py-1.5 px-1.5 text-[var(--text-muted)] text-right whitespace-nowrap">Últ. Precio</th>
                                <th className="py-1.5 px-1.5 text-[var(--text-muted)] text-right whitespace-nowrap">Cant. a pedir</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productosFiltrados.map((r) => {
                                const p = r.producto;
                                const isSelected = seleccionados.has(p.id);
                                const diasColor =
                                    r.diasStockNivel === 'CRITICO' ? 'text-red-400 font-bold' :
                                        r.diasStockNivel === 'ATENCION' ? 'text-yellow-400 font-semibold' :
                                            r.diasStockNivel === 'SIN_DATOS' ? 'text-[var(--text-muted)]' :
                                                'text-green-400';

                                const tipoLabel = p.tipo_materia_prima
                                    ? (TIPO_LABELS[p.tipo_materia_prima] || p.tipo_materia_prima)
                                    : (TIPO_LABELS[p.tipo] || p.tipo);

                                return (
                                    <tr
                                        key={p.id}
                                        className={`border-b border-[var(--border-default)]/30 hover:bg-[var(--bg-elevated)]/50 transition-colors ${isSelected ? 'bg-amber-500/5' : ''
                                            }`}
                                        style={{ height: '32px' }}
                                    >
                                        {/* Checkbox */}
                                        <td className="py-1 px-1.5">
                                            <input
                                                type="checkbox"
                                                className="rounded"
                                                checked={isSelected}
                                                onChange={() => toggleSeleccion(p.id)}
                                            />
                                        </td>
                                        {/* Código */}
                                        <td className="py-1 px-1.5">
                                            <Link href={`/productos/${p.id}`} className="font-mono text-[var(--accent-gold)] hover:underline">
                                                {p.codigo}
                                            </Link>
                                        </td>
                                        {/* Nombre */}
                                        <td className="py-1 px-1.5 text-[var(--text-primary)] max-w-[160px] truncate" title={p.nombre}>
                                            {p.nombre}
                                        </td>
                                        {/* Tipo */}
                                        <td className="py-1 px-1.5">
                                            <Badge variant="default" size="sm" className="text-[9px] !px-1.5 !py-0">
                                                {tipoLabel}
                                            </Badge>
                                        </td>
                                        {/* Stock */}
                                        <td className="py-1 px-1.5 text-right text-[var(--text-primary)]">
                                            {fn(p.stock_actual)} <span className="text-[9px] text-[var(--text-muted)]">{p.unidad_medida}</span>
                                        </td>
                                        {/* $ Stock */}
                                        <td className="py-1 px-1.5 text-right text-[var(--text-secondary)]">
                                            {fc(r.stockValorizadoARS)}
                                        </td>
                                        {/* USD Stock */}
                                        <td className="py-1 px-1.5 text-right text-[var(--text-muted)]">
                                            {fu(r.stockValorizadoUSD)}
                                        </td>
                                        {/* Pendiente */}
                                        <td className="py-1 px-1.5 text-right">
                                            {r.pendienteEntrega > 0 ? (
                                                <span className="text-green-400 font-medium">+{fn(r.pendienteEntrega)}</span>
                                            ) : (
                                                <span className="text-[var(--text-muted)]">—</span>
                                            )}
                                        </td>
                                        {/* OC */}
                                        <td className="py-1 px-1.5">
                                            {r.ocAbiertas.length > 0 ? (
                                                <Link href={`/compras/${r.ocAbiertas[0].id}`} className="font-mono text-[10px] text-[var(--accent-gold)] hover:underline flex items-center gap-0.5">
                                                    {r.ocAbiertas[0].numero} <ExternalLink className="w-2.5 h-2.5" />
                                                </Link>
                                            ) : (
                                                <span className="text-[var(--text-muted)]">—</span>
                                            )}
                                        </td>
                                        {/* Consumo/Mes */}
                                        <td className="py-1 px-1.5 text-right text-[var(--text-primary)]">
                                            {r.tieneHistorial ? fn(r.consumoMesEstacional) : <span className="text-[var(--text-muted)]">—</span>}
                                        </td>
                                        {/* Máx 24m */}
                                        <td className="py-1 px-1.5 text-right">
                                            {r.consumoMaxMensual > 0 ? (
                                                <span className="text-[var(--text-secondary)]" title={r.consumoMaxMes}>
                                                    {fn(r.consumoMaxMensual)}
                                                    <span className="text-[9px] text-[var(--text-muted)] ml-0.5">({r.consumoMaxMes})</span>
                                                </span>
                                            ) : (
                                                <span className="text-[var(--text-muted)]">—</span>
                                            )}
                                        </td>
                                        {/* Consumo 3M año anterior */}
                                        <td className="py-1 px-1.5 text-right">
                                            {r.consumo3MAnoAnterior > 0 ? (
                                                <span className="text-[var(--text-secondary)]" title={r.meses3MAnoAnterior}>
                                                    {fn(r.consumo3MAnoAnterior)}
                                                </span>
                                            ) : (
                                                <span className="text-[var(--text-muted)]">—</span>
                                            )}
                                        </td>
                                        {/* Días Stock */}
                                        <td className={`py-1 px-1.5 text-right ${diasColor}`}>
                                            {r.diasStockNivel === 'SIN_DATOS' ? 'S/D' : (r.diasStock >= 999 ? '>365' : `${r.diasStock}d`)}
                                        </td>
                                        {/* Último precio */}
                                        <td className="py-1 px-1.5 text-right">
                                            {r.ultimoPrecio ? (
                                                <span className="flex items-center justify-end gap-0.5 text-[var(--text-secondary)]">
                                                    {fc(r.ultimoPrecio, 2)}
                                                    {r.tendenciaPrecio === 'SUBE' && <TrendingUp className="w-2.5 h-2.5 text-red-400" />}
                                                    {r.tendenciaPrecio === 'BAJA' && <TrendingDown className="w-2.5 h-2.5 text-green-400" />}
                                                    {r.tendenciaPrecio === 'ESTABLE' && <Minus className="w-2.5 h-2.5 text-[var(--text-muted)]" />}
                                                </span>
                                            ) : (
                                                <span className="text-[var(--text-muted)]">—</span>
                                            )}
                                        </td>
                                        {/* Cantidad a pedir */}
                                        <td className="py-1 px-1.5 text-right">
                                            {isSelected ? (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    value={cantidades[p.id] || ''}
                                                    onChange={e => setCantidades(prev => ({ ...prev, [p.id]: e.target.value }))}
                                                    placeholder="Cant."
                                                    className="w-16 px-1 py-0.5 text-right text-[11px] rounded bg-[var(--bg-tertiary)] border border-[var(--accent-gold)]/40 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                                                    autoFocus
                                                />
                                            ) : (
                                                <span className="text-[var(--text-muted)]">—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {productosFiltrados.length === 0 && (
                    <div className="text-center py-8">
                        <Package className="w-8 h-8 mx-auto text-[var(--text-muted)] mb-2 opacity-30" />
                        <p className="text-sm text-[var(--text-muted)]">No se encontraron productos con ese filtro</p>
                    </div>
                )}
            </Card>

            {/* ─── Barra inferior fija si hay seleccionados ─── */}
            {totalSeleccionados > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-elevated)] border-t border-[var(--accent-gold)]/30 px-6 py-3 flex items-center justify-between shadow-2xl">
                    <span className="text-sm text-[var(--text-secondary)]">
                        <strong className="gold-text">{totalSeleccionados}</strong> producto(s) seleccionados
                    </span>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setSeleccionados(new Set()); setCantidades({}); }}>
                            Limpiar selección
                        </Button>
                        <Button onClick={handlePasarALista}>
                            <ShoppingCart className="w-4 h-4 mr-1" />
                            Agregar a Lista de Compra
                        </Button>
                    </div>
                </div>
            )}
        </PageContainer>
    );
}
