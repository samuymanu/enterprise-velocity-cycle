# 🚀 TASK IMPLEMENTATION GUIDE - WEEK 1

> **Archivo de referencia técnica para implementación**  
> **Stack:** Node.js + TypeScript + Prisma + React + ShadCN  
> **Objetivo:** Sistema de movimientos de inventario completo

---

## 📂 ESTRUCTURA DE ARCHIVOS A CREAR

### **🔧 BACKEND FILES**

```
backend/src/
├── services/
│   ├── inventoryMovementService.ts     ✅ PRIORITY 1
│   ├── stockValidationService.ts       ✅ PRIORITY 1  
│   ├── alertService.ts                 ✅ PRIORITY 2
│   ├── cacheService.ts                 ✅ PRIORITY 2
│   └── searchService.ts                ✅ PRIORITY 3
├── routes/
│   ├── inventoryMovements.ts           ✅ PRIORITY 1
│   └── alerts.ts                       ✅ PRIORITY 2
├── middleware/
│   ├── auditMiddleware.ts              ✅ PRIORITY 2
│   └── cacheMiddleware.ts              ✅ PRIORITY 3
├── websocket/
│   └── inventorySocket.ts              ✅ PRIORITY 2
├── jobs/
│   └── stockMonitoringJob.ts           ✅ PRIORITY 2
└── tests/
    ├── services/
    ├── routes/
    └── integration/
```

### **🎨 FRONTEND FILES**

```
src/
├── components/inventory/
│   ├── InventoryMovements.tsx          ✅ PRIORITY 1
│   ├── MovementForm.tsx                ✅ PRIORITY 1
│   ├── StockHistory.tsx                ✅ PRIORITY 1
│   ├── AlertCenter.tsx                 ✅ PRIORITY 2
│   ├── StockAlerts.tsx                 ✅ PRIORITY 2
│   ├── BulkOperations.tsx              ✅ PRIORITY 3
│   └── VirtualizedProductList.tsx      ✅ PRIORITY 3
├── hooks/
│   ├── useInventorySocket.ts           ✅ PRIORITY 2
│   ├── useInventoryMovements.ts        ✅ PRIORITY 1
│   └── useStockAlerts.ts               ✅ PRIORITY 2
├── services/
│   ├── inventoryService.ts             ✅ PRIORITY 1
│   └── alertService.ts                 ✅ PRIORITY 2
└── types/
    └── inventory.ts                    ✅ PRIORITY 1
```

---

## 🔧 IMPLEMENTACIÓN TÉCNICA DETALLADA

### **📦 TASK 1: InventoryMovementService (PRIORITY 1)**

#### **📁 File:** `backend/src/services/inventoryMovementService.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { CreateInventoryMovementRequest } from '../schemas/validation';

interface InventoryMovementService {
  createMovement(data: CreateInventoryMovementRequest, userId: string): Promise<InventoryMovement>;
  getMovements(query: InventoryMovementQuery): Promise<InventoryMovement[]>;
  getMovementsByProduct(productId: string, options?: QueryOptions): Promise<InventoryMovement[]>;
  validateStockOperation(productId: string, quantity: number, type: string): Promise<ValidationResult>;
  calculateNewStock(productId: string, quantity: number, type: string): Promise<number>;
}

class InventoryMovementServiceImpl implements InventoryMovementService {
  constructor(private prisma: PrismaClient) {}

  async createMovement(data: CreateInventoryMovementRequest, userId: string): Promise<InventoryMovement> {
    // 🔄 IMPLEMENTATION STEPS:
    // 1. Validate product exists
    // 2. Validate stock availability for OUT operations
    // 3. Calculate new stock level
    // 4. Create movement record in transaction
    // 5. Update product stock
    // 6. Trigger alerts if needed
    // 7. Return movement with updated product data
  }

  async getMovements(query: InventoryMovementQuery): Promise<InventoryMovement[]> {
    // 🔄 IMPLEMENTATION STEPS:
    // 1. Build dynamic where clause from query
    // 2. Apply pagination
    // 3. Apply sorting
    // 4. Include related data (product, user)
    // 5. Return formatted results
  }

  // ... more methods
}
```

#### **✅ ACCEPTANCE CRITERIA:**
- ✅ All movement types supported (IN, OUT, ADJUSTMENT, TRANSFER)
- ✅ Automatic stock calculation with validation
- ✅ Transaction safety (rollback on error)
- ✅ Real-time stock updates
- ✅ Audit trail for all changes
- ✅ Performance <100ms for simple operations

---

### **📦 TASK 2: Movement API Endpoints (PRIORITY 1)**

#### **📁 File:** `backend/src/routes/inventoryMovements.ts`

```typescript
import express from 'express';
import { validateBody, validateQuery } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { auditMiddleware } from '../middleware/audit';
import { 
  createInventoryMovementSchema, 
  inventoryMovementQuerySchema,
  updateStockSchema 
} from '../schemas/validation';

const router = express.Router();

// Apply middleware
router.use(authMiddleware);
router.use(auditMiddleware);

// POST /api/inventory/movements - Create new movement
router.post('/', 
  validateBody(createInventoryMovementSchema),
  async (req: Request, res: Response) => {
    // 🔄 IMPLEMENTATION STEPS:
    // 1. Extract validated data from req.body
    // 2. Get user ID from req.user
    // 3. Call inventoryMovementService.createMovement()
    // 4. Handle success/error responses
    // 5. Emit WebSocket event for real-time updates
  }
);

// GET /api/inventory/movements - List movements with filters
router.get('/',
  validateQuery(inventoryMovementQuerySchema),
  async (req: Request, res: Response) => {
    // 🔄 IMPLEMENTATION STEPS:
    // 1. Extract query parameters
    // 2. Call inventoryMovementService.getMovements()
    // 3. Format response with pagination metadata
    // 4. Return consistent API response
  }
);

// PUT /api/inventory/products/:id/stock - Direct stock update
router.put('/products/:id/stock',
  validateBody(updateStockSchema),
  async (req: Request, res: Response) => {
    // 🔄 IMPLEMENTATION STEPS:
    // 1. Validate product ID
    // 2. Create ADJUSTMENT movement
    // 3. Update stock level
    // 4. Return updated product data
  }
);

export default router;
```

#### **✅ ACCEPTANCE CRITERIA:**
- ✅ All endpoints follow REST conventions
- ✅ Consistent error handling and responses
- ✅ Input validation with Zod schemas
- ✅ Authentication and authorization
- ✅ Rate limiting applied
- ✅ API documentation ready

---

### **📦 TASK 3: Frontend Movement Form (PRIORITY 1)**

#### **📁 File:** `src/components/inventory/MovementForm.tsx`

```typescript
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useInventoryMovements } from '@/hooks/useInventoryMovements';

const movementFormSchema = z.object({
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER']),
  quantity: z.number().min(1),
  reason: z.string().min(1),
  cost: z.number().optional(),
  notes: z.string().optional(),
});

interface MovementFormProps {
  productId: string;
  currentStock: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MovementForm({ productId, currentStock, onSuccess, onCancel }: MovementFormProps) {
  const { createMovement, isLoading } = useInventoryMovements();
  const [previewStock, setPreviewStock] = useState(currentStock);

  const form = useForm({
    resolver: zodResolver(movementFormSchema),
    defaultValues: {
      type: 'IN' as const,
      quantity: 1,
      reason: '',
      cost: undefined,
      notes: '',
    },
  });

  // 🔄 IMPLEMENTATION FEATURES:
  // 1. Real-time stock preview calculation
  // 2. Movement type selection with icons
  // 3. Validation for negative stock prevention
  // 4. Cost input for IN movements
  // 5. Reason templates/suggestions
  // 6. Success/error handling with notifications

  const onSubmit = async (data: MovementFormData) => {
    try {
      await createMovement({
        productId,
        ...data,
      });
      
      onSuccess?.();
    } catch (error) {
      // Handle error with notification
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Movement Type Selection */}
      {/* Quantity Input with Preview */}
      {/* Reason Input */}
      {/* Cost Input (conditional) */}
      {/* Notes Textarea */}
      {/* Action Buttons */}
    </form>
  );
}
```

#### **✅ ACCEPTANCE CRITERIA:**
- ✅ Form validation with real-time feedback
- ✅ Stock preview calculation
- ✅ Intuitive UX with clear visual feedback
- ✅ Error handling with user-friendly messages
- ✅ Mobile responsive design
- ✅ Accessibility compliant (WCAG AA)

---

### **📦 TASK 4: Real-time Alert System (PRIORITY 2)**

#### **📁 File:** `backend/src/services/alertService.ts`

```typescript
interface AlertService {
  checkStockLevels(): Promise<void>;
  createAlert(data: CreateAlertData): Promise<Alert>;
  getActiveAlerts(query?: AlertQuery): Promise<Alert[]>;
  resolveAlert(alertId: string, userId: string): Promise<void>;
  subscribeToAlerts(userId: string, callback: AlertCallback): void;
}

class AlertServiceImpl implements AlertService {
  async checkStockLevels(): Promise<void> {
    // 🔄 IMPLEMENTATION STEPS:
    // 1. Query all active products with stock <= minStock
    // 2. Check if alerts already exist for these products
    // 3. Create new LOW_STOCK alerts
    // 4. Check for OUT_OF_STOCK conditions
    // 5. Emit WebSocket notifications
    // 6. Log alert generation activity
  }

  async createAlert(data: CreateAlertData): Promise<Alert> {
    // 🔄 IMPLEMENTATION STEPS:
    // 1. Validate alert data
    // 2. Check for duplicate alerts
    // 3. Create alert record
    // 4. Determine priority based on conditions
    // 5. Trigger notifications via WebSocket
    // 6. Schedule auto-resolution if applicable
  }
}
```

#### **📁 File:** `src/components/inventory/AlertCenter.tsx`

```typescript
export function AlertCenter() {
  const { alerts, resolveAlert, markAsRead } = useStockAlerts();
  const { isConnected } = useInventorySocket();

  // 🔄 IMPLEMENTATION FEATURES:
  // 1. Real-time alert list with auto-refresh
  // 2. Alert filtering by type/priority
  // 3. Bulk alert actions
  // 4. Alert details modal with product info
  // 5. Sound notifications (configurable)
  // 6. Connection status indicator

  return (
    <div className="alert-center">
      {/* Connection Status */}
      {/* Alert Filters */}
      {/* Alert List with Virtual Scrolling */}
      {/* Bulk Actions */}
    </div>
  );
}
```

#### **✅ ACCEPTANCE CRITERIA:**
- ✅ Real-time alert generation and display
- ✅ Multiple alert types (LOW_STOCK, OUT_OF_STOCK, etc.)
- ✅ Priority-based alert sorting
- ✅ WebSocket integration <1s latency
- ✅ Alert resolution workflow
- ✅ Notification preferences

---

## 🧪 TESTING STRATEGY

### **📊 Test Coverage Requirements:**

```typescript
// Unit Tests (Target: 95% coverage)
describe('InventoryMovementService', () => {
  describe('createMovement', () => {
    it('should create IN movement and increase stock');
    it('should create OUT movement and decrease stock');
    it('should prevent negative stock on OUT movement');
    it('should handle ADJUSTMENT movements');
    it('should create audit trail');
    it('should trigger alerts when stock is low');
  });
});

// Integration Tests (Target: 90% coverage)
describe('Inventory Movement API', () => {
  it('should complete full movement workflow');
  it('should handle concurrent stock updates');
  it('should emit WebSocket events');
  it('should maintain data consistency');
});

// E2E Tests (Target: Critical paths)
describe('Inventory Management E2E', () => {
  it('should process stock adjustment from UI');
  it('should display real-time alerts');
  it('should handle bulk operations');
});
```

---

## 📊 PERFORMANCE TARGETS

### **🎯 Response Time Requirements:**

```typescript
const performanceTargets = {
  api: {
    simpleQueries: '<100ms',      // Single product lookup
    complexQueries: '<500ms',     // Filtered movement history
    stockUpdates: '<200ms',       // Movement creation
    bulkOperations: '<2s/1000',   // Bulk stock updates
  },
  
  frontend: {
    pageLoad: '<3s',              // Initial page load
    componentRender: '<100ms',    // Component updates
    searchResults: '<300ms',      // Product search
    realTimeUpdates: '<1s',       // WebSocket notifications
  },
  
  database: {
    stockQueries: '<50ms',        // Stock level queries
    movementInserts: '<100ms',    // Movement creation
    complexJoins: '<300ms',       // Reports with joins
    bulkOperations: '<1s/1000',   // Bulk data operations
  }
};
```

---

## 🔐 SECURITY CONSIDERATIONS

### **🛡️ Security Checklist:**

```typescript
const securityRequirements = {
  authentication: {
    required: true,
    method: 'JWT + Refresh Token',
    expiration: '15 minutes access / 7 days refresh'
  },
  
  authorization: {
    rbac: true,                   // Role-based access control
    permissions: [
      'inventory.read',
      'inventory.write', 
      'inventory.delete',
      'inventory.bulk'
    ]
  },
  
  inputValidation: {
    zod: true,                    // Schema validation
    sanitization: true,           // XSS prevention
    sqlInjection: true,           // Parameterized queries
    rateLimiting: true,           // API abuse prevention
  },
  
  auditTrail: {
    allOperations: true,          // Complete audit log
    userAttribution: true,        // Track user actions
    immutableLogs: true,          // Prevent log tampering
    retention: '7 years'          // Legal compliance
  }
};
```

---

## 🚀 DEPLOYMENT CHECKLIST

### **✅ Pre-deployment Requirements:**

```bash
# Backend Deployment
□ All tests passing (95%+ coverage)
□ Database migrations ready
□ Environment variables configured
□ API documentation updated
□ Security audit completed
□ Performance benchmarks met
□ Error monitoring configured
□ Backup strategy implemented

# Frontend Deployment  
□ Bundle optimization completed
□ Component tests passing
□ Cross-browser testing done
□ Mobile responsiveness verified
□ Accessibility audit passed
□ Performance budget met
□ CDN configuration ready
□ SEO optimization applied

# Infrastructure
□ SSL certificates installed
□ Load balancer configured
□ Database replication setup
□ Redis cache configured
□ Monitoring alerts active
□ Log aggregation working
□ Backup automation tested
□ Disaster recovery plan ready
```

---

## 📞 SUPPORT & MAINTENANCE

### **🔧 Monitoring & Alerts:**

```typescript
const monitoringConfig = {
  healthChecks: {
    api: '/api/health',
    database: '/api/health/db',
    cache: '/api/health/cache',
    websocket: '/api/health/ws'
  },
  
  alerts: {
    responseTime: '>500ms',
    errorRate: '>1%',
    diskSpace: '>85%',
    memoryUsage: '>80%',
    cpuUsage: '>70%'
  },
  
  logging: {
    level: 'info',
    rotation: 'daily',
    retention: '30 days',
    format: 'JSON'
  }
};
```

---

## 🎯 SUCCESS METRICS

### **📊 Week 1 Completion Criteria:**

```typescript
const week1Success = {
  functionality: {
    stockMovements: '100% working',
    realTimeAlerts: '100% working', 
    apiEndpoints: '100% implemented',
    userInterface: '100% functional'
  },
  
  performance: {
    apiResponseTime: '<100ms average',
    frontendLoadTime: '<3s',
    databaseQueries: '<50ms average',
    websocketLatency: '<1s'
  },
  
  quality: {
    testCoverage: '>90%',
    codeQuality: '>8.5/10',
    documentation: '100% complete',
    securityAudit: 'Passed'
  },
  
  userExperience: {
    intuitive: 'User testing positive',
    responsive: 'Mobile friendly',
    accessible: 'WCAG AA compliant',
    reliable: '99.9% uptime'
  }
};
```

---

**🚀 Ready to build the foundation for an enterprise-grade ERP! Let's start coding! 💪**

*This implementation guide provides the technical roadmap for Week 1. Each task includes specific acceptance criteria, performance targets, and quality standards.*
