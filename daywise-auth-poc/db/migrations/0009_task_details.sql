
-- Daywise Migration 0009
-- Full task details editing
-- Run on the development branch ONLY

BEGIN;

CREATE FUNCTION public.update_task_details(
    p_task_id uuid,
    p_expected_version bigint,
    p_description text,
    p_priority text,
    p_planned_date date,
    p_due_date date,
    p_list_id uuid
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
    -- 1. Identify the authenticated owner.

    v_owner := auth.user_id()::uuid;

    IF v_owner IS NULL THEN
        RAISE EXCEPTION 'Authentication required'
            USING ERRCODE = '28000';
    END IF;

    -- 2. Validate the task and version.

    IF p_task_id IS NULL
       OR p_expected_version IS NULL
       OR p_expected_version < 1
    THEN
        RAISE EXCEPTION 'Invalid task or version'
            USING ERRCODE = '22023';
    END IF;

    -- 3. Validate the description.

    IF p_description IS NOT NULL
       AND pg_catalog.char_length(p_description) > 5000
    THEN
        RAISE EXCEPTION 'Description is too long'
            USING ERRCODE = '22023';
    END IF;

    -- 4. Validate priority.

    IF p_priority IS NULL
       OR p_priority NOT IN ('low', 'medium', 'high')
    THEN
        RAISE EXCEPTION 'Invalid task priority'
            USING ERRCODE = '22023';
    END IF;

    -- 5. Verify list ownership.
    -- NULL means the task should be unassigned.
    -- Another user's list must never be accepted.

    IF p_list_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM public.task_lists AS l
           WHERE l.id = p_list_id
             AND l.owner_id = v_owner
       )
    THEN
        RAISE EXCEPTION 'Invalid list selection'
            USING ERRCODE = '22023';
    END IF;

    -- 6. Update the task atomically.
    -- Preserve title, status, and completed_at.

    UPDATE public.tasks
    SET
        description = p_description,
        priority = p_priority,
        planned_date = p_planned_date,
        due_date = p_due_date,
        list_id = p_list_id,
        version = version + 1,
        updated_at = pg_catalog.clock_timestamp()
    WHERE id = p_task_id
      AND owner_id = v_owner
      AND version = p_expected_version
    RETURNING version INTO v_new_version;

    -- 7. Reject stale or unauthorized requests.

    IF v_new_version IS NULL THEN
        RAISE EXCEPTION 'Task changed or unavailable'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN v_new_version;
END;
$$;

-- Restrict execution permissions.

REVOKE ALL ON FUNCTION
public.update_task_details(
    uuid, bigint, text, text, date, date, uuid
)
FROM PUBLIC, anonymous, authenticated;

GRANT EXECUTE ON FUNCTION
public.update_task_details(
    uuid, bigint, text, text, date, date, uuid
)
TO authenticated;

COMMIT;
