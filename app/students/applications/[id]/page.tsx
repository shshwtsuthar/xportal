'use client';

import { useParams } from 'next/navigation';
import { useApplicationById } from '@/hooks/use-applications-status';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap
} from 'lucide-react';
import Link from 'next/link';

// Details are provided by the Supabase Edge Function via useApplicationById

export default function ApplicationDetailsPage() {
  const params = useParams();
  const applicationId = params.id as string;

  const { data: application, isLoading, isError, error } = useApplicationById(applicationId);

  const getStatusConfig = (status: string) => {
    const configs = {
      Draft: {
        variant: 'secondary' as const,
        icon: <Clock className="h-3 w-3" />,
        color: 'text-yellow-600',
      },
      Submitted: {
        variant: 'default' as const,
        icon: <FileText className="h-3 w-3" />,
        color: 'text-blue-600',
      },
      Approved: {
        variant: 'default' as const,
        icon: <CheckCircle className="h-3 w-3" />,
        color: 'text-green-600',
      },
      Rejected: {
        variant: 'destructive' as const,
        icon: <XCircle className="h-3 w-3" />,
        color: 'text-red-600',
      },
    };
    return configs[status as keyof typeof configs] || configs.Draft;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>
            Error loading application: {error?.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>
            Application not found
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const statusConfig = getStatusConfig(application.status);
  const payload = application.applicationPayload;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/students/applications">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Application Details</h1>
          <p className="text-muted-foreground">View and manage application information</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">First Name</label>
                  <p className="text-lg">{payload.personalDetails.firstName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                  <p className="text-lg">{payload.personalDetails.lastName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-lg flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {payload.personalDetails.primaryEmail}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p className="text-lg flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {payload.personalDetails.phoneNumber}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                  <p className="text-lg flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(payload.personalDetails.dateOfBirth).toLocaleDateString('en-AU')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Gender</label>
                  <p className="text-lg">{payload.personalDetails.gender}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>{payload.address.residential.street_number} {payload.address.residential.street_name}</p>
                <p>{payload.address.residential.suburb}, {payload.address.residential.state} {payload.address.residential.postcode}</p>
                <p>{payload.address.residential.country}</p>
              </div>
            </CardContent>
          </Card>

          {/* Program Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Program Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Program Name</label>
                  <p className="text-lg">{payload.programDetails.programName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Course Offering ID</label>
                  <p className="text-sm font-mono text-muted-foreground">{payload.programDetails.courseOfferingId}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={statusConfig.variant} className="flex items-center space-x-2 w-fit">
                {statusConfig.icon}
                <span>{application.status}</span>
              </Badge>
            </CardContent>
          </Card>

          {/* Application Info */}
          <Card>
            <CardHeader>
              <CardTitle>Application Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Application ID</label>
                <p className="text-sm font-mono text-muted-foreground">{application.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p className="text-sm">{formatDate(application.createdAt)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="text-sm">{formatDate(application.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {application.status === 'Draft' && (
                <Button className="w-full">
                  Submit for Review
                </Button>
              )}
              {application.status === 'Submitted' && (
                <div className="space-y-2">
                  <Button variant="outline" className="w-full">
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button className="w-full">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </div>
              )}
              {application.status === 'Approved' && (
                <Button variant="outline" className="w-full">
                  Generate Offer Letter
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
