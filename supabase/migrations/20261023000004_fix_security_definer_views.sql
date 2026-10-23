-- ==============================================================================
-- Migración: Corrección de Seguridad para Vistas (Security Invoker)
-- Archivo: 20261023000004_fix_security_definer_views.sql
-- ==============================================================================
-- Convierte las vistas a SECURITY INVOKER para que respeten las políticas RLS
-- del usuario que consulta y resuelvan la advertencia de Supabase Linter (0010_security_definer_view).

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'vista_balance_taller') THEN
        ALTER VIEW public.vista_balance_taller SET (security_invoker = true);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'payments') THEN
        ALTER VIEW public.payments SET (security_invoker = true);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'cuentas_cobro') THEN
        ALTER VIEW public.cuentas_cobro SET (security_invoker = true);
    END IF;
END $$;
