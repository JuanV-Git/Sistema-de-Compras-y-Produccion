-- Agregar columna moneda_costo a la tabla productos
ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS moneda_costo text DEFAULT 'ARS';

-- Actualizar productos existentes
UPDATE productos SET moneda_costo = 'ARS' WHERE moneda_costo IS NULL;
