-- =====================================================
-- ESQUEMA SUPABASE - SISTEMA DE GESTIÓN MULTI-TENANT
-- =====================================================

-- =====================================================
-- TABLA: TENANTS (Empresas/Clientes)
-- =====================================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  codigo TEXT UNIQUE NOT NULL,
  email TEXT,
  telefono TEXT,
  direccion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: USUARIOS (con tenant)
-- =====================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT DEFAULT 'usuario', -- admin, usuario, operador
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: PRODUCTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT NOT NULL, -- MP, SE, PT, ENVASE, ETIQUETA
  tipo_materia_prima TEXT, -- RESINA, PIGMENTO, CARGA, SOLVENTE, ADITIVO
  unidad_medida TEXT NOT NULL,
  -- Stock
  stock_actual NUMERIC(12,2) DEFAULT 0,
  stock_minimo NUMERIC(12,2) DEFAULT 0,
  stock_maximo NUMERIC(12,2),
  -- Costos
  costo_unitario NUMERIC(12,4) DEFAULT 0,
  costo_promedio NUMERIC(12,4) DEFAULT 0,
  -- Metadata
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, codigo)
);

-- =====================================================
-- TABLA: PROVEEDORES
-- =====================================================
CREATE TABLE IF NOT EXISTS proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  razon_social TEXT,
  cuit TEXT,
  email TEXT,
  telefono TEXT,
  direccion TEXT,
  contacto_nombre TEXT,
  contacto_email TEXT,
  contacto_telefono TEXT,
  -- Condiciones
  condicion_pago TEXT, -- Contado, 30 días, etc.
  plazo_entrega_dias INTEGER DEFAULT 15,
  -- Metadata
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, codigo)
);

-- =====================================================
-- TABLA: PRODUCTOS_PROVEEDORES (relación N:M)
-- =====================================================
CREATE TABLE IF NOT EXISTS productos_proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  producto_id UUID REFERENCES productos(id) ON DELETE CASCADE,
  proveedor_id UUID REFERENCES proveedores(id) ON DELETE CASCADE,
  codigo_alternativo TEXT,
  precio_unitario NUMERIC(12,4),
  es_principal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(producto_id, proveedor_id)
);

-- =====================================================
-- TABLA: RECETAS
-- =====================================================
CREATE TABLE IF NOT EXISTS recetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  producto_id UUID REFERENCES productos(id), -- Producto que produce
  cantidad_producida NUMERIC(12,2) NOT NULL,
  unidad_medida TEXT NOT NULL,
  estado TEXT DEFAULT 'ACTIVA', -- ACTIVA, INACTIVA, BORRADOR
  -- Costos calculados
  costo_total NUMERIC(12,4) DEFAULT 0,
  costo_por_unidad NUMERIC(12,4) DEFAULT 0,
  -- Metadata
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, codigo, version)
);

-- =====================================================
-- TABLA: RECETA_COMPONENTES
-- =====================================================
CREATE TABLE IF NOT EXISTS receta_componentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  receta_id UUID REFERENCES recetas(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  cantidad NUMERIC(12,4) NOT NULL,
  unidad_medida TEXT NOT NULL,
  orden INTEGER DEFAULT 0,
  -- Costo calculado
  costo_unitario NUMERIC(12,4) DEFAULT 0,
  costo_subtotal NUMERIC(12,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: ORDENES_COMPRA
-- =====================================================
CREATE TABLE IF NOT EXISTS ordenes_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  numero TEXT NOT NULL,
  proveedor_id UUID REFERENCES proveedores(id),
  estado TEXT DEFAULT 'ABIERTA', -- ABIERTA, CERRADA, CANCELADA
  fecha_emision DATE DEFAULT CURRENT_DATE,
  fecha_entrega_estimada DATE,
  -- Totales
  subtotal NUMERIC(12,2) DEFAULT 0,
  iva NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  -- Metadata
  observaciones TEXT,
  usuario_creacion UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, numero)
);

-- =====================================================
-- TABLA: ORDENES_COMPRA_ITEMS
-- =====================================================
CREATE TABLE IF NOT EXISTS ordenes_compra_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  orden_compra_id UUID REFERENCES ordenes_compra(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  cantidad_pedida NUMERIC(12,2) NOT NULL,
  cantidad_recibida NUMERIC(12,2) DEFAULT 0,
  precio_unitario NUMERIC(12,4) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  estado TEXT DEFAULT 'PENDIENTE', -- PENDIENTE, COMPLETADO, CANCELADO
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: ORDENES_PRODUCCION
-- =====================================================
CREATE TABLE IF NOT EXISTS ordenes_produccion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  numero TEXT NOT NULL,
  receta_id UUID REFERENCES recetas(id),
  producto_id UUID REFERENCES productos(id),
  estado TEXT DEFAULT 'ABIERTA', -- ABIERTA, EN_PROCESO, CERRADA, CANCELADA
  cantidad_programada NUMERIC(12,2) NOT NULL,
  cantidad_producida NUMERIC(12,2) DEFAULT 0,
  unidad_medida TEXT NOT NULL,
  -- Costos
  costo_teorico_total NUMERIC(12,4) DEFAULT 0,
  costo_real_total NUMERIC(12,4) DEFAULT 0,
  variacion_porcentaje NUMERIC(6,2) DEFAULT 0,
  -- Fechas
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  fecha_inicio TIMESTAMPTZ,
  fecha_cierre TIMESTAMPTZ,
  -- Usuarios
  usuario_creacion UUID REFERENCES usuarios(id),
  usuario_cierre UUID REFERENCES usuarios(id),
  -- Metadata
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, numero)
);

-- =====================================================
-- TABLA: ORDENES_PRODUCCION_CONSUMOS
-- =====================================================
CREATE TABLE IF NOT EXISTS ordenes_produccion_consumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  orden_produccion_id UUID REFERENCES ordenes_produccion(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  cantidad_teorica NUMERIC(12,4) NOT NULL,
  cantidad_real NUMERIC(12,4) DEFAULT 0,
  costo_unitario NUMERIC(12,4) DEFAULT 0,
  costo_teorico NUMERIC(12,4) DEFAULT 0,
  costo_real NUMERIC(12,4) DEFAULT 0,
  variacion_cantidad NUMERIC(6,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: MOVIMIENTOS_STOCK
-- =====================================================
CREATE TABLE IF NOT EXISTS movimientos_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  producto_id UUID REFERENCES productos(id),
  tipo_movimiento TEXT NOT NULL, -- ENTRADA, SALIDA, AJUSTE_POSITIVO, AJUSTE_NEGATIVO
  origen TEXT NOT NULL, -- REMITO_COMPRA, ORDEN_PRODUCCION, AJUSTE_MANUAL
  documento_id UUID, -- ID de OC u OP
  documento_numero TEXT,
  cantidad NUMERIC(12,4) NOT NULL,
  stock_anterior NUMERIC(12,4) NOT NULL,
  stock_posterior NUMERIC(12,4) NOT NULL,
  costo_unitario NUMERIC(12,4),
  costo_total NUMERIC(12,4),
  usuario_id UUID REFERENCES usuarios(id),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_productos_tenant ON productos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_productos_tipo ON productos(tenant_id, tipo);
CREATE INDEX IF NOT EXISTS idx_proveedores_tenant ON proveedores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recetas_tenant ON recetas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_tenant ON ordenes_compra(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_estado ON ordenes_compra(tenant_id, estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_produccion_tenant ON ordenes_produccion(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_produccion_estado ON ordenes_produccion(tenant_id, estado);
CREATE INDEX IF NOT EXISTS idx_movimientos_stock_producto ON movimientos_stock(tenant_id, producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_stock_fecha ON movimientos_stock(tenant_id, created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE receta_componentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_compra_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_produccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_produccion_consumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_stock ENABLE ROW LEVEL SECURITY;

-- NOTA: Las políticas de RLS se configuran después de crear las funciones
-- de autenticación que determinan el tenant_id del usuario actual.

-- =====================================================
-- FUNCIÓN: Obtener tenant_id del usuario actual
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM usuarios WHERE auth_user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- =====================================================
-- POLÍTICAS RLS (una por tabla)
-- =====================================================

-- Productos
CREATE POLICY "tenant_isolation_productos" ON productos
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Proveedores
CREATE POLICY "tenant_isolation_proveedores" ON proveedores
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Recetas
CREATE POLICY "tenant_isolation_recetas" ON recetas
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Receta Componentes
CREATE POLICY "tenant_isolation_receta_componentes" ON receta_componentes
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Órdenes de Compra
CREATE POLICY "tenant_isolation_ordenes_compra" ON ordenes_compra
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Órdenes de Compra Items
CREATE POLICY "tenant_isolation_ordenes_compra_items" ON ordenes_compra_items
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Órdenes de Producción
CREATE POLICY "tenant_isolation_ordenes_produccion" ON ordenes_produccion
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Órdenes de Producción Consumos
CREATE POLICY "tenant_isolation_ordenes_produccion_consumos" ON ordenes_produccion_consumos
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Movimientos de Stock
CREATE POLICY "tenant_isolation_movimientos_stock" ON movimientos_stock
  FOR ALL USING (tenant_id = get_user_tenant_id());
