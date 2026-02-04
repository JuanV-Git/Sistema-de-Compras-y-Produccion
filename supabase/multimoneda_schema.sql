-- ==============================================================================
-- SCHEMA DE MULTIMONEDA EN RECETAS
-- ==============================================================================

-- Agregamos columnas para almacenar costos en USD
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recetas' AND column_name = 'costo_total_usd') THEN
        ALTER TABLE recetas ADD COLUMN costo_total_usd NUMERIC(15, 4) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recetas' AND column_name = 'costo_por_unidad_usd') THEN
        ALTER TABLE recetas ADD COLUMN costo_por_unidad_usd NUMERIC(15, 4) DEFAULT 0;
    END IF;
END $$;
