// =====================================================
// SERVICIO DE CONFIGURACION GLOBAL
// =====================================================
// Configuración sistema (Single Tenant)

import type { Configuracion } from '@/types/database';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Headers comunes
function getHeaders() {
    return {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
    };
}

// Tipo de cambio por defecto
const DEFAULT_TIPO_CAMBIO = 1200;

/**
 * Obtiene la configuración global (única fila)
 */
export async function getConfiguracion(): Promise<Configuracion | null> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/configuraciones?select=*&limit=1`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        // Puede que la tabla aun no tenga datos
        return null;
    }

    const data = await response.json();
    return data[0] || null;
}

/**
 * Obtiene el tipo de cambio USD -> ARS desde params
 */
export async function getTipoCambio(): Promise<number> {
    const config = await getConfiguracion();
    if (config && config.params && config.params.tipo_cambio_usd) {
        return Number(config.params.tipo_cambio_usd);
    }
    return DEFAULT_TIPO_CAMBIO;
}

/**
 * Actualiza el tipo de cambio USD -> ARS en params
 */
export async function setTipoCambio(valor: number): Promise<boolean> {
    const config = await getConfiguracion();

    // Si no existe config, habría que crearla (inicialización), 
    // pero asumiremos que el seed o setup inicial crea la fila.
    // Si no existe, fallamos por ahora o hacemos un upsert básico si tuvieramos ID.

    if (!config) {
        console.error('No se encontró configuración base para actualizar tipo de cambio');
        return false;
    }

    const newParams = {
        ...config.params,
        tipo_cambio_usd: valor
    };

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/configuraciones?id=eq.${config.id}`,
        {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({
                params: newParams,
                updated_at: new Date().toISOString()
            }),
        }
    );

    return response.ok;
}

/**
 * Convierte de USD a ARS usando el tipo de cambio configurado
 */
export async function convertirUSDaARS(montoUSD: number): Promise<number> {
    const tipoCambio = await getTipoCambio();
    return montoUSD * tipoCambio;
}

/**
 * Convierte de ARS a USD usando el tipo de cambio configurado
 */
export async function convertirARSaUSD(montoARS: number): Promise<number> {
    const tipoCambio = await getTipoCambio();
    return montoARS / tipoCambio;
}
