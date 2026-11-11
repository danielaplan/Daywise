# Daywise — First real UI integration

This is the original Vite React project, combined with a new Daywise UI based on the supplied Google Stitch reference screens and DESIGN.md. Existing `src/lib/neon.ts`, lockfile, migrations, and security-test components are preserved. No `.env.local`, credentials, or `node_modules` are included.

## Recommended safe first run (Windows PowerShell)

1. Keep your original `daywise-auth-poc` folder untouched. Extract this archive into a **new folder**, e.g. `C:\Users\acer\Desktop\Daywise\daywise-ui-preview`.
2. Copy your existing local environment variables into the preview folder. **Do not upload the .env.local file to a chat or repository**:

   ```powershell
   Copy-Item "C:\Users\acer\Desktop\Daywise\daywise-auth-poc\.env.local" "C:\Users\acer\Desktop\Daywise\daywise-ui-preview\.env.local"
   ```

3. Stop your original `npm run dev` with `Ctrl+C` so the preview can use port **5173**, which your localhost OAuth test already uses.
4. In the preview folder run:

   ```powershell
   cd "C:\Users\acer\Desktop\Daywise\daywise-ui-preview"
   npm ci
   npm run build
   npm run dev
   ```

5. Open http://localhost:5173, sign in to your **development** Neon database, and test the flows below with disposable data. If `npm run build` reports any errors, keep the original project as is and share the error.

## Initial acceptance checklist

- [ ] Google sign-in/out works and only the current user's tasks/lists appear.
- [ ] My Day shows a timezone-based date, planned-today tasks, overdue tasks, unfinished plans, and completed-today tasks.
- [ ] Tasks page shows open tasks sorted by priority (high → medium → low), then due date.
- [ ] Create a task; create and select a personal list; edit details and titles.
- [ ] Complete/reopen, move to today, and permanently delete a disposable task.
- [ ] Change a task in Browser A while its editor is open in Browser B; observe the refresh-conflict message.
- [ ] Close an unsaved task editor; keep editing or discard via the dialog.
- [ ] Delete a list and verify linked tasks are preserved in Inbox.
- [ ] Test both desktop and mobile widths (mobile task editor fills the screen).
- [ ] Retest Account B's isolation before treating this UI as secure.

## Included / deferred

**Included:** Real `My Day`, `Tasks`, task creation, title/details updates, completion/reopening, Move to Today, list creation/rename/deletion, task deletion, search, priorities, due dates, filtering, desktop sidebar, mobile bottom navigation, right-side/fullscreen editor, explicit unsaved-change and version-conflict dialogs, real account isolation through existing RLS.

**Deferred:** Planner, Vault, Habits, Focus timer, Insights, full Settings editing, full browser-navigation blocking, and production launch. Their navigation entries are shown as *Coming soon*, not wired to fake data. The Focus and Habits dashboard panels are labeled as previews.

**Important backend limitation:** Current migrations expose `update_task_title` (0003) and `update_task_details` (0009) as separate RPCs. If users change title **and** details together, they are saved sequentially and the operation is **not atomic**. A failed details save after successful title save is explicitly reported; reload latest and reconcile. A future single version-checked RPC should combine them.

**Security:** This is a local development preview, not a completed production security audit. Previously reported vulnerabilities in the installed Neon/Better Auth SDK dependency tree remain a **public deployment blocker**. Do not expose this app to public users until audited and fixed. Use only the Neon `development` branch, not `production`.

## Project layout

- `src/App.tsx`: authenticated app shell, My Day, Tasks, list controls
- `src/App.css`: Stitch-inspired CSS design tokens and responsive styles
- `src/components/TaskEditor.tsx`: drawer/fullscreen editor and confirmation/conflict dialogs
- `src/components/Icons.tsx`: local vector icons (no additional package)
- `src/lib/daywiseApi.ts`: calls the already-tested Neon RPC functions
- `src/lib/neon.ts`: unchanged from your uploaded source
- `src/types/daywise.ts`: task/list types, sorting and timezone date utilities
- `src/*Test.tsx`: original test screens preserved but not mounted in the app
- `db/migrations/`: original SQL history preserved
- `design-reference/`: source Stitch DESIGN.md and screen captures

There is **no requirement to rerun database migrations** to use this UI. Ensure migrations 0001–0009 were applied on the development branch already.
