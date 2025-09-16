# XPortal Payment Plan System - Comprehensive Analysis

## Table of Contents
1. [System Overview](#system-overview)
2. [Database Architecture](#database-architecture)
3. [API Endpoints & Schemas](#api-endpoints--schemas)
4. [Finance/Payment Plans Management](#financepayment-plans-management)
5. [Application Wizard Integration](#application-wizard-integration)
6. [Payment Plan Derivation Process](#payment-plan-derivation-process)
7. [Snapshot Validation & Storage](#snapshot-validation--storage)
8. [Current Implementation Status](#current-implementation-status)
9. [Gaps & Issues Identified](#gaps--issues-identified)
10. [Technical Implementation Details](#technical-implementation-details)

## System Overview

The XPortal Payment Plan system is a sophisticated financial management component that handles payment templates, schedule derivation, and financial snapshots for student applications. It operates across two main contexts:

1. **Finance Management** (`/finance/payment-plans`) - Administrative interface for creating and managing payment plan templates
2. **Application Wizard** (`/students/new/step-6`) - Student-facing interface for selecting payment plans during application

### Core Concepts

- **Payment Plan Templates**: Reusable payment structures defined per program
- **Instalments**: Individual payment components with amounts, descriptions, and timing
- **Anchor System**: Flexible date calculation system for payment scheduling
- **Snapshots**: Immutable financial records stored with applications
- **Derivation**: Dynamic schedule generation based on templates and anchors

## Database Architecture

### Core Tables

#### 1. `sms_op.payment_plan_templates`
```sql
CREATE TABLE sms_op.payment_plan_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES core.programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Purpose**: Stores payment plan templates scoped to specific programs
**Key Features**:
- One default template per program
- Program-scoped isolation
- Cascade deletion when programs are removed

#### 2. `sms_op.payment_plan_template_instalments`
```sql
CREATE TABLE sms_op.payment_plan_template_instalments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES sms_op.payment_plan_templates(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  offset_days integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0
);
```

**Purpose**: Defines individual payment components within templates
**Key Features**:
- Amount validation (non-negative)
- Offset days for flexible scheduling
- Sort order for proper sequencing

#### 3. Application Payment Snapshot Fields
```sql
ALTER TABLE sms_op.applications
  ADD COLUMN payment_snapshot jsonb NULL,
  ADD COLUMN selected_payment_template_id uuid NULL REFERENCES sms_op.payment_plan_templates(id),
  ADD COLUMN payment_anchor text NULL CHECK (payment_anchor IN ('OFFER_LETTER','COMMENCEMENT','CUSTOM')),
  ADD COLUMN payment_anchor_date date NULL,
  ADD COLUMN tuition_fee_snapshot numeric(10,2) NULL,
  ADD COLUMN agent_commission_rate_snapshot numeric(5,2) NULL;
```

**Purpose**: Stores immutable financial snapshots with applications
**Key Features**:
- JSONB snapshot for flexible data storage
- Foreign key to template for audit trail
- Anchor system for date calculations
- Separate fields for financial totals

### Indexes
```sql
CREATE INDEX idx_payment_plan_templates_program_id ON sms_op.payment_plan_templates(program_id);
CREATE INDEX idx_template_instalments_template_id ON sms_op.payment_plan_template_instalments(template_id);
CREATE INDEX idx_app_selected_payment_template_id ON sms_op.applications(selected_payment_template_id);
```

## API Endpoints & Schemas

### Payment Plan Templates API

#### 1. List Templates
```
GET /programs/{programId}/payment-plan-templates
GET /payment-plan-templates/programs/{programId}/payment-plan-templates
```

**Response Schema**:
```typescript
interface PaymentPlanTemplate {
  id: string;
  program_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}
```

#### 2. Create Template
```
POST /programs/{programId}/payment-plan-templates
```

**Request Schema**:
```typescript
interface TemplateCreateRequest {
  name: string;
  is_default?: boolean;
}
```

#### 3. Get Template Instalments
```
GET /payment-plan-templates/{templateId}/instalments
```

**Response Schema**:
```typescript
interface PaymentPlanInstalment {
  id: string;
  template_id: string;
  description: string;
  amount: number;
  offset_days: number;
  sort_order: number;
}
```

#### 4. Replace Instalments
```
PUT /payment-plan-templates/{templateId}/instalments
```

**Request Schema**:
```typescript
interface InstalmentInput {
  description: string;
  amount: number;
  offset_days?: number;
  sort_order?: number;
}
```

#### 5. Update Template
```
PATCH /payment-plan-templates/{templateId}
```

**Request Schema**:
```typescript
interface TemplateUpdateRequest {
  is_default: boolean;
}
```

### Payment Plan Derivation API

#### Derive Schedule
```
POST /applications/{applicationId}/derive-payment-plan
POST /payment-plan-templates/applications/{applicationId}/derive-payment-plan
```

**Request Schema**:
```typescript
interface DeriveRequest {
  templateId: string;
  anchor?: 'OFFER_LETTER' | 'COMMENCEMENT' | 'CUSTOM';
  anchorDate?: string; // Required for CUSTOM, optional for COMMENCEMENT
  startDate?: string; // Deprecated
}
```

**Response Schema**:
```typescript
interface DerivedSchedule {
  items: Array<{
    description: string;
    amount: number;
    dueDate: string; // YYYY-MM-DD format
  }>;
}
```

## Finance/Payment Plans Management

### Location: `app/finance/payment-plans/page.tsx`

The Finance Payment Plans page provides administrative management of payment plan templates.

#### Key Components

1. **Program Selector**: Choose which program's templates to manage
2. **Advanced Payment Templates Component**: Full-featured template management interface

### Advanced Payment Templates Component

**Location**: `app/finance/payment-plans/_components/AdvancedPaymentTemplates.tsx`

#### Features

1. **Template Grid Display**:
   - Shows all templates for selected program
   - Default template highlighted with star icon
   - Template statistics (instalment count, total amount)

2. **Template Creation**:
   - Create new templates with custom names
   - Set as default template
   - Duplicate existing templates

3. **Instalment Management**:
   - Add/edit/delete instalments
   - Drag-and-drop reordering
   - Preset templates (weekly, monthly, etc.)
   - Real-time preview with actual dates

4. **Advanced Editor**:
   - Bulk operations
   - Amount calculations
   - Offset day management
   - Visual timeline preview

#### Key Functions

```typescript
// Template creation
const createTemplate = useCreatePaymentPlanTemplate();

// Instalment management
const replaceInstalments = useReplaceInstalments();

// Default template setting
const setDefault = useSetTemplateDefault();

// Preview calculation
const preview = useMemo(() => {
  // Calculate preview with actual dates
  const today = new Date();
  const items = rows
    .filter(r => r.description.trim() && Number(r.amount) > 0)
    .map(r => {
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + Number(r.offset_days));
      return {
        description: r.description,
        amount: Number(r.amount),
        dueDate,
        dueLabel: dueDate.toLocaleDateString(),
      };
    })
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  
  return { items, total, first, last };
}, [rows]);
```

## Application Wizard Integration

### Location: `app/students/new/step-6/page.tsx`

Step 6 of the application wizard handles financial arrangements and payment plan selection.

#### Current Implementation

1. **Program Selection**: Falls back to program selected in earlier steps
2. **Template Selection**: Dropdown of available templates for selected program
3. **Anchor Selection**: Choose date calculation method
4. **Schedule Derivation**: Real-time schedule generation
5. **Financial Data**: Tuition fees and commission rates

#### Key State Management

```typescript
// Template and anchor state
const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
const [anchor, setAnchor] = useState<'OFFER_LETTER' | 'COMMENCEMENT' | 'CUSTOM'>('OFFER_LETTER');
const [anchorDate, setAnchorDate] = useState<string>('');
const [derivedSchedule, setDerivedSchedule] = useState<Array<{ description: string; amount: number; dueDate: string }>>([]);

// Form integration
const { data: templates } = usePaymentPlanTemplates(currentProgramId || undefined);
```

#### Schedule Derivation Function

```typescript
const derive = async () => {
  if (!draftId || !selectedTemplateId || !currentProgramId) return;
  
  const res = await fetch(`${FUNCTIONS_URL}/payment-plan-templates/applications/${draftId}/derive-payment-plan`, {
    method: 'POST',
    headers: { ...getFunctionHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      templateId: selectedTemplateId,
      anchor,
      ...(anchor === 'CUSTOM' || anchor === 'COMMENCEMENT' ? { anchorDate } : {}),
    }),
  });
  
  if (!res.ok) {
    console.error('Failed to derive schedule', await res.text());
    setDerivedSchedule([]);
    return;
  }
  
  const data = await res.json();
  const items = (data?.items ?? []) as Array<{ description: string; amount: number; dueDate: string }>;
  setDerivedSchedule(items);
};
```

## Payment Plan Derivation Process

### Backend Implementation

**Location**: `supabase/functions/payment-plan-templates/index.ts`

#### Derivation Logic

```typescript
const deriveSchedule = async (_req: Request, _ctx: ApiContext, applicationId: string, body: unknown) => {
  const { templateId, startDate, anchor, anchorDate } = DeriveSchema.parse(body);
  
  // Get instalments from template
  const instalments = await db.selectFrom('sms_op.payment_plan_template_instalments')
    .select(['description','amount','offset_days','sort_order'])
    .where('template_id','=',templateId)
    .orderBy('sort_order','asc')
    .execute();

  // Resolve effective start date based on anchor
  let effectiveStart: Date | null = null;
  if (anchor === 'OFFER_LETTER') {
    effectiveStart = new Date(); // Today
  } else if (anchor === 'COMMENCEMENT') {
    if (!anchorDate) {
      throw new ValidationError('anchorDate is required when anchor=COMMENCEMENT until offering dates are provided.');
    }
    effectiveStart = new Date(anchorDate);
  } else if (anchor === 'CUSTOM') {
    if (!anchorDate) {
      throw new ValidationError('anchorDate is required when anchor=CUSTOM');
    }
    effectiveStart = new Date(anchorDate);
  } else if (startDate) {
    effectiveStart = new Date(startDate); // Deprecated fallback
  } else {
    effectiveStart = new Date(); // Default fallback
  }

  // Generate schedule with actual dates
  const items = instalments.map((i) => ({
    description: i.description,
    amount: Number(i.amount),
    dueDate: new Date(effectiveStart!.getTime() + i.offset_days * 86400000).toISOString().slice(0,10),
  }));
  
  return new Response(JSON.stringify({ items }), {
    status: 200, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
};
```

### Anchor System

The anchor system provides flexible date calculation for payment schedules:

1. **OFFER_LETTER**: Payments calculated from today (when offer is generated)
2. **COMMENCEMENT**: Payments calculated from course start date
3. **CUSTOM**: Payments calculated from a specific user-provided date

## Snapshot Validation & Storage

### Validation Schema

**Location**: `supabase/functions/applications/index.ts`

```typescript
const PaymentPlanSnapshotSchema = z.object({
  selectedTemplateId: z.string().uuid(),
  anchor: PaymentPlanAnchorEnum,
  anchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  schedule: z.array(PaymentPlanInstalmentSchema).min(1).max(24),
  tuitionFeeSnapshot: z.number().positive(),
});

const PaymentPlanInstalmentSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
```

### Validation Rules

1. **Template ID**: Must be valid UUID
2. **Anchor**: Must be one of the three valid values
3. **Schedule**: 1-24 instalments, each with positive amount
4. **Date Format**: YYYY-MM-DD format for all dates
5. **Amount Validation**: Tuition fee must equal sum of instalment amounts

### Snapshot Storage

```typescript
function validatePaymentPlanSnapshotOrThrow(appPayload: Record<string, unknown>): void {
  const paymentPlan = (appPayload as any)?.paymentPlan;
  if (!paymentPlan) {
    throw new ValidationError('Payment plan selection and snapshot are required before submit.');
  }
  
  const parsedResult = PaymentPlanSnapshotSchema.safeParse(paymentPlan);
  if (!parsedResult.success) {
    const issues = parsedResult.error.issues.map(issue => issue.message);
    throw new ValidationError('Invalid payment plan snapshot.', { issues });
  }
  
  const parsed = parsedResult.data;
  const sum = parsed.schedule.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  if (Math.round(parsed.tuitionFeeSnapshot * 100) !== Math.round(sum * 100)) {
    throw new ValidationError('Payment plan tuitionFeeSnapshot must equal the sum of instalment amounts.');
  }
}
```

## Current Implementation Status

### ✅ Completed Features

1. **Database Schema**: Complete with proper relationships and constraints
2. **API Endpoints**: Full CRUD operations for templates and instalments
3. **Finance Management UI**: Advanced template management interface
4. **Derivation Logic**: Backend schedule generation with anchor system
5. **Validation**: Comprehensive validation schemas and rules
6. **Snapshot Storage**: Application-level financial snapshots

### ⚠️ Partially Implemented

1. **Application Wizard Integration**: Basic template selection implemented, but missing:
   - Proper form integration with React Hook Form
   - Schedule preview display
   - Snapshot saving to application
   - Validation feedback

2. **Anchor System**: Backend logic complete, but frontend missing:
   - Anchor selection UI
   - Custom date picker
   - Commencement date integration

### ❌ Missing Features

1. **Schedule Preview**: No visual display of derived schedule in wizard
2. **Form Integration**: Payment plan data not properly integrated with form state
3. **Snapshot Persistence**: Derived schedules not saved to application payload
4. **Validation Feedback**: No user feedback for validation errors
5. **Error Handling**: Limited error handling in frontend
6. **Loading States**: No loading indicators during derivation
7. **Accessibility**: Missing ARIA labels and keyboard navigation

## Gaps & Issues Identified

### Critical Gaps

1. **Incomplete Wizard Integration**:
   - Step 6 doesn't properly integrate with the application wizard state
   - Payment plan data not saved to application payload
   - No validation before proceeding to review step

2. **Missing UI Components**:
   - No schedule preview in wizard
   - No anchor selection interface
   - No custom date picker
   - No loading states during derivation

3. **Form State Management**:
   - Payment plan data not integrated with React Hook Form
   - No proper validation feedback
   - State not synchronized with wizard store

4. **Error Handling**:
   - Limited error messages for derivation failures
   - No retry mechanisms
   - No fallback options

### Technical Issues

1. **API Integration**:
   - Derivation endpoint not properly integrated
   - No error handling for network failures
   - Missing loading states

2. **Data Flow**:
   - Template selection doesn't trigger derivation
   - Schedule changes don't update form state
   - No persistence of derived schedules

3. **Validation**:
   - Frontend validation missing
   - No real-time validation feedback
   - Submission can proceed without valid payment plan

## Technical Implementation Details

### Frontend Hooks

**Location**: `hooks/use-payment-templates.ts`

```typescript
export const usePaymentPlanTemplates = (programId: string | undefined) => {
  return useQuery<PaymentPlanTemplate[]>({
    queryKey: ['payment-templates', programId],
    enabled: !!programId,
    queryFn: async () => {
      const res = await fetch(`${FUNCTIONS_URL}/payment-plan-templates/programs/${programId}/payment-plan-templates`, {
        headers: getFunctionHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load templates');
      return res.json();
    },
  });
};
```

### Backend Validation

**Location**: `supabase/functions/applications/index.ts`

```typescript
// Soft validation during PATCH: only enforce when schedule has items
if (scheduleArr.length > 0) {
  const r = PaymentPlanSnapshotSchema.safeParse(candidate);
  if (!r.success) {
    const issues = r.error.issues.map(issue => issue.message);
    throw new ValidationError('Invalid payment plan snapshot.', { issues });
  }
}
```

### Database Constraints

```sql
-- Amount validation
CHECK (amount >= 0)

-- Anchor validation
CHECK (payment_anchor IN ('OFFER_LETTER','COMMENCEMENT','CUSTOM'))

-- Precision constraints
numeric(10,2) -- For amounts (up to 99,999,999.99)
numeric(5,2)  -- For commission rates (up to 999.99%)
```

## Conclusion

The XPortal Payment Plan system has a solid foundation with comprehensive backend implementation, but the frontend integration in the application wizard is incomplete. The system needs significant work to properly integrate payment plan selection, schedule derivation, and snapshot persistence into the application workflow.

The main areas requiring attention are:
1. Complete the application wizard integration
2. Implement proper form state management
3. Add comprehensive UI components for schedule preview
4. Implement proper validation and error handling
5. Ensure data persistence and synchronization

This analysis provides the complete technical foundation needed to implement the missing features and resolve the identified gaps.
