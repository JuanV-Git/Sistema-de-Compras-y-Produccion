-- =====================================================
-- MIGRATION: 01_tenant_settings.sql
-- Descripción: Agrega soporte para configuración de tenant y detalles en recetas.
-- =====================================================

-- 1. Agregar columnas a tabla TENANTS
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS configuracion JSONB DEFAULT '{
  "modulos": { "produccion": true, "compras": true, "ventas": true },
  "recetas": { "habilitar_semielaborados": true, "permite_duplicados_ingredientes": false, "nivel_detalle_pasos": "simple" },
  "monedas": { "principal": "ARS", "lista_habilitadas": ["ARS", "USD"] },
  "ui": { "theme_color": "#eab308" }
}'::jsonb;

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'FREE';

-- 2. Agregar columnas a tabla RECETA_COMPONENTES
ALTER TABLE receta_componentes 
ADD COLUMN IF NOT EXISTS instrucciones TEXT;

-- 3. Actualizar tenants existentes (si los hay) con la config por defecto si es nula
UPDATE tenants 
SET configuracion = '{
  "modulos": { "produccion": true, "compras": true, "ventas": true },
  "recetas": { "habilitar_semielaborados": true, "permite_duplicados_ingredientes": false, "nivel_detalle_pasos": "simple" },
  "monedas": { "principal": "ARS", "lista_habilitadas": ["ARS", "USD"] },
  "ui": { "theme_color": "#eab308" }
}'::jsonb
WHERE configuracion IS NULL;
