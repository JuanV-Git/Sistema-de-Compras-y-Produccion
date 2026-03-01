// =====================================================
// SERVICIO DE MOVIMIENTOS DE STOCK
// =====================================================

import { createClient } from '@/lib/supabase/client';

// Tipos de movimiento
export type TipoMovimiento = 'ENTRADA' | 'SALIDA';

// Orígenes de movimiento
export type OrigenMovimiento =
    | 'COMPRA'                  // Recepción de OC
    | 'PRODUCCION_PT'           // PT al completar OP
    | 'CONSUMO_PRODUCCION'      // MP consumida en OP
    | 'DEVOLUCION_PROVEEDOR'    // Devolución a proveedor
    | 'AJUSTE_POSITIVO'         // Ajuste inventario +
    | 'AJUSTE_NEGATIVO'         // Mermas/roturas
    | 'TRASPASO_ENTRADA'        // Desde otro depósito
    | 'TRASPASO_SALIDA';        // Hacia otro depósito

export const OrigenLabels: Record<OrigenMovimiento, string> = {
    COMPRA: 'Compra',
    PRODUCCION_PT: 'Producción (PT)',
    CONSUMO_PRODUCCION: 'Consumo Producción',
    DEVOLUCION_PROVEEDOR: 'Devolución Proveedor',
    AJUSTE_POSITIVO: 'Ajuste (+)',
    AJUSTE_NEGATIVO: 'Ajuste (-)',
    TRASPASO_ENTRADA: 'Traspaso Entrada',
    TRASPASO_SALIDA: 'Traspaso Salida',
};

// Datos para crear movimiento
export type CreateMovimientoData = {
    producto_id: string;
    tipo_movimiento: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
    origen: OrigenMovimiento;
    documento_id?: string;
    documento_numero?: string;
    cantidad: number;
    costo_unitario?: number;
    observaciones?: string;
    fecha?: string;
};

// Movimiento con producto
export interface MovimientoConProducto {
    id: string;
    // tenant_id removido
    producto_id: string;
    tipo_movimiento: TipoMovimiento;
    origen: OrigenMovimiento;
    documento_id?: string;
    documento_numero?: string;
    cantidad: number;
    stock_anterior: number;
    stock_posterior: number;
    costo_unitario?: number;
    costo_total?: number;
    observaciones?: string;
    created_at: string;
    producto?: {
        id: string;
        codigo: string;
        nombre: string;
        unidad_medida: string;
    };
}

// =====================================================
// FUNCIONES PRINCIPALES
// =====================================================

/**
 * Obtiene el stock actual de un producto
 */
export async function getStockProducto(productoId: string): Promise<number> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('productos')
        .select('stock_actual')
        .eq('id', productoId)
        .single();

    if (error || !data) return 0;
    return data.stock_actual || 0;
}

/**
 * Actualiza el stock de un producto directamente
 */
async function actualizarStockProducto(productoId: string, nuevoStock: number): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase
        .from('productos')
        .update({
            stock_actual: nuevoStock,
            updated_at: new Date().toISOString()
        })
        .eq('id', productoId);

    return !error;
}

/**
 * Crea un movimiento de stock y actualiza el stock del producto
 */
export async function crearMovimientoStock(data: CreateMovimientoData): Promise<MovimientoConProducto | null> {
    const supabase = createClient();
    // 1. Obtener stock actual
    const stockAnterior = await getStockProducto(data.producto_id);

    // 2. Calcular nuevo stock
    const esEntrada = data.tipo_movimiento === 'ENTRADA';
    const stockPosterior = esEntrada
        ? stockAnterior + data.cantidad
        : stockAnterior - data.cantidad;

    // 3. Validar que no quede stock negativo
    if (stockPosterior < 0) {
        throw new Error(`Stock insuficiente. Disponible: ${stockAnterior}, Solicitado: ${data.cantidad}`);
    }

    // 4. Insertar movimiento
    const movimientoData: any = {
        producto_id: data.producto_id,
        tipo_movimiento: data.tipo_movimiento,
        origen: data.origen,
        documento_id: data.documento_id,
        documento_numero: data.documento_numero,
        cantidad: data.cantidad,
        stock_anterior: stockAnterior,
        stock_posterior: stockPosterior,
        costo_unitario: data.costo_unitario,
        costo_total: data.costo_unitario ? data.cantidad * data.costo_unitario : null,
        observaciones: data.observaciones,
    };

    if (data.fecha) {
        movimientoData.created_at = data.fecha;
    }

    const { data: result, error } = await supabase
        .from('movimientos_stock')
        .insert(movimientoData)
        .select()
        .single();

    if (error) {
        console.error('Error creando movimiento:', error);
        throw new Error(`Error al crear movimiento: ${error.message}`);
    }

    // 5. Actualizar stock del producto
    const stockActualizado = await actualizarStockProducto(data.producto_id, stockPosterior);
    if (!stockActualizado) {
        console.error('Error actualizando stock del producto');
    }

    return result as unknown as MovimientoConProducto;
}

/**
 * Obtiene movimientos de stock con filtros opcionales
 */
export async function getMovimientosStock(params?: {
    productoId?: string;
    origen?: OrigenMovimiento;
    limit?: number;
}): Promise<MovimientoConProducto[]> {
    const supabase = createClient();
    let query = supabase
        .from('movimientos_stock')
        .select('*,producto:productos(id,codigo,nombre,unidad_medida)')
        .order('created_at', { ascending: false });

    if (params?.productoId) {
        query = query.eq('producto_id', params.productoId);
    }
    if (params?.origen) {
        query = query.eq('origen', params.origen);
    }
    if (params?.limit) {
        query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching movimientos:', error);
        return [];
    }

    return (data || []) as unknown as MovimientoConProducto[];
}

// =====================================================
// FUNCIONES DE ALTO NIVEL PARA INTEGRACIÓN
// =====================================================

/**
 * Registra consumo de producción (SALIDA de MP)
 */
export async function registrarConsumoProduccion(
    productoId: string,
    cantidad: number,
    opNumero: string,
    opId: string,
    costoUnitario?: number
): Promise<MovimientoConProducto | null> {
    return crearMovimientoStock({
        producto_id: productoId,
        tipo_movimiento: 'SALIDA',
        origen: 'CONSUMO_PRODUCCION',
        documento_id: opId,
        documento_numero: opNumero,
        cantidad,
        costo_unitario: costoUnitario,
        observaciones: `Consumo para OP ${opNumero}`,
    });
}

/**
 * Registra entrada de producto terminado (ENTRADA de PT)
 */
export async function registrarProduccionPT(
    productoId: string,
    cantidad: number,
    opNumero: string,
    opId: string,
    costoUnitario?: number
): Promise<MovimientoConProducto | null> {
    return crearMovimientoStock({
        producto_id: productoId,
        tipo_movimiento: 'ENTRADA',
        origen: 'PRODUCCION_PT',
        documento_id: opId,
        documento_numero: opNumero,
        cantidad,
        costo_unitario: costoUnitario,
        observaciones: `Producción OP ${opNumero}`,
    });
}

/**
 * Registra recepción de compra (ENTRADA de MP)
 */
export async function registrarRecepcionCompra(
    productoId: string,
    cantidad: number,
    ocNumero: string,
    ocId: string,
    costoUnitario?: number,
    fecha?: string
): Promise<MovimientoConProducto | null> {
    return crearMovimientoStock({
        producto_id: productoId,
        tipo_movimiento: 'ENTRADA',
        origen: 'COMPRA',
        documento_id: ocId,
        documento_numero: ocNumero,
        cantidad,
        costo_unitario: costoUnitario,
        observaciones: `Recepción OC ${ocNumero}`,
        fecha,
    });
}

/**
 * Registra devolución a proveedor (SALIDA de MP)
 */
export async function registrarDevolucionProveedor(
    productoId: string,
    cantidad: number,
    ocNumero: string,
    ocId: string,
    observaciones?: string
): Promise<MovimientoConProducto | null> {
    return crearMovimientoStock({
        producto_id: productoId,
        tipo_movimiento: 'SALIDA',
        origen: 'DEVOLUCION_PROVEEDOR',
        documento_id: ocId,
        documento_numero: ocNumero,
        cantidad,
        observaciones: observaciones || `Devolución OC ${ocNumero}`,
    });
}


