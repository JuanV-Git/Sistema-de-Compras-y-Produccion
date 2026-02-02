// =====================================================
// SERVICIO DE CONFIGURACION GLOBAL
// =====================================================
// Configuraciones del sistema como tipo de cambio, etc.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const DEMO_TENANT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// Headers comunes
function getHeaders() {
    return {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
    };
}

export interface ConfiguracionGlobal {
    id: string;
    tenant_id: string;
    clave: string;
    valor: string;
    descripcion?: string;
    created_at: string;
    updated_at: string;
}

// Tipo de cambio por defecto si no hay configuración
const DEFAULT_TIPO_CAMBIO = 1200;

/**
 * Obtiene una configuración por clave
 */
export async function getConfiguracion(clave: string): Promise<string | null> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/configuraciones?tenant_id=eq.${DEMO_TENANT_ID}&clave=eq.${clave}`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        console.error('Error fetching configuracion:', await response.text());
        return null;
    }

    const data = await response.json();
    return data[0]?.valor || null;
}

/**
 * Obtiene el tipo de cambio USD -> ARS
 */
export async function getTipoCambio(): Promise<number> {
    const valor = await getConfiguracion('TIPO_CAMBIO_USD');
    return valor ? parseFloat(valor) : DEFAULT_TIPO_CAMBIO;
}

/**
 * Actualiza o crea una configuración
 */
export async function setConfiguracion(clave: string, valor: string, descripcion?: string): Promise<boolean> {
    // Primero ver si existe
    const existing = await getConfiguracion(clave);

    if (existing !== null) {
        // Actualizar
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/configuraciones?tenant_id=eq.${DEMO_TENANT_ID}&clave=eq.${clave}`,
            {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({ valor, updated_at: new Date().toISOString() }),
            }
        );
        return response.ok;
    } else {
        // Crear
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/configuraciones`,
            {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    tenant_id: DEMO_TENANT_ID,
                    clave,
                    valor,
                    descripcion,
                }),
            }
        );
        return response.ok;
    }
}

/**
 * Actualiza el tipo de cambio USD -> ARS
 */
export async function setTipoCambio(valor: number): Promise<boolean> {
    return setConfiguracion('TIPO_CAMBIO_USD', valor.toString(), 'Tipo de cambio USD a ARS');
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
