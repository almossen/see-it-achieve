

# 🏠 طلباتي (Talabati) — Family Grocery Ordering App

A multi-tenant SaaS web app enabling families to order groceries with voice support, designed especially for elderly users. Features role-based dashboards (Admin, Elder, Member, Driver) with real-time updates and WhatsApp integration.

---

## Phase 1: Foundation & Authentication
Set up the core app structure, design system, and authentication flow.

- **Arabic RTL setup** with Tajawal font, green primary color scheme, and dark mode support
- **Landing page** — marketing page with hero section, feature cards (voice ordering, image-based shopping, driver delivery), how-it-works steps, and CTA
- **Login page** — centered card with email/password, Arabic labels, large touch targets
- **Registration flow** — 2-step form: family info (name, phone, email, password) → theme customization (color picker)
- **Auth system** — Supabase authentication with role-based routing, protected routes, and session management
- **Database schema** — tenants, users, categories, products, drivers, orders, order_items, notifications tables with Row Level Security

---

## Phase 2: Admin Dashboard
Complete admin panel for managing the family's grocery system.

- **Admin layout** — desktop sidebar + mobile bottom nav with role-appropriate navigation
- **Overview dashboard** — stat cards (total orders, today's orders, members, active drivers) + recent orders table + quick actions
- **Members management** — CRUD table with role assignment (elder/member/driver), avatars, phone numbers
- **Drivers management** — card grid with status toggles, WhatsApp numbers, active order counts
- **Categories management** — reorderable list with emoji icons, bilingual names, active toggles, pre-loaded defaults
- **Products management** — filterable grid by category, search, image/emoji display, pricing, unit selection
- **Orders management** — filtered list with status badges, order detail modal with timeline, driver assignment, WhatsApp send
- **Settings** — tabbed layout for family info, theme, order preferences (WhatsApp config), and account management
- **Notifications** — bell icon with real-time Supabase notifications, unread count badge

---

## Phase 3: Elder Dashboard (Accessibility-First)
The most critical interface — designed for elderly users with extra-large UI and voice support.

- **Simplified layout** — no sidebar, bottom nav only (4 items), 72px nav height, minimum 52px touch targets
- **Voice ordering** — large pulsing microphone button, Arabic speech recognition, voice results overlay with matching products
- **Categories grid** — large emoji-based cards (40px icons), simple navigation to product lists
- **Product browsing** — 2-column grid with large cards, simple add/quantity controls, heart icon for favorites
- **Favorites** — horizontal scroll row on home + dedicated favorites page
- **Shopping cart** — floating cart button, bottom sheet with items list, notes, driver selection, order total
- **Order placement** — creates order in Supabase, assigns driver, generates WhatsApp message, shows success confirmation with animation
- **Order history** — simple card list with status badges and order details

---

## Phase 4: Driver Dashboard
Mobile-optimized interface for delivery drivers.

- **Driver layout** — mobile-first with availability toggle ("متاح/غير متاح"), bottom nav (3 items)
- **Active orders** — real-time order list via Supabase Realtime, sound notification for new orders
- **Order processing** — product checklist with 3 actions per item: Found ✅, Not Found ❌, Substitute 📷
- **Substitute flow** — camera/upload modal, send photo for family approval, real-time approval/rejection via Supabase Realtime
- **Order completion** — summary of found/not found/substituted items, final total, delivery confirmation
- **Completed orders** — history list with details
- **Messages** — chat interface with customers, text + image support, real-time via Supabase

---

## Phase 5: Advanced Features & Polish
Member dashboard and cross-cutting enhancements.

- **Member dashboard** — similar to elder but standard-sized UI, plus recipe management (add recipes with ingredients, auto-add to cart)
- **PDF export** — order export with Arabic/English/bilingual options, text or visual card format, optional prices and family logo
- **WhatsApp integration** — formatted order messages sent to drivers via WhatsApp deep links
- **Voice text-to-speech** — elder dashboard speaks back search results and confirmations in Arabic
- **Onboarding tour** — step-by-step tooltip guide for new admin users
- **Final polish** — skeleton loading screens, smooth page transitions, Arabic number/date formatting, haptic feedback, pull-to-refresh, auto-save cart drafts, session timeout handling

