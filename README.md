# Agenda

A minimalist workspace application for managing daily schedules, tasks, client projects, and freelance deliverables.

## Core Features

### 1. Daily Agenda & Scheduling
- **Multi-View Calendar**: Switch between Day, Week, and Month agenda views.
- **Multiple Calendars**: Create and color-code distinct calendars for different contexts.
- **Calendar Sharing & Collaboration**: Share calendars with collaborators or guests via view/edit permissions.
- **Quick-Capture Input**: Rapidly schedule time-blocked agenda items and daily tasks.

### 2. Task Management & Hierarchies
- **Nested Tasks**: Deeply hierarchical task structures (parent tasks with inner sub-tasks and todos).
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
3. Paste and run the contents of [`supabase/schema.sql`](supabase/schema.sql).
4. Create a `.env.local` file with your credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```