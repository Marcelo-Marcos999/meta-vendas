# Cálculo de Metas - Sales Tracking Application

## Overview
A sales tracking application (Cálculo de Metas) that allows users to set sales goals for a period, configure holidays, track daily sales, and automatically recalculate goals. Features include goal configuration, daily sales recording with automatic goal redistribution, holiday management, individual seller management with their own goals and sales tracking, and a dashboard with charts showing progress against minimum and maximum goals.

## Architecture

### Tech Stack
- **Frontend**: React with TypeScript, Vite, Tailwind CSS, Shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (client-side), Express (server-side)
- **State Management**: TanStack Query (React Query v5)
- **Authentication**: Session-based with username/password

### Project Structure
```
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utility functions
│   │   └── pages/        # Page components
├── server/               # Backend Express application
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Database operations
│   └── vite.ts           # Vite integration
├── shared/               # Shared code between frontend and backend
│   └── schema.ts         # Drizzle ORM schema and types
└── drizzle/              # Database migrations
```

### Database Schema
- **users**: User accounts (id, username, password)
- **goals_config**: Sales goal configurations (startDate, endDate, minGoal, maxGoal, userId)
- **holidays**: Holiday dates excluded from sales tracking
- **daily_sales**: Daily sales records linked to goals (with min/max goals per day)
- **sellers**: Individual sellers with their own goal (id, name, goal, userId)
- **seller_daily_sales**: Daily sales records for individual sellers (with single goal per day)

## Recent Changes
- **2026-01-24**: Fixed dynamic goal recalculation issues
  - Corrected inverted minGoal/maxGoal in initial sales generation
  - Improved recalculation logic for both general sales and individual sellers
  - Goals now correctly subtract sold amount and redistribute remaining to future days
  - Added parallel API updates for better performance
  - Fixed Sunday weight handling (weight=0)
  - Settings "Gerar" button now preserves existing sales values and recalculates future goals dynamically
- **2026-01-24**: Added Admin panel for user management
  - Admin login: marcelomarcos.g9@gmail.com / 1234
  - Admin can view all registered users and passwords
  - Admin can delete non-admin users (and all their data)
  - Admin menu only visible to admin users
- **2026-01-24**: Added dynamic goal recalculation for sellers
  - When a seller's sale is recorded, remaining daily goals are redistributed
- **2026-01-24**: Added Sellers management functionality
  - Created sellers and seller_daily_sales database tables
  - Added API endpoints for seller CRUD and seller sales management
  - Created Sellers page with seller list, sales table, and filtering by seller
  - Sellers have single "Meta" column (not min/max like general sales)
  - Seller daily goals are proportionally distributed based on the seller's total goal
- **2026-01-23**: Successfully migrated from Lovable/Supabase to Replit fullstack environment
  - Replaced Supabase client with Drizzle ORM + PostgreSQL
  - Migrated from react-router-dom to wouter
  - Implemented session-based authentication (username/password)
  - Created Express backend with RESTful API
  - Fixed Express 5 wildcard routing compatibility
  - Fixed CSS @import ordering for Tailwind

## User Preferences
- Language: Portuguese (Brazilian) for UI text
- Application name: Cálculo de Metas

## Development Notes
- Server runs on port 5000 (required for Replit webview)
- Use `npm run dev` to start development server
- Use `npm run db:push` to sync database schema
- All API routes prefixed with `/api/`
