-- ==============================================================================
-- SCHEMA DE MULTIMONEDA EN COMPONENTES DE RECETA
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recetas_componentes' AND column_name = 'moneda') THEN
        ALTER TABLE recetas_componentes ADD COLUMN moneda VARCHAR(10) DEFAULT 'ARS';
    END IF;
END $$;
