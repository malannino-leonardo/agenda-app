# Agenda

A minimalist workspace application for managing daily schedules, tasks, client projects, and freelance deliverables.

## Core Features

### 1. Daily Agenda & Scheduling
- **Day / Week / Month views**: 24-hour timeline for day and week (current-time marker, all-day row, overlapping tasks placed side by side) and a month grid with "+N more" sheets.
- **Drag & drop**: move tasks between days and time slots (15-minute snapping), drop on the all-day row to clear the time, drag the bottom edge of a block to change its duration.
- **Click to create**: click any empty slot to create a task at that exact time; the quick-capture bar understands times (`14:30 Call Marco`).
- **Multiple calendars**: color-coded calendars with per-calendar visibility checkboxes in a collapsible sidebar (remembered per user), "show only this" and "show all".
- **Reminders**: optional "remind me" offset per task, delivered as in-app notices and browser notifications while Agenda is open (works for the installed PWA too).
- **Keyboard shortcuts**: `T` today, `D`/`W`/`M` views, `N` new task, `←`/`→` previous/next period.
- **Unscheduled tray**: tasks without a date, one click to schedule them on the selected day.

### 1b. Shared Calendars
- **Permission-based access**: every collaborator is **Can view** (sees everything, changes nothing) or **Can edit** (adds, moves, completes and deletes tasks). The owner can change or revoke access at any time; collaborators can leave.
- **Invite by email**: opens your mail app with the invitation link ready to send; the invitee also sees the invitation (Accept / Decline) inside the app after signing in with that address. Email invites only work for that address.
- **Invite by link**: one shareable link per permission level (copy / native share sheet); anyone who opens it can sign in or sign up and join. Disable the link to stop new joins.
- **Join flow**: `/invite/<token>` shows who invited you and what access you get, keeps the invite through sign-up and resumes it after login.
- **Enforced server-side**: access rules live in Postgres Row-Level Security and security-definer functions, not just in the UI. Shared tasks show who created them and sync across devices on focus and every 25 seconds.

### 2. Task Management & Hierarchies
- **Nested Tasks**: Deeply hierarchical task structures with inline subtask creation.
- **Table view**: Notion-style list with inline title editing, status / priority / date dropdowns, status, scope and calendar filters, and 3-state column sorting (remembered).
- **Bulk actions**: select many tasks and set status, priority or delete in one go.
- **All Tasks View**: Unified task list with scope filtering (Agenda, Projects, Freelance).
- **Quick Complete**: Instant completion toggle with dedicated checkmark controls.
- **State Organization**: Clear separation between active tasks (pending/in progress) and completed items.
- **Priorities & Dates**: Priority indicators (low, medium, high) and due date tracking.

### 3. Projects Workspace
- **Client Association**: Link projects directly to clients in your directory.
- **Status Pipeline**: Track project progress through pending, in progress, completed, and archived stages.
- **Financial Details**: Record budgets, custom quoted prices, and invoiced amounts.
- **Project Tasks**: Manage deliverables and task breakdowns within each project context.

### 4. Client Directory
- **Client Profiles**: Contact details, company information, default hourly rates, currency, and notes.
- **Financial Overview**: View associated projects and financial summaries per client.

### 5. Appearance & Customization
- **Theme Selection**: Seamless switching between dark and light themes.
- **Vector UI Scaling**: Crisp, subpixel UI scale adjustments with dedicated presets (90% to 130%) and instant reset.
- **Interactive Blobatar**: Dynamic user avatar with mouse-tracking gaze interactions.

### 6. Internationalization (i18n)
- Built-in support for **English** and **Italian**.
- Language switcher in the navigation bar with immediate UI updates and persistence.

### 7. PWA & Offline Support
- **Standalone PWA**: Installable on desktop and mobile platforms with safe-area support.
- **Local-First Architecture**: Automatic offline persistence with Supabase cloud synchronization.


## Technical Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide React icons.
- **Build Tool**: Vite.
- **Database & Auth**: Supabase (PostgreSQL) with Row-Level Security (RLS), foreign keys, and cascading deletes.
- **Storage**: Local-first storage fallback allowing out-of-the-box offline functionality.


## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

### 3. Build for Production
```bash
npm run build
```

---

## Database Setup (Supabase)

1. Create a new project in [Supabase](https://supabase.com).
2. Open the SQL Editor in your Supabase dashboard.
3. Paste and run the contents of [`supabase/schema.sql`](supabase/schema.sql). The script is idempotent: **run it again on an existing project to upgrade it** (it adds shared calendars, converts old email-only shares into pending invitations and tightens the RLS policies).
4. Create a `.env.local` file with your credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### Sharing notes
- Sharing requires a Supabase project (without one the app stays local-first and the share dialog explains this).
- Email invitations are sent from the owner's own mail app (a prefilled `mailto:` link), so no mail server or edge function is needed. To send them automatically, call a mail provider from a Supabase Edge Function using the invite token returned by `create_calendar_invite`.
- For people to land on `/invite/<token>` the host must serve `index.html` for unknown paths (already configured in `vercel.json`).
- Reminders use the browser Notification API and only fire while the app is open; there is no background push.
