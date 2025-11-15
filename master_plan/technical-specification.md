# Proof of Hardware (PoH) - Technical Specification

## Architecture Overview

### System Architecture
```
┌─────────────────────────────────────────────────────┐
│                   Client Layer                       │
│  React 18 + TypeScript + Vite + TanStack Query      │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│                    API Gateway                       │
│         Express.js + TypeScript + Middleware         │
└───────────────────┬─────────────────────────────────┘
                    │
        ┌───────────┴───────────┬────────────┐
        │                       │            │
┌───────▼────────┐  ┌──────────▼──────┐  ┌─▼──────────┐
│   PostgreSQL   │  │  Google Cloud   │  │  Zaprite   │
│   (Neon DB)    │  │    Storage      │  │    API     │
└────────────────┘  └─────────────────┘  └────────────┘
```

## Database Schema

### Core Tables

#### Users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  role ENUM('customer', 'printer_owner', 'admin') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  email_verified BOOLEAN DEFAULT FALSE,
  replit_id VARCHAR(255) UNIQUE
);
```

#### Printers
```sql
CREATE TABLE printers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  model VARCHAR(255),
  build_volume JSONB, -- {x: 200, y: 200, z: 200} in mm
  materials TEXT[], -- ['PLA', 'ABS', 'PETG']
  colors TEXT[],
  location POINT NOT NULL, -- PostGIS point
  address JSONB,
  hourly_rate DECIMAL(10, 2),
  min_order_value DECIMAL(10, 2),
  max_print_time INTEGER, -- in hours
  active BOOLEAN DEFAULT TRUE,
  rating DECIMAL(3, 2),
  total_prints INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Jobs
```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES users(id),
  printer_id UUID REFERENCES printers(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('draft', 'posted', 'matched', 'printing', 
              'quality_check', 'completed', 'disputed', 
              'cancelled') NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  material VARCHAR(50),
  color VARCHAR(50),
  quantity INTEGER DEFAULT 1,
  dimensions JSONB, -- {x: 100, y: 100, z: 50}
  weight_estimate DECIMAL(10, 2), -- in grams
  print_time_estimate INTEGER, -- in minutes
  price DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'USD',
  deadline TIMESTAMP,
  location POINT,
  max_distance INTEGER, -- in km
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  quality_score DECIMAL(3, 2),
  quality_photos TEXT[]
);
```

#### Payments
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  zaprite_payment_id VARCHAR(255) UNIQUE,
  payment_type ENUM('lightning', 'on_chain', 'fiat') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  btc_amount DECIMAL(16, 8),
  status ENUM('pending', 'confirmed', 'released', 
              'refunded', 'disputed') NOT NULL,
  escrow_release_conditions JSONB,
  invoice_data JSONB,
  paid_at TIMESTAMP,
  released_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Disputes
```sql
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  initiated_by UUID REFERENCES users(id),
  reason ENUM('quality', 'non_delivery', 'wrong_spec', 
              'damaged', 'other') NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB[], -- Array of {type, url, description}
  status ENUM('open', 'under_review', 'resolved', 
              'escalated', 'closed') NOT NULL,
  resolution TEXT,
  resolution_amount DECIMAL(10, 2),
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);
```

#### Messages
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  sender_id UUID REFERENCES users(id),
  recipient_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  attachments JSONB[],
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Specification

### Authentication Endpoints

#### POST /auth/login
```typescript
interface LoginRequest {
  replitToken: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: 'customer' | 'printer_owner' | 'admin';
  };
}
```

#### POST /auth/refresh
```typescript
interface RefreshRequest {
  refreshToken: string;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}
```

### Job Management Endpoints

#### POST /jobs
```typescript
interface CreateJobRequest {
  title: string;
  description?: string;
  file: File; // STL file
  material: string;
  color: string;
  quantity: number;
  deadline?: string; // ISO date
  maxDistance?: number; // km
}

interface CreateJobResponse {
  id: string;
  estimatedCost: number;
  estimatedWeight: number;
  estimatedPrintTime: number;
  matchedPrinters: PrinterMatch[];
}
```

#### GET /jobs/:id
```typescript
interface JobResponse {
  id: string;
  title: string;
  status: JobStatus;
  customer: UserBasic;
  printer?: PrinterBasic;
  fileUrl: string;
  thumbnailUrl?: string;
  price: number;
  currency: string;
  deadline?: string;
  createdAt: string;
  qualityScore?: number;
  qualityPhotos?: string[];
}
```

#### POST /jobs/:id/accept
```typescript
interface AcceptJobRequest {
  printerId: string;
  estimatedCompletion: string;
  notes?: string;
}
```

#### POST /jobs/:id/complete
```typescript
interface CompleteJobRequest {
  photos: File[]; // Multiple photos for AI verification
  notes?: string;
}
```

### Payment Endpoints

#### POST /payments/create
```typescript
interface CreatePaymentRequest {
  jobId: string;
  paymentMethod: 'lightning' | 'fiat';
  amount: number;
  currency: string;
}

interface CreatePaymentResponse {
  paymentId: string;
  invoice?: string; // Lightning invoice
  paymentUrl?: string; // Fiat payment URL
  expiresAt: string;
}
```

#### POST /payments/:id/release
```typescript
interface ReleasePaymentRequest {
  reason?: string;
}
```

### Quality Assurance Endpoints

#### POST /quality/verify
```typescript
interface QualityVerifyRequest {
  jobId: string;
  photos: string[]; // URLs to photos
}

interface QualityVerifyResponse {
  score: number; // 0-100
  confidence: number; // 0-1
  issues?: QualityIssue[];
  requiresManualReview: boolean;
}
```

### Printer Management Endpoints

#### GET /printers/nearby
```typescript
interface NearbyPrintersRequest {
  latitude: number;
  longitude: number;
  radius: number; // km
  material?: string;
  minRating?: number;
}

interface NearbyPrintersResponse {
  printers: PrinterWithDistance[];
  total: number;
}
```

## Frontend Architecture

### Component Structure
```
src/
├── components/
│   ├── common/
│   │   ├── Layout.tsx
│   │   ├── Header.tsx
│   │   └── Navigation.tsx
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── AuthGuard.tsx
│   ├── jobs/
│   │   ├── JobCreate.tsx
│   │   ├── JobList.tsx
│   │   ├── JobDetail.tsx
│   │   └── STLViewer.tsx
│   ├── payments/
│   │   ├── PaymentForm.tsx
│   │   └── InvoiceDisplay.tsx
│   └── quality/
│       ├── PhotoUpload.tsx
│       └── QualityScore.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useJobs.ts
│   ├── usePayments.ts
│   └── useWebSocket.ts
├── services/
│   ├── api.ts
│   ├── auth.ts
│   └── storage.ts
└── utils/
    ├── validation.ts
    ├── formatting.ts
    └── calculations.ts
```

### State Management
```typescript
// Using TanStack Query for server state
const useJob = (jobId: string) => {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => fetchJob(jobId),
    staleTime: 30000,
  });
};

// Using Zustand for client state
interface AppState {
  user: User | null;
  notifications: Notification[];
  setUser: (user: User | null) => void;
  addNotification: (notification: Notification) => void;
}
```

## Security Considerations

### Authentication & Authorization
- JWT tokens with 15-minute expiry
- Refresh tokens with 7-day expiry
- Role-based access control (RBAC)
- API rate limiting per user/IP

### Data Protection
- All passwords hashed with bcrypt (cost factor 12)
- Sensitive data encrypted at rest
- TLS 1.3 for all connections
- Input validation with Zod schemas

### File Security
- STL file validation before processing
- Virus scanning on upload
- File size limits (100MB)
- Signed URLs with expiration

### Payment Security
- Non-custodial payment handling via Zaprite
- Escrow release requires multiple confirmations
- Audit trail for all transactions
- Webhook signature verification

## Performance Requirements

### Response Times
- API endpoints: < 200ms (p95)
- File uploads: < 5s for 50MB file
- 3D preview load: < 3s
- Payment confirmation: < 10s

### Scalability
- Support 10,000 concurrent users
- Handle 1,000 jobs/hour
- Process 100 simultaneous file uploads
- 99.9% uptime SLA

### Database
- Connection pooling (min: 5, max: 20)
- Query optimization (all queries < 100ms)
- Indexes on frequently queried fields
- Partitioning for large tables

## Monitoring & Observability

### Metrics
- API response times
- Error rates
- Payment success rates
- Job completion rates
- User activity patterns

### Logging
- Structured logging with correlation IDs
- Log levels: ERROR, WARN, INFO, DEBUG
- Centralized log aggregation
- 30-day retention policy

### Alerts
- Payment failures
- High error rates (> 1%)
- Database connection issues
- Storage quota warnings
- Security violations

## Testing Strategy

### Unit Tests
- Minimum 80% code coverage
- All business logic tested
- Mock external dependencies

### Integration Tests
- API endpoint testing
- Database interaction testing
- Payment flow testing

### End-to-End Tests
- Critical user journeys
- Payment workflows
- File upload/processing
- Dispute resolution flow

### Performance Tests
- Load testing (JMeter/K6)
- Stress testing
- Database query performance
- File upload limits

## Deployment Architecture

### Infrastructure
- Frontend: CDN (CloudFlare)
- Backend: Container orchestration (Kubernetes)
- Database: Neon (serverless PostgreSQL)
- Storage: Google Cloud Storage
- Cache: Redis

### CI/CD Pipeline
1. Code commit triggers build
2. Run linting and type checking
3. Execute unit tests
4. Build Docker images
5. Run integration tests
6. Deploy to staging
7. Run E2E tests
8. Manual approval for production
9. Blue-green deployment
10. Smoke tests
11. Monitoring verification

### Environment Configuration
- Development: Local Docker compose
- Staging: Scaled-down production replica
- Production: Full infrastructure with redundancy
