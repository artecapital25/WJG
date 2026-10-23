-- Script de Diagnóstico de Salud de Base de Datos WJGEEKS 3D PRO
-- Ejecutable mediante MCP tool execute_sql con project_id: brjzpbqxjakihpsbkqfh

-- 1. Resumen de inventario y figuras en stock
SELECT 
    categoria, 
    COUNT(*) as total_referencias, 
    SUM(stock_actual) as total_unidades,
    SUM(precio_unitario * stock_actual) as valor_inventario_cop
FROM public.productos_stock
WHERE activo = true
GROUP BY categoria
ORDER BY categoria;

-- 2. Conteo de filas en tablas transaccionales y maestras
SELECT 
    schemaname, 
    relname as tabla, 
    n_live_tup as filas_aproximadas
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- 3. Verificación de políticas RLS activas por tabla
SELECT 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
