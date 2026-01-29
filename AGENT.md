# EasyMan Agent Context

## Project Overview
**EasyMan** is an efficient task management dashboard for teams, featuring AI-powered task assignment and comprehensive reporting.

### Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** SQLite (Local)
- **ORM:** Prisma v5.10.2
- **UI Components:** Lucide React (Icons)
- **AI Integration:** OpenAI SDK

## Current Status (2026-01-27)
- ✅ **Project Setup:** Next.js + Tailwind v4 + TypeScript environment initialized.
- ✅ **Database:** SQLite DB (`dev.db`) created and migrated.
  - **Seed Data:** Initial users (Admin, Kim, Lee, Park) and global settings populated.
- ✅ **AI Functionality:**
  - **Mention System:** Dashboard input supports `@` mention with Korean/English search & autocomplete.
  - **AI Assignment API (`/api/ai/assign`):** Backend logic to parse natural language, match users, and create Tasks in DB.
- ✅ **UI Implementation:**
  - **Dashboard:** AI Task Assignment UI integrated with the assignment API.
  - **User Management:** User list table with search and "Add User" UI.
  - **Reports:** Optimized layout with statistical cards, task table, and team overview.
  - **Settings:** LLM Provider (OpenAI, Claude, Grok, Ollama) and Notification configurations.
  - **Sidebar:** Navigation and consistent layout across all pages.

## Database Schema
Refer to `prisma/schema.prisma` for full details.
- **User:** `id`, `name`, `email`, `role`, `avatar`
- **Task:** `id`, `title`, `status`, `progress`, `dueDate`, `assigneeId`
- **Settings:** `id`, `llmProvider`, `apiKey`, `notificationConfig`

## How to Run
1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Database Setup:**
   ```bash
   npx prisma generate
   npx prisma db seed # To populate initial users
   ```
3. **Run Development Server:**
   ```bash
   npm run dev
   ```
   Access at [http://localhost:3000](http://localhost:3000)

## TODO List (Future Work)

### 1. Backend API Implementation
- [x] **User API:**
  - `GET /api/users`: Fetch all team members from DB.
  - `POST /api/users`: Register a new user.
- [x] **Settings API:**
  - `GET /api/settings`: Fetch current LLM & Notification configs.
  - `POST /api/settings`: Save user configuration to DB.
- [x] **Task API:**
  - `GET /api/tasks`: Fetch all tasks (with filtering/sorting).
  - `PATCH /api/tasks/[id]`: Update task status or progress.

- [x] **Expanded AI Support:** Add actual implementation for Ollama, Claude, and Grok in the assign API.

### 2. Frontend Integration
- [x] **Connect Dashboard Task List:** Replace the placeholder with a real task list from the DB.
- [x] **Connect Users Page:** Fetch and display real users from the DB.
- [x] **Connect Settings Page:** Implement Fetch/Save functionality for LLM and Notifications.
- [x] **Connect Reports:** Generate dynamic statistics and charts based on real DB data.



### 3. Polish & Deployment
- [x] Implement error handling UI (Toasts/Modals) instead of browser `alert`.
- [x] Add Form validation for Settings and User creation.
- [x] Implement "Add User" feature on the User Management page.
- [ ] Production build verification and deployment (Vercel/Docker).

---

## 🚀 Final Project Status
- **Design:** Completed in `admin_dashboard.pen` (Dashboard, Users, Settings, Reports, Modals).
- **Backend:** SQLite + Prisma APIs fully implemented.
- **Frontend:** Next.js App Router integrated with real data and AI capabilities.
- **AI:** Supports OpenAI, Claude, Grok, and local Ollama for smart task assignment.
- **UI:** Premium look with Tailwind CSS v4, smooth animations, and Toast feedback.

## Notes for Agents
- **AI Context:** Always pass the current date and user list to the LLM for accurate parsing.
- **Design System:** Colors are defined in `globals.css` using HSL variables. Custom colors are registered in `tailwind.config.ts`.
- **Mock vs Real:** The AI API has a fallback/mock mode if no OpenAI API Key is provided in the `Settings` table.