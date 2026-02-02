-- =====================================================
-- SEED DATA - DATOS INICIALES DE PRUEBA
-- =====================================================

-- =====================================================
-- 1. CREAR TENANT DE PRUEBA
-- =====================================================
INSERT INTO tenants (id, nombre, codigo, email, telefono, direccion)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Pinturas Demo S.A.',
  'DEMO',
  'admin@pinturasdemo.com',
  '+54 11 4444-5555',
  'Av. Industrial 1234, CABA'
);

-- Variable para usar en todos los inserts
-- (usamos el UUID del tenant creado)

-- =====================================================
-- 2. PRODUCTOS - MATERIAS PRIMAS
-- =====================================================
INSERT INTO productos (tenant_id, codigo, nombre, tipo, tipo_materia_prima, unidad_medida, stock_actual, stock_minimo, stock_maximo, costo_unitario) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'MP-001', 'Dióxido de Titanio', 'MP', 'PIGMENTO', 'kg', 150, 200, 800, 2.80),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'MP-002', 'Resina Alquídica', 'MP', 'RESINA', 'kg', 280, 150, 500, 3.50),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'MP-003', 'Solvente Industrial', 'MP', 'SOLVENTE', 'L', 50, 100, 400, 1.20),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'MP-004', 'Carbonato de Calcio', 'MP', 'CARGA', 'kg', 500, 200, 1000, 0.45),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'MP-005', 'Aditivo Antisedimentante', 'MP', 'ADITIVO', 'kg', 15, 20, 50, 8.50);

-- =====================================================
-- 3. PRODUCTOS - ENVASES Y ETIQUETAS
-- =====================================================
INSERT INTO productos (tenant_id, codigo, nombre, tipo, unidad_medida, stock_actual, stock_minimo, stock_maximo, costo_unitario) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ENV-001', 'Balde 20L', 'ENVASE', 'un', 350, 100, 500, 2.50),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ENV-002', 'Lata 4L', 'ENVASE', 'un', 800, 200, 1000, 1.20),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ETQ-001', 'Etiqueta Esmalte 20L', 'ETIQUETA', 'un', 5000, 1000, 10000, 0.15),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ETQ-002', 'Etiqueta Esmalte 4L', 'ETIQUETA', 'un', 8000, 2000, 15000, 0.10);

-- =====================================================
-- 4. PRODUCTOS - SEMIELABORADOS Y TERMINADOS
-- =====================================================
INSERT INTO productos (tenant_id, codigo, nombre, tipo, unidad_medida, stock_actual, stock_minimo, stock_maximo, costo_unitario) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'SE-001', 'Base Blanca', 'SE', 'kg', 200, 100, 400, 2.21),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PT-001', 'Esmalte Sintético Blanco 20L', 'PT', 'un', 80, 50, 200, 58.50),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PT-002', 'Esmalte Sintético Blanco 4L', 'PT', 'un', 150, 100, 300, 14.80);

-- =====================================================
-- 5. PROVEEDORES
-- =====================================================
INSERT INTO proveedores (tenant_id, codigo, nombre, razon_social, cuit, email, telefono, condicion_pago, plazo_entrega_dias) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PROV-001', 'Química Industrial SA', 'Química Industrial S.A.', '30-12345678-9', 'ventas@quimicaindustrial.com', '+54 11 4555-1234', '30 días', 7),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PROV-002', 'Resinas del Sur', 'Resinas del Sur S.R.L.', '30-87654321-0', 'pedidos@resinasdelsur.com', '+54 11 4666-5678', '15 días', 10),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PROV-003', 'Envases Plásticos', 'Envases Plásticos Argentina S.A.', '30-11223344-5', 'comercial@envasesplasticos.com', '+54 11 4777-9012', 'Contado', 3);

-- =====================================================
-- 6. RECETAS (obtenemos IDs de productos)
-- =====================================================
-- Primero insertamos la receta de Base Blanca
INSERT INTO recetas (id, tenant_id, codigo, nombre, version, cantidad_producida, unidad_medida, estado, costo_total, costo_por_unidad)
VALUES (
  'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'REC-001',
  'Base Blanca Standard',
  1,
  100,
  'kg',
  'ACTIVA',
  221.00,
  2.21
);

-- Receta de Esmalte Sintético 20L
INSERT INTO recetas (id, tenant_id, codigo, nombre, version, cantidad_producida, unidad_medida, estado, costo_total, costo_por_unidad)
VALUES (
  'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'REC-002',
  'Esmalte Sintético Blanco 20L',
  1,
  20,
  'un',
  'ACTIVA',
  1170.00,
  58.50
);

-- =====================================================
-- 7. COMPONENTES DE RECETAS
-- =====================================================
-- Componentes de Base Blanca (REC-001)
INSERT INTO receta_componentes (tenant_id, receta_id, producto_id, cantidad, unidad_medida, orden, costo_unitario, costo_subtotal)
SELECT 
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
  id,
  CASE codigo 
    WHEN 'MP-001' THEN 25
    WHEN 'MP-002' THEN 30
    WHEN 'MP-004' THEN 40
    WHEN 'MP-003' THEN 5
  END,
  unidad_medida,
  CASE codigo 
    WHEN 'MP-001' THEN 1
    WHEN 'MP-002' THEN 2
    WHEN 'MP-004' THEN 3
    WHEN 'MP-003' THEN 4
  END,
  costo_unitario,
  costo_unitario * CASE codigo 
    WHEN 'MP-001' THEN 25
    WHEN 'MP-002' THEN 30
    WHEN 'MP-004' THEN 40
    WHEN 'MP-003' THEN 5
  END
FROM productos
WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND codigo IN ('MP-001', 'MP-002', 'MP-004', 'MP-003');

-- =====================================================
-- 8. VERIFICAR DATOS CREADOS
-- =====================================================
-- Ejecuta estas queries para verificar:
-- SELECT * FROM tenants;
-- SELECT * FROM productos WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
-- SELECT * FROM proveedores WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
-- SELECT * FROM recetas WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
