
-- Daywise Migration 0003
-- Version-protected task title editing
-- Development branch only

BEGIN;

-- The function owner must also be covered by
-- the SELECT policy when FORCE RLS applies.
-- Anonymous users still have no table SELECT grant.

ALTER POLICY tasks_select_own
ON public.tasks
TO PUBLIC;

-- RLS permits updating only the owner's rows.
-- This policy does not grant direct UPDATE access.

CREATE POLICY tasks_update_own
ON public.tasks
FOR UPDATE TO PUBLIC
USING (
    auth.user_id() IS NOT NULL
    AND owner_id = auth.user_id()::uuid
)
WITH CHECK (
    auth.user_id() IS NOT NULL
    AND owner_id = auth.user_id()::uuid
);

-- Secure, version-checked title update.

CREATE FUNCTION public.update_task_title(
    p_task_id uuid,
    p_expected_version bigint,
    p_new_title text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_owner uuid;
    v_title text;
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

    v_title := btrim(p_new_title);

    IF v_title IS NULL
       OR char_length(v_title) NOT BETWEEN 1 AND 200
    THEN
        RAISE EXCEPTION 'Invalid task title'
        USING ERRCODE = '22023';
    END IF;

    -- Atomic ownership and version check.

    UPDATE public.tasks
    SET
        title = v_title,
        version = version + 1,
        updated_at = clock_timestamp()
    WHERE id = p_task_id
      AND owner_id = v_owner
      AND version = p_expected_version
    RETURNING version INTO v_new_version;

    IF v_new_version IS NULL THEN
        RAISE EXCEPTION
            'Task changed or unavailable'
        USING ERRCODE = 'P0001';
    END IF;

    RETURN v_new_version;
END;
$$;

REVOKE ALL ON FUNCTION
public.update_task_title(uuid, bigint, text)
FROM PUBLIC, anonymous, authenticated;

GRANT EXECUTE ON FUNCTION
public.update_task_title(uuid, bigint, text)
TO authenticated;

COMMIT;
    