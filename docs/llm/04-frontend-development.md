# XPortal Student Management System - Frontend Development

## Frontend Architecture Overview

The XPortal frontend is built using Next.js 14 with the App Router, providing a modern, performant, and scalable user interface. The frontend follows a component-based architecture with strict type safety, comprehensive state management, and accessibility-first design principles.

### Technology Stack

#### Core Framework
- **Next.js 14**: React framework with App Router
- **React 18**: Modern React with concurrent features
- **TypeScript**: Type-safe development throughout
- **Tailwind CSS**: Utility-first CSS framework

#### UI & Styling
- **ShadCN UI**: Component library built on Radix UI
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library
- **Tailwind CSS**: Utility-first styling

#### State Management
- **Zustand**: Lightweight client-side state management
- **React Query**: Server state management and caching
- **React Hook Form**: Form state management
- **Zod**: Runtime validation and type inference

## Project Structure

### Directory Organization

```
app/
├── (auth)/                    # Authentication routes
│   ├── login/
│   ├── register/
│   └── forgot-password/
├── (dashboard)/               # Main application routes
│   ├── students/              # Student management
│   │   ├── new/              # Application wizard
│   │   │   ├── step-1/       # Personal information
│   │   │   ├── step-2/       # Academic information
│   │   │   ├── step-3/       # Program selection
│   │   │   ├── step-4/       # Agent & referral
│   │   │   ├── step-5/       # Financial arrangements
│   │   │   ├── review/       # Final review
│   │   │   └── components/   # Wizard components
│   │   ├── applications/     # Application management
│   │   │   ├── [id]/        # Application details
│   │   │   └── components/  # Application components
│   │   └── [id]/            # Student profile
│   ├── programs/             # Program management
│   ├── course-offerings/     # Course delivery
│   ├── staff/               # Staff management
│   ├── agents/              # Agent management
│   ├── finance/             # Financial management
│   ├── compliance/          # Compliance & reporting
│   ├── reports/             # Reports & analytics
│   └── settings/            # System configuration
├── globals.css              # Global styles
├── layout.tsx               # Root layout
└── page.tsx                 # Home page

components/
├── ui/                      # ShadCN UI components
├── providers/               # Context providers
├── app-sidebar.tsx          # Main navigation
├── search-form.tsx          # Global search
└── theme-provider.tsx       # Theme management

hooks/
├── use-applications.ts      # Application hooks
├── use-clients.ts          # Client hooks
├── use-programs.ts         # Program hooks
├── use-reference-data.ts   # Reference data hooks
└── use-mobile.ts           # Mobile detection

lib/
├── schemas/                 # Zod validation schemas
├── data/                   # Static data
├── supabase/               # Supabase client
└── utils.ts                # Utility functions

stores/
└── application-wizard.ts   # Wizard state management
```

## Component Architecture

### Atomic Design Principles

#### Atoms (Basic Building Blocks)
```typescript
// Example: Button component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  loading?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', loading = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {props.children}
      </button>
    );
  }
);
```

#### Molecules (Simple Combinations)
```typescript
// Example: FormField component
interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  description?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required = false,
  children,
  description,
}) => {
  const fieldId = useId();
  
  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId} className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
        {label}
      </Label>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {children}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
```

#### Organisms (Complex Components)
```typescript
// Example: DataTable component
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  loading?: boolean;
  searchable?: boolean;
  onSearch?: (query: string) => void;
}

export function DataTable<T>({
  data,
  columns,
  pagination,
  loading = false,
  searchable = false,
  onSearch,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const handleSearch = useCallback(
    debounce((query: string) => {
      onSearch?.(query);
    }, 300),
    [onSearch]
  );

  useEffect(() => {
    handleSearch(searchQuery);
  }, [searchQuery, handleSearch]);

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
      )}
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead key={index}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow key={index}>
                  {columns.map((column, colIndex) => (
                    <TableCell key={colIndex}>
                      {column.cell ? column.cell(row) : String(row[column.accessorKey as keyof T])}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {pagination && (
        <Pagination
          currentPage={pagination.page}
          totalPages={Math.ceil(pagination.total / pagination.limit)}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  );
}
```

### Component Composition Patterns

#### Higher-Order Components
```typescript
// Example: withAuth HOC
interface WithAuthProps {
  requiredRole?: string;
  fallback?: React.ReactNode;
}

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  { requiredRole, fallback }: WithAuthProps = {}
) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth();
    
    if (loading) {
      return <div>Loading...</div>;
    }
    
    if (!user) {
      return <Navigate to="/login" />;
    }
    
    if (requiredRole && user.role !== requiredRole) {
      return fallback || <div>Access denied</div>;
    }
    
    return <Component {...props} />;
  };
}

// Usage
const ProtectedApplicationsPage = withAuth(ApplicationsPage, {
  requiredRole: 'admin',
});
```

#### Render Props Pattern
```typescript
// Example: DataFetcher component
interface DataFetcherProps<T> {
  url: string;
  children: (data: {
    data: T | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
  }) => React.ReactNode;
}

export function DataFetcher<T>({ url, children }: DataFetcherProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(url);
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [url]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return <>{children({ data, loading, error, refetch: fetchData })}</>;
}
```

## State Management

### Client State (Zustand)

#### Store Structure
```typescript
// Example: Application wizard store
interface ApplicationWizardState {
  // Current step
  currentStep: number;
  totalSteps: number;
  
  // Form data
  step1Data: Step1PersonalInfo | null;
  step2Data: Step2AcademicInfo | null;
  step3Data: Step3ProgramSelection | null;
  step4Data: Step4AgentReferral | null;
  step5Data: Step5FinancialArrangements | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  isDirty: boolean;
  
  // Actions
  setCurrentStep: (step: number) => void;
  updateStep1Data: (data: Step1PersonalInfo) => void;
  updateStep2Data: (data: Step2AcademicInfo) => void;
  updateStep3Data: (data: Step3ProgramSelection) => void;
  updateStep4Data: (data: Step4AgentReferral) => void;
  updateStep5Data: (data: Step5FinancialArrangements) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setIsDirty: (dirty: boolean) => void;
  reset: () => void;
}

export const useApplicationWizardStore = create<ApplicationWizardState>((set, get) => ({
  // Initial state
  currentStep: 1,
  totalSteps: 5,
  step1Data: null,
  step2Data: null,
  step3Data: null,
  step4Data: null,
  step5Data: null,
  isLoading: false,
  error: null,
  isDirty: false,
  
  // Actions
  setCurrentStep: (step) => set({ currentStep: step }),
  
  updateStep1Data: (data) => set((state) => ({
    step1Data: { ...state.step1Data, ...data },
    isDirty: true,
  })),
  
  updateStep2Data: (data) => set((state) => ({
    step2Data: { ...state.step2Data, ...data },
    isDirty: true,
  })),
  
  updateStep3Data: (data) => set((state) => ({
    step3Data: { ...state.step3Data, ...data },
    isDirty: true,
  })),
  
  updateStep4Data: (data) => set((state) => ({
    step4Data: { ...state.step4Data, ...data },
    isDirty: true,
  })),
  
  updateStep5Data: (data) => set((state) => ({
    step5Data: { ...state.step5Data, ...data },
    isDirty: true,
  })),
  
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  
  reset: () => set({
    currentStep: 1,
    step1Data: null,
    step2Data: null,
    step3Data: null,
    step4Data: null,
    step5Data: null,
    isLoading: false,
    error: null,
    isDirty: false,
  }),
}));
```

#### Store Persistence
```typescript
// Example: Store with persistence
export const useApplicationWizardStore = create<ApplicationWizardState>()(
  persist(
    (set, get) => ({
      // Store implementation
    }),
    {
      name: 'application-wizard-storage',
      partialize: (state) => ({
        currentStep: state.currentStep,
        step1Data: state.step1Data,
        step2Data: state.step2Data,
        step3Data: state.step3Data,
        step4Data: state.step4Data,
        step5Data: state.step5Data,
      }),
    }
  )
);
```

### Server State (React Query)

#### Query Hooks
```typescript
// Example: Applications query hook
export const useApplications = (params: ListApplicationsParams) => {
  return useQuery({
    queryKey: ['applications', params],
    queryFn: () => fetchApplications(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Example: Application mutation hook
export const useCreateApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createApplication,
    onSuccess: (newApplication) => {
      // Invalidate and refetch applications
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      
      // Add to cache
      queryClient.setQueryData(['applications', newApplication.id], newApplication);
    },
    onError: (error) => {
      console.error('Failed to create application:', error);
    },
  });
};

// Example: Application update hook
export const useUpdateApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ApplicationData> }) =>
      updateApplication(id, data),
    onSuccess: (updatedApplication) => {
      // Update cache
      queryClient.setQueryData(['applications', updatedApplication.id], updatedApplication);
      
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
};
```

#### Query Configuration
```typescript
// Example: Query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});
```

## Form Management

### React Hook Form Integration

#### Form Setup
```typescript
// Example: Application form setup
const ApplicationForm = () => {
  const form = useForm<ApplicationData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      personalDetails: {
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'M',
        primaryEmail: '',
      },
      address: {
        residential: {
          streetNumber: '',
          streetName: '',
          suburb: '',
          state: '',
          postcode: '',
        },
        isPostalSameAsResidential: true,
      },
      avetmissDetails: {
        countryOfBirthId: '',
        languageAtHomeId: '',
        indigenousStatusId: '',
        highestSchoolLevelId: '',
        isAtSchool: false,
        hasDisability: false,
        hasPriorEducation: false,
        labourForceId: '',
      },
      enrolmentDetails: {
        programId: '',
        courseOfferingId: '',
        subjectStructure: {
          coreSubjectIds: [],
          electiveSubjectIds: [],
        },
        startDate: '',
        expectedCompletionDate: '',
        deliveryLocationId: '',
        deliveryModeId: '',
        fundingSourceId: '',
        studyReasonId: '',
        isVetInSchools: false,
      },
    },
    mode: 'onChange', // Real-time validation
  });

  const onSubmit = (data: ApplicationData) => {
    console.log('Form data:', data);
    // Handle form submission
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Form fields */}
      </form>
    </Form>
  );
};
```

#### Form Validation
```typescript
// Example: Zod validation schema
const applicationSchema = z.object({
  personalDetails: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    gender: z.enum(['M', 'F', 'X'], {
      errorMap: () => ({ message: 'Gender must be M, F, or X' }),
    }),
    primaryEmail: z.string().email('Invalid email format'),
  }),
  address: z.object({
    residential: addressSchema,
    isPostalSameAsResidential: z.boolean(),
    postal: addressSchema.optional(),
  }),
  avetmissDetails: z.object({
    countryOfBirthId: z.string().min(1, 'Country of birth is required'),
    languageAtHomeId: z.string().min(1, 'Language at home is required'),
    indigenousStatusId: z.string().min(1, 'Indigenous status is required'),
    highestSchoolLevelId: z.string().min(1, 'Highest school level is required'),
    isAtSchool: z.boolean(),
    hasDisability: z.boolean(),
    disabilityTypeIds: z.array(z.string()).optional(),
    hasPriorEducation: z.boolean(),
    priorEducationCodes: z.array(z.string()).optional(),
    labourForceId: z.string().min(1, 'Labour force status is required'),
  }),
  enrolmentDetails: z.object({
    programId: z.string().uuid('Invalid program ID'),
    courseOfferingId: z.string().uuid('Invalid course offering ID'),
    subjectStructure: z.object({
      coreSubjectIds: z.array(z.string().uuid()),
      electiveSubjectIds: z.array(z.string().uuid()),
    }),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    expectedCompletionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    deliveryLocationId: z.string().uuid('Invalid delivery location ID'),
    deliveryModeId: z.string().min(1, 'Delivery mode is required'),
    fundingSourceId: z.string().min(1, 'Funding source is required'),
    studyReasonId: z.string().min(1, 'Study reason is required'),
    isVetInSchools: z.boolean().default(false),
  }),
});
```

#### Form Field Components
```typescript
// Example: Form field component
interface FormFieldProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  description,
  required = false,
  children,
}) => {
  const fieldId = useId();
  
  return (
    <FormItem>
      <FormLabel htmlFor={fieldId} className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
        {label}
      </FormLabel>
      {description && (
        <FormDescription>{description}</FormDescription>
      )}
      <FormControl>
        {children}
      </FormControl>
      <FormMessage />
    </FormItem>
  );
};

// Usage
<FormField name="personalDetails.firstName" label="First Name" required>
  <Input {...form.register('personalDetails.firstName')} />
</FormField>
```

## UI/UX Design System

### Design Principles

#### Accessibility First
- **WCAG 2.1 AA Compliance**: All components meet accessibility standards
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Color Contrast**: Sufficient color contrast ratios
- **Focus Management**: Clear focus indicators

#### Mobile-First Design
- **Responsive Layout**: Adapts to all screen sizes
- **Touch-Friendly**: Appropriate touch targets (44px minimum)
- **Performance**: Optimized for mobile devices
- **Progressive Enhancement**: Works without JavaScript

#### Consistency
- **Design System**: ShadCN UI component library
- **Color Palette**: Consistent color usage
- **Typography**: Clear hierarchy and readability
- **Spacing**: Consistent spacing system

### Component Library

#### ShadCN UI Integration
```typescript
// Example: Custom button variants
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

#### Custom Components
```typescript
// Example: Status badge component
interface StatusBadgeProps {
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  className?: string;
}

const statusConfig = {
  draft: {
    label: 'Draft',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  submitted: {
    label: 'Submitted',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
};
```

### Layout System

#### Grid System
```typescript
// Example: Responsive grid component
interface GridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4 | 6 | 12;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Grid: React.FC<GridProps> = ({
  children,
  cols = 1,
  gap = 'md',
  className,
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
    12: 'grid-cols-12',
  };
  
  const gridGap = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };
  
  return (
    <div
      className={cn(
        'grid',
        gridCols[cols],
        gridGap[gap],
        className
      )}
    >
      {children}
    </div>
  );
};
```

#### Page Layout
```typescript
// Example: Page layout component
interface PageLayoutProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  description,
  actions,
  children,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-2">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
};
```

## Performance Optimization

### Code Splitting

#### Route-Based Splitting
```typescript
// Example: Lazy loading for heavy components
const ApplicationWizard = lazy(() => import('./ApplicationWizard'));
const ReportsDashboard = lazy(() => import('./ReportsDashboard'));
const DataTable = lazy(() => import('./DataTable'));

// Usage with Suspense
<Suspense fallback={<div>Loading...</div>}>
  <ApplicationWizard />
</Suspense>
```

#### Component-Based Splitting
```typescript
// Example: Dynamic imports for heavy components
const HeavyComponent = lazy(() => 
  import('./HeavyComponent').then(module => ({
    default: module.HeavyComponent
  }))
);
```

### Image Optimization

#### Next.js Image Component
```typescript
// Example: Optimized image component
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
}) => {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={className}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
    />
  );
};
```

### Caching Strategy

#### React Query Caching
```typescript
// Example: Query client with caching configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});
```

#### Local Storage Caching
```typescript
// Example: Local storage cache utility
class LocalStorageCache {
  private prefix = 'xportal_cache_';
  
  set(key: string, value: any, ttl: number = 3600000) { // 1 hour default
    const item = {
      value,
      timestamp: Date.now(),
      ttl,
    };
    localStorage.setItem(this.prefix + key, JSON.stringify(item));
  }
  
  get(key: string) {
    const item = localStorage.getItem(this.prefix + key);
    if (!item) return null;
    
    const parsed = JSON.parse(item);
    const now = Date.now();
    
    if (now - parsed.timestamp > parsed.ttl) {
      localStorage.removeItem(this.prefix + key);
      return null;
    }
    
    return parsed.value;
  }
  
  remove(key: string) {
    localStorage.removeItem(this.prefix + key);
  }
  
  clear() {
    Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix))
      .forEach(key => localStorage.removeItem(key));
  }
}

export const cache = new LocalStorageCache();
```

## Testing Strategy

### Unit Testing

#### Component Testing
```typescript
// Example: Component test
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });
  
  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('shows loading state', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
```

#### Hook Testing
```typescript
// Example: Hook test
import { renderHook, act } from '@testing-library/react';
import { useApplicationWizardStore } from './useApplicationWizardStore';

describe('useApplicationWizardStore', () => {
  beforeEach(() => {
    useApplicationWizardStore.getState().reset();
  });
  
  it('initializes with correct default values', () => {
    const { result } = renderHook(() => useApplicationWizardStore());
    
    expect(result.current.currentStep).toBe(1);
    expect(result.current.totalSteps).toBe(5);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isDirty).toBe(false);
  });
  
  it('updates step data correctly', () => {
    const { result } = renderHook(() => useApplicationWizardStore());
    
    act(() => {
      result.current.updateStep1Data({
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'M',
        primaryEmail: 'john.doe@example.com',
      });
    });
    
    expect(result.current.step1Data).toEqual({
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      gender: 'M',
      primaryEmail: 'john.doe@example.com',
    });
    expect(result.current.isDirty).toBe(true);
  });
});
```

### Integration Testing

#### API Integration Testing
```typescript
// Example: API integration test
import { server } from '../mocks/server';
import { rest } from 'msw';
import { render, screen, waitFor } from '@testing-library/react';
import { ApplicationsPage } from './ApplicationsPage';

describe('ApplicationsPage', () => {
  it('displays applications data', async () => {
    server.use(
      rest.get('/api/applications', (req, res, ctx) => {
        return res(
          ctx.json({
            data: [
              {
                id: '1',
                status: 'Draft',
                clientName: 'John Doe',
                clientEmail: 'john.doe@example.com',
                programName: 'Certificate III in Business',
                createdAt: '2024-01-01T00:00:00Z',
              },
            ],
            pagination: {
              page: 1,
              limit: 20,
              total: 1,
              totalPages: 1,
              hasNext: false,
              hasPrevious: false,
            },
          })
        );
      })
    );
    
    render(<ApplicationsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('Certificate III in Business')).toBeInTheDocument();
    });
  });
});
```

### End-to-End Testing

#### Playwright E2E Tests
```typescript
// Example: E2E test
import { test, expect } from '@playwright/test';

test.describe('Application Wizard', () => {
  test('completes application wizard flow', async ({ page }) => {
    await page.goto('/students/new');
    
    // Step 1: Personal Information
    await page.fill('[name="personalDetails.firstName"]', 'John');
    await page.fill('[name="personalDetails.lastName"]', 'Doe');
    await page.fill('[name="personalDetails.dateOfBirth"]', '1990-01-01');
    await page.selectOption('[name="personalDetails.gender"]', 'M');
    await page.fill('[name="personalDetails.primaryEmail"]', 'john.doe@example.com');
    
    await page.click('button[type="submit"]');
    
    // Step 2: Academic Information
    await page.selectOption('[name="avetmissDetails.countryOfBirthId"]', '1101');
    await page.selectOption('[name="avetmissDetails.languageAtHomeId"]', '1201');
    await page.selectOption('[name="avetmissDetails.indigenousStatusId"]', '4');
    await page.selectOption('[name="avetmissDetails.highestSchoolLevelId"]', '12');
    
    await page.click('button[type="submit"]');
    
    // Continue through remaining steps...
    
    // Final review
    await expect(page.locator('h1')).toContainText('Review Application');
    await expect(page.locator('text=John Doe')).toBeVisible();
    
    // Submit application
    await page.click('button:has-text("Submit Application")');
    
    // Verify success
    await expect(page.locator('text=Application submitted successfully')).toBeVisible();
  });
});
```

## Accessibility Implementation

### ARIA Labels and Descriptions

#### Form Accessibility
```typescript
// Example: Accessible form field
interface AccessibleFormFieldProps {
  id: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export const AccessibleFormField: React.FC<AccessibleFormFieldProps> = ({
  id,
  label,
  description,
  error,
  required = false,
  children,
}) => {
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          required && "after:content-['*'] after:ml-0.5 after:text-red-500"
        )}
      >
        {label}
      </label>
      
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      {React.cloneElement(children as React.ReactElement, {
        id,
        'aria-describedby': cn(
          description && descriptionId,
          error && errorId
        ).trim() || undefined,
        'aria-invalid': error ? 'true' : 'false',
        'aria-required': required,
      })}
      
      {error && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
```

#### Navigation Accessibility
```typescript
// Example: Accessible navigation
export const AccessibleNavigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <nav role="navigation" aria-label="Main navigation">
      <button
        aria-expanded={isOpen}
        aria-controls="navigation-menu"
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden"
      >
        <span className="sr-only">Toggle navigation menu</span>
        <Menu className="h-6 w-6" />
      </button>
      
      <div
        id="navigation-menu"
        className={cn(
          'md:block',
          isOpen ? 'block' : 'hidden'
        )}
      >
        <ul role="list" className="space-y-2">
          <li>
            <a
              href="/students"
              className="block px-3 py-2 rounded-md text-sm font-medium"
              aria-current="page"
            >
              Students
            </a>
          </li>
          <li>
            <a
              href="/programs"
              className="block px-3 py-2 rounded-md text-sm font-medium"
            >
              Programs
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
};
```

### Keyboard Navigation

#### Focus Management
```typescript
// Example: Focus management hook
export const useFocusManagement = () => {
  const focusRef = useRef<HTMLElement>(null);
  
  const focusFirst = useCallback(() => {
    focusRef.current?.focus();
  }, []);
  
  const trapFocus = useCallback((element: HTMLElement) => {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };
    
    element.addEventListener('keydown', handleKeyDown);
    return () => element.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return { focusRef, focusFirst, trapFocus };
};
```

## Conclusion

The XPortal frontend development follows modern React best practices with a strong focus on type safety, performance, and accessibility. The component-based architecture with atomic design principles provides a scalable and maintainable codebase, while the comprehensive state management and form handling ensure a smooth user experience.

Key strengths of the frontend architecture:
- **Type Safety**: End-to-end TypeScript implementation
- **Performance**: Code splitting, lazy loading, and caching strategies
- **Accessibility**: WCAG 2.1 AA compliance with comprehensive ARIA support
- **User Experience**: Intuitive navigation and responsive design
- **Maintainability**: Clear component structure and separation of concerns
- **Testing**: Comprehensive unit, integration, and E2E testing

This frontend architecture provides a solid foundation for the XPortal Student Management System while ensuring excellent user experience and long-term maintainability.

---

*This document provides a comprehensive overview of the XPortal frontend development. For detailed implementation examples, please refer to the specific component documentation and code examples.*
