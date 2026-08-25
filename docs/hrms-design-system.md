# HRMS Design System

A consistent, accessible and modern design system for the HRMS application. This reference is based on the supplied design-system mockup and the current implementation in `app/globals.css`.

## Principles

- Keep screens quiet, structured and task-focused.
- Prefer compact, scannable layouts over marketing-style composition.
- Use clear hierarchy, restrained color and predictable interaction states.
- Use `lucide-react` outline icons for all interface iconography.
- Keep cards, controls and panels at `6px` to `8px` radius.
- Do not make an entire route client-only for a small interaction. Use small client islands for modals, menus, accordions and interactive widgets.

## Foundations

### Color Tokens

| Token | Value | Usage |
| --- | --- | --- |
| `--color-primary` | `#2563eb` | Primary actions, active nav, key icons |
| `--color-primary-hover` | `#1d4ed8` | Primary button hover |
| `--color-primary-light` | `#dbeafe` | Soft blue surfaces |
| `--color-primary-10` | `#eff6ff` | Icon tiles, info surfaces |
| `--color-success` | `#16a34a` | Success states, verified status |
| `--color-warning` | `#f59e0b` | Warning states, pending status |
| `--color-error` | `#dc2626` | Error states, destructive feedback |
| `--color-info` | `#0ea5e9` | Informational states |
| `--color-neutral-900` | `#111827` | Primary text |
| `--color-neutral-700` | `#374151` | Secondary text |
| `--color-neutral-500` | `#6b7280` | Muted labels |
| `--color-neutral-300` | `#d1d5db` | Input borders |
| `--color-neutral-100` | `#f3f4f6` | Subtle backgrounds |
| `--color-white` | `#ffffff` | Cards and controls |
| `--color-page` | `#f7f9fc` | Page background |
| `--color-border` | `#e5e7eb` | Card, table and section borders |
| `--color-focus` | `rgba(37, 99, 235, 0.22)` | Focus rings |

### Typography

Use Inter first, then system UI fallbacks.

| Token | Size | Weight | Usage |
| --- | ---: | --- | --- |
| `--font-display` | `32px` | Bold | Large display samples and major visual emphasis |
| `--font-h1` | `24px` | Bold | Page titles |
| `--font-h2` | `20px` | Semi bold | Section headings |
| `--font-h3` | `18px` | Semi bold | Card group headings |
| `--font-h4` | `16px` | Medium | Compact headings |
| `--font-body-lg` | `14px` | Regular | Slightly emphasized body text |
| `--font-body` | `13px` | Regular | Default application text |
| `--font-small` | `12px` | Regular | Labels, badges, metadata |

Line height uses `--line-tight: 1.2` for headings and `--line-body: 1.5` for body text. Letter spacing stays `0`.

### Spacing

The system follows an 8px base with smaller utility steps where needed.

| Token | Value | Usage |
| --- | ---: | --- |
| `--space-1` | `4px` | Tiny gaps, label spacing |
| `--space-2` | `8px` | Base gap |
| `--space-3` | `12px` | Compact control padding |
| `--space-4` | `16px` | Standard card and grid gap |
| `--space-6` | `24px` | Page section gap |
| `--space-8` | `32px` | Large layout gap |
| `--space-10` | `40px` | Major spacing step |
| `--space-12` | `48px` | Large vertical separation |
| `--space-16` | `64px` | Maximum common spacing |

### Radius, Borders and Elevation

| Token | Value | Usage |
| --- | --- | --- |
| `--radius-sm` | `6px` | Buttons, inputs, icon buttons, small cards |
| `--radius-md` | `8px` | Primary cards and panels |
| `--radius-pill` | `999px` | Badges and pills |
| `--shadow-xs` | `0 1px 2px rgba(16, 24, 40, 0.05)` | Sidebars and subtle fixed UI |
| `--shadow-sm` | `0 2px 4px rgba(16, 24, 40, 0.08)` | Default cards |
| `--shadow-md` | `0 4px 8px rgba(16, 24, 40, 0.08)` | Hovered cards |
| `--shadow-lg` | `0 8px 16px rgba(16, 24, 40, 0.1)` | Elevated panels |
| `--shadow-xl` | `0 20px 40px rgba(16, 24, 40, 0.12)` | Modal-level elevation |

Use `1px solid var(--color-border)` for standard dividers and card outlines. Use `var(--color-neutral-300)` for form field borders.

## Components

### Buttons

Buttons are compact, 36px minimum height, `6px` radius, `13px` text, semibold weight and optional left icon.

- Primary: blue background, white text, used for the main page action.
- Secondary: white background, blue border and blue text.
- Tertiary: transparent background and blue text.
- Disabled: pale neutral background, muted text, no shadow.
- Hover states should strengthen only the active surface, not resize or shift layout.

Use icon-only buttons for obvious utility actions such as close, expand, edit, delete, search and filter. Always provide `aria-label`.

### Badges

Badges use pill radius, 24px minimum height, compact horizontal padding and `12px` bold text.

- Success: active, verified, complete.
- Warning: pending, on leave, attention needed.
- Error: resigned, rejected, failed.
- Info: informational or signed states.
- Neutral: inactive, draft, masked or restricted.

### Tags

Tags identify employee attributes like employment type, role type, location or department. Use outline icons from `lucide-react` when the tag benefits from a quick visual cue.

Examples: Permanent, Full Time, Remote, Mumbai, Engineering.

### Alerts

Alerts are 40px minimum height, `6px` radius and use a status icon plus concise message.

- Success: saved successfully.
- Warning: verify information.
- Error: something went wrong.
- Info: informational notice.

Alerts should be dismissible when they are non-blocking. Keep messages action-oriented and short.

### Avatars

Use circular avatars for people and initials. Sizes in the mockup cluster around small profile chips and larger profile cards.

- Photo avatar: circular image with `object-fit: cover`.
- Initial avatar: soft primary background with uppercase initials.
- Placeholder avatar: neutral icon on pale neutral background.

### Progress

Use a blue linear progress indicator for completion percentage and step indicators for workflow status.

- Active step uses primary fill.
- Inactive steps use outlined circles.
- Labels stay below each step and use small text.

### Forms

Inputs, selects and textareas use white backgrounds, neutral borders, `6px` radius and 36px minimum height for single-line controls.

- Labels are `13px`, bold and neutral 900.
- Placeholder text should be muted.
- Focus uses primary border plus `--color-focus` ring.
- Textareas have at least 76px height and vertical resize.
- Checkboxes, radios and toggles use primary blue for selected state.

### Navigation

Navigation should be predictable and compact.

- Sidebar: white surface, border-right, active item with soft primary background and primary text.
- Tabs: horizontal links, active tab with primary underline.
- Breadcrumbs: small muted text with chevron separators.
- Pagination: compact square controls, active page in primary blue.

Avoid decorative navigation. Navigation should help users move through employee data quickly.

### Data Display

#### Tables

Tables use bordered containers, subtle header background and compact rows.

- Header text is small, bold and neutral.
- Status cells use badges.
- Actions use icon buttons or compact text buttons.
- Keep row height stable and avoid wrapping action controls.

#### Cards

Cards use `--radius-md`, white background, `--color-border` outline and `--shadow-sm`.

- Use cards for discrete records, repeated items, modals and framed tools.
- Do not nest cards inside cards.
- Do not use cards as decorative page section wrappers when a plain layout band is enough.

#### List Items

List items use a small avatar or icon, primary text, secondary metadata and a chevron/action affordance on the right.

## HRMS Profile Patterns

### Profile Hero

The profile hero presents employee identity, status, employee code and primary actions.

- Avatar on the left, identity text in the middle, actions on the right.
- Status badge and employee code sit above the name.
- Keep the hero compact and sticky only when there is enough viewport space.

### Profile Section Cards

Section cards are the main employee profile content pattern.

- Header contains icon tile, section title and arrow action.
- Card body uses definition grids, address blocks, timelines, document grids, education lists or salary summaries.
- Clicking the arrow opens read-only details for that specific section.
- Keep the edit flow separate through the main Edit Profile action.

### Definition Grid

Use definition grids for label/value data.

- Labels use muted small text.
- Values use neutral 900 and bold weight.
- Use `overflow-wrap: anywhere` for identifiers, emails and long values.

### Section Detail Modal

Use a modal for section-specific read-only details.

- The route page should remain server-rendered.
- The modal should live in a small client component or client island.
- Modal closes on close button, backdrop click and Escape.
- Focus moves into the modal on open and returns to the triggering arrow on close.
- Body scroll locks while the modal is open.
- Sensitive values remain masked by default.

## Iconography

Use `lucide-react` outline icons. Keep stroke icons visually consistent.

Recommended patterns:

- User and team: `UserRound`, `UsersRound`.
- Work and organization: `BriefcaseBusiness`, `Building2`.
- Location and time: `MapPin`, `CalendarDays`, `Clock`.
- Documents and records: `FileCheck2`, `IdCard`, `ClipboardCheck`.
- Money and payroll: `CircleDollarSign`, `Landmark`.
- Actions: `ChevronRight`, `X`, `Edit3`, `Search`, `Filter`, `Settings`.

Icon buttons should be square, usually 34px, with `6px` radius and a clear accessible label.

## Implementation Guardrails

- Keep global tokens in `app/globals.css`.
- Prefer existing utility classes before adding new component styles.
- Add new abstractions only when they remove meaningful duplication or isolate interactivity.
- Keep route pages server-rendered unless the whole page genuinely requires client state.
- For small interactions, create focused client components and pass serializable data from the server page.
- Run `npm run build` after UI or component changes.
- For visual changes, verify desktop and mobile layouts before handing off.
