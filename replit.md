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
- **Lightning Network** for Bitcoin micropayments (implementation planned with LNbits API)
- Escrow payment system for secure transactions between customers and printer owners

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