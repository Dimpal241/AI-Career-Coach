# Sensai — AI Career Coach

> An AI-powered, full-stack career coaching SaaS that helps professionals with resume building, mock interview prep, cover letter generation, and personalized industry insights.

🔗 **Repository:** [https://github.com/Dimpal241/AI-Career-Coach](https://github.com/Dimpal241/AI-Career-Coach)

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [AI Integration](#ai-integration)
- [Background Jobs](#background-jobs)
- [Authentication & Authorization](#authentication--authorization)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Key Design Decisions](#key-design-decisions)

---

## Project Overview

Sensai is a Next.js 15 full-stack application that acts as a personal career coach powered by Google Gemini AI. After onboarding (selecting their industry, skills, experience, and bio), users get access to four AI-driven tools:

1. **Resume Builder** — Markdown editor with AI-powered section improvement and PDF export
2. **Interview Prep** — AI-generated, industry-specific multiple-choice quiz with performance tracking
3. **Cover Letter Generator** — AI-written cover letters tailored to specific job descriptions
4. **Industry Dashboard** — Real-time salary ranges, growth rates, key trends, and demand levels for the user's industry

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | JavaScript (ES Modules) |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix UI) |
| Auth | Clerk (`@clerk/nextjs`) |
| Database | PostgreSQL via Prisma ORM v6 |
| AI | Google Gemini 1.5 Flash (`@google/generative-ai`) |
| Background Jobs | Inngest v3 |
| Charts | Recharts |
| Forms | React Hook Form + Zod validation |
| Rich Text | `@uiw/react-md-editor` |
| PDF Export | `html2pdf.js` |
| Toasts | Sonner |
| Icons | Lucide React |

---

## Features

### 1. Resume Builder (`/resume`)

- Markdown-based resume editor with live preview split-view
- Form fields for work experience, education, skills, and projects (`entry-form.jsx`)
- **AI improve button** on each section — calls `improveWithAI()` which sends the current content to Gemini with a prompt asking for action verbs, quantifiable metrics, and industry-specific keywords
- Auto-save (`saveResume`) with `upsert` — one resume per user
- PDF export via `html2pdf.js` directly in the browser

### 2. Interview Prep (`/interview`)

- Calls `generateQuiz()` which prompts Gemini to produce 10 multiple-choice questions tailored to the user's industry and skills (pure JSON response)
- Interactive quiz UI with radio buttons, question counter, and progress bar
- On submit, calls `saveQuizResult()` which:
  - Scores each answer
  - Sends wrong answers back to Gemini for a concise improvement tip
  - Persists the `Assessment` record to the database
- **Performance chart** (`performance-chart.jsx`) — a Recharts `LineChart` visualizing quiz scores over time
- **Stats cards** show total quizzes, average score, latest score, and improvement trend

### 3. Cover Letter Generator (`/ai-cover-letter`)

- User inputs company name, job title, and job description
- `generateCoverLetter()` builds a prompt including the user's industry, years of experience, skills, and bio; Gemini returns a professional Markdown-formatted letter
- Letters are saved to the database and listed with creation dates
- Each letter can be previewed in a dialog and deleted

### 4. Industry Insights Dashboard (`/dashboard`)

- On first visit, `getIndustryInsights()` checks if an `IndustryInsight` record exists for the user's industry; if not, it generates one live via Gemini
- Displays: salary ranges (Bar Chart), growth rate, demand level, market outlook, top in-demand skills, key trends, and recommended skills to learn
- Data is refreshed automatically every Sunday midnight by an Inngest background job

---

## Architecture

```
Browser
  └── Next.js 15 App Router
        ├── (auth) route group  ← Clerk SignIn / SignUp pages
        └── (main) route group  ← Protected pages
              ├── /onboarding      ← First-time user setup
              ├── /dashboard       ← Industry insights
              ├── /resume          ← Resume builder
              ├── /interview       ← Mock interview quiz
              └── /ai-cover-letter ← Cover letter tool

Server Actions ("use server")
  ├── actions/user.js          ← updateUser, getUserOnboardingStatus
  ├── actions/resume.js        ← saveResume, getResume, improveWithAI
  ├── actions/interview.js     ← generateQuiz, saveQuizResult, getAssessments
  ├── actions/cover-letter.js  ← generateCoverLetter, getCoverLetters, deleteCoverLetter
  └── actions/dashboard.js     ← getIndustryInsights, generateAIInsights

Data Layer
  ├── Prisma ORM → PostgreSQL
  └── lib/prisma.js            ← Singleton PrismaClient

Background Jobs
  ├── lib/inngest/client.js    ← Inngest client
  ├── lib/inngest/functions.js ← generateIndustryInsights (weekly cron)
  └── app/api/inngest/route.js ← Inngest webhook handler

Utilities
  ├── lib/checkUser.js         ← Sync Clerk user → DB on every request
  ├── hooks/use-fetch.js       ← Wraps Server Actions with loading/error/toast state
  └── app/lib/schema.js        ← Zod validation schemas
```

---

## Database Schema

### User
Central model. One `clerkUserId` per user. Stores `industry` (e.g. `"tech-software-development"`), `skills[]`, `bio`, and `experience` (years). All other models relate back to `User.id`.

### Resume
One-to-one with User. Stores `content` as Markdown text. `atsScore` and `feedback` fields are reserved for future ATS analysis.

### Assessment
Many-to-one with User. Each quiz attempt creates one record. `questions` is a `Json[]` array of `{question, answer, userAnswer, isCorrect, explanation}` objects. `improvementTip` holds the AI-generated feedback string.

### CoverLetter
Many-to-one with User. Stores `content` (Markdown), `jobDescription`, `companyName`, `jobTitle`, and `status` (`draft` | `completed`).

### IndustryInsight
Shared across users in the same industry (linked by the `industry` string). Contains `salaryRanges[]` (JSON), `growthRate`, `demandLevel`, `topSkills[]`, `marketOutlook`, `keyTrends[]`, `recommendedSkills[]`, and scheduling fields (`lastUpdated`, `nextUpdate`).

---

## AI Integration

All AI calls use **Google Gemini 1.5 Flash** via `@google/generative-ai`. Every prompt demands a pure JSON response with no markdown fences, no additional text — a common gotcha in production AI apps. The app strips any remaining backticks with:

```js
const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
const parsed = JSON.parse(cleanedText);
```

### Prompts at a glance

| Feature | What the prompt asks for | Response format |
|---|---|---|
| Quiz generation | 10 MCQs for user's industry + skills | `{ questions: [{question, options[], correctAnswer, explanation}] }` |
| Improvement tip | Concise tip based on wrong answers | Plain text, ≤2 sentences |
| Resume improvement | Rewrite a section with action verbs + metrics | Single paragraph |
| Cover letter | Full letter in Markdown | Markdown string |
| Industry insights | Full industry analysis | Structured JSON with 7 fields |

---

## Background Jobs

Inngest powers the weekly industry data refresh. The function is defined in `lib/inngest/functions.js`:

```js
export const generateIndustryInsights = inngest.createFunction(
  { name: "Generate Industry Insights" },
  { cron: "0 0 * * 0" },   // Every Sunday at midnight
  async ({ event, step }) => {
    const industries = await step.run("Fetch industries", async () => {
      return await db.industryInsight.findMany({ select: { industry: true } });
    });

    for (const { industry } of industries) {
      // Gemini call wrapped in step.ai.wrap for observability
      const res = await step.ai.wrap("gemini", async (p) => {
        return await model.generateContent(p);
      }, prompt);

      await step.run(`Update ${industry} insights`, async () => {
        await db.industryInsight.update({ where: { industry }, data: { ...insights, nextUpdate: ... } });
      });
    }
  }
);
```

The Inngest webhook is exposed at `/api/inngest`. `step.run` makes each step independently retriable — if one industry update fails, the others still complete.

---

## Authentication & Authorization

Clerk handles authentication. The `middleware.js` uses `clerkMiddleware` to protect all non-public routes:

```js
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)", "/resume(.*)", "/interview(.*)",
  "/ai-cover-letter(.*)", "/onboarding(.*)",
]);
```

Inside every Server Action, `auth()` from `@clerk/nextjs/server` verifies the session and retrieves `userId`. This `clerkUserId` is then used to look up the internal `User` record in Postgres.

`lib/checkUser.js` runs on the main layout — it checks if a Clerk-authenticated user exists in the database and creates them if not (first login flow).

The onboarding page (`/onboarding`) checks `getUserOnboardingStatus()` — if the user's `industry` field is null, they're redirected to complete onboarding before accessing any features.

---

## Project Structure

```
AI-Career-Coach/
├── app/
│   ├── (auth)/                  # Clerk sign-in / sign-up pages
│   ├── (main)/
│   │   ├── dashboard/           # Industry insights page
│   │   ├── resume/              # Resume builder
│   │   ├── interview/           # Mock interview + quiz
│   │   ├── ai-cover-letter/     # Cover letter tool
│   │   └── onboarding/          # First-time setup
│   ├── api/inngest/             # Inngest webhook route
│   ├── lib/
│   │   ├── schema.js            # Zod schemas
│   │   └── helper.js            # Utility functions
│   ├── globals.css
│   └── layout.js                # Root layout (Clerk + Theme providers)
├── actions/                     # Next.js Server Actions
│   ├── user.js
│   ├── resume.js
│   ├── interview.js
│   ├── cover-letter.js
│   └── dashboard.js
├── components/
│   ├── header.jsx               # Nav with Clerk UserButton
│   ├── hero.jsx                 # Landing page hero
│   └── ui/                     # shadcn/ui components
├── data/
│   ├── industries.js            # Industry + sub-industry list
│   ├── features.js              # Landing page features
│   ├── faqs.js                  # FAQ data
│   └── testimonial.js
├── hooks/
│   └── use-fetch.js             # Custom hook for Server Actions
├── lib/
│   ├── checkUser.js             # Clerk → DB user sync
│   ├── prisma.js                # Prisma singleton
│   ├── inngest/
│   │   ├── client.js            # Inngest client
│   │   └── functions.js        # Background job definitions
│   └── generated/prisma/       # Prisma generated client
├── prisma/
│   ├── schema.prisma            # Database models
│   └── migrations/              # SQL migration history
├── middleware.js                # Clerk route protection
└── next.config.mjs
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or hosted, e.g. Neon, Supabase)
- Clerk account (for auth)
- Google AI Studio API key (for Gemini)
- Inngest account (for background jobs)

### Installation

```bash
git clone https://github.com/Dimpal241/AI-Career-Coach.git
cd AI-Career-Coach
npm install
```

### Database setup

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For Inngest background jobs in development, run the Inngest dev server separately:

```bash
npx inngest-cli@latest dev
```

---

## Environment Variables

Create a `.env` file in the root:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sensai"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Google Gemini
GEMINI_API_KEY=AIza...

# Inngest
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```

---

## Key Design Decisions

**Why Server Actions instead of API routes?** Server Actions colocate data-fetching logic with the components that use them, reduce boilerplate, and are type-safe by default. The `useFetch` hook provides a uniform loading/error/toast pattern across all of them.

**Why Gemini 1.5 Flash?** It's fast and cost-effective for the structured JSON outputs this app needs. All prompts explicitly demand pure JSON with no extra text, and the app defensively strips any markdown fencing before parsing.

**Why Inngest for the cron job?** Inngest provides built-in retry logic, step-level observability, and a local dev server — all without running a separate queue worker. Each `step.run` call is independently retriable, so a failed update for one industry doesn't block others.

**Why one resume per user?** The schema uses `@unique` on `Resume.userId` and `upsert` in `saveResume`. This keeps the UX simple — users always edit their single resume rather than managing multiple versions.

**Why is IndustryInsight shared across users?** Multiple users in the same industry share one `IndustryInsight` record (keyed by the `industry` string). This avoids redundant AI calls and keeps the weekly refresh efficient — one Gemini call per industry, not per user.

**How does `checkUser()` work?** It's called in the root `(main)` layout on every page load. It reads the current Clerk session and either returns the existing DB user or creates a new one. This bridges the gap between Clerk's auth system and the app's own Postgres user records.
