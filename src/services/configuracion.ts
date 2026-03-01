// =====================================================
// SERVICIO DE CONFIGURACION GLOBAL
// =====================================================

import { createClient } from '@/lib/supabase/client';
import type { Configuracion } from '@/types/database';

// Tipo de cambio por defecto
const DEFAULT_TIPO_CAMBIO = 1200;

/**
 * Obtiene la configuración global (única fila)
 */
export async function getConfiguracion(): Promise<Configuracion | null> {
    const supabase = createClient();

    // Asumimos que la tabla se llama 'configuracion' en Supabase según schema.sql
    const { data, error } = await supabase
        .from('configuracion')
        .select('*')
        .limit(1)
        .single();

    if (error) {
        // Podría no haber fila, así que retornamos null
        return null;
    }

    return data as Configuracion;
}

/**
 * Obtiene el tipo de cambio USD -> ARS desde params
 */
export async function getTipoCambio(): Promise<number> {
    const config = await getConfiguracion();
    if (config && config.params && (config.params as any).tipo_cambio_usd) {
        return Number((config.params as any).tipo_cambio_usd);
    }
    return DEFAULT_TIPO_CAMBIO;
}

/**
 * Actualiza el tipo de cambio USD -> ARS en params
 */
export async function setTipoCambio(valor: number): Promise<boolean> {
    const supabase = createClient();
    const config = await getConfiguracion();

    const newParams = {
        ...(config?.params || {}),
        tipo_cambio_usd: valor
    };

    if (!config) {
        // Necesitamos crear la primera fila
        const { error } = await supabase
            .from('configuracion')
            .insert([{
                params: newParams,
            }]);

        if (error) {
            console.error('Error insertando configuración:', error);
            return false;
        }
    } else {
        // Actualizar fila existente
        const { error } = await supabase
            .from('configuracion')
            .update({
                params: newParams,
                updated_at: new Date().toISOString()
            })
            .eq('id', config.id);

        if (error) {
            console.error('Error actualizando configuración:', error);
            return false;
        }
    }

    return true;
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
