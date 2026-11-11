
-- Daywise Migration 0004
-- Task completion and reopening
-- Target: Neon development branch only

BEGIN;

-- ==========================================
-- 1. COMPLETE TASK
-- ==========================================

CREATE FUNCTION public.complete_task(
    p_task_id uuid,
    p_expected_version bigint
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_owner uuid;
    v_new_version bigint;
    v_now timestamptz;
BEGIN
    v_owner := auth.user_id()::uuid;

    IF v_owner IS NULL THEN
        RAISE EXCEPTION 'Authentication required'
            USING ERRCODE = '28000';
    END IF;

    IF p_task_id IS NULL
       OR p_expected_version IS NULL
       OR p_expected_version < 1
    THEN
        RAISE EXCEPTION 'Invalid task or version'
            USING ERRCODE = '22023';
    END IF;

    v_now := clock_timestamp();

    UPDATE public.tasks
    SET
        status = 'completed',
        completed_at = v_now,
        updated_at = v_now,
        version = version + 1
    WHERE id = p_task_id
      AND owner_id = v_owner
      AND version = p_expected_version
      AND status = 'open'
    RETURNING version INTO v_new_version;

    IF v_new_version IS NULL THEN
        RAISE EXCEPTION 'Task changed or unavailable'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN v_new_version;
END;
$$;

-- ==========================================
-- 2. REOPEN TASK
-- ==========================================

CREATE FUNCTION public.reopen_task(
    p_task_id uuid,
    p_expected_version bigint
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_owner uuid;
    v_new_version bigint;
BEGIN
    v_owner := auth.user_id()::uuid;

    IF v_owner IS NULL THEN
        RAISE EXCEPTION 'Authentication required'
            USING ERRCODE = '28000';
    END IF;

    IF p_task_id IS NULL
       OR p_expected_version IS NULL
       OR p_expected_version < 1
    THEN
        RAISE EXCEPTION 'Invalid task or version'
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.tasks
    SET
        status = 'open',
        completed_at = NULL,
        updated_at = clock_timestamp(),
        version = version + 1
    WHERE id = p_task_id
      AND owner_id = v_owner
      AND version = p_expected_version
      AND status = 'completed'
    RETURNING version INTO v_new_version;

    IF v_new_version IS NULL THEN
        RAISE EXCEPTION 'Task changed or unavailable'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN v_new_version;
END;
$$;

-- ==========================================
-- 3. SECURE EXECUTION PERMISSIONS
-- ==========================================

REVOKE ALL ON FUNCTION
public.complete_task(uuid, bigint)
FROM PUBLIC, anonymous, authenticated;

REVOKE ALL ON FUNCTION
public.reopen_task(uuid, bigint)
FROM PUBLIC, anonymous, authenticated;

GRANT EXECUTE ON FUNCTION
public.complete_task(uuid, bigint)
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.reopen_task(uuid, bigint)
TO authenticated;

COMMIT;
