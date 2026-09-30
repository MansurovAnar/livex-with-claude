---
name: responsive-web-ui
description: Make a page, component, or layout mobile responsive (≥320px, no horizontal scroll) in the Exam Entrance Control System without changing desktop (>768px) appearance or behavior. Use when adding or fixing mobile support, or when creating any new page/component.
---

# Responsive Web UI Skill — responsive-web-ui

You make pages of the **Exam Entrance Control System** (React 18 + Vite, inline styles only) usable on phones **while desktop stays pixel-identical**. This skill implements the "Mobile Responsiveness Rules" in `.claude/CLAUDE.md` — if the two ever conflict, CLAUDE.md wins.

## Golden Rules

1. **Additive only.** Never edit or wrap existing desktop inline styles to satisfy mobile. Add a `className` and a mobile override in `responsive.css`, or a JS-conditional style via `useIsMobile()`.
2. **One breakpoint: `768px`** (`max-width: 768px` = mobile). No other breakpoints.
3. **Nothing wider than the viewport** at 320px. `document.documentElement.scrollWidth <= window.innerWidth`.
4. **No CSS modules / Tailwind / per-component CSS files.** Only the single global `frontend/src/styles/responsive.css` plus inline styles.
5. Keep `<meta name="viewport" content="width=device-width, initial-scale=1.0" />` in `frontend/index.html`; never add `user-scalable=no`.

## Step 0 — Ensure the infrastructure exists

Check for these two files; create them if missing (they are shared — never duplicate per component).

### `frontend/src/hooks/useIsMobile.js`
```js
import { useEffect, useState } from 'react';

const QUERY = '(max-width: 768px)';

export default function useIsMobile() {
  const get = () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches;
  const [isMobile, setIsMobile] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = e => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}
```

### `frontend/src/styles/responsive.css` (imported once in `frontend/src/main.jsx`: `import './styles/responsive.css';`)
Global safety rules are unconditional and harmless on desktop; everything else is inside the media query.
```css
*, *::before, *::after { box-sizing: border-box; }
html, body { max-width: 100%; overflow-x: hidden; }
img, video, canvas { max-width: 100%; height: auto; }
.table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; max-width: 100%; }
.wrap-text { overflow-wrap: anywhere; word-break: break-word; }

@media (max-width: 768px) {
  /* Layout (sidebar → top bar + drawer; see "Layouts") */
  .app-shell    { flex-direction: column !important; }
  .app-sidebar  { position: fixed !important; top: 0; left: 0; bottom: 0; width: min(280px, 85vw) !important;
                  transform: translateX(-100%); transition: transform .2s ease; z-index: 1100; overflow-y: auto; }
  .app-sidebar.open { transform: translateX(0); }
  .app-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 1050; }
  .app-topbar   { display: flex !important; }
  .app-main     { width: 100% !important; margin-left: 0 !important; padding: 12px !important; min-width: 0; }

  /* Grids / rows / toolbars */
  .form-grid, .stat-grid, .card-grid { grid-template-columns: 1fr !important; }
  .stack-mobile { flex-direction: column !important; align-items: stretch !important; }
  .wrap-mobile  { flex-wrap: wrap !important; }
  .toolbar      { flex-direction: column !important; align-items: stretch !important; gap: 8px !important; }
  .toolbar > *  { width: 100% !important; max-width: 100% !important; }

  /* Tables */
  .hide-mobile  { display: none !important; }

  /* Modals */
  .modal-card   { width: min(var(--modal-w, 520px), calc(100vw - 24px)) !important; max-width: calc(100vw - 24px) !important;
                  max-height: 90vh !important; overflow-y: auto !important; padding: 1rem !important; }

  /* Forms: ≥16px font stops iOS zoom-on-focus; ≥44px touch targets */
  .app-main input, .app-main select, .app-main textarea,
  .modal-card input, .modal-card select, .modal-card textarea { width: 100% !important; font-size: 16px !important; min-height: 44px; }
  .app-main button, .modal-card button, .btn-block { min-height: 44px; }
  .btn-block    { width: 100% !important; }
  .full-mobile  { width: 100% !important; max-width: 100% !important; min-width: 0 !important; }
}
```
Add new shared classes here, only inside the media query, only when an existing class can't do the job.

## Step 1 — Audit the target file

Read the page/component and list every offender:

| Look for | Fix |
|---|---|
| `<table>` | wrap in `<div className="table-scroll">`; mark low-value `<th>/<td>` pairs `className="hide-mobile"` |
| `display: 'grid'` + `gridTemplateColumns: 'repeat(n…)'` or multiple fixed columns | add `className="form-grid"` (or `stat-grid`/`card-grid`) |
| `display: 'flex'` row of sibling blocks / toolbar (search + filters + buttons) | `className="toolbar"` (stack) or `wrap-mobile` (wrap) |
| fixed pixel `width`/`minWidth` on container, card, input, select | add `className="full-mobile"` |
| modal (`position: 'fixed'` overlay) | add `modal-card` to the inner card and `--modal-w` for its desktop width (see Modals) |
| emails, school names, URLs, IDs, long names | add `className="wrap-text"` |
| input/select/button in forms | covered by global mobile rules; verify height ≥ 44px |
| `position: 'absolute'/'fixed'` with px offsets, `whiteSpace: 'nowrap'` on long text | override via class or `useIsMobile()` |

## Step 2 — Apply fixes

### Preferred: className + CSS
Keep the existing inline style untouched and add a class:
```jsx
<div className="toolbar" style={{ display: 'flex', gap: 12 }}>…</div>
<div className="table-scroll"><table style={{ width: '100%', borderCollapse: 'collapse' }}>…</table></div>
<div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>…</div>
```
`!important` in the media query is what overrides the inline style; don't put `!important` anywhere else.

### Only when JS must decide: `useIsMobile()`
```jsx
import useIsMobile from '../../hooks/useIsMobile';
const isMobile = useIsMobile();
<div style={{ ...card, ...(isMobile && { padding: 12 }) }}>
```
Spread the mobile override **after** the desktop style, gated by `isMobile`, so desktop output is byte-identical. Use for structural changes (render hamburger vs. sidebar), not for things CSS can do.

### Layouts (`components/layout/*Layout.jsx`)
For each of Admin/Reception/Security/Partner layouts:
- Root flex container → `className="app-shell"`; sidebar → `className={`app-sidebar${open ? ' open' : ''}`}`; content wrapper → `className="app-main"`.
- Add `const [open, setOpen] = useState(false)` and `const isMobile = useIsMobile()`.
- When `isMobile`, render a top bar (`className="app-topbar"`, hidden on desktop via `style={{ display: 'none' }}`) with a hamburger `<button aria-label="Open menu" onClick={() => setOpen(true)}>☰</button>` and the app/section title.
- When `open && isMobile`, render `<div className="app-backdrop" onClick={() => setOpen(false)} />`.
- Close the drawer on navigation: `useEffect(() => setOpen(false), [location.pathname])`, and when a nav link is clicked.
- Main padding 12–16px on mobile (via `.app-main`); desktop keeps the fixed sidebar untouched.

### Modals
Inline modals follow the frontend-dev pattern. Add the class and expose the desktop width through a CSS variable so desktop stays as-is:
```jsx
<div className="modal-card" style={{ '--modal-w': '520px', background: '#fff', borderRadius: 12, padding: '2rem', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
```

### Security scan / entry page, Live Monitor, `StudentTicket.jsx`
Highest priority on phones: single column, large tap targets (buttons ≥ 48px tall, big status text), no horizontal scroll, ticket content wraps (`wrap-text`), QR/camera/video elements `max-width: 100%`.

## Step 3 — New pages/components

A new page or component **ships with its mobile behavior in the same change**: classNames on tables/grids/toolbars/modals from the start, no fixed pixel widths, every new table wrapped in `table-scroll`, any new shared rule added to `responsive.css`.

## Step 4 — Verify (required before finishing)

1. `cd frontend && npm run build` passes.
2. Run the app (`npm run dev`, http://localhost:5173) and, using the `claude-in-chrome`/built-in browser or DevTools device mode, load the page at **320, 375, 414px** and check:
   - `document.documentElement.scrollWidth <= window.innerWidth`
   - tables scroll inside their container, modals fit and scroll, drawer opens/closes, inputs don't trigger zoom, buttons are reachable.
3. Re-check at **≥1024px**: the page must look and behave exactly as before (no changed spacing, sidebar still fixed, no hidden columns, no stacked toolbars).
4. Test the page for each role that can reach it (shared pages are used by several roles).

If the app can't be launched, say so explicitly and list what remains unverified — don't claim it's verified.

## Anti-patterns (don't)

- Editing desktop style values, or wrapping elements in new containers that alter desktop layout.
- Adding extra breakpoints, `@media` in JS strings, or per-component CSS files.
- Hiding entire critical columns/actions on mobile (hide only low-value ones; keep action buttons reachable).
- `overflow-x: hidden` as a fix for a specific overflowing element — find and fix the cause instead.
- Fixed `width: 400px` on anything that can render at 320px; use `width: 100%` + `max-width`, `min-width: 0` on flex children.
- Tiny tap targets (< 44px) or input font-size < 16px.
