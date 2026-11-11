
-- Daywise Migration 0005 — Part A
-- Initialize authenticated user settings
-- Target: Neon development branch only

BEGIN;

-- Allow the function owner to operate under
-- FORCE RLS. This does not grant anonymous
-- users direct access to the table.

ALTER POLICY user_settings_select_own
ON public.user_settings
TO PUBLIC;

CREATE POLICY user_settings_insert_own
ON public.user_settings
FOR INSERT TO PUBLIC
WITH CHECK (
    auth.user_id() IS NOT NULL
    AND user_id = auth.user_id()::uuid
);

-- Initialize settings only if they do not exist.

CREATE FUNCTION public.initialize_user_settings(
    p_timezone text DEFAULT 'UTC',
    p_week_starts_on smallint DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_owner uuid;
BEGIN
    v_owner := auth.user_id()::uuid;

    IF v_owner IS NULL THEN
        RAISE EXCEPTION 'Authentication required'
        USING ERRCODE = '28000';
    END IF;

    -- Validate the timezone against recognized
    -- PostgreSQL timezone names.

    IF p_timezone IS NULL
       OR NOT EXISTS (
           SELECT 1
           FROM pg_catalog.pg_timezone_names tz
           WHERE tz.name = p_timezone
       )
    THEN
        RAISE EXCEPTION 'Invalid timezone'
        USING ERRCODE = '22023';
    END IF;

    IF p_week_starts_on IS NULL
       OR p_week_starts_on NOT BETWEEN 1 AND 7
    THEN
        RAISE EXCEPTION 'Invalid week start'
        USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.user_settings (
        user_id,
        timezone,
        week_starts_on
    )
    VALUES (
        v_owner,
        p_timezone,
        p_week_starts_on
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN v_owner;
END;
$$;

-- Restrict function execution.

REVOKE ALL ON FUNCTION
public.initialize_user_settings(text, smallint)
FROM PUBLIC, anonymous, authenticated;

GRANT EXECUTE ON FUNCTION
public.initialize_user_settings(text, smallint)
TO authenticated;

COMMIT;
