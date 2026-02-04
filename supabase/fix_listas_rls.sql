-- =====================================================
-- FIX RLS: Listas de Precios y Precios Productos
-- =====================================================
-- Permitir acceso dev/anonimo para el tenant demo
-- (Mismo patrón que productos, recetas, etc.)

-- 1. LISTAS DE PRECIOS
DROP POLICY IF EXISTS "Users can view listas_precios of their tenant" ON listas_precios;
DROP POLICY IF EXISTS "Users can insert listas_precios for their tenant" ON listas_precios;
DROP POLICY IF EXISTS "Users can update listas_precios of their tenant" ON listas_precios;

CREATE POLICY "dev_all_listas_precios" ON listas_precios
  FOR ALL 
  USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
  WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- 2. PRECIOS PRODUCTOS
DROP POLICY IF EXISTS "Users can view precios_productos of their tenant" ON precios_productos;
DROP POLICY IF EXISTS "Users can insert precios_productos for their tenant" ON precios_productos;

CREATE POLICY "dev_all_precios_productos" ON precios_productos
  FOR ALL 
  USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
  WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- 3. CONFIGURACIONES (Si no estaba)
-- Aseguramos que configuraciones también tenga acceso
DROP POLICY IF EXISTS "dev_all_configuraciones" ON configuraciones;
CREATE POLICY "dev_all_configuraciones" ON configuraciones
  FOR ALL 
  USING (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
  WITH CHECK (tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
