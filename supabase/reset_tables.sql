-- ==============================================================================
-- SCRIPT DE LIMPIEZA TOTAL DE DATOS (RESET)
-- ==============================================================================
-- ADVERTENCIA: Este script borrará TODOS los registros de las tablas operativas.
-- No borrará usuarios ni tenants (configuración base), solo datos transaccionales.
-- ==============================================================================

BEGIN;

-- Desactivar restricciones de FK momentáneamente o usar CASCADE es más limpio.
-- Usamos TRUNCATE ... CASCADE para borrar automáticamente las tablas dependientes.

-- 1. Tablas Transaccionales (Movimientos, Ordenes, Consumos, Items)
TRUNCATE TABLE 
  movimientos_stock,
  ordenes_produccion_consumos,
  ordenes_produccion,
  ordenes_compra_items,
  ordenes_compra,
  recetas_componentes,
  recetas,
  productos_proveedores,
  proveedores,
  productos
CASCADE;

-- Nota: 'tenants' y 'usuarios' NO se tocan para poder seguir logueados.

COMMIT;
