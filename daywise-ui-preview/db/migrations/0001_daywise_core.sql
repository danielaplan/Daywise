
-- Daywise Migration 0001
-- Core database foundation
-- Target: Neon development branch
--
-- Creates:
--   user_settings
--   task_lists
--   tasks
--
-- SECURITY:
-- RLS enabled on all three tables.
-- Authenticated clients can read only their own data.
-- Direct client writes remain disabled until
-- controlled mutation functions are implemented.

BEGIN;

-- ==========================================
-- 1. USER SETTINGS
-- ==========================================

CREATE TABLE public.user_settings (
    user_id uuid PRIMARY KEY
        DEFAULT (auth.user_id())::uuid
        REFERENCES neon_auth."user"(id)
        ON DELETE CASCADE,

    timezone text NOT NULL DEFAULT 'UTC'
        CHECK (char_length(timezone) BETWEEN 1 AND 100),

    week_starts_on smallint NOT NULL DEFAULT 1
        CHECK (week_starts_on BETWEEN 1 AND 7),

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==========================================
-- 2. TASK LISTS
-- ==========================================

CREATE TABLE public.task_lists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_id uuid NOT NULL
        DEFAULT (auth.user_id())::uuid
        REFERENCES neon_auth."user"(id)
        ON DELETE CASCADE,

    name text NOT NULL,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT task_list_name_valid
        CHECK (
            char_length(name) BETWEEN 1 AND 80
            AND name = btrim(name)
        ),

    CONSTRAINT task_lists_owner_id_unique
        UNIQUE (owner_id, id)
);

-- No duplicate list names for one user,
-- ignoring capitalization.

CREATE UNIQUE INDEX task_lists_owner_name_unique
ON public.task_lists (owner_id, lower(name));

-- ==========================================
-- 3. TASKS
-- ==========================================

CREATE TABLE public.tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_id uuid NOT NULL
        DEFAULT (auth.user_id())::uuid
        REFERENCES neon_auth."user"(id)
        ON DELETE CASCADE,

    list_id uuid,

    title text NOT NULL,

    description text,

    status text NOT NULL DEFAULT 'open',

    priority text NOT NULL DEFAULT 'medium',

    planned_date date,

    due_date date,

    completed_at timestamptz,

    version bigint NOT NULL DEFAULT 1,

    created_at timestamptz NOT NULL DEFAULT now(),

    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT task_title_valid
        CHECK (
            char_length(title) BETWEEN 1 AND 200
            AND title = btrim(title)
        ),

    CONSTRAINT task_description_valid
        CHECK (
            description IS NULL
            OR char_length(description) <= 5000
        ),

    CONSTRAINT task_status_valid
        CHECK (status IN ('open', 'completed')),

    CONSTRAINT task_priority_valid
        CHECK (priority IN ('low', 'medium', 'high')),

    CONSTRAINT task_completion_consistent
        CHECK (
            (status = 'open' AND completed_at IS NULL)
            OR
            (status = 'completed' AND completed_at IS NOT NULL)
        ),

    CONSTRAINT task_version_valid
        CHECK (version >= 1),

    -- A task can only reference a list
    -- belonging to the same user.
    CONSTRAINT task_list_same_owner
        FOREIGN KEY (owner_id, list_id)
        REFERENCES public.task_lists(owner_id, id)
        ON DELETE SET NULL (list_id)
);

-- ==========================================
-- 4. INDEXES
-- ==========================================

CREATE INDEX tasks_owner_status_idx
ON public.tasks (owner_id, status);

CREATE INDEX tasks_owner_planned_idx
ON public.tasks (owner_id, planned_date);

CREATE INDEX tasks_owner_due_idx
ON public.tasks (owner_id, due_date);

CREATE INDEX tasks_owner_list_idx
ON public.tasks (owner_id, list_id);

-- ==========================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.user_settings
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.task_lists
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tasks
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_settings
FORCE ROW LEVEL SECURITY;

ALTER TABLE public.task_lists
FORCE ROW LEVEL SECURITY;

ALTER TABLE public.tasks
FORCE ROW LEVEL SECURITY;

-- ==========================================
-- 6. RESTRICT PERMISSIONS
-- ==========================================

REVOKE ALL ON TABLE
    public.user_settings,
    public.task_lists,
    public.tasks
FROM PUBLIC, anonymous, authenticated;

GRANT USAGE ON SCHEMA public
TO authenticated;

GRANT SELECT ON TABLE
    public.user_settings,
    public.task_lists,
    public.tasks
TO authenticated;

-- No direct INSERT, UPDATE, or DELETE
-- permissions are granted in migration 0001.

-- ==========================================
-- 7. USER SETTINGS RLS
-- ==========================================

CREATE POLICY user_settings_select_own
ON public.user_settings
FOR SELECT TO authenticated
USING (
    user_id = (auth.user_id())::uuid
);

-- ==========================================
-- 8. TASK LISTS RLS
-- ==========================================

CREATE POLICY task_lists_select_own
ON public.task_lists
FOR SELECT TO authenticated
USING (
    owner_id = (auth.user_id())::uuid
);

-- ==========================================
-- 9. TASKS RLS
-- ==========================================

CREATE POLICY tasks_select_own
ON public.tasks
FOR SELECT TO authenticated
USING (
    owner_id = (auth.user_id())::uuid
);

COMMIT;
