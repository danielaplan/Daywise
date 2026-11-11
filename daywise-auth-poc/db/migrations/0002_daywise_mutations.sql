
-- Daywise Migration 0002 — Part A
-- Secure task creation
-- Target: development branch only

BEGIN;

-- Allow the controlled database function to insert
-- only records belonging to the authenticated user.
-- This policy does NOT grant direct INSERT permission.

CREATE POLICY tasks_insert_own
ON public.tasks
FOR INSERT
TO PUBLIC
WITH CHECK (
    owner_id = auth.user_id()::uuid
);

-- Create the controlled task creation function.

CREATE FUNCTION public.create_task(
    p_title text,
    p_description text DEFAULT NULL,
    p_priority text DEFAULT 'medium',
    p_planned_date date DEFAULT NULL,
    p_due_date date DEFAULT NULL,
    p_list_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_owner uuid;
    v_title text;
    v_task_id uuid;
BEGIN
    -- Obtain identity from the authenticated request.
    -- Never accept owner_id from the frontend.

    v_owner := auth.user_id()::uuid;

    IF v_owner IS NULL THEN
        RAISE EXCEPTION 'Authentication required'
            USING ERRCODE = '28000';
    END IF;

    -- Validate task title.

    v_title := btrim(p_title);

    IF v_title IS NULL
       OR char_length(v_title) NOT BETWEEN 1 AND 200
    THEN
        RAISE EXCEPTION 'Invalid task title'
            USING ERRCODE = '22023';
    END IF;

    -- Validate priority.

    IF p_priority IS NULL
       OR p_priority NOT IN ('low', 'medium', 'high')
    THEN
        RAISE EXCEPTION 'Invalid task priority'
            USING ERRCODE = '22023';
    END IF;

    -- Validate description length.

    IF p_description IS NOT NULL
       AND char_length(p_description) > 5000
    THEN
        RAISE EXCEPTION 'Description too long'
            USING ERRCODE = '22023';
    END IF;

    -- Generate the task identifier.

    v_task_id := gen_random_uuid();

    -- Insert only fields the user is allowed to set.
    -- Status, version, and timestamps use DB defaults.
    -- The composite foreign key prevents use of
    -- another user's task list.

    INSERT INTO public.tasks (
        id,
        owner_id,
        title,
        description,
        priority,
        planned_date,
        due_date,
        list_id
    )
    VALUES (
        v_task_id,
        v_owner,
        v_title,
        p_description,
        p_priority,
        p_planned_date,
        p_due_date,
        p_list_id
    );

    RETURN v_task_id;
END;
$$;

-- PostgreSQL functions normally receive public
-- execution privileges unless explicitly revoked.

REVOKE ALL ON FUNCTION public.create_task(
    text, text, text, date, date, uuid
)
FROM PUBLIC, anonymous, authenticated;

-- Only authenticated users may invoke the function.

GRANT EXECUTE ON FUNCTION public.create_task(
    text, text, text, date, date, uuid
)
TO authenticated;

COMMIT;
