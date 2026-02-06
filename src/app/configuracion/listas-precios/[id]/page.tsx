'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { Card, Button, Input } from '@/components/ui';
import { ArrowLeft, Save, Loader2, Search, DollarSign, Download } from 'lucide-react';
import { getListasPrecios, getHistorialPrecios, updatePrecioProducto, getPreciosDeLista } from '@/services/precios';
import { getProductos } from '@/services/productos';
import { getTipoCambio } from '@/services/configuracion';
import type { ListaPrecio, Producto, PrecioProducto } from '@/types/database';

interface ProductoPrecioRow {
    producto: Producto;
    precioActual?: PrecioProducto;
    nuevoPrecio: string;
    moneda: string;
}

export default function DetalleListaPrecioPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [lista, setLista] = useState<ListaPrecio | null>(null);
    const [rows, setRows] = useState<ProductoPrecioRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [tipoCambio, setTipoCambio] = useState<number>(0);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        setLoading(true);
        try {
            // Cargar datos en paralelo: Listas, Productos, TC y Precios Vigentes de esta lista
            const [listas, productos, tc, preciosVigentesMap] = await Promise.all([
                getListasPrecios(),
                getProductos(),
                getTipoCambio(),
                getPreciosDeLista(id)
            ]);

            const currentLista = listas.find(l => l.id === id);
            setLista(currentLista || null);
            setTipoCambio(tc);

            if (currentLista) {
                const rowsData: ProductoPrecioRow[] = [];

                // Filtramos productos según tipo de lista
                const productosFiltrados = currentLista.tipo === 'COSTO'
                    ? productos.filter(p => ['MP', 'ENVASE', 'ETIQUETA', 'MATERIA_PRIMA'].includes(p.tipo))
                    : productos.filter(p => p.tipo === 'PT' || p.tipo === 'SE');

                for (const p of productosFiltrados) {
                    const precioVigente = preciosVigentesMap[p.id];

                    rowsData.push({
                        producto: p,
                        precioActual: precioVigente, // Ahora sí tenemos el precio real
                        nuevoPrecio: '',
                        moneda: precioVigente?.moneda || 'ARS'
                    });
                }
                setRows(rowsData);
            }
        } catch (error) {
            console.error('Error loading detail:', error);
        }
        setLoading(false);
    }

    const handleExport = () => {
        if (!lista || rows.length === 0) return;

        // Headers: Fecha, Codigo, Descripcion, Unidad, Moneda, Costo
        const headers = ['Fecha', 'Codigo', 'Descripcion', 'Unidad', 'Moneda', 'Costo'];

        // Data rows
        const csvContent = rows.map(row => {
            const fecha = row.precioActual?.fecha_vigencia
                ? new Date(row.precioActual.fecha_vigencia).toLocaleDateString()
                : '-';
            const costo = row.precioActual?.precio || 0;
            const moneda = row.precioActual?.moneda || 'ARS';

            // Escape quotes and handle commas in text
            return [
                fecha,
                `"${row.producto.codigo}"`,
                `"${row.producto.nombre}"`,
                row.producto.unidad_medida,
                moneda,
                costo
            ].join(',');
        });

        // Combine with BOM for Excel utf-8 compatibility
        const BOM = '\uFEFF';
        const csvString = BOM + [headers.join(','), ...csvContent].join('\n');

        // Create blob and download
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${lista.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <PageContainer title="Cargando..."><div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-[var(--accent-gold)]" /></div></PageContainer>;
    if (!lista) return <PageContainer title="Lista no encontrada">Lista no existe</PageContainer>;

    const filteredRows = rows.filter(r =>
        r.producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.producto.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <PageContainer
            title={lista.nombre}
            description={`Tipo: ${lista.tipo} · TC Ref: $${tipoCambio}`}
            actions={
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleExport} disabled={loading || rows.length === 0}>
                        <Download className="w-4 h-4 mr-2" /> Exportar CSV
                    </Button>
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Volver
                    </Button>
                </div>
            }
        >
            <Card className="mb-6 ">
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)]" />
                    <Input
                        placeholder="Buscar producto por nombre o código..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="border-b border-[var(--border-default)] text-[var(--text-secondary)]">
                                <th className="py-3 px-4 font-medium">Producto</th>
                                <th className="py-3 px-4 font-medium">Unidad</th>
                                <th className="py-3 px-4 font-medium">Precio Vigente</th>
                                <th className="py-3 px-4 font-medium">Actualizado</th>
                                <th className="py-3 px-4 font-medium">Nuevo Precio</th>
                                <th className="py-3 px-4 font-medium">Moneda</th>
                                <th className="py-3 px-4 font-medium text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-default)]">
                            {filteredRows.map((row) => (
                                <PrecioRow
                                    key={row.producto.id}
                                    row={row}
                                    listaId={id}
                                    tipoCambio={tipoCambio}
                                    onPrecioUpdated={() => {
                                        // Recargar solo precios sería ideal, por ahora recargamos todo para simpleza
                                        loadData();
                                    }}
                                />
                            ))}
                        </tbody>
                    </table>

                    {filteredRows.length === 0 && (
                        <div className="text-center py-8 text-[var(--text-muted)]">
                            No se encontraron productos para esta lista.
                        </div>
                    )}
                </div>
            </Card>
        </PageContainer>
    );
}

function PrecioRow({ row, listaId, tipoCambio, onPrecioUpdated }: { row: ProductoPrecioRow, listaId: string, tipoCambio: number, onPrecioUpdated: () => void }) {
    const [nuevoPrecio, setNuevoPrecio] = useState('');
    const [moneda, setMoneda] = useState(row.moneda);
    const [loading, setLoading] = useState(false);

    // Calcular preview si hay nuevo precio
    const previewConversion = nuevoPrecio && !isNaN(parseFloat(nuevoPrecio))
        ? (moneda === 'ARS'
            ? `USD ${(parseFloat(nuevoPrecio) / tipoCambio).toFixed(2)}`
            : `$ ${(parseFloat(nuevoPrecio) * tipoCambio).toFixed(2)}`)
        : null;

    async function handleSave() {
        if (!nuevoPrecio) return;
        setLoading(true);

        try {
            await updatePrecioProducto(listaId, row.producto.id, parseFloat(nuevoPrecio), moneda);
            setNuevoPrecio('');
            onPrecioUpdated(); // Trigger refresh
        } catch (error) {
            console.error(error);
            alert('Error al guardar precio');
        } finally {
            setLoading(false);
        }
    }

    const fechaAct = row.precioActual?.fecha_vigencia
        ? new Date(row.precioActual.fecha_vigencia).toLocaleDateString()
        : '-';

    return (
        <tr className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
            <td className="py-3 px-4">
                <div className="font-medium text-[var(--text-primary)]">{row.producto.nombre}</div>
                <div className="text-xs text-[var(--text-muted)] font-mono">{row.producto.codigo}</div>
            </td>
            <td className="py-3 px-4 text-[var(--text-secondary)]">{row.producto.unidad_medida}</td>

            {/* Precio Vigente */}
            <td className="py-3 px-4">
                {row.precioActual ? (
                    <div className="flex flex-col">
                        <span className="font-semibold text-[var(--text-primary)]">
                            {row.precioActual.moneda === 'USD' ? 'USD ' : '$ '}
                            {row.precioActual.precio}
                        </span>
                    </div>
                ) : (
                    <span className="text-[var(--text-muted)] italic text-xs">Sin precio</span>
                )}
            </td>
            <td className="py-3 px-4 text-xs text-[var(--text-muted)]">
                {fechaAct}
            </td>

            {/* Inputs Nuevo Precio */}
            <td className="py-3 px-4">
                <div className="flex flex-col gap-1">
                    <input
                        type="number"
                        className="w-28 px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:outline-none"
                        placeholder="Nuevo..."
                        value={nuevoPrecio}
                        onChange={e => setNuevoPrecio(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    />
                    {previewConversion && (
                        <span className="text-[10px] text-[var(--accent-gold)] text-right px-1">
                            ≈ {previewConversion}
                        </span>
                    )}
                </div>
            </td>
            <td className="py-3 px-4">
                <select
                    className="px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm focus:border-[var(--accent-gold)] focus:outline-none"
                    value={moneda}
                    onChange={e => setMoneda(e.target.value)}
                >
                    <option value="ARS">$ ARS</option>
                    <option value="USD">USD</option>
                </select>
            </td>

            <td className="py-3 px-4 text-right">
                <Button
                    size="sm"
                    disabled={!nuevoPrecio || loading}
                    onClick={handleSave}
                    className={nuevoPrecio ? "bg-[var(--accent-gold)] text-black hover:bg-yellow-500" : ""}
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </Button>
            </td>
        </tr>
    );
}
