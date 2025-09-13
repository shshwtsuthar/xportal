# Document Upload Implementation Plan

## Overview
This document outlines the implementation plan for adding document upload functionality to the XPortal application wizard. We will add a new Step 1 for document uploads and restructure the existing wizard steps accordingly.

## Current State Analysis

### ✅ Already Implemented
- Database schema: `sms_op.application_documents` table
- Storage bucket: `student-docs` (private)
- Basic document operations: List, CoE upload, offer letter generation
- RLS policies and security infrastructure

### ❌ Missing Components
- General document upload endpoints (upload-url, confirm, delete)
- Frontend dropzone component
- Signed URL generation for secure uploads
- File management UI

## Implementation Plan

### Phase 1: Backend Implementation

#### 1.1 Add Missing API Endpoints
Add the following endpoints to `supabase/functions/applications/index.ts`:

**POST /applications/{id}/documents/upload-url**
- Validates user permissions and application access
- Generates signed URL with 1-hour expiration
- Returns upload URL + required headers
- Request body: `{ filename: string, contentType: string, category: string }`

**POST /applications/{id}/documents/confirm**
- Confirms successful file upload
- Records metadata in `sms_op.application_documents`
- Validates file exists in storage
- Request body: `{ path: string, size: number, hash?: string }`

**DELETE /applications/{id}/documents/{docId}**
- Deletes document from storage and database
- Validates user permissions
- Removes both storage object and metadata record

#### 1.2 Update OpenAPI Specification
- Add new endpoints to `openapi.yaml`
- Define request/response schemas
- Update type generation

#### 1.3 Security Enhancements
- Implement proper RLS policies for document access
- Add file size limits (20MB per file, 200MB per application)
- Add file type validation (images, PDFs, documents)
- Implement virus scanning placeholder

### Phase 2: Frontend Restructuring

#### 2.1 Wizard Step Renaming
Use PowerShell commands to rename directories and update references:

```powershell
# Rename existing steps
Rename-Item "app/students/new/step-1" "app/students/new/step-2"
Rename-Item "app/students/new/step-2" "app/students/new/step-3"
Rename-Item "app/students/new/step-3" "app/students/new/step-4"
Rename-Item "app/students/new/step-4" "app/students/new/step-5"
Rename-Item "app/students/new/step-5" "app/students/new/step-6"

# Create new step-1 directory
New-Item -ItemType Directory "app/students/new/step-1"
```

#### 2.2 Update References
- Update all import paths in renamed components
- Update wizard progress component
- Update routing in main wizard container
- Update step numbers in wizard state management

#### 2.3 New Step 1 Implementation
Create `app/students/new/step-1/page.tsx` with:
- Document upload dropzone using ShadCN components
- File list display with delete functionality
- Progress indicators for uploads
- Accessibility features (ARIA labels, keyboard navigation)

### Phase 3: Component Implementation

#### 3.1 Document Dropzone Component
Create `app/students/new/step-1/components/document-dropzone.tsx`:
- Drag-and-drop functionality
- File type validation
- Upload progress tracking
- Error handling and user feedback
- Accessibility compliance

#### 3.2 Document List Component
Create `app/students/new/step-1/components/document-list.tsx`:
- Display uploaded files with metadata
- Delete functionality with confirmation
- Download links (signed URLs)
- Category badges and file icons

#### 3.3 Hooks for Document Management
Create `hooks/use-document-upload.ts`:
- Upload URL generation
- File upload handling
- Document listing and management
- Error handling and loading states

### Phase 4: Integration and Testing

#### 4.1 Wizard Integration
- Update wizard state management for new step
- Implement step validation logic
- Add document requirements checking
- Update navigation flow

#### 4.2 Testing Strategy
- Unit tests for document upload hooks
- Integration tests for API endpoints
- E2E tests for complete upload flow
- Accessibility testing

## File Structure After Implementation

```
app/students/new/
├── step-1/                    # NEW: Document Upload
│   ├── page.tsx
│   └── components/
│       ├── document-dropzone.tsx
│       └── document-list.tsx
├── step-2/                    # Personal Information (was step-1)
├── step-3/                    # Academic Information (was step-2)
├── step-4/                    # Program Selection (was step-3)
├── step-5/                    # Agent Referral (was step-4)
├── step-6/                    # Financial Arrangements (was step-5)
└── review/                    # Review (unchanged)
```

## API Endpoints

### Document Upload Flow
1. **Request Upload URL**
   ```
   POST /applications/{id}/documents/upload-url
   Body: { filename: "passport.pdf", contentType: "application/pdf", category: "EVIDENCE" }
   Response: { uploadUrl: "https://...", headers: {...}, expiresAt: "..." }
   ```

2. **Upload File**
   ```
   PUT {uploadUrl}
   Headers: { Content-Type: "application/pdf", ... }
   Body: [file binary data]
   ```

3. **Confirm Upload**
   ```
   POST /applications/{id}/documents/confirm
   Body: { path: "applications/123/uploads/passport.pdf", size: 1024000 }
   Response: { id: "doc-123", message: "Document uploaded successfully" }
   ```

4. **List Documents**
   ```
   GET /applications/{id}/documents
   Response: { data: [{ id, filename, category, size, createdAt, ... }] }
   ```

5. **Delete Document**
   ```
   DELETE /applications/{id}/documents/{docId}
   Response: { message: "Document deleted successfully" }
   ```

## Security Considerations

### File Validation
- Maximum file size: 20MB per file
- Maximum total: 200MB per application
- Allowed types: images/*, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document
- File extension validation
- MIME type verification

### Access Control
- RLS policies on `sms_op.application_documents`
- Signed URLs with 1-hour expiration
- Role-based permissions (staff, admin, agent)
- Application ownership validation

### Audit Trail
- All uploads logged with user ID and timestamp
- File metadata stored for compliance
- Deletion tracking for audit purposes

## Error Handling

### Backend Errors
- 400: Invalid file type or size
- 401: Unauthorized access
- 403: Insufficient permissions
- 404: Application not found
- 413: File too large
- 500: Storage or database errors

### Frontend Errors
- Network connectivity issues
- File validation errors
- Upload progress failures
- Permission denied scenarios

## Performance Considerations

### Upload Optimization
- Direct upload to Supabase Storage (no server intermediary)
- Chunked upload for large files
- Progress tracking and cancellation
- Retry logic for failed uploads

### UI/UX
- Optimistic updates for better perceived performance
- Skeleton loading states
- Debounced file validation
- Responsive design for mobile devices

## Testing Checklist

### Backend Testing
- [ ] Upload URL generation works correctly
- [ ] File upload to signed URL succeeds
- [ ] Metadata recording functions properly
- [ ] File deletion removes both storage and database records
- [ ] RLS policies prevent unauthorized access
- [ ] File size and type validation works
- [ ] Error handling covers all edge cases

### Frontend Testing
- [ ] Dropzone accepts valid files
- [ ] File validation shows appropriate errors
- [ ] Upload progress displays correctly
- [ ] File list updates after upload/delete
- [ ] Navigation between steps works
- [ ] Accessibility features function properly
- [ ] Mobile responsiveness works

### Integration Testing
- [ ] Complete upload flow works end-to-end
- [ ] Wizard step progression includes document step
- [ ] Document requirements validation works
- [ ] Error recovery scenarios work
- [ ] Performance meets requirements

## Deployment Considerations

### Environment Variables
- `SUPABASE_URL`: Storage endpoint
- `SUPABASE_SERVICE_ROLE_KEY`: Service role for storage operations
- `MAX_FILE_SIZE`: Configurable file size limit
- `ALLOWED_FILE_TYPES`: Configurable file type restrictions

### Database Migrations
- No new migrations required (schema already exists)
- Verify RLS policies are properly configured
- Test with production-like data volumes

### Storage Configuration
- Verify `student-docs` bucket exists and is private
- Configure CORS for direct uploads
- Set up monitoring for storage usage
- Implement backup and retention policies

## Success Criteria

### Functional Requirements
- Users can upload documents via drag-and-drop
- Files are stored securely in the correct location
- Document list shows all uploaded files
- Users can delete uploaded documents
- Wizard progression includes document step
- All file types and sizes are properly validated

### Non-Functional Requirements
- Upload process completes within 30 seconds for typical files
- UI is responsive and accessible
- Error messages are clear and actionable
- System handles concurrent uploads gracefully
- Security requirements are met

## Future Enhancements

### Phase 2 Features
- Bulk file upload
- File preview functionality
- Document categorization UI
- Advanced file validation (virus scanning)
- Document templates and requirements

### Phase 3 Features
- Document versioning
- File compression and optimization
- Integration with external document services
- Advanced search and filtering
- Document workflow automation

## Implementation Timeline

### Week 1: Backend Implementation
- Day 1-2: API endpoints implementation
- Day 3: OpenAPI specification updates
- Day 4: Security and validation
- Day 5: Testing and bug fixes

### Week 2: Frontend Implementation
- Day 1-2: Wizard restructuring
- Day 3-4: Dropzone and file management components
- Day 5: Integration and testing

### Week 3: Testing and Polish
- Day 1-2: Comprehensive testing
- Day 3-4: Bug fixes and performance optimization
- Day 5: Documentation and deployment preparation

This plan provides a comprehensive roadmap for implementing document upload functionality while maintaining the existing application's architecture and security standards.
