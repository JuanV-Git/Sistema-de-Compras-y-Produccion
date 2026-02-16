-- =====================================================
-- MIGRATION: 02_switch_to_single_tenant.sql (FIXED V6)
-- Descripción: MIGRACIÓN DEFINITIVA & IDEMPOTENTE
-- Acciones:
-- 1. Identifica 'recetas_componentes' (PLURAL) como la tabla activa.
-- 2. Elimina 'receta_componentes' (SINGULAR) que es la duplicada/vieja.
-- 3. Elimina 'tenants' y 'tenant_id' de todas las tablas activas.
-- 4. Establece políticas RLS 'allow_all'.
-- 5. **FIX V6**: Agrega DROP POLICY previos para evitar errores de "ya existe".
-- =====================================================

-- 1. LIMPIEZA DE TABLAS OBSOLETAS O DUPLICADAS
-- =====================================================

-- Eliminar tabla duplicada 'receta_componentes' (La app usa 'recetas_componentes')
DROP TABLE IF EXISTS receta_componentes CASCADE;

-- Eliminar tabla 'tenants' (Ya no se usa en Single Tenant)
DROP TABLE IF EXISTS tenants CASCADE;

-- Eliminar tabla 'configuracion' (SINGULAR) si existe vacía o errónea
DROP TABLE IF EXISTS configuracion CASCADE; 


-- 2. ELIMINAR POLÍTICAS RLS ANTIGUAS (DE LAS TABLAS ACTIVAS)
-- =====================================================

DO $$ 
BEGIN
    -- Productos
    DROP POLICY IF EXISTS "auth_select_productos" ON productos;
    DROP POLICY IF EXISTS "auth_insert_productos" ON productos;
    DROP POLICY IF EXISTS "auth_update_productos" ON productos;
    DROP POLICY IF EXISTS "auth_delete_productos" ON productos;
    DROP POLICY IF EXISTS "dev_all_productos" ON productos;

    -- Proveedores
    DROP POLICY IF EXISTS "auth_select_proveedores" ON proveedores;
    DROP POLICY IF EXISTS "auth_insert_proveedores" ON proveedores;
    DROP POLICY IF EXISTS "auth_update_proveedores" ON proveedores;
    DROP POLICY IF EXISTS "dev_all_proveedores" ON proveedores;

    -- Recetas
    DROP POLICY IF EXISTS "auth_select_recetas" ON recetas;
    DROP POLICY IF EXISTS "auth_insert_recetas" ON recetas;
    DROP POLICY IF EXISTS "auth_update_recetas" ON recetas;
    DROP POLICY IF EXISTS "dev_all_recetas" ON recetas;

    -- Recetas Componentes (PLURAL - Tabla Activa)
    DROP POLICY IF EXISTS "auth_select_receta_componentes" ON recetas_componentes; 
    DROP POLICY IF EXISTS "auth_all_receta_componentes" ON recetas_componentes;
    DROP POLICY IF EXISTS "dev_all_receta_componentes" ON recetas_componentes;
    DROP POLICY IF EXISTS "dev_all_recetas_componentes" ON recetas_componentes; 

    -- Compras
    DROP POLICY IF EXISTS "auth_select_ordenes_compra" ON ordenes_compra;
    DROP POLICY IF EXISTS "auth_all_ordenes_compra" ON ordenes_compra;
    DROP POLICY IF EXISTS "dev_all_ordenes_compra" ON ordenes_compra;

    DROP POLICY IF EXISTS "auth_select_ordenes_compra_items" ON ordenes_compra_items;
    DROP POLICY IF EXISTS "auth_all_ordenes_compra_items" ON ordenes_compra_items;
    DROP POLICY IF EXISTS "dev_all_ordenes_compra_items" ON ordenes_compra_items;

    -- Produccion
    DROP POLICY IF EXISTS "auth_select_ordenes_produccion" ON ordenes_produccion;
    DROP POLICY IF EXISTS "auth_all_ordenes_produccion" ON ordenes_produccion;
    DROP POLICY IF EXISTS "dev_all_ordenes_produccion" ON ordenes_produccion;

    DROP POLICY IF EXISTS "auth_select_ordenes_produccion_consumos" ON ordenes_produccion_consumos;
    DROP POLICY IF EXISTS "auth_all_ordenes_produccion_consumos" ON ordenes_produccion_consumos;
    DROP POLICY IF EXISTS "dev_all_ordenes_produccion_consumos" ON ordenes_produccion_consumos;

    -- Stock
    DROP POLICY IF EXISTS "auth_select_movimientos_stock" ON movimientos_stock;
    DROP POLICY IF EXISTS "auth_all_movimientos_stock" ON movimientos_stock;
    DROP POLICY IF EXISTS "dev_all_movimientos_stock" ON movimientos_stock;

    -- Precios y Listas
    DROP POLICY IF EXISTS "dev_all_listas_precios" ON listas_precios;
    DROP POLICY IF EXISTS "dev_all_precios_productos" ON precios_productos;
    DROP POLICY IF EXISTS "Users can view listas_precios of their tenant" ON listas_precios;
    DROP POLICY IF EXISTS "Users can insert listas_precios for their tenant" ON listas_precios;
    DROP POLICY IF EXISTS "Users can update listas_precios of their tenant" ON listas_precios;
    DROP POLICY IF EXISTS "Users can view precios_productos of their tenant" ON precios_productos;
    DROP POLICY IF EXISTS "Users can insert precios_productos for their tenant" ON precios_productos;

    -- Configuraciones (PLURAL - Tabla Activa)
    DROP POLICY IF EXISTS "dev_all_configuracion" ON configuraciones;
    DROP POLICY IF EXISTS "dev_all_configuraciones" ON configuraciones;

    -- Otras tablas
    DROP POLICY IF EXISTS "dev_all_productos_proveedores" ON productos_proveedores;
    DROP POLICY IF EXISTS "dev_public_insert_usuarios" ON usuarios;
    DROP POLICY IF EXISTS "dev_public_select_usuarios" ON usuarios;
END $$;


-- 3. ELIMINAR COLUMNA TENANT_ID DE TABLAS ACTIVAS (Con CASCADE)
-- =====================================================

DO $$ 
BEGIN 
    -- Configuraciones (PLURAL)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'configuraciones') THEN
        ALTER TABLE configuraciones DROP COLUMN IF EXISTS tenant_id CASCADE;
    END IF;

    -- Usuarios
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'usuarios') THEN
        ALTER TABLE usuarios DROP COLUMN IF EXISTS tenant_id CASCADE;
    END IF;

    -- Productos
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'productos') THEN
        ALTER TABLE productos DROP COLUMN IF EXISTS tenant_id CASCADE;
    END IF;

    -- Proveedores
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'proveedores') THEN
        ALTER TABLE proveedores DROP COLUMN IF EXISTS tenant_id CASCADE;
    END IF;

    -- Productos Proveedores
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'productos_proveedores') THEN
        ALTER TABLE productos_proveedores DROP COLUMN IF EXISTS tenant_id CASCADE;
    END IF;

    -- Listas Precios
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'listas_precios') THEN
        ALTER TABLE listas_precios DROP COLUMN IF EXISTS tenant_id CASCADE;
    END IF;

    -- Precios Productos
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'precios_productos') THEN
        ALTER TABLE precios_productos DROP COLUMN IF EXISTS tenant_id CASCADE;
    END IF;

    -- Recetas
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'recetas') THEN
        ALTER TABLE recetas DROP COLUMN IF EXISTS tenant_id CASCADE;
    END IF;

    -- Recetas Componentes (PLURAL)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'recetas_componentes') THEN
        ALTER TABLE recetas_componentes DROP COLUMN IF EXISTS tenant_id CASCADE;
    END IF;

    -- Ordenes Produccion
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'ordenes_produccion') THEN
        ALTER TABLE ordenes_produccion DROP COLUMN IF EXISTS tenant_id CASCADE;
    END IF;

    -- Ordenes Produccion Consumos
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'ordenes_produccion_consumos') THEN
        ALTER TABLE ordenes_produccion_consumos DROP COLUMN IF EXISTS tenant_id CASCADE;
    END IF;

    -- Ordenes Compra
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'ordenes_compra') THEN
        ALTER TABLE ordenes_compra DROP COLUMN IF EXISTS tenant_id CASCADE;
    END IF;

    -- Ordenes Compra Items
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'ordenes_compra_items') THEN
        ALTER TABLE ordenes_compra_items DROP COLUMN IF EXISTS tenant_id CASCADE;
    END IF;

    -- Movimientos Stock
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'movimientos_stock') THEN
        ALTER TABLE movimientos_stock DROP COLUMN IF EXISTS tenant_id CASCADE;
    END IF;
END $$;


-- 4. CREAR NUEVAS POLÍTICAS SIMPLIFICADAS (Single Tenant)
-- Regla: AUTHENTICATED USER = TOTAL ACCESS
-- Usamos DROP POLICY IF EXISTS previo para garantizar idempotencia
-- =====================================================

-- PRODUCTOS
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_authenticated_productos" ON productos;
CREATE POLICY "allow_all_authenticated_productos" ON productos FOR ALL USING (auth.role() = 'authenticated');

-- PROVEEDORES
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_authenticated_proveedores" ON proveedores;
CREATE POLICY "allow_all_authenticated_proveedores" ON proveedores FOR ALL USING (auth.role() = 'authenticated');

-- RECETAS
ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_authenticated_recetas" ON recetas;
CREATE POLICY "allow_all_authenticated_recetas" ON recetas FOR ALL USING (auth.role() = 'authenticated');

-- RECETAS COMPONENTES (PLURAL)
ALTER TABLE recetas_componentes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_authenticated_recetas_componentes" ON recetas_componentes;
CREATE POLICY "allow_all_authenticated_recetas_componentes" ON recetas_componentes FOR ALL USING (auth.role() = 'authenticated');

-- COMPRAS
ALTER TABLE ordenes_compra ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_authenticated_ordenes_compra" ON ordenes_compra;
CREATE POLICY "allow_all_authenticated_ordenes_compra" ON ordenes_compra FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE ordenes_compra_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_authenticated_ordenes_compra_items" ON ordenes_compra_items;
CREATE POLICY "allow_all_authenticated_ordenes_compra_items" ON ordenes_compra_items FOR ALL USING (auth.role() = 'authenticated');

-- PRODUCCION
ALTER TABLE ordenes_produccion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_authenticated_ordenes_produccion" ON ordenes_produccion;
CREATE POLICY "allow_all_authenticated_ordenes_produccion" ON ordenes_produccion FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE ordenes_produccion_consumos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_authenticated_ordenes_produccion_consumos" ON ordenes_produccion_consumos;
CREATE POLICY "allow_all_authenticated_ordenes_produccion_consumos" ON ordenes_produccion_consumos FOR ALL USING (auth.role() = 'authenticated');

-- STOCK
ALTER TABLE movimientos_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_authenticated_movimientos_stock" ON movimientos_stock;
CREATE POLICY "allow_all_authenticated_movimientos_stock" ON movimientos_stock FOR ALL USING (auth.role() = 'authenticated');

-- LISTAS DE PRECIOS
ALTER TABLE listas_precios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_authenticated_listas_precios" ON listas_precios;
CREATE POLICY "allow_all_authenticated_listas_precios" ON listas_precios FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE precios_productos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_authenticated_precios_productos" ON precios_productos;
CREATE POLICY "allow_all_authenticated_precios_productos" ON precios_productos FOR ALL USING (auth.role() = 'authenticated');

-- PRODUCTOS PROVEEDORES
ALTER TABLE productos_proveedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_authenticated_productos_proveedores" ON productos_proveedores;
CREATE POLICY "allow_all_authenticated_productos_proveedores" ON productos_proveedores FOR ALL USING (auth.role() = 'authenticated');

-- USUARIOS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_authenticated_usuarios" ON usuarios;
CREATE POLICY "allow_all_authenticated_usuarios" ON usuarios FOR ALL USING (auth.role() = 'authenticated');

-- CONFIGURACIONES (PLURAL)
ALTER TABLE configuraciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_authenticated_configuraciones" ON configuraciones;
CREATE POLICY "allow_all_authenticated_configuraciones" ON configuraciones FOR ALL USING (auth.role() = 'authenticated');
