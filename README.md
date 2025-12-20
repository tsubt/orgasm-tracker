# OrgasmTracker

A web application for tracking and visualizing your orgasm history. Built with Next.js App Router, featuring server-side rendering, authentication, and data visualization.

## Features

### ✅ Implemented Features

#### Authentication & User Management

- User authentication via NextAuth.js
- User profiles with customizable usernames
- Public/private profile settings
- Public/private orgasm feed settings

#### Core Functionality

- **Orgasm Tracking**: Add, edit, and delete orgasm entries
  - Date and time tracking
  - Orgasm types (FULL, RUINED, HANDSFREE, ANAL)
  - Partner types (SOLO, VIRTUAL, PHYSICAL)
  - Optional notes for each entry
- **Statistics Dashboard**: View comprehensive stats
  - Total orgasm count
  - Days without orgasm
  - Longest streak
  - Longest break
  - Last orgasm information
- **Data Visualization**: Interactive charts
  - Year view chart
  - Period selection (Year, Month, Week, Day)
  - Time-based filtering

#### Pages & Navigation

- **Home Page**: Personalized dashboard for logged-in users, guest welcome page
- **About Page**: Information about the application
- **Users Page**: Browse public user profiles
- **Stats Page**: Global statistics (total users, total orgasms)
- **User Profiles**: Public profile pages (`/u/[username]`)
  - User statistics
  - Orgasm charts
  - Profile visibility controls
- **Settings Page**: Account management
  - Username configuration with real-time validation
  - Profile visibility settings
  - Orgasm feed visibility settings
  - Sidebar navigation for extensibility

#### Technical Features

- Server-side rendering with React Server Components
- Suspense boundaries for loading states
- Server actions for mutations (no API routes where possible)
- Responsive design with Tailwind CSS
- Toast notifications for user feedback

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- PostgreSQL database
- Environment variables configured (see `.env.example`)

### Installation

```bash
# Install dependencies
npm install
# or
pnpm install
# or
bun install
```

### Database Setup

```bash
# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

### Development

```bash
npm run dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org) (App Router)
- **Authentication**: [NextAuth.js](https://next-auth.js.org)
- **Database**: [Prisma](https://prisma.io) with PostgreSQL
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **Date Handling**: [dayjs](https://day.js.org)
- **Notifications**: [react-hot-toast](https://react-hot-toast.com)

## To Do

### High Priority

#### 1. Public/Community Feed

- **Status**: Not implemented
- **Description**: Display a public feed of orgasms from users who have enabled `publicOrgasms`
- **Components Needed**:
  - `Feed.tsx` component for displaying public orgasms
  - `TypeTag.tsx` and `PartnerTag.tsx` components for color-coded badges
- **Features**:
  - Show orgasms with username, relative time, type tags, partner tags, and notes
  - "Load more" pagination functionality
  - Display on home page for both guests and logged-in users

#### 2. Chart Period Views

- **Status**: Placeholder only (Year view is implemented)
- **Description**: Complete implementation of Month, Week, and Day chart views
- **Current State**: Placeholders exist in `Charts` component
- **Features**:
  - Month view chart visualization
  - Week view chart visualization
  - Day view chart visualization

#### 4. BarChart Component

- **Status**: Partially implemented
- **Description**: Full BarChart implementation with day/week/month views
- **Features**:
  - Record and average statistics display
  - Color-coded bars by orgasm type
  - Partner indicators (virtual/physical)
  - Interactive date navigation

### Medium Priority

#### 4. TypeTag and PartnerTag Components

- **Status**: Not implemented
- **Description**: Color-coded tag components for displaying orgasm types and partner types
- **Features**:
  - TypeTag: Color-coded badges (FULL=green, RUINED=yellow, HANDSFREE=red, ANAL=purple)
  - PartnerTag: SOLO/VIRTUAL/PHYSICAL indicators with appropriate styling
- **Note**: Required for the Public Feed feature

#### 5. HeatMap Chart View

- **Status**: Not implemented
- **Description**: SVG-based heatmap visualization for orgasm frequency
- **Features**:
  - Week-based visualization
  - Clickable squares to view details
  - Color intensity based on frequency
- **Note**: Was commented out in OLD-tracker but component exists

#### 6. Settings/Orgasm Page

- **Status**: Placeholder only
- **Description**: `/settings/orgasm` page for orgasm-specific settings
- **Note**: Currently just a placeholder - determine if needed

### Low Priority / Nice to Have

#### 7. Unified OrgasmChart Component

- **Status**: Partially different implementation
- **Description**: Consider consolidating stats and charts into a unified component
- **Note**: Current split implementation may be fine - evaluate if consolidation improves UX

## Project Structure

```
src/
├── app/
│   ├── about/          # About page
│   ├── components/     # Reusable components
│   ├── header/        # Header and navigation
│   ├── orgasms/        # Orgasm management page
│   ├── settings/       # Settings pages with sidebar layout
│   ├── stats/          # Global statistics page
│   ├── u/[username]/   # User profile pages
│   └── users/          # Public users listing
├── auth.ts             # NextAuth configuration
└── prisma.ts           # Prisma client
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Prisma Documentation](https://prisma.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Deploy

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
