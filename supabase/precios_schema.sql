-- ==============================================================================
-- SCHEMA DE LISTAS DE PRECIOS
-- ==============================================================================

-- 1. Tabla de Definición de Listas
CREATE TABLE IF NOT EXISTS listas_precios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL, -- Asumo que ya existe la tabla tenants
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('COSTO', 'VENTA')), -- COSTO: Proveedores/Interno, VENTA: Clientes
    descripcion TEXT,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_listas_precios_tenant ON listas_precios(tenant_id);

-- RLS
ALTER TABLE listas_precios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view listas_precios of their tenant" ON listas_precios
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert listas_precios for their tenant" ON listas_precios
    FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update listas_precios of their tenant" ON listas_precios
    FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM usuarios WHERE auth_user_id = auth.uid()));


-- 2. Tabla de Precios por Producto (Historial)
CREATE TABLE IF NOT EXISTS precios_productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    lista_id UUID REFERENCES listas_precios(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES productos(id) ON DELETE CASCADE,
    precio NUMERIC(15, 4) NOT NULL DEFAULT 0,
    moneda TEXT DEFAULT 'ARS', -- Preparado para multimoneda futuro
    fecha_vigencia TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    usuario_id UUID REFERENCES auth.users(id), -- Quién cargó el precio
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices para búsqueda rápida de precio actual
CREATE INDEX IF NOT EXISTS idx_precios_productos_lookup ON precios_productos(lista_id, producto_id, fecha_vigencia DESC);

-- RLS
ALTER TABLE precios_productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view precios_productos of their tenant" ON precios_productos
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert precios_productos for their tenant" ON precios_productos
    FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM usuarios WHERE auth_user_id = auth.uid()));


-- 3. Modificación a Tabla Productos (Vínculo con Lista)
-- Agregamos la columna que define qué lista de costo usa este producto por defecto
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'lista_costo_id') THEN
        ALTER TABLE productos ADD COLUMN lista_costo_id UUID REFERENCES listas_precios(id);
    END IF;
END $$;

-- 4. Trigger Opcional: Mantener costo_unitario legacy actualizado (OPCIONAL)
-- Para no romper todo el sistema de una, podemos hacer que cuando se inserte un precio nuevo
-- en la lista asignada como 'lista_costo_id' del producto, se actualice el campo viejo 'costo_unitario' en productos.
-- (Implementación simplificada para el futuro si es necesario)
