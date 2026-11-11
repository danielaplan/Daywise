
    -- Daywise Migration 0006
    -- Move an open task to today's planned date
    -- Target: Neon development branch only

    BEGIN;

    CREATE FUNCTION public.move_task_to_today(
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
        v_timezone text;
        v_today date;
        v_now timestamptz;
        v_new_version bigint;
    BEGIN
        -- 1. Verify authenticated identity

        v_owner := auth.user_id()::uuid;

        IF v_owner IS NULL THEN
            RAISE EXCEPTION 'Authentication required'
                USING ERRCODE = '28000';
        END IF;

        -- 2. Validate task and expected version

        IF p_task_id IS NULL
        OR p_expected_version IS NULL
        OR p_expected_version < 1
        THEN
            RAISE EXCEPTION 'Invalid task or version'
                USING ERRCODE = '22023';
        END IF;

        -- 3. Load the current user's saved timezone

        SELECT s.timezone
        INTO v_timezone
        FROM public.user_settings AS s
        WHERE s.user_id = v_owner;

        IF v_timezone IS NULL THEN
            RAISE EXCEPTION 'User settings not initialized'
                USING ERRCODE = '22023';
        END IF;

        -- 4. Calculate today in the user's timezone

        v_now := pg_catalog.clock_timestamp();

        v_today := (v_now AT TIME ZONE v_timezone)::date;

        -- 5. Atomically update only the planned date
        -- Preserve due_date, title, and other task data.

        UPDATE public.tasks
        SET
            planned_date = v_today,
            updated_at = v_now,
            version = version + 1
        WHERE id = p_task_id
        AND owner_id = v_owner
        AND version = p_expected_version
        AND status = 'open'
        RETURNING version INTO v_new_version;

        -- 6. Reject stale or unauthorized operations

        IF v_new_version IS NULL THEN
            RAISE EXCEPTION 'Task changed or unavailable'
                USING ERRCODE = 'P0001';
        END IF;

        RETURN v_new_version;
    END;
    $$;

    -- 7. Restrict function execution

    REVOKE ALL ON FUNCTION
    public.move_task_to_today(uuid, bigint)
    FROM PUBLIC, anonymous, authenticated;

    GRANT EXECUTE ON FUNCTION
    public.move_task_to_today(uuid, bigint)
    TO authenticated;

    COMMIT;
