-- =====================================================
-- POLÍTICA RLS PARA TENANTS (Acceso público para registro)
-- =====================================================
-- Permitir lectura pública de tenants para la página de registro

CREATE POLICY "public_read_tenants" ON tenants
  FOR SELECT USING (activo = true);

-- Permitir inserción de usuarios a cualquier tenant
CREATE POLICY "dev_public_insert_usuarios" ON usuarios
  FOR INSERT WITH CHECK (true);

CREATE POLICY "dev_public_select_usuarios" ON usuarios
  FOR SELECT USING (true);
