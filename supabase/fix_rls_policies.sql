-- =====================================================
-- FIX: Eliminar políticas conflictivas de RLS
-- =====================================================
-- El problema: hay dos sets de políticas en conflicto
-- 1. tenant_isolation_* (requieren usuario autenticado)
-- 2. auth_*/dev_public_* (para desarrollo)
-- 
-- EJECUTAR ESTO EN SUPABASE SQL EDITOR

-- Primero eliminar TODAS las políticas conflictivas en productos
DROP POLICY IF EXISTS "tenant_isolation_productos" ON productos;
DROP POLICY IF EXISTS "dev_public_select_productos" ON productos;
DROP POLICY IF EXISTS "dev_public_insert_productos" ON productos;
DROP POLICY IF EXISTS "dev_public_update_productos" ON productos;
DROP POLICY IF EXISTS "auth_select_productos" ON productos;
DROP POLICY IF EXISTS "auth_insert_productos" ON productos;
DROP POLICY IF EXISTS "auth_update_productos" ON productos;
DROP POLICY IF EXISTS "auth_delete_productos" ON productos;

-- Crear políticas simples para desarrollo
-- Permiten TODAS las operaciones para el tenant demo
CREATE POLICY "dev_all_productos" ON productos
  FOR ALL 
  USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
  WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- Lo mismo para las demás tablas principales
DROP POLICY IF EXISTS "tenant_isolation_proveedores" ON proveedores;
DROP POLICY IF EXISTS "auth_select_proveedores" ON proveedores;
DROP POLICY IF EXISTS "auth_insert_proveedores" ON proveedores;
DROP POLICY IF EXISTS "auth_update_proveedores" ON proveedores;

CREATE POLICY "dev_all_proveedores" ON proveedores
  FOR ALL 
  USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
  WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

DROP POLICY IF EXISTS "tenant_isolation_recetas" ON recetas;
DROP POLICY IF EXISTS "auth_select_recetas" ON recetas;
DROP POLICY IF EXISTS "auth_insert_recetas" ON recetas;
DROP POLICY IF EXISTS "auth_update_recetas" ON recetas;

CREATE POLICY "dev_all_recetas" ON recetas
  FOR ALL 
  USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
  WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

DROP POLICY IF EXISTS "tenant_isolation_receta_componentes" ON receta_componentes;
DROP POLICY IF EXISTS "auth_select_receta_componentes" ON receta_componentes;
DROP POLICY IF EXISTS "auth_all_receta_componentes" ON receta_componentes;

CREATE POLICY "dev_all_receta_componentes" ON receta_componentes
  FOR ALL 
  USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
  WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

DROP POLICY IF EXISTS "tenant_isolation_ordenes_compra" ON ordenes_compra;
DROP POLICY IF EXISTS "auth_select_ordenes_compra" ON ordenes_compra;
DROP POLICY IF EXISTS "auth_all_ordenes_compra" ON ordenes_compra;

CREATE POLICY "dev_all_ordenes_compra" ON ordenes_compra
  FOR ALL 
  USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
  WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

DROP POLICY IF EXISTS "tenant_isolation_ordenes_compra_items" ON ordenes_compra_items;
DROP POLICY IF EXISTS "auth_select_ordenes_compra_items" ON ordenes_compra_items;
DROP POLICY IF EXISTS "auth_all_ordenes_compra_items" ON ordenes_compra_items;

CREATE POLICY "dev_all_ordenes_compra_items" ON ordenes_compra_items
  FOR ALL 
  USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
  WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

DROP POLICY IF EXISTS "tenant_isolation_ordenes_produccion" ON ordenes_produccion;
DROP POLICY IF EXISTS "auth_select_ordenes_produccion" ON ordenes_produccion;
DROP POLICY IF EXISTS "auth_all_ordenes_produccion" ON ordenes_produccion;

CREATE POLICY "dev_all_ordenes_produccion" ON ordenes_produccion
  FOR ALL 
  USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
  WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

DROP POLICY IF EXISTS "tenant_isolation_ordenes_produccion_consumos" ON ordenes_produccion_consumos;
DROP POLICY IF EXISTS "auth_select_ordenes_produccion_consumos" ON ordenes_produccion_consumos;
DROP POLICY IF EXISTS "auth_all_ordenes_produccion_consumos" ON ordenes_produccion_consumos;

CREATE POLICY "dev_all_ordenes_produccion_consumos" ON ordenes_produccion_consumos
  FOR ALL 
  USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
  WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

DROP POLICY IF EXISTS "tenant_isolation_movimientos_stock" ON movimientos_stock;
DROP POLICY IF EXISTS "auth_select_movimientos_stock" ON movimientos_stock;
DROP POLICY IF EXISTS "auth_all_movimientos_stock" ON movimientos_stock;

CREATE POLICY "dev_all_movimientos_stock" ON movimientos_stock
  FOR ALL 
  USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
  WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- PRODUCTOS PROVEEDORES (relación N:M para códigos alternativos)
DROP POLICY IF EXISTS "tenant_isolation_productos_proveedores" ON productos_proveedores;
DROP POLICY IF EXISTS "dev_all_productos_proveedores" ON productos_proveedores;

CREATE POLICY "dev_all_productos_proveedores" ON productos_proveedores
  FOR ALL 
  USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
  WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- PRODUCTOS PROVEEDORES (relación N:M)
DROP POLICY IF EXISTS "tenant_isolation_productos_proveedores" ON productos_proveedores;
DROP POLICY IF EXISTS "dev_all_productos_proveedores" ON productos_proveedores;

CREATE POLICY "dev_all_productos_proveedores" ON productos_proveedores
  FOR ALL 
  USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
  WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

