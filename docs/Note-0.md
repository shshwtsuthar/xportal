/app
├── /dashboard                    # Main dashboard (role-based)
├── /auth                        # Authentication
│   ├── /login
│   ├── /register
│   └── /forgot-password
│
├── /students                    # Student Management
│   ├── /                        # Student list/search
│   ├── /new                     # New Application Wizard ⭐
│   ├── /[studentId]             # Student profile
│   │   ├── /overview
│   │   ├── /enrolments
│   │   ├── /academic-progress
│   │   ├── /financial
│   │   ├── /documents
│   │   └── /notes
│   └── /[studentId]/enrolments/[enrolmentId]
│       ├── /overview
│       ├── /subjects
│       ├── /attendance
│       ├── /assessments
│       └── /results
│
├── /programs                    # Program Management
│   ├── /                        # Program catalog
│   ├── /[programId]             # Program details
│   ├── /[programId]/subjects    # Program structure
│   └── /create                  # Create new program
│
├── /course-offerings            # Course Delivery
│   ├── /                        # Active offerings
│   ├── /[offeringId]            # Offering details
│   ├── /[offeringId]/schedule   # Timetable
│   ├── /[offeringId]/attendance # Attendance tracking
│   └── /create                  # Create new offering
│
├── /staff                       # Staff Management
│   ├── /                        # Staff directory
│   ├── /[staffId]               # Staff profile
│   └── /trainers                # Trainer-specific views
│
├── /agents                      # Agent Management
│   ├── /                        # Agent directory
│   ├── /[agentId]               # Agent profile
│   └── /commissions             # Commission tracking
│
├── /finance                     # Financial Management
│   ├── /invoices                # Invoice management
│   ├── /payments                # Payment tracking
│   ├── /payment-plans           # Payment plan management
│   ├── /commissions             # Agent commissions
│   └── /reports                 # Financial reports
│
├── /compliance                  # Compliance & Reporting
│   ├── /avetmiss                # AVETMISS reporting
│   │   ├── /submissions         # Submission history
│   │   ├── /create              # Create new submission
│   │   └── /[submissionId]      # Submission details
│   ├── /cricos                  # CRICOS management
│   │   ├── /coes                # Confirmation of Enrolments
│   │   └── /international-students
│   └── /audits                  # Audit trails
│
├── /reports                     # Reporting & Analytics
│   ├── /academic                # Academic reports
│   ├── /financial               # Financial reports
│   ├── /compliance              # Compliance reports
│   └── /custom                  # Custom reports
│
├── /settings                    # System Configuration
│   ├── /organisation            # Organisation details
│   ├── /locations               # Delivery locations
│   ├── /users                   # User management
│   ├── /roles                   # Role permissions
│   └── /system                  # System settings
│
└── /help                        # Help & Documentation
    ├── /user-guide
    ├── /compliance-guide
    └── /support

    