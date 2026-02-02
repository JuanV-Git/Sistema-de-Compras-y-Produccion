-- =====================================================
-- POLÍTICAS RLS PARA DESARROLLO (SIN AUTENTICACIÓN)
-- =====================================================
-- IMPORTANTE: Estas políticas permiten acceso público.
-- Reemplazar por políticas seguras en producción.

-- Eliminar políticas anteriores (si existen)
DROP POLICY IF EXISTS "tenant_isolation_productos" ON productos;
DROP POLICY IF EXISTS "tenant_isolation_proveedores" ON proveedores;
DROP POLICY IF EXISTS "tenant_isolation_recetas" ON recetas;
DROP POLICY IF EXISTS "tenant_isolation_receta_componentes" ON receta_componentes;
DROP POLICY IF EXISTS "tenant_isolation_ordenes_compra" ON ordenes_compra;
DROP POLICY IF EXISTS "tenant_isolation_ordenes_compra_items" ON ordenes_compra_items;
DROP POLICY IF EXISTS "tenant_isolation_ordenes_produccion" ON ordenes_produccion;
DROP POLICY IF EXISTS "tenant_isolation_ordenes_produccion_consumos" ON ordenes_produccion_consumos;
DROP POLICY IF EXISTS "tenant_isolation_movimientos_stock" ON movimientos_stock;

-- =====================================================
-- POLÍTICAS DE DESARROLLO (Acceso público al tenant demo)
-- =====================================================
-- Tenant demo ID: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11

-- Productos: acceso público para SELECT
CREATE POLICY "dev_public_select_productos" ON productos
  FOR SELECT USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "dev_public_insert_productos" ON productos
  FOR INSERT WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "dev_public_update_productos" ON productos
  FOR UPDATE USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- Proveedores
CREATE POLICY "dev_public_select_proveedores" ON proveedores
  FOR SELECT USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "dev_public_insert_proveedores" ON proveedores
  FOR INSERT WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "dev_public_update_proveedores" ON proveedores
  FOR UPDATE USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- Recetas
CREATE POLICY "dev_public_select_recetas" ON recetas
  FOR SELECT USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "dev_public_insert_recetas" ON recetas
  FOR INSERT WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "dev_public_update_recetas" ON recetas
  FOR UPDATE USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- Receta Componentes
CREATE POLICY "dev_public_select_receta_componentes" ON receta_componentes
  FOR SELECT USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "dev_public_insert_receta_componentes" ON receta_componentes
  FOR INSERT WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- Órdenes de Compra
CREATE POLICY "dev_public_select_ordenes_compra" ON ordenes_compra
  FOR SELECT USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "dev_public_insert_ordenes_compra" ON ordenes_compra
  FOR INSERT WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "dev_public_update_ordenes_compra" ON ordenes_compra
  FOR UPDATE USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- Órdenes de Compra Items
CREATE POLICY "dev_public_select_ordenes_compra_items" ON ordenes_compra_items
  FOR SELECT USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "dev_public_insert_ordenes_compra_items" ON ordenes_compra_items
  FOR INSERT WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- Órdenes de Producción
CREATE POLICY "dev_public_select_ordenes_produccion" ON ordenes_produccion
  FOR SELECT USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "dev_public_insert_ordenes_produccion" ON ordenes_produccion
  FOR INSERT WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "dev_public_update_ordenes_produccion" ON ordenes_produccion
  FOR UPDATE USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- Órdenes de Producción Consumos
CREATE POLICY "dev_public_select_ordenes_produccion_consumos" ON ordenes_produccion_consumos
  FOR SELECT USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "dev_public_insert_ordenes_produccion_consumos" ON ordenes_produccion_consumos
  FOR INSERT WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- Movimientos de Stock
CREATE POLICY "dev_public_select_movimientos_stock" ON movimientos_stock
  FOR SELECT USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "dev_public_insert_movimientos_stock" ON movimientos_stock
  FOR INSERT WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- =====================================================
-- VERIFICAR
-- =====================================================
-- Ejecuta: SELECT * FROM productos;
-- Deberías ver los 12 productos del tenant demo
