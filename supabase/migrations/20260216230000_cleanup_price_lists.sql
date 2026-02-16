-- Limpieza del sistema antiguo de Listas de Precios

-- 1. Eliminar referencias en tabla productos
UPDATE productos SET lista_costo_id = NULL;

-- 2. Vaciar tablas de precios (Orden inverso por FKs)
TRUNCATE TABLE precios_productos CASCADE;
TRUNCATE TABLE listas_precios CASCADE;

-- 3. Resetear costos unitarios de productos que no sean MP/Insumos (opcional, para limpieza)
-- Para PT y SE el costo vendrá de la receta, así que podemos dejarlos o resetearlos.
-- Por ahora solo quitamos la referencia a la lista.
