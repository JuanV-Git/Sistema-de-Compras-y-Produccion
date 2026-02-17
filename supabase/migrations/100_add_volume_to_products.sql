-- =====================================================
-- Migration: Add Volume Fields to Products
-- Version: 100
-- Date: 2026-02-17
-- Description: Add volumen_unitario and unidad_volumen 
--              fields for Finished Products (PT)
-- =====================================================

-- Add volume fields to productos table
ALTER TABLE productos
ADD COLUMN IF NOT EXISTS volumen_unitario DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS unidad_volumen VARCHAR(20);

-- Create index for performance on tipo queries
CREATE INDEX IF NOT EXISTS idx_productos_tipo ON productos(tipo);

-- Add column comments for documentation
COMMENT ON COLUMN productos.volumen_unitario IS 'Volumen contenido por unidad (solo para PT). Ejemplo: 1.00 para "x 1 Lt"';
COMMENT ON COLUMN productos.unidad_volumen IS 'Unidad de medida del volumen. Valores comunes: Lt, ml, m³, gal';

-- Verify columns were added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'productos' 
        AND column_name = 'volumen_unitario'
    ) THEN
        RAISE NOTICE 'Column volumen_unitario added successfully';
    END IF;
    
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'productos' 
        AND column_name = 'unidad_volumen'
    ) THEN
        RAISE NOTICE 'Column unidad_volumen added successfully';
    END IF;
END $$;
