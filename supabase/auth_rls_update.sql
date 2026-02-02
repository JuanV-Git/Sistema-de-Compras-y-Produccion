-- =====================================================
-- POLÍTICAS RLS PARA USUARIOS AUTENTICADOS
-- =====================================================
-- Ejecutar después de auth_policies.sql y dev_policies.sql
-- Estas políticas permiten a usuarios autenticados del tenant demo
-- realizar operaciones CRUD completas.

-- Primero eliminar las políticas de desarrollo existentes
DROP POLICY IF EXISTS "dev_public_select_productos" ON productos;
DROP POLICY IF EXISTS "dev_public_insert_productos" ON productos;
DROP POLICY IF EXISTS "dev_public_update_productos" ON productos;

DROP POLICY IF EXISTS "dev_public_select_proveedores" ON proveedores;
DROP POLICY IF EXISTS "dev_public_insert_proveedores" ON proveedores;
DROP POLICY IF EXISTS "dev_public_update_proveedores" ON proveedores;

DROP POLICY IF EXISTS "dev_public_select_recetas" ON recetas;
DROP POLICY IF EXISTS "dev_public_insert_recetas" ON recetas;
DROP POLICY IF EXISTS "dev_public_update_recetas" ON recetas;

DROP POLICY IF EXISTS "dev_public_select_receta_componentes" ON receta_componentes;
DROP POLICY IF EXISTS "dev_public_insert_receta_componentes" ON receta_componentes;

DROP POLICY IF EXISTS "dev_public_select_ordenes_compra" ON ordenes_compra;
DROP POLICY IF EXISTS "dev_public_insert_ordenes_compra" ON ordenes_compra;
DROP POLICY IF EXISTS "dev_public_update_ordenes_compra" ON ordenes_compra;

DROP POLICY IF EXISTS "dev_public_select_ordenes_compra_items" ON ordenes_compra_items;
DROP POLICY IF EXISTS "dev_public_insert_ordenes_compra_items" ON ordenes_compra_items;

DROP POLICY IF EXISTS "dev_public_select_ordenes_produccion" ON ordenes_produccion;
DROP POLICY IF EXISTS "dev_public_insert_ordenes_produccion" ON ordenes_produccion;
DROP POLICY IF EXISTS "dev_public_update_ordenes_produccion" ON ordenes_produccion;

DROP POLICY IF EXISTS "dev_public_select_ordenes_produccion_consumos" ON ordenes_produccion_consumos;
DROP POLICY IF EXISTS "dev_public_insert_ordenes_produccion_consumos" ON ordenes_produccion_consumos;

DROP POLICY IF EXISTS "dev_public_select_movimientos_stock" ON movimientos_stock;
DROP POLICY IF EXISTS "dev_public_insert_movimientos_stock" ON movimientos_stock;

-- =====================================================
-- NUEVAS POLÍTICAS: Usuarios autenticados + tenant demo
-- =====================================================

-- PRODUCTOS
CREATE POLICY "auth_select_productos" ON productos
  FOR SELECT USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "auth_insert_productos" ON productos
  FOR INSERT WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "auth_update_productos" ON productos
  FOR UPDATE USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "auth_delete_productos" ON productos
  FOR DELETE USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- PROVEEDORES
CREATE POLICY "auth_select_proveedores" ON proveedores
  FOR SELECT USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "auth_insert_proveedores" ON proveedores
  FOR INSERT WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "auth_update_proveedores" ON proveedores
  FOR UPDATE USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- RECETAS
CREATE POLICY "auth_select_recetas" ON recetas
  FOR SELECT USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "auth_insert_recetas" ON recetas
  FOR INSERT WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "auth_update_recetas" ON recetas
  FOR UPDATE USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- RECETA COMPONENTES
CREATE POLICY "auth_select_receta_componentes" ON receta_componentes
  FOR SELECT USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "auth_all_receta_componentes" ON receta_componentes
  FOR ALL USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- ORDENES COMPRA
CREATE POLICY "auth_select_ordenes_compra" ON ordenes_compra
  FOR SELECT USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "auth_all_ordenes_compra" ON ordenes_compra
  FOR ALL USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- ORDENES COMPRA ITEMS
CREATE POLICY "auth_select_ordenes_compra_items" ON ordenes_compra_items
  FOR SELECT USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "auth_all_ordenes_compra_items" ON ordenes_compra_items
  FOR ALL USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- ORDENES PRODUCCION
CREATE POLICY "auth_select_ordenes_produccion" ON ordenes_produccion
  FOR SELECT USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "auth_all_ordenes_produccion" ON ordenes_produccion
  FOR ALL USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- ORDENES PRODUCCION CONSUMOS
CREATE POLICY "auth_select_ordenes_produccion_consumos" ON ordenes_produccion_consumos
  FOR SELECT USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "auth_all_ordenes_produccion_consumos" ON ordenes_produccion_consumos
  FOR ALL USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- MOVIMIENTOS STOCK
CREATE POLICY "auth_select_movimientos_stock" ON movimientos_stock
  FOR SELECT USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

CREATE POLICY "auth_all_movimientos_stock" ON movimientos_stock
  FOR ALL USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
