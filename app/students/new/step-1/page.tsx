'use client';

import { } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WizardProgress } from '../components/wizard-progress';
import { useApplicationWizard } from '@/stores/application-wizard';
import { DocumentDropzone } from './components/document-dropzone';
import { DocumentList } from './components/document-list';
import { useDocumentUpload } from '@/hooks/use-document-upload';

// =============================================================================
// STEP 1: DOCUMENT UPLOAD
// Handles document uploads for the application
// =============================================================================

export default function Step1DocumentUpload() {
  const router = useRouter();
  const { nextStep, draftId } = useApplicationWizard();
  const { documents, isLoading, uploadFile, deleteDocument, refreshDocuments } = useDocumentUpload(draftId || '');

  const handleNext = () => {
    nextStep();
    router.push('/students/new/step-2');
  };

  const handleFileUpload = async (file: File) => {
    if (!draftId) return;
    
    try {
      await uploadFile(file, 'EVIDENCE');
      await refreshDocuments();
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleFileDelete = async (documentId: string) => {
    if (!draftId) return;
    
    try {
      await deleteDocument(documentId);
      await refreshDocuments();
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Progress Indicator */}
      <WizardProgress />
      
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Page Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground">Document Upload</h1>
            <p className="mt-2 text-muted-foreground">
              Upload supporting documents for your application. You can upload passport scans, 
              academic transcripts, certificates, and other relevant documents.
            </p>
          </div>
          
          {/* Document Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
              <CardDescription>
                Drag and drop files here or click to browse. Supported formats: 
                Images (JPG, PNG, GIF, WebP), PDF, Word documents (DOC, DOCX)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentDropzone onFileUpload={handleFileUpload} />
            </CardContent>
          </Card>

          {/* Document List Section */}
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Documents</CardTitle>
              <CardDescription>
                Review and manage your uploaded documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentList 
                documents={documents}
                isLoading={isLoading}
                onDelete={handleFileDelete}
              />
            </CardContent>
          </Card>
          
          {/* Navigation */}
          <div className="flex justify-end">
            <Button onClick={handleNext} className="px-8">
              Continue to Personal Information
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
