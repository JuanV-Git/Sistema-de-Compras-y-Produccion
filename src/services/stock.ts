// =====================================================
// SERVICIO DE MOVIMIENTOS DE STOCK
// =====================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getHeaders() {
    return {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
    };
}

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
export interface CreateMovimientoData {
    producto_id: string;
    tipo_movimiento: TipoMovimiento;
    origen: OrigenMovimiento;
    documento_id?: string;
    documento_numero?: string;
    cantidad: number;
    costo_unitario?: number;
    observaciones?: string;
}

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
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/productos?id=eq.${productoId}&select=stock_actual`,
        { headers: getHeaders() }
    );

    if (!response.ok) return 0;

    const data = await response.json();
    return data[0]?.stock_actual || 0;
}

/**
 * Actualiza el stock de un producto directamente
 */
async function actualizarStockProducto(productoId: string, nuevoStock: number): Promise<boolean> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/productos?id=eq.${productoId}`,
        {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({
                stock_actual: nuevoStock,
                updated_at: new Date().toISOString()
            }),
        }
    );

    return response.ok;
}

/**
 * Crea un movimiento de stock y actualiza el stock del producto
 */
export async function crearMovimientoStock(data: CreateMovimientoData): Promise<MovimientoConProducto | null> {
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
    const movimientoData = {
        // tenant_id removido
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

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/movimientos_stock`,
        {
            method: 'POST',
            headers: {
                ...getHeaders(),
                'Prefer': 'return=representation',
            },
            body: JSON.stringify(movimientoData),
        }
    );

    if (!response.ok) {
        const error = await response.text();
        console.error('Error creando movimiento:', error);
        throw new Error(`Error al crear movimiento: ${error}`);
    }

    // 5. Actualizar stock del producto
    const stockActualizado = await actualizarStockProducto(data.producto_id, stockPosterior);
    if (!stockActualizado) {
        console.error('Error actualizando stock del producto');
    }

    const result = await response.json();
    return result[0] || result;
}

/**
 * Obtiene movimientos de stock con filtros opcionales
 */
export async function getMovimientosStock(params?: {
    productoId?: string;
    origen?: OrigenMovimiento;
    limit?: number;
}): Promise<MovimientoConProducto[]> {
    let url = `${SUPABASE_URL}/rest/v1/movimientos_stock?select=*,producto:productos(id,codigo,nombre,unidad_medida)&order=created_at.desc`;

    if (params?.productoId) {
        url += `&producto_id=eq.${params.productoId}`;
    }
    if (params?.origen) {
        url += `&origen=eq.${params.origen}`;
    }
    if (params?.limit) {
        url += `&limit=${params.limit}`;
    }

    const response = await fetch(url, { headers: getHeaders() });

    if (!response.ok) {
        console.error('Error fetching movimientos:', await response.text());
        return [];
    }

    return response.json();
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
    costoUnitario?: number
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


