// =====================================================
// SERVICIO DE ALERTAS DE COMPRAS — MOTOR ESTACIONAL
// =====================================================
// Calcula consumo estacional, pendientes de entrega,
// historial de ingresos y días de cobertura.

import { createClient } from '@/lib/supabase/client';
import { getTipoCambio } from './configuracion';
import type { Producto, TipoMateriaPrima } from '@/types/database';

// ─── Tipos ───────────────────────────────────────────

export interface ConsumoMensual {
    año: number;
    mes: number;
    consumo: number;
}

export interface IndiceEstacional {
    mes: number;      // 1-12
    promedio: number;  // kg promedio de ese mes
    indice: number;    // factor vs promedio global (1.0 = normal)
}

export interface PendienteEntrega {
    productoId: string;
    cantidadPendiente: number;
    ocNumero: string;
    ocId: string;
}

export interface IngresoHistorico {
    fecha: string;
    ocNumero: string;
    proveedorNombre: string;
    cantidad: number;
    costoUnitario: number;
    moneda: string;
}

export interface ResumenProductoCompras {
    producto: Producto;
    // Stock valorizado
    stockValorizadoARS: number;
    stockValorizadoUSD: number;
    // Pendientes
    pendienteEntrega: number;
    ocAbiertas: { numero: string; id: string }[];
    // Consumo
    consumoMesEstacional: number;     // Consumo mensual ajustado al mes actual
    tasaDiariaBase: number;           // kg/día promedio últimos 90d
    tasaDiariaAjustada: number;       // kg/día × índice estacional del mes actual
    indiceEstacionalActual: number;   // Factor del mes actual
    // Máx 24 meses
    consumoMaxMensual: number;
    consumoMaxMes: string;            // "Mar 2025"
    // Consumo 3M año anterior
    consumo3MAnoAnterior: number;
    meses3MAnoAnterior: string;       // "Feb-Mar-Abr 2025"
    // Días de stock
    diasStock: number;
    diasStockNivel: 'CRITICO' | 'ATENCION' | 'OK' | 'SIN_DATOS';
    // Proveedor
    proveedorPrincipal?: { id: string; nombre: string; plazoEntregaDias: number };
    ultimoPrecio?: number;
    ultimoPrecioMoneda?: string;
    tendenciaPrecio?: 'SUBE' | 'BAJA' | 'ESTABLE';
    // Datos
    tieneHistorial: boolean;
}

export interface StockValorizadoGrupo {
    label: string;
    totalARS: number;
    totalUSD: number;
}

// ─── Labels de meses ──────────────────────────────────

const MESES_CORTOS = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// ─── Funciones principales ────────────────────────────

/**
 * Obtiene TODOS los datos necesarios para el panel de compras en una sola llamada.
 * Optimizado para minimizar queries a Supabase.
 */
export async function getResumenPanelCompras(): Promise<{
    productos: ResumenProductoCompras[];
    stockPorGrupo: StockValorizadoGrupo[];
    stockMPPorSubtipo: StockValorizadoGrupo[];
}> {
    const supabase = createClient();
    const tipoCambio = await getTipoCambio();
    const ahora = new Date();
    const mesActual = ahora.getMonth() + 1; // 1-12
    const añoActual = ahora.getFullYear();

    // 1. Obtener productos (MP, ENVASE, ETIQUETA)
    const { data: productosRaw } = await supabase
        .from('productos')
        .select('*')
        .in('tipo', ['MP', 'ENVASE', 'ETIQUETA'])
        .eq('activo', true)
        .order('tipo')
        .order('nombre');

    const productos = (productosRaw || []) as Producto[];

    // 2. Obtener consumos de los últimos 24 meses
    const fecha24m = new Date(añoActual - 2, mesActual - 1, 1).toISOString();
    const { data: movimientosConsumo } = await supabase
        .from('movimientos_stock')
        .select('producto_id, cantidad, created_at')
        .eq('tipo_movimiento', 'SALIDA')
        .eq('origen', 'CONSUMO_PRODUCCION')
        .gte('created_at', fecha24m);

    // 3. Obtener ingresos (compras) de los últimos 24 meses
    const { data: movimientosIngreso } = await supabase
        .from('movimientos_stock')
        .select('producto_id, cantidad, costo_unitario, created_at, documento_numero, documento_id')
        .eq('tipo_movimiento', 'ENTRADA')
        .eq('origen', 'COMPRA')
        .gte('created_at', fecha24m)
        .order('created_at', { ascending: false });

    // 4. Obtener pendientes de OCs abiertas
    const { data: itemsOC } = await supabase
        .from('ordenes_compra_items')
        .select('producto_id, cantidad_pedida, cantidad_recibida, estado, orden_compra_id, orden_compra:ordenes_compra(id, numero, estado)')
        .in('estado', ['PENDIENTE', 'PARCIAL']);

    // 5. Obtener proveedores principales
    const { data: proveedoresLink } = await supabase
        .from('productos_proveedores')
        .select('producto_id, proveedor_id, precio_unitario, es_principal, proveedor:proveedores(id, nombre, plazo_entrega_dias)')
        .eq('es_principal', true);

    // ─── Indexar datos por producto_id ───────────────────

    // Consumos agrupados por producto → mes
    const consumosPorProducto = agruparConsumosPorProductoYMes(movimientosConsumo || []);

    // Pendientes por producto
    const pendientesPorProducto = new Map<string, { total: number; ocs: { numero: string; id: string }[] }>();
    for (const item of (itemsOC || [])) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const oc = item.orden_compra as any;
        if (!oc || !['ENVIADA', 'PARCIAL'].includes(oc.estado)) continue;

        const pid = item.producto_id;
        const pendiente = item.cantidad_pedida - (item.cantidad_recibida || 0);
        if (pendiente <= 0) continue;

        const entry = pendientesPorProducto.get(pid) || { total: 0, ocs: [] };
        entry.total += pendiente;
        if (!entry.ocs.find(o => o.id === oc.id)) {
            entry.ocs.push({ numero: oc.numero, id: oc.id });
        }
        pendientesPorProducto.set(pid, entry);
    }

    // Proveedor principal por producto
    const provPrincipal = new Map<string, { id: string; nombre: string; plazoEntregaDias: number }>();
    for (const link of (proveedoresLink || [])) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prov = link.proveedor as any;
        if (prov) {
            provPrincipal.set(link.producto_id, {
                id: prov.id,
                nombre: prov.nombre,
                plazoEntregaDias: prov.plazo_entrega_dias || 15,
            });
        }
    }

    // Últimos precios por producto (de ingresos)
    const ultimosPrecios = new Map<string, { precio: number; precioAnterior?: number; moneda: string }>();
    for (const mov of (movimientosIngreso || [])) {
        if (!ultimosPrecios.has(mov.producto_id) && mov.costo_unitario) {
            ultimosPrecios.set(mov.producto_id, { precio: mov.costo_unitario, moneda: 'ARS' });
        } else if (ultimosPrecios.has(mov.producto_id) && !ultimosPrecios.get(mov.producto_id)!.precioAnterior && mov.costo_unitario) {
            ultimosPrecios.get(mov.producto_id)!.precioAnterior = mov.costo_unitario;
        }
    }

    // ─── Calcular resumen por producto ────────────────────

    const resultados: ResumenProductoCompras[] = [];

    for (const prod of productos) {
        const consumosMensuales = consumosPorProducto.get(prod.id) || [];
        const moneda = prod.moneda_costo || 'ARS';
        const costo = prod.costo_unitario || 0;

        // Stock valorizado
        const valorEnMonedaOriginal = prod.stock_actual * costo;
        const stockARS = moneda === 'USD' ? valorEnMonedaOriginal * tipoCambio : valorEnMonedaOriginal;
        const stockUSD = moneda === 'ARS' ? (tipoCambio > 0 ? valorEnMonedaOriginal / tipoCambio : 0) : valorEnMonedaOriginal;

        // Consumo estacional
        const { tasaDiaria, indiceActual, consumoMes, maxMensual, maxMesLabel, consumo3M, meses3MLabel, diasStock } =
            calcularEstacionalidad(consumosMensuales, prod.stock_actual, mesActual, añoActual);

        // Nivel de alerta
        const prov = provPrincipal.get(prod.id);
        const leadTime = prov?.plazoEntregaDias || 15;
        let diasStockNivel: 'CRITICO' | 'ATENCION' | 'OK' | 'SIN_DATOS' = 'OK';
        if (consumosMensuales.length === 0) {
            diasStockNivel = 'SIN_DATOS';
        } else if (diasStock <= leadTime) {
            diasStockNivel = 'CRITICO';
        } else if (diasStock <= leadTime * 1.5) {
            diasStockNivel = 'ATENCION';
        }

        // Pendientes
        const pend = pendientesPorProducto.get(prod.id);

        // Precios
        const precioInfo = ultimosPrecios.get(prod.id);
        let tendencia: 'SUBE' | 'BAJA' | 'ESTABLE' | undefined;
        if (precioInfo?.precioAnterior) {
            const diff = ((precioInfo.precio - precioInfo.precioAnterior) / precioInfo.precioAnterior) * 100;
            tendencia = diff > 3 ? 'SUBE' : diff < -3 ? 'BAJA' : 'ESTABLE';
        }

        resultados.push({
            producto: prod,
            stockValorizadoARS: stockARS,
            stockValorizadoUSD: stockUSD,
            pendienteEntrega: pend?.total || 0,
            ocAbiertas: pend?.ocs || [],
            consumoMesEstacional: consumoMes,
            tasaDiariaBase: tasaDiaria,
            tasaDiariaAjustada: tasaDiaria * indiceActual,
            indiceEstacionalActual: indiceActual,
            consumoMaxMensual: maxMensual,
            consumoMaxMes: maxMesLabel,
            consumo3MAnoAnterior: consumo3M,
            meses3MAnoAnterior: meses3MLabel,
            diasStock,
            diasStockNivel,
            proveedorPrincipal: prov,
            ultimoPrecio: precioInfo?.precio,
            ultimoPrecioMoneda: precioInfo ? moneda : undefined,
            tendenciaPrecio: tendencia,
            tieneHistorial: consumosMensuales.length > 0,
        });
    }

    // ─── Stock por grupo ──────────────────────────────────

    const stockPorGrupo = calcularStockPorGrupo(resultados);
    const stockMPPorSubtipo = calcularStockMPPorSubtipo(resultados);

    return { productos: resultados, stockPorGrupo, stockMPPorSubtipo };
}

/**
 * Obtiene el historial detallado de ingresos de un producto (para dashboard)
 */
export async function getHistorialIngresos(productoId: string): Promise<IngresoHistorico[]> {
    const supabase = createClient();

    const { data: movimientos } = await supabase
        .from('movimientos_stock')
        .select('cantidad, costo_unitario, created_at, documento_numero, documento_id')
        .eq('producto_id', productoId)
        .eq('tipo_movimiento', 'ENTRADA')
        .eq('origen', 'COMPRA')
        .order('created_at', { ascending: false })
        .limit(50);

    if (!movimientos || movimientos.length === 0) return [];

    // Obtener las OCs para tener los proveedores
    const ocIds = [...new Set(movimientos.map(m => m.documento_id).filter(Boolean))];
    const { data: ocs } = await supabase
        .from('ordenes_compra')
        .select('id, numero, moneda, proveedor:proveedores(nombre)')
        .in('id', ocIds);

    const ocMap = new Map<string, { numero: string; proveedorNombre: string; moneda: string }>();
    for (const oc of (ocs || [])) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prov = oc.proveedor as any;
        ocMap.set(oc.id, {
            numero: oc.numero,
            proveedorNombre: prov?.nombre || '—',
            moneda: oc.moneda || 'ARS',
        });
    }

    return movimientos.map(m => {
        const oc = m.documento_id ? ocMap.get(m.documento_id) : undefined;
        return {
            fecha: m.created_at,
            ocNumero: oc?.numero || m.documento_numero || '—',
            proveedorNombre: oc?.proveedorNombre || '—',
            cantidad: m.cantidad,
            costoUnitario: m.costo_unitario || 0,
            moneda: oc?.moneda || 'ARS',
        };
    });
}

/**
 * Obtiene datos de consumo e ingreso mensual para el gráfico
 */
export async function getDatosGraficoProducto(productoId: string): Promise<{
    meses: string[];
    ingresos: number[];
    consumos: number[];
}> {
    const supabase = createClient();
    const ahora = new Date();
    const fecha18m = new Date(ahora.getFullYear(), ahora.getMonth() - 17, 1).toISOString();

    const { data: movimientos } = await supabase
        .from('movimientos_stock')
        .select('tipo_movimiento, origen, cantidad, created_at')
        .eq('producto_id', productoId)
        .gte('created_at', fecha18m);

    // Inicializar 18 meses
    const meses: string[] = [];
    const ingresosMap = new Map<string, number>();
    const consumosMap = new Map<string, number>();

    for (let i = 17; i >= 0; i--) {
        const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = `${MESES_CORTOS[d.getMonth() + 1]} ${String(d.getFullYear()).slice(-2)}`;
        meses.push(label);
        ingresosMap.set(key, 0);
        consumosMap.set(key, 0);
    }

    for (const mov of (movimientos || [])) {
        const d = new Date(mov.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        if (mov.tipo_movimiento === 'ENTRADA' && mov.origen === 'COMPRA') {
            ingresosMap.set(key, (ingresosMap.get(key) || 0) + mov.cantidad);
        } else if (mov.tipo_movimiento === 'SALIDA' && mov.origen === 'CONSUMO_PRODUCCION') {
            consumosMap.set(key, (consumosMap.get(key) || 0) + mov.cantidad);
        }
    }

    const ingresos = [...ingresosMap.values()];
    const consumos = [...consumosMap.values()];

    return { meses, ingresos, consumos };
}

// ─── Helpers internos ─────────────────────────────────

function agruparConsumosPorProductoYMes(
    movimientos: { producto_id: string; cantidad: number; created_at: string }[]
): Map<string, ConsumoMensual[]> {
    const map = new Map<string, Map<string, ConsumoMensual>>();

    for (const mov of movimientos) {
        const d = new Date(mov.created_at);
        const año = d.getFullYear();
        const mes = d.getMonth() + 1;
        const key = `${año}-${mes}`;

        if (!map.has(mov.producto_id)) map.set(mov.producto_id, new Map());
        const prodMap = map.get(mov.producto_id)!;

        if (!prodMap.has(key)) prodMap.set(key, { año, mes, consumo: 0 });
        prodMap.get(key)!.consumo += mov.cantidad;
    }

    const result = new Map<string, ConsumoMensual[]>();
    for (const [pid, prodMap] of map) {
        result.set(pid, [...prodMap.values()]);
    }
    return result;
}

function calcularEstacionalidad(
    consumosMensuales: ConsumoMensual[],
    stockActual: number,
    mesActual: number,
    añoActual: number
): {
    tasaDiaria: number;
    indiceActual: number;
    consumoMes: number;
    maxMensual: number;
    maxMesLabel: string;
    consumo3M: number;
    meses3MLabel: string;
    diasStock: number;
} {
    // Sin datos → todo cero
    if (consumosMensuales.length === 0) {
        const añoAnt = añoActual - 1;
        const m1 = MESES_CORTOS[mesActual];
        const m2 = MESES_CORTOS[mesActual % 12 + 1];
        const m3 = MESES_CORTOS[(mesActual + 1) % 12 + 1];
        return {
            tasaDiaria: 0,
            indiceActual: 1,
            consumoMes: 0,
            maxMensual: 0,
            maxMesLabel: '—',
            consumo3M: 0,
            meses3MLabel: `${m1}-${m2}-${m3} ${añoAnt}`,
            diasStock: stockActual > 0 ? 999 : 0,
        };
    }

    // Calcular índices estacionales (1-12)
    const consumoPorMes = new Map<number, number[]>(); // mes → [consumo1, consumo2, ...]
    let totalGlobal = 0;

    for (const c of consumosMensuales) {
        if (!consumoPorMes.has(c.mes)) consumoPorMes.set(c.mes, []);
        consumoPorMes.get(c.mes)!.push(c.consumo);
        totalGlobal += c.consumo;
    }

    const mesesConDatos = consumosMensuales.length;
    const promedioGlobal = totalGlobal / mesesConDatos;

    const indices = new Map<number, number>();
    for (let m = 1; m <= 12; m++) {
        const datos = consumoPorMes.get(m) || [];
        if (datos.length === 0) {
            indices.set(m, 1.0); // Sin datos para ese mes → neutral
        } else {
            const promMes = datos.reduce((a, b) => a + b, 0) / datos.length;
            indices.set(m, promedioGlobal > 0 ? promMes / promedioGlobal : 1.0);
        }
    }

    // Tasa diaria reciente (últimos 90 días)
    const ahora = new Date();
    const hace90d = new Date(ahora.getTime() - 90 * 24 * 3600 * 1000);
    let consumo90d = 0;
    for (const c of consumosMensuales) {
        const fechaMes = new Date(c.año, c.mes - 1, 15);
        if (fechaMes >= hace90d) {
            consumo90d += c.consumo;
        }
    }
    const diasTranscurridos = Math.max(1, Math.ceil((ahora.getTime() - hace90d.getTime()) / (24 * 3600 * 1000)));
    const tasaDiaria = consumo90d / diasTranscurridos;

    // Índice del mes actual
    const indiceActual = indices.get(mesActual) || 1.0;

    // Consumo/Mes ajustado
    const consumoMes = tasaDiaria * indiceActual * 30;

    // Máximo mensual últimos 24 meses
    let maxMensual = 0;
    let maxMesLabel = '—';
    for (const c of consumosMensuales) {
        if (c.consumo > maxMensual) {
            maxMensual = c.consumo;
            maxMesLabel = `${MESES_CORTOS[c.mes]} ${c.año}`;
        }
    }

    // Consumo 3M año anterior (mes actual + 2 siguientes, del año pasado)
    const añoAnt = añoActual - 1;
    const meses3M = [mesActual, mesActual % 12 + 1, (mesActual + 1) % 12 + 1];
    let consumo3M = 0;
    for (const m of meses3M) {
        const found = consumosMensuales.find(c => c.año === añoAnt && c.mes === m);
        if (found) consumo3M += found.consumo;
    }
    const meses3MLabel = `${MESES_CORTOS[meses3M[0]]}-${MESES_CORTOS[meses3M[1]]}-${MESES_CORTOS[meses3M[2]]} ${añoAnt}`;

    // Días de stock (iterando con estacionalidad)
    let diasStock = 0;
    if (tasaDiaria > 0) {
        let consumoAcum = 0;
        for (let d = 1; d <= 365; d++) {
            const fechaFutura = new Date(ahora.getTime() + d * 24 * 3600 * 1000);
            const mesFuturo = fechaFutura.getMonth() + 1;
            const indiceMes = indices.get(mesFuturo) || 1.0;
            consumoAcum += tasaDiaria * indiceMes;
            if (consumoAcum >= stockActual) {
                diasStock = d;
                break;
            }
        }
        if (diasStock === 0) diasStock = 999; // más de un año
    } else {
        diasStock = stockActual > 0 ? 999 : 0;
    }

    return { tasaDiaria, indiceActual, consumoMes, maxMensual, maxMesLabel, consumo3M, meses3MLabel, diasStock };
}

function calcularStockPorGrupo(resultados: ResumenProductoCompras[]): StockValorizadoGrupo[] {
    const grupos: Record<string, StockValorizadoGrupo> = {
        MP: { label: 'Materia Prima', totalARS: 0, totalUSD: 0 },
        ENVASE: { label: 'Envases', totalARS: 0, totalUSD: 0 },
        ETIQUETA: { label: 'Etiquetas', totalARS: 0, totalUSD: 0 },
    };

    for (const r of resultados) {
        const tipo = r.producto.tipo;
        if (grupos[tipo]) {
            grupos[tipo].totalARS += r.stockValorizadoARS;
            grupos[tipo].totalUSD += r.stockValorizadoUSD;
        }
    }

    return Object.values(grupos);
}

function calcularStockMPPorSubtipo(resultados: ResumenProductoCompras[]): StockValorizadoGrupo[] {
    const subtipos: Record<TipoMateriaPrima, StockValorizadoGrupo> = {
        RESINA: { label: 'Resinas', totalARS: 0, totalUSD: 0 },
        PIGMENTO: { label: 'Pigmentos', totalARS: 0, totalUSD: 0 },
        CARGA: { label: 'Cargas', totalARS: 0, totalUSD: 0 },
        SOLVENTE: { label: 'Solventes', totalARS: 0, totalUSD: 0 },
        ADITIVO: { label: 'Aditivos', totalARS: 0, totalUSD: 0 },
    };

    for (const r of resultados) {
        if (r.producto.tipo === 'MP' && r.producto.tipo_materia_prima) {
            const st = r.producto.tipo_materia_prima as TipoMateriaPrima;
            if (subtipos[st]) {
                subtipos[st].totalARS += r.stockValorizadoARS;
                subtipos[st].totalUSD += r.stockValorizadoUSD;
            }
        }
    }

    return Object.values(subtipos);
}
