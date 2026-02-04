// =====================================================
// SERVICIO DE API REST - RECETAS
// =====================================================
// Usando fetch directo a la API REST de Supabase

import type { Receta, RecetaComponente, EstadoReceta } from '@/types/database';
import { getPrecioProducto } from './precios'; // Importar servicio precios
import { getTipoCambio } from './configuracion'; // Importar tipo cambio

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const DEMO_TENANT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function getHeaders() {
    return {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
    };
}

// =====================================================
// RECETAS
// =====================================================

/**
 * Obtiene todas las recetas
 */
export async function getRecetas(): Promise<Receta[]> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/recetas?tenant_id=eq.${DEMO_TENANT_ID}&order=codigo`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        console.error('Error fetching recetas:', await response.text());
        return [];
    }

    return response.json();
}

/**
 * Obtiene una receta por ID
 */
export async function getRecetaById(id: string): Promise<Receta | null> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/recetas?id=eq.${id}`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        console.error('Error fetching receta:', await response.text());
        return null;
    }

    const data = await response.json();
    return data[0] || null;
}

/**
 * Genera el siguiente código de receta disponible
 * Formato: REC-001, REC-002, etc.
 */
export async function getNextCodigoReceta(): Promise<string> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/recetas?tenant_id=eq.${DEMO_TENANT_ID}&select=codigo&order=codigo.desc&limit=100`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        return 'REC-001';
    }

    const recetas = await response.json();

    let maxNum = 0;
    for (const r of recetas) {
        const match = r.codigo?.match(/REC-(\d+)/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
        }
    }

    const nextNum = maxNum + 1;
    return `REC-${String(nextNum).padStart(3, '0')}`;
}

export type CreateRecetaData = {
    codigo: string;
    nombre: string;
    version?: number;
    producto_id?: string;
    cantidad_producida: number;
    unidad_medida: string;
    estado: EstadoReceta;
    observaciones?: string;
};

/**
 * Crea una nueva receta
 */
export async function createReceta(receta: CreateRecetaData): Promise<Receta | null> {
    const insertData = {
        ...receta,
        tenant_id: DEMO_TENANT_ID,
        version: receta.version || 1,
        costo_total: 0,
        costo_por_unidad: 0,
    };

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/recetas`,
        {
            method: 'POST',
            headers: {
                ...getHeaders(),
                'Prefer': 'return=representation',
            },
            body: JSON.stringify(insertData),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error creating receta:', errorText);
        throw new Error(`Error al crear receta: ${errorText}`);
    }

    const data = await response.json();
    return data[0] || data;
}

/**
 * Actualiza una receta existente
 */
export async function updateReceta(
    id: string,
    receta: Partial<CreateRecetaData>
): Promise<Receta | null> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/recetas?id=eq.${id}`,
        {
            method: 'PATCH',
            headers: {
                ...getHeaders(),
                'Prefer': 'return=representation',
            },
            body: JSON.stringify({
                ...receta,
                updated_at: new Date().toISOString(),
            }),
        }
    );

    if (!response.ok) {
        console.error('Error updating receta:', await response.text());
        return null;
    }

    const data = await response.json();
    return data[0] || null;
}

/**
 * Actualiza los costos de una receta
 */
export async function updateRecetaCostos(recetaId: string): Promise<void> {
    // Obtener componentes para calcular costos
    const componentes = await getComponentesByReceta(recetaId);
    const receta = await getRecetaById(recetaId);

    if (!receta) return;

    // Calcular totales en ARS y USD
    // Estrategia: Iteramos componentes, convertimos según su moneda y sumamos
    let totalArs = 0;
    let totalUsd = 0;
    const tc = await getTipoCambio();

    for (const c of componentes) {
        // Asumimos que c.moneda viene del fetch (hay que actualizar getComponentesByReceta select)
        // Ojo: RECETAS_COMPONENTES debe tener columna moneda, si no, asumimos moneda del precio histórico o ARS
        // Para simplificar, si no tenemos el dato en componente, asumimos ARS.
        // Pero idealmente updateComponente ya guardó la moneda en la tabla.

        // @ts-ignore
        const monedaComp = c.moneda || 'ARS';
        const costoSubtotal = c.costo_subtotal || 0;

        if (monedaComp === 'USD') {
            totalUsd += costoSubtotal;
            totalArs += costoSubtotal * tc;
        } else {
            totalArs += costoSubtotal;
            totalUsd += costoSubtotal / tc;
        }
    }

    const cantidad = receta.cantidad_producida > 0 ? receta.cantidad_producida : 1;
    const costoUnitArs = totalArs / cantidad;
    const costoUnitUsd = totalUsd / cantidad;

    await fetch(
        `${SUPABASE_URL}/rest/v1/recetas?id=eq.${recetaId}`,
        {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({
                costo_total: totalArs,
                costo_por_unidad: costoUnitArs,
                costo_total_usd: totalUsd,
                costo_por_unidad_usd: costoUnitUsd,
                updated_at: new Date().toISOString(),
            }),
        }
    );
}

/**
 * Actualiza los costos de todos los componentes de una receta usando las listas de precios asignadas.
 * Ahora soporta conversión de moneda (ARS/USD).
 */
export async function actualizarCostosRecetaDesdeListas(recetaId: string): Promise<boolean> {
    const componentes = await getComponentesByReceta(recetaId);
    const tipoCambio = await getTipoCambio(); // Obtener TC global
    let updatedCount = 0;

    for (const comp of componentes) {
        // @ts-ignore
        const listaId = comp.producto?.lista_costo_id;

        if (listaId) {
            const precioVigente = await getPrecioProducto(listaId, comp.producto_id);

            if (precioVigente && precioVigente.precio !== undefined) {
                // Determinar moneda del precio vigente (default ARS si null)
                const monedaPrecio = precioVigente.moneda || 'ARS';

                // Actualizamos componente con precio y moneda
                await updateComponente(comp.id, {
                    costo_unitario: precioVigente.precio,
                    moneda: monedaPrecio, // Guardamos la moneda original
                    cantidad: comp.cantidad
                }, recetaId);
                updatedCount++;
            }
        }
    }

    if (updatedCount > 0) {
        await updateRecetaCostos(recetaId); // Recalculamos totales
        return true;
    }
    return false;
}

// =====================================================
// COMPONENTES DE RECETA
// =====================================================

export interface RecetaComponenteConProducto {
    id: string;
    tenant_id: string;
    receta_id: string;
    producto_id: string;
    cantidad: number;
    unidad_medida: string;
    orden: number;
    costo_unitario: number;
    moneda?: string; // Added
    costo_subtotal: number;
    created_at: string;
    producto?: {
        id: string;
        codigo: string;
        nombre: string;
        unidad_medida: string;
        costo_unitario: number;
    };
}

/**
 * Obtiene todos los componentes de una receta
 */
export async function getComponentesByReceta(recetaId: string): Promise<RecetaComponenteConProducto[]> {
    const url = `${SUPABASE_URL}/rest/v1/recetas_componentes?receta_id=eq.${recetaId}&select=*,producto:productos(id,codigo,nombre,unidad_medida,costo_unitario,lista_costo_id)`;
    // Nota: Select * traerá 'moneda' si existe en tabla
    console.log('Fetching componentes from:', url);

    const response = await fetch(
        url,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching componentes:', errorText);
        return [];
    }

    const data = await response.json();
    console.log('Componentes recibidos:', data);
    return data;
}

export type CreateComponenteData = {
    receta_id: string;
    producto_id: string;
    cantidad: number;
    unidad_medida: string;
    orden?: number;
    costo_unitario: number;
    moneda?: string; // Added
};

/**
 * Agrega un componente a una receta
 */
export async function addComponenteToReceta(data: CreateComponenteData): Promise<RecetaComponente | null> {
    const insertData = {
        ...data,
        tenant_id: DEMO_TENANT_ID,
        orden: data.orden || 0,
        costo_subtotal: data.cantidad * data.costo_unitario,
    };

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/recetas_componentes`,
        {
            method: 'POST',
            headers: {
                ...getHeaders(),
                'Prefer': 'return=representation',
            },
            body: JSON.stringify(insertData),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error adding componente:', errorText);
        throw new Error(`Error al agregar componente: ${errorText}`);
    }

    // Actualizar costos de la receta
    await updateRecetaCostos(data.receta_id);

    const result = await response.json();
    return result[0] || result;
}

/**
 * Actualiza un componente
 */
export async function updateComponente(
    id: string,
    data: { cantidad?: number; costo_unitario?: number; orden?: number; moneda?: string },
    recetaId: string
): Promise<RecetaComponente | null> {
    const updateData: any = { ...data };

    if (data.cantidad !== undefined && data.costo_unitario !== undefined) {
        updateData.costo_subtotal = data.cantidad * data.costo_unitario;
    }

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/recetas_componentes?id=eq.${id}`,
        {
            method: 'PATCH',
            headers: {
                ...getHeaders(),
                'Prefer': 'return=representation',
            },
            body: JSON.stringify(updateData),
        }
    );

    if (!response.ok) {
        console.error('Error updating componente:', await response.text());
        return null;
    }

    // Actualizar costos de la receta
    await updateRecetaCostos(recetaId);

    const result = await response.json();
    return result[0] || null;
}

/**
 * Elimina un componente
 */
export async function removeComponente(id: string, recetaId: string): Promise<boolean> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/recetas_componentes?id=eq.${id}`,
        {
            method: 'DELETE',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        console.error('Error removing componente:', await response.text());
        return false;
    }

    // Actualizar costos de la receta
    await updateRecetaCostos(recetaId);

    return true;
}

/**
 * Calcula el costo total de una receta
 */
export function calcularCostoReceta(componentes: RecetaComponente[]): number {
    return componentes.reduce((acc, comp) => acc + (comp.costo_subtotal || 0), 0);
}
