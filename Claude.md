# CLAUDE.md — TaskMan Frontend (React + Vite + TypeScript + Tailwind)

## Project Overview

TaskMan frontend is an internal team task management interface for Desinftec. It connects to the TaskMan Django REST API. The UI must be clean, fast, and simple — no clutter, no unnecessary complexity. The target users are a small team (5–15 people) who need to manage tasks daily without friction.

Design direction: **refined utilitarian** — dark sidebar, clean white/light main area, clear typography, minimal color use. Think Linear.app or Notion but stripped down. Nothing decorative that doesn't serve a purpose.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v3 |
| Routing | React Router v6 |
| Server State | TanStack Query (React Query v5) |
| Forms | React Hook Form + Zod |
| HTTP Client | Axios |
| Auth | JWT stored in memory + httpOnly cookie for refresh |
| Icons | Lucide React |
| Notifications | Sonner (toast) |
| Date handling | date-fns |

---

## Project Structure

```
taskman_frontend/
├── public/
├── src/
│   ├── api/              # Axios instance + all API call functions
│   │   ├── axios.ts
│   │   ├── auth.ts
│   │   ├── projects.ts
│   │   ├── tasks.ts
│   │   ├── comments.ts
│   │   ├── tickets.ts
│   │   ├── notifications.ts
│   │   └── users.ts
│   ├── components/
│   │   ├── ui/           # Reusable base components (Button, Input, Badge, Modal, etc.)
│   │   ├── layout/       # AppShell, Sidebar, TopBar
│   │   ├── tasks/        # TaskCard, TaskDetail, TaskStatusBadge, DependencyChain
│   │   ├── comments/     # CommentList, CommentInput (with @mention support)
│   │   ├── tickets/      # TicketList, TicketForm, TicketCard
│   │   └── notifications/ # NotificationBell, NotificationDropdown
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx     # Employee: my tasks overview
│   │   ├── ProjectsPage.tsx      # Admin: all projects
│   │   ├── ProjectDetailPage.tsx # Task list for a project
│   │   ├── TaskDetailPage.tsx    # Full task view with comments + attachments
│   │   ├── TicketsPage.tsx       # My tickets (employee) / all tickets (admin)
│   │   ├── NotificationsPage.tsx
│   │   └── AdminPage.tsx         # Admin: user management
│   ├── hooks/            # Custom hooks (useAuth, useTasks, useNotifications, etc.)
│   ├── store/            # Auth state (Zustand or React Context)
│   ├── types/            # TypeScript interfaces matching backend models
│   ├── utils/            # Helpers (formatDate, parseMentions, getStatusColor, etc.)
│   ├── router/           # Route definitions + guards
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.example
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig.json
└── CLAUDE.md
```

---

## TypeScript Types

These mirror the backend models exactly. Keep them in `src/types/`.

```typescript
// src/types/index.ts

export interface User {
  id: number;
  email: string;
  full_name: string;
  role_label: string;
  is_admin: boolean;
  avatar: string | null;
  created_at: string;
}

export type TaskStatus = 'todo' | 'blocked' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: number;
  project: number;
  title: string;
  description: string;
  assigned_to: User | null;
  created_by: User | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  prerequisites: Task[];
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  created_by: User | null;
  members: User[];
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  task: number;
  author: User;
  body: string;
  mentions: Mention[];
  attachments: Attachment[];
  created_at: string;
  updated_at: string;
}

export interface Mention {
  id: number;
  mentioned_user: User;
}

export interface Attachment {
  id: number;
  file: string;       // URL
  file_name: string;
  file_size: number;  // bytes
  mime_type: string;
  uploaded_by: User;
  created_at: string;
}

export type TicketStatus = 'open' | 'in_review' | 'resolved' | 'closed';

export interface Ticket {
  id: number;
  title: string;
  body: string;
  created_by: User;
  related_task: Task | null;
  tagged_users: User[];
  status: TicketStatus;
  admin_note: string;
  created_at: string;
  updated_at: string;
}

export type NotificationType =
  | 'task_assigned'
  | 'task_unblocked'
  | 'mentioned_in_comment'
  | 'ticket_status_changed'
  | 'tagged_in_ticket';

export interface Notification {
  id: number;
  type: NotificationType;
  message: string;
  is_read: boolean;
  object_id: number | null;
  object_type: 'task' | 'ticket' | 'comment' | null;
  created_at: string;
}
```

---

## API Layer

### Axios instance (`src/api/axios.ts`)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,  // for httpOnly refresh cookie
});

// Attach access token from memory on every request
api.interceptors.request.use((config) => {
  const token = getAccessToken(); // from auth store
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      await refreshAccessToken();
      return api(error.config);
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Auth storage strategy
- **Access token**: stored in memory only (Zustand store). Never localStorage — prevents XSS token theft.
- **Refresh token**: httpOnly cookie set by the backend. Never touched by JS.

---

## Pages & Their Responsibility

### `LoginPage`
- Simple centered form: email + password
- On success: store access token in memory, redirect to dashboard
- No registration — admin creates accounts

### `DashboardPage` (Employee view)
- Shows **only tasks assigned to the current user**
- Grouped by status: Blocked / To Do / In Progress / In Review / Done
- Quick status update inline (dropdown or drag)
- Unread notification count in top bar

### `ProjectDetailPage` (Admin + members)
- List of all tasks in the project
- Admin sees all tasks; employees see only their own
- Shows dependency chain visually — simple numbered badge: "Waiting for: UX/UI"
- Admin can create tasks, set prerequisites, assign users

### `TaskDetailPage`
- Full task info: title, description, status, priority, due date, assigned user
- Dependency section: which tasks this is blocked by / which tasks it unblocks
- Comments section with @mention support
- Attachments: upload + list
- Employees can change status only

### `TicketsPage`
- Employee: create ticket, see own tickets + their status
- Admin: see all tickets, update status, write admin note
- Ticket form: title, body (with @mention), optional task link, tag users

### `AdminPage`
- User list: name, email, role label, active status
- Create user form
- Deactivate user

---

## Component Patterns

### Status Badge
Map status → color. Keep it consistent everywhere.

```typescript
// src/utils/statusColor.ts
export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  todo:        { label: 'To Do',       color: 'bg-zinc-100 text-zinc-600' },
  blocked:     { label: 'Blocked',     color: 'bg-red-100 text-red-600' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  in_review:   { label: 'In Review',   color: 'bg-amber-100 text-amber-700' },
  done:        { label: 'Done',        color: 'bg-green-100 text-green-700' },
};
```

### @Mention in Comments
- As user types `@`, show a dropdown of team members filtered by what they type next
- On selection, insert `@FullName` into the textarea
- On submit, send raw body text — backend parses mentions
- Highlight `@Name` tokens in rendered comments with a subtle chip style

### Dependency Display
Keep it simple — don't build a graph visualizer. Just show:
```
Blocked by:  [UX/UI ✓ Done]  [Backend ⏳ In Progress]
Unblocks:    [Mobile]
```

### File Attachments
- Upload button on task detail and comment form
- Show file list with name, size, download link
- Image files show a small thumbnail
- Validate file size/type on the frontend too (same rules as backend)

---

## Routing & Guards

```typescript
// src/router/index.tsx

// Public
/login

// Protected (requires auth)
/                          → DashboardPage
/projects                  → ProjectsPage      (admin only)
/projects/:id              → ProjectDetailPage
/tasks/:id                 → TaskDetailPage
/tickets                   → TicketsPage
/notifications             → NotificationsPage
/admin                     → AdminPage         (admin only)
```

Route guard: if no access token in store → redirect to `/login`.
Admin guard: if `user.is_admin === false` → redirect to `/`.

---

## Layout

### AppShell
```
┌─────────────┬──────────────────────────────────────────────┐
│             │  TopBar: page title + notification bell + avatar│
│  Sidebar    ├──────────────────────────────────────────────┤
│             │                                              │
│  - Dashboard│              Main Content                   │
│  - Projects │                                              │
│  - Tickets  │                                              │
│  - Admin*   │                                              │
│             │                                              │
└─────────────┴──────────────────────────────────────────────┘
* admin only
```

- Sidebar: dark background (`bg-zinc-900`), white text, active item highlighted
- TopBar: white/light, shows current page title, notification bell with unread count badge, user avatar + name
- Main content: light gray background (`bg-zinc-50`), white cards

---

## Design Rules

- **No gradients** unless for status indicators
- **No animations** beyond simple fade/slide transitions (150–200ms)
- **No modals for everything** — use slide-over panels for task detail and ticket forms
- **Typography**: one font family throughout (e.g. `DM Sans` or `Geist`) — clean, readable
- **Spacing**: generous padding inside cards, consistent 4px grid
- **Colors**: zinc/slate scale for neutrals, semantic colors only for status (red=blocked, blue=in-progress, green=done, amber=in-review)
- **Tables vs Cards**: use a simple table for task lists, cards for dashboard overview
- **Empty states**: always show a helpful message when a list is empty — no blank screens

---

## Environment Variables

```
# .env.example
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## Development Setup

```bash
git clone <repo>
cd taskman_frontend
npm install

cp .env.example .env.local   # set VITE_API_BASE_URL

npm run dev
```

---

## Rules for Claude (AI Coding Assistant)

- **Access token lives in memory only** — never `localStorage`, never `sessionStorage`.
- **All API calls go through `src/api/`** — no direct `fetch` or `axios` calls in components.
- **Use TanStack Query for all server state** — no manual `useEffect` + `useState` for data fetching.
- **Forms use React Hook Form + Zod** — no uncontrolled inputs, no manual validation logic.
- **Employees never see admin-only UI** — guard at the component level too, not just routing.
- **Task status changes are optimistic** — update UI immediately, rollback on API error.
- **@mention dropdown** must be keyboard-navigable (arrow keys + enter).
- **No inline styles** — Tailwind classes only. If a utility doesn't exist, extend `tailwind.config.ts`.
- **Every list has a loading skeleton and an empty state** — no blank screens.
- **Error handling**: catch API errors and show a toast (Sonner), never let errors silently fail.
- **TypeScript strict mode is on** — no `any`, no `as unknown as X` hacks. Type everything properly.
- **Components stay small** — if a component exceeds ~150 lines, split it.
- **Keep it simple** — if a feature adds complexity without clear user value, skip it.