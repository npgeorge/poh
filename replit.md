# Overview

Proof of Hardware (PoH) is a Lightning-powered distributed 3D printing marketplace that connects customers who need 3D printed parts with printer owners worldwide. The platform functions as "Uber for 3D printers" with Bitcoin payments and AI-powered quality assurance. Users can upload STL files, get matched with local printers, pay via Lightning escrow, and receive quality-controlled printed parts through photo verification.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Full-Stack Architecture
The application uses a modern full-stack TypeScript architecture with Express.js backend and React frontend, designed for deployment on Replit with integrated authentication and object storage.

### Frontend Architecture
- **React 18** with TypeScript for type safety and modern React features
- **Vite** as the build tool for fast development and optimized production builds
- **Wouter** for lightweight client-side routing instead of React Router
- **TanStack Query** for server state management and caching
- **shadcn/ui** component library built on Radix UI primitives for accessible, customizable components
- **Tailwind CSS** for utility-first styling with custom design tokens

### Backend Architecture
- **Express.js** server with TypeScript for API endpoints and middleware
- **Drizzle ORM** with PostgreSQL for type-safe database operations
- Custom object storage service using Google Cloud Storage for STL files and photos
- RESTful API design with proper error handling and logging middleware

### Database Layer
- **PostgreSQL** database with Neon serverless driver for connection pooling
- **Drizzle** schema definitions in shared directory for type safety across frontend and backend
- Database schema includes users, printers, jobs, and sessions tables
- Relational data modeling with foreign key constraints

### Authentication System
- **Replit Auth** integration using OpenID Connect (OIDC) for seamless platform authentication
- **Passport.js** strategy for OIDC authentication flow
- Session-based authentication with PostgreSQL session storage
- User profile management with automatic user creation/updates

### File Management
- **Google Cloud Storage** integration for STL file uploads and quality control photos
- Custom object ACL (Access Control List) system for fine-grained file permissions
- **Uppy** file uploader with dashboard interface for user-friendly file management
- **Three.js** STL viewer for 3D model preview and visualization

### State Management
- Server state managed by TanStack Query with optimistic updates
- Form state handled by React Hook Form with Zod validation
- Global UI state managed through React hooks and context

### Development Setup
- **TypeScript** configuration shared across client, server, and shared modules
- **ESM modules** throughout the application for modern JavaScript features
- Development server with Vite HMR and Express API in single process
- Production build process with separate client and server bundling

## External Dependencies

### Cloud Services
- **Replit** platform for hosting, authentication, and development environment
- **Neon Database** for serverless PostgreSQL hosting
- **Google Cloud Storage** for object storage and file management

### Payment Integration
- **Zaprite** for unified fiat and Lightning Network payments with BTC discount functionality
- Non-custodial payment processing at $25/month
- Webhook-based payment confirmation (signature verification pending implementation)
- Support for both traditional payment methods and Bitcoin Lightning Network
- Escrow-style workflow: payment required before job matching with printer owners

#### Zaprite Integration Details
- **API Service**: `server/zapriteService.ts` handles order creation and webhook processing
- **Payment Routes**:
  - `POST /api/jobs/:id/payment` - Create or retrieve payment order (idempotent). Returns `{ orderId, checkoutUrl }`
  - `POST /api/webhooks/zaprite` - Webhook handler for payment events (verification not yet implemented)
  - `GET /api/jobs/:id/payment-status` - Check payment status. Returns `{ paymentStatus, zapriteOrderId, checkoutUrl }`
- **Database Fields**: Jobs table includes `paymentStatus`, `zapriteOrderId`, `checkoutUrl`, `paymentMethod`
- **Security**: 
  - Server-controlled pricing (client cannot set amount)
  - RBAC on payment routes (job ownership verified)
  - **Webhook Security Status**: Signature verification NOT implemented. Webhook rejects requests (returns 401) unless `ZAPRITE_WEBHOOK_SECRET_BYPASS=true` is set. DO NOT expose webhook publicly without implementing verification.
  - **Production TODO**: Implement HMAC-SHA256 signature verification with raw body middleware and x-zaprite-signature header validation
- **Required Secrets**: 
  - `ZAPRITE_API_KEY` - API authentication for order creation
  - `ZAPRITE_WEBHOOK_SECRET` - For future HMAC signature verification (not yet used)
  - `ZAPRITE_WEBHOOK_SECRET_BYPASS=true` - Development only: accepts webhooks without verification (NEVER use in production)

#### Payment Flow
1. Customer uploads STL and creates job (status: 'pending', paymentStatus: 'pending' by default)
2. System creates Zaprite order with job details
3. Customer redirects to Zaprite checkout page
4. Customer pays via fiat or Lightning (with BTC discount)
5. Zaprite webhook fires on payment event
6. Webhook handler updates paymentStatus ('paid', 'expired', etc.)
7. If paymentStatus becomes 'paid', job status automatically updates to 'matched'
8. If payment expires, customer can resume payment from dashboard ("Pay Now" button)

### UI Framework
- **Radix UI** primitives for accessible component foundation
- **Lucide React** for consistent icon library
- **Tailwind CSS** for utility-first styling approach

### Development Tools
- **Drizzle Kit** for database migrations and schema management
- **PostCSS** with Autoprefixer for CSS processing
- **ESBuild** for server-side bundling in production

### 3D Visualization
- **Three.js** for STL file rendering and 3D model interaction
- STL loader for parsing 3D model files
- Orbital controls for user interaction with 3D models