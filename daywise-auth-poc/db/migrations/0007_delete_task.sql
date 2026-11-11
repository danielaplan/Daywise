
-- Daywise Migration 0007
-- Permanent task deletion with version protection
-- Target: Neon development branch ONLY

BEGIN;

-- ==========================================
-- 1. ROW LEVEL SECURITY POLICY
-- ==========================================

-- Allow the controlled function to delete
-- rows belonging to the authenticated owner.
--
-- This policy does NOT grant direct DELETE
-- privileges to application users.

CREATE POLICY tasks_delete_own
ON public.tasks
FOR DELETE TO PUBLIC
USING (
    auth.user_id() IS NOT NULL
    AND owner_id = auth.user_id()::uuid
);

-- ==========================================
-- 2. SECURE TASK DELETION FUNCTION
-- ==========================================

CREATE FUNCTION public.delete_task(
    p_task_id uuid,
    p_expected_version bigint
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_owner uuid;
    v_deleted_id uuid;
BEGIN

    -- Verify authenticated user identity.

    v_owner := auth.user_id()::uuid;

    IF v_owner IS NULL THEN
        RAISE EXCEPTION
            'Authentication required'
            USING ERRCODE = '28000';
    END IF;

    -- Validate parameters.

    IF p_task_id IS NULL
       OR p_expected_version IS NULL
       OR p_expected_version < 1
    THEN
        RAISE EXCEPTION
            'Invalid task or version'
            USING ERRCODE = '22023';
    END IF;

    -- Atomically delete only the user's task
    -- when its version matches.

    DELETE FROM public.tasks
    WHERE id = p_task_id
      AND owner_id = v_owner
      AND version = p_expected_version
    RETURNING id INTO v_deleted_id;

    -- Do not reveal whether another user's
    -- task exists.

    IF v_deleted_id IS NULL THEN
        RAISE EXCEPTION
            'Task changed or unavailable'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN v_deleted_id;

END;
$$;

-- ==========================================
-- 3. EXECUTION PERMISSIONS
-- ==========================================

REVOKE ALL ON FUNCTION
public.delete_task(uuid, bigint)
FROM PUBLIC, anonymous, authenticated;

GRANT EXECUTE ON FUNCTION
public.delete_task(uuid, bigint)
TO authenticated;

COMMIT;
