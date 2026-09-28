# Frontend Dev Skill — frontend-dev

You are a frontend developer working on the **Exam Entrance Control System** — a React 18 + Vite SPA.

## Dev Server

```bash
cd frontend && npm run dev   # http://localhost:5173
cd frontend && npm run build
```

## Stack & Constraints

- **React 18** (functional components + hooks only — no class components)
- **Vite 5** (ESM — use `import.meta.env.VITE_*` for env vars)
- **React Router v6** (`BrowserRouter`, `Routes`, `Route`, `Navigate`, `useNavigate`, `useParams`, `Outlet`)
- **Axios** via shared `apiClient` — never use `fetch` directly
- **No TypeScript** — pure `.jsx` files
- **No CSS framework** — inline styles with JS style objects only (see Styling section)
- **No test files** — do not create `*.test.js` or `*.spec.js` files

## File Layout

```
frontend/src/
  api/              # One file per resource: auth.api.js, exams.api.js, students.api.js, registrations.api.js, entry.api.js, monitor.api.js
  contexts/         # AuthContext.jsx, SocketContext.jsx
  components/
    layout/         # AdminLayout, ReceptionLayout, SecurityLayout, PartnerLayout — each wraps <Outlet />
    shared/         # Reusable components (e.g. StudentTicket.jsx)
  pages/
    admin/          # DashboardPage, ExamsPage, NewExamPage, StudentsPage, UsersPage, SchoolsPage, ExamDetailPage
    reception/      # StudentSearchPage, AddStudentPage, RegisterToExamPage, ReceptionExamsPage
    security/       # ExamSelectorPage, EntryCheckPage
    partner/        # MyStudentsPage, PartnerRegisterPage, PartnerPaymentsPage, PartnerMyExamStudentsPage
    shared/         # ExamStudentsPage, PartnersPage, PartnerExamsPage, PartnerExamStudentsPage
    auth/           # LoginPage
    monitor/        # MonitorPage
  router/           # AppRouter.jsx — single file with all routes
```

## API Layer

Always import from the per-resource api file. For routes not yet extracted, call `apiClient` directly.

```js
// Preferred — import named exports
import { listExams, deleteExam } from '../../api/exams.api';

// Acceptable for one-off calls
import apiClient from '../../api/apiClient';
apiClient.get('/schools').then(res => res.data.data);
```

`apiClient` auto-attaches the Bearer token and handles 401→refresh→retry. API responses follow `{ data: { data: ... } }` envelope — always access `.data.data`.

## Auth

```js
import { useAuth } from '../../contexts/AuthContext';
const { user, loading, login, logout } = useAuth();
// user.role: 'admin' | 'reception' | 'security' | 'partner' | 'viewer'
```

Use `loading` to gate renders that depend on user identity. Never read `localStorage` directly in pages.

## Routing

Routes live in `frontend/src/router/AppRouter.jsx`. Layouts use nested routes with `<Outlet />`. The `RequireAuth` component there handles role gating.

To add a new page:
1. Create the component in the appropriate `pages/<role>/` folder
2. Import it in `AppRouter.jsx`
3. Add `<Route>` under the correct layout route

Role → root path: `admin→/admin`, `reception→/reception`, `security→/security`, `partner→/partner`, `viewer→/monitor/:examId`

## Styling

No CSS files. All styling via inline style objects. Follow the established pattern:

```jsx
// Style constants at the BOTTOM of the file (not inside components)
const th = { padding: '0.65rem 1rem', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' };
const td = { padding: '0.65rem 1rem', fontSize: '0.875rem', color: '#1e293b' };
const inputStyle = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.3rem', color: '#374151' };

// Color palette (stay consistent)
// Primary blue: #2563eb    Error red: #dc2626    Success green: #16a34a
// Muted text: #94a3b8      Border: #e2e8f0       Card bg: #fff
// Table stripe: #fafafa    Header bg: #f8fafc
```

Spread to override: `style={{ ...inputStyle, width: 120 }}`

## Common Page Pattern

```jsx
import React, { useEffect, useState } from 'react';
import { listThings } from '../../api/things.api';

export default function ThingsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    listThings().then(res => setItems(res.data.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  if (loading) return <p style={{ color: '#94a3b8' }}>Loading...</p>;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Things</h2>
      {/* content */}
    </div>
  );
}
```

## Modal Pattern

Modals are inline in the same file as the page that uses them — do not create separate modal files.

```jsx
// In the page:
const [editingItem, setEditingItem] = useState(null);
// ...
{editingItem && <EditModal item={editingItem} onClose={() => setEditingItem(null)} onSaved={() => { setEditingItem(null); load(); }} />}

// Modal component in the same file:
function EditModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState({ name: item.name });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateThing(item.id, form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* header, error, form */}
      </div>
    </div>
  );
}
```

## Form Controlled Input Pattern

```jsx
const handleChange = e => {
  const { name, value, type } = e.target;
  setForm(f => ({ ...f, [name]: type === 'number' ? Number(value) : value }));
};
```

## Shared Pages (Role-Aware)

Some pages in `pages/shared/` are mounted under multiple role layouts. Detect the calling context via `useAuth().user.role` or `useMatch` when behavior must differ. Examples:
- `ExamStudentsPage` — at `/admin/exams/:id/students` and `/reception/exams/:id/students`
- `PartnersPage` — bonus column shown only to admin
- `PartnerExamStudentsPage` — payment actions only for reception

## WebSocket (Monitor)

`SocketContext.jsx` manages a WebSocket connected to `ws://localhost:4000/ws?token=<accessToken>`. Subscribe to an exam room:

```js
import { useSocket } from '../../contexts/SocketContext';
const { socket } = useSocket();
socket?.send(JSON.stringify({ type: 'subscribe', exam_id: id }));
socket?.onmessage = e => { const msg = JSON.parse(e.data); /* handle entry event */ };
```

## Adding a New API File

When a resource doesn't have an `*.api.js` yet:

```js
// frontend/src/api/things.api.js
import apiClient from './apiClient';

export const listThings = () => apiClient.get('/things');
export const getThing = (id) => apiClient.get(`/things/${id}`);
export const createThing = (data) => apiClient.post('/things', data);
export const updateThing = (id, data) => apiClient.patch(`/things/${id}`, data);
export const deleteThing = (id) => apiClient.delete(`/things/${id}`);
```
