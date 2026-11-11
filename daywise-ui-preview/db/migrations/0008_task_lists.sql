
-- Daywise Migration 0008
-- Secure personal task lists
-- Run on development branch ONLY

BEGIN;

-- Add optimistic concurrency control to lists.
ALTER TABLE public.task_lists
ADD COLUMN version bigint NOT NULL DEFAULT 1;

ALTER TABLE public.task_lists
ADD CONSTRAINT task_lists_version_positive
CHECK (version > 0);

-- Policies support SECURITY DEFINER operations
-- under FORCE ROW LEVEL SECURITY.
-- They do not grant direct table writes.

CREATE POLICY task_lists_rpc_select_own
ON public.task_lists
FOR SELECT TO PUBLIC
USING (
  auth.user_id() IS NOT NULL
  AND owner_id = auth.user_id()::uuid
);

CREATE POLICY task_lists_insert_own
ON public.task_lists
FOR INSERT TO PUBLIC
WITH CHECK (
  auth.user_id() IS NOT NULL
  AND owner_id = auth.user_id()::uuid
);

CREATE POLICY task_lists_update_own
ON public.task_lists
FOR UPDATE TO PUBLIC
USING (
  auth.user_id() IS NOT NULL
  AND owner_id = auth.user_id()::uuid
)
WITH CHECK (
  auth.user_id() IS NOT NULL
  AND owner_id = auth.user_id()::uuid
);

CREATE POLICY task_lists_delete_own
ON public.task_lists
FOR DELETE TO PUBLIC
USING (
  auth.user_id() IS NOT NULL
  AND owner_id = auth.user_id()::uuid
);

-- 1. CREATE LIST

CREATE FUNCTION public.create_task_list(
  p_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner uuid;
  v_name text;
  v_id uuid;
BEGIN
  v_owner := auth.user_id()::uuid;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  v_name := pg_catalog.btrim(p_name);

  IF v_name IS NULL
     OR pg_catalog.char_length(v_name) NOT BETWEEN 1 AND 80
  THEN
    RAISE EXCEPTION 'Invalid list name'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.task_lists (
    id, owner_id, name, created_at, updated_at
  )
  VALUES (
    pg_catalog.gen_random_uuid(),
    v_owner,
    v_name,
    pg_catalog.clock_timestamp(),
    pg_catalog.clock_timestamp()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 2. RENAME LIST

CREATE FUNCTION public.rename_task_list(
  p_list_id uuid,
  p_expected_version bigint,
  p_new_name text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner uuid;
  v_name text;
  v_version bigint;
BEGIN
  v_owner := auth.user_id()::uuid;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF p_list_id IS NULL
     OR p_expected_version IS NULL
     OR p_expected_version < 1
  THEN
    RAISE EXCEPTION 'Invalid list or version'
      USING ERRCODE = '22023';
  END IF;

  v_name := pg_catalog.btrim(p_new_name);

  IF v_name IS NULL
     OR pg_catalog.char_length(v_name) NOT BETWEEN 1 AND 80
  THEN
    RAISE EXCEPTION 'Invalid list name'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.task_lists
  SET name = v_name,
      version = version + 1,
      updated_at = pg_catalog.clock_timestamp()
  WHERE id = p_list_id
    AND owner_id = v_owner
    AND version = p_expected_version
  RETURNING version INTO v_version;

  IF v_version IS NULL THEN
    RAISE EXCEPTION 'List changed or unavailable'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN v_version;
END;
$$;

-- 3. DELETE LIST WHILE PRESERVING TASKS

CREATE FUNCTION public.delete_task_list(
  p_list_id uuid,
  p_expected_version bigint
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner uuid;
  v_current_version bigint;
  v_deleted_id uuid;
BEGIN
  v_owner := auth.user_id()::uuid;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF p_list_id IS NULL
     OR p_expected_version IS NULL
     OR p_expected_version < 1
  THEN
    RAISE EXCEPTION 'Invalid list or version'
      USING ERRCODE = '22023';
  END IF;

  -- Lock list before checking its version.
  SELECT version INTO v_current_version
  FROM public.task_lists
  WHERE id = p_list_id
    AND owner_id = v_owner
  FOR UPDATE;

  IF v_current_version IS DISTINCT FROM p_expected_version THEN
    RAISE EXCEPTION 'List changed or unavailable'
      USING ERRCODE = 'P0001';
  END IF;

  -- Unassign linked tasks instead of deleting them.
  -- Increase task versions so old edits become stale.
  UPDATE public.tasks
  SET list_id = NULL,
      version = version + 1,
      updated_at = pg_catalog.clock_timestamp()
  WHERE owner_id = v_owner
    AND list_id = p_list_id;

  DELETE FROM public.task_lists
  WHERE id = p_list_id
    AND owner_id = v_owner
    AND version = p_expected_version
  RETURNING id INTO v_deleted_id;

  IF v_deleted_id IS NULL THEN
    RAISE EXCEPTION 'List changed or unavailable'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN v_deleted_id;
END;
$$;

-- 4. RESTRICT FUNCTION EXECUTION

REVOKE ALL ON FUNCTION
  public.create_task_list(text)
FROM PUBLIC, anonymous, authenticated;

REVOKE ALL ON FUNCTION
  public.rename_task_list(uuid,bigint,text)
FROM PUBLIC, anonymous, authenticated;

REVOKE ALL ON FUNCTION
  public.delete_task_list(uuid,bigint)
FROM PUBLIC, anonymous, authenticated;

GRANT EXECUTE ON FUNCTION
  public.create_task_list(text)
TO authenticated;

GRANT EXECUTE ON FUNCTION
  public.rename_task_list(uuid,bigint,text)
TO authenticated;

GRANT EXECUTE ON FUNCTION
  public.delete_task_list(uuid,bigint)
TO authenticated;

COMMIT;
