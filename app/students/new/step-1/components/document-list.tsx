'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  File, 
  Download, 
  Trash2, 
  Image, 
  FileText, 
  AlertCircle,
  Calendar,
  HardDrive
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  path: string;
  doc_type: string;
  version: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

interface DocumentListProps {
  documents: Document[];
  isLoading: boolean;
  onDelete: (documentId: string) => Promise<void>;
}

export function DocumentList({ documents, isLoading, onDelete }: DocumentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-4 w-4 text-blue-500" alt="Image file" />;
    }
    if (mimeType === 'application/pdf') {
      return <FileText className="h-4 w-4 text-red-500" alt="PDF file" />;
    }
    if (mimeType.includes('word')) {
      return <FileText className="h-4 w-4 text-blue-600" alt="Word document" />;
    }
    return <File className="h-4 w-4 text-muted-foreground" alt="File" />;
  };

  const getCategoryBadge = (docType: string) => {
    const categoryMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'EVIDENCE': { label: 'Evidence', variant: 'default' },
      'OFFER_LETTER': { label: 'Offer Letter', variant: 'secondary' },
      'COE': { label: 'CoE', variant: 'outline' },
      'OTHER': { label: 'Other', variant: 'outline' }
    };
    
    const category = categoryMap[docType] || { label: docType, variant: 'outline' as const };
    return <Badge variant={category.variant}>{category.label}</Badge>;
  };

  const handleDelete = async (documentId: string) => {
    setDeletingId(documentId);
    try {
      await onDelete(documentId);
    } catch (error) {
      console.error('Error deleting document:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (document: Document) => {
    // TODO: Implement download functionality
    console.log('Download document:', document);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No documents uploaded yet. Use the dropzone above to upload your documents.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">
          {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded
        </h4>
        <div className="text-sm text-muted-foreground">
          Total size: {formatFileSize(documents.reduce((sum, doc) => sum + doc.size_bytes, 0))}
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((document) => {
              const filename = document.path.split('/').pop() || 'Unknown';
              const isDeleting = deletingId === document.id;
              
              return (
                <TableRow key={document.id} className={cn(isDeleting && 'opacity-50')}>
                  <TableCell>
                    {getFileIcon(document.mime_type)}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-sm truncate max-w-xs" title={filename}>
                        {filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {document.mime_type}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getCategoryBadge(document.doc_type)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <HardDrive className="h-3 w-3" />
                      <span>{formatFileSize(document.size_bytes)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(document.created_at)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(document)}
                        disabled={isDeleting}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Document</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &quot;{filename}&quot;? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(document.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
