// =====================================================
// SERVICIO DE API REST - PROVEEDORES
// =====================================================
// Usando fetch directo a la API REST de Supabase

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

export interface Proveedor {
    id: string;
    tenant_id: string;
    codigo: string;
    nombre: string;
    razon_social?: string;
    cuit?: string;
    email?: string;
    telefono?: string;
    direccion?: string;
    contacto_nombre?: string;
    contacto_email?: string;
    contacto_telefono?: string;
    condicion_pago?: string;
    plazo_entrega_dias: number;
    activo: boolean;
    created_at: string;
    updated_at: string;
}

export type CreateProveedorData = Omit<Proveedor, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>;

/**
 * Obtiene todos los proveedores activos
 */
export async function getProveedores(): Promise<Proveedor[]> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/proveedores?tenant_id=eq.${DEMO_TENANT_ID}&activo=eq.true&order=nombre`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        console.error('Error fetching proveedores:', await response.text());
        return [];
    }

    return response.json();
}

/**
 * Genera el siguiente código de proveedor disponible
 * Formato: PROV-001, PROV-002, etc.
 */
export async function getNextCodigoProveedor(): Promise<string> {
    // Obtener todos los proveedores (incluso inactivos) para no reusar códigos
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/proveedores?tenant_id=eq.${DEMO_TENANT_ID}&select=codigo&order=codigo.desc&limit=100`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        return 'PROV-001';
    }

    const proveedores = await response.json();

    // Buscar el número más alto
    let maxNum = 0;
    for (const p of proveedores) {
        const match = p.codigo?.match(/PROV-(\d+)/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
        }
    }

    // Siguiente número
    const nextNum = maxNum + 1;
    return `PROV-${String(nextNum).padStart(3, '0')}`;
}

/**
 * Obtiene un proveedor por ID
 */
export async function getProveedorById(id: string): Promise<Proveedor | null> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/proveedores?id=eq.${id}`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        console.error('Error fetching proveedor:', await response.text());
        return null;
    }

    const data = await response.json();
    return data[0] || null;
}

/**
 * Crea un nuevo proveedor
 */
export async function createProveedor(proveedor: CreateProveedorData): Promise<Proveedor | null> {
    const insertData = {
        ...proveedor,
        tenant_id: DEMO_TENANT_ID,
    };

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/proveedores`,
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
        console.error('Error creating proveedor:', errorText);
        throw new Error(`Error al crear proveedor: ${errorText}`);
    }

    const data = await response.json();
    return data[0] || data;
}

/**
 * Actualiza un proveedor existente
 */
export async function updateProveedor(
    id: string,
    proveedor: Partial<CreateProveedorData>
): Promise<Proveedor | null> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/proveedores?id=eq.${id}`,
        {
            method: 'PATCH',
            headers: {
                ...getHeaders(),
                'Prefer': 'return=representation',
            },
            body: JSON.stringify({
                ...proveedor,
                updated_at: new Date().toISOString(),
            }),
        }
    );

    if (!response.ok) {
        console.error('Error updating proveedor:', await response.text());
        return null;
    }

    const data = await response.json();
    return data[0] || null;
}

/**
 * Elimina un proveedor (soft delete)
 */
export async function deleteProveedor(id: string): Promise<boolean> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/proveedores?id=eq.${id}`,
        {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({
                activo: false,
                updated_at: new Date().toISOString(),
            }),
        }
    );

    if (!response.ok) {
        console.error('Error deleting proveedor:', await response.text());
        return false;
    }

    return true;
}
