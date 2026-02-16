-- =====================================================
-- ESQUEMA SUPABASE - SISTEMA SINGLE-TENANT (DEDICADO)
-- =====================================================

-- =====================================================
-- TABLA: CONFIGURACION (Singleton)
-- =====================================================
CREATE TABLE IF NOT EXISTS configuracion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Solo debería haber 1 fila
  nombre_empresa TEXT NOT NULL DEFAULT 'Mi Empresa',
  moneda_principal TEXT DEFAULT 'ARS',
  logo_url TEXT,
  theme_color TEXT DEFAULT '#eab308',
  params JSONB DEFAULT '{}'::jsonb, -- Configs extras
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: USUARIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  codigo TEXT UNIQUE NOT NULL, -- Unique en todo el sistema (porque es single tenant)
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: PROVEEDORES
-- =====================================================
CREATE TABLE IF NOT EXISTS proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
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
  condicion_pago TEXT,
  plazo_entrega_dias INTEGER DEFAULT 15,
  -- Metadata
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: PRODUCTOS_PROVEEDORES (relación N:M)
-- =====================================================
CREATE TABLE IF NOT EXISTS productos_proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID REFERENCES productos(id) ON DELETE CASCADE,
  proveedor_id UUID REFERENCES proveedores(id) ON DELETE CASCADE,
  codigo_alternativo TEXT,
  precio_unitario NUMERIC(12,4),
  es_principal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(producto_id, proveedor_id)
);

-- =====================================================
-- TABLA: LISTAS_PRECIOS (Venta/Costo)
-- =====================================================
CREATE TABLE IF NOT EXISTS listas_precios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'VENTA', -- COSTO o VENTA
  descripcion TEXT,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: PRECIOS_PRODUCTOS (Historial)
-- =====================================================
CREATE TABLE IF NOT EXISTS precios_productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id UUID REFERENCES listas_precios(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id) ON DELETE CASCADE,
  precio NUMERIC(12,4) NOT NULL,
  moneda TEXT DEFAULT 'ARS',
  fecha_vigencia TIMESTAMPTZ DEFAULT NOW(),
  usuario_id UUID REFERENCES usuarios(id), -- Auditoría opcional
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: RECETAS
-- =====================================================
CREATE TABLE IF NOT EXISTS recetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  producto_id UUID REFERENCES productos(id),
  cantidad_producida NUMERIC(12,2) NOT NULL,
  unidad_medida TEXT NOT NULL,
  estado TEXT DEFAULT 'ACTIVA',
  -- Costos calculados
  costo_total NUMERIC(12,4) DEFAULT 0,
  costo_por_unidad NUMERIC(12,4) DEFAULT 0,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(codigo, version)
);

-- =====================================================
-- TABLA: RECETA_COMPONENTES
-- =====================================================
CREATE TABLE IF NOT EXISTS receta_componentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receta_id UUID REFERENCES recetas(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  cantidad NUMERIC(12,4) NOT NULL,
  unidad_medida TEXT NOT NULL,
  orden INTEGER DEFAULT 0,
  -- Costo calculado
  costo_unitario NUMERIC(12,4) DEFAULT 0,
  costo_subtotal NUMERIC(12,4) DEFAULT 0,
  instrucciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: ORDENES_COMPRA
-- =====================================================
CREATE TABLE IF NOT EXISTS ordenes_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT UNIQUE NOT NULL,
  proveedor_id UUID REFERENCES proveedores(id),
  estado TEXT DEFAULT 'ABIERTA',
  fecha_emision DATE DEFAULT CURRENT_DATE,
  fecha_entrega_estimada DATE,
  subtotal NUMERIC(12,2) DEFAULT 0,
  iva NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  observaciones TEXT,
  usuario_creacion UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: ORDENES_COMPRA_ITEMS
-- =====================================================
CREATE TABLE IF NOT EXISTS ordenes_compra_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_compra_id UUID REFERENCES ordenes_compra(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  cantidad_pedida NUMERIC(12,2) NOT NULL,
  cantidad_recibida NUMERIC(12,2) DEFAULT 0,
  precio_unitario NUMERIC(12,4) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  estado TEXT DEFAULT 'PENDIENTE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: ORDENES_PRODUCCION
-- =====================================================
CREATE TABLE IF NOT EXISTS ordenes_produccion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT UNIQUE NOT NULL,
  receta_id UUID REFERENCES recetas(id),
  producto_id UUID REFERENCES productos(id),
  estado TEXT DEFAULT 'ABIERTA',
  cantidad_programada NUMERIC(12,2) NOT NULL,
  cantidad_producida NUMERIC(12,2) DEFAULT 0,
  unidad_medida TEXT NOT NULL,
  costo_teorico_total NUMERIC(12,4) DEFAULT 0,
  costo_real_total NUMERIC(12,4) DEFAULT 0,
  variacion_porcentaje NUMERIC(6,2) DEFAULT 0,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  fecha_inicio TIMESTAMPTZ,
  fecha_cierre TIMESTAMPTZ,
  usuario_creacion UUID REFERENCES usuarios(id),
  usuario_cierre UUID REFERENCES usuarios(id),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: ORDENES_PRODUCCION_CONSUMOS
-- =====================================================
CREATE TABLE IF NOT EXISTS ordenes_produccion_consumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  producto_id UUID REFERENCES productos(id),
  tipo_movimiento TEXT NOT NULL,
  origen TEXT NOT NULL,
  documento_id UUID,
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
-- ROW LEVEL SECURITY (RLS) - SIMPLE
-- =====================================================

-- Habilitar RLS
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_produccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_stock ENABLE ROW LEVEL SECURITY;

-- Política Genérica: Solo usuarios autenticados pueden ver todo (es su DB privada)
CREATE POLICY "acceso_total_autenticado_productos" ON productos
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "acceso_total_autenticado_proveedores" ON proveedores
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "acceso_total_autenticado_recetas" ON recetas
  FOR ALL USING (auth.role() = 'authenticated');
  
CREATE POLICY "acceso_total_autenticado_compras" ON ordenes_compra
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "acceso_total_autenticado_produccion" ON ordenes_produccion
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "acceso_total_autenticado_stock" ON movimientos_stock
  FOR ALL USING (auth.role() = 'authenticated');

