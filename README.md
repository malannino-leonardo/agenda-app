# Agenda

A production-ready, minimalist workspace application for managing freelance client projects, web development deliverables, and university coursework.

Designed with a human-crafted Swiss aesthetic: generous whitespace, high-contrast typography, subtle neutral palettes (zinc / slate), and zero AI tropes (no badges, no emojis, no sparkles, no gradients).

---

## Core Features

### 1. Dual-Scope Architecture
- **Freelance Module**:
  - Client Management: Complete profiles with company, contact info, hourly rates, and notes.
  - Project Workspace: Projects linked to clients with budgets, quotes, and nested tasks.
  - Financial Tracking: Total quoted, invoiced, and pending payment metrics.
- **University Module**:
  - Courses & Exams: Course codes, professors, credits (CFU), exam dates, and target grades.
  - Course Tasks & Study Goals: Preparation milestones and assignment tracking.
- **Daily Agenda**:
  - Quick-capture input for daily tasks not tied to a specific client or course.

### 2. Task Management & Quick Interactions
- **Nested Tasks**: Deeply hierarchical task structures (main tasks with inner todos/sub-tasks).
- **Icon-Only Quick Complete**: Instant completion toggle with sleek checkmark button.
- **State Organization**: Clear separation between "Stuff to do" (pending/in progress) and "Stuff already done" (completed).

### 3. Internationalization (i18n)
- Built-in support for **English** and **Italian**.
- Language switcher in the navigation bar with immediate UI update and persistence.

---

## Technical Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide React icons.
- **Build Tool**: Vite.
- **Database**: Supabase (PostgreSQL) with Row-Level Security (RLS), foreign keys, and cascading deletes.
- **Storage**: Local-first storage fallback allowing out-of-the-box offline functionality.

---

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