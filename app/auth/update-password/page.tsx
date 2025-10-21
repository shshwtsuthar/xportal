import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { UpdatePasswordForm } from './_components/UpdatePasswordForm';

export default function UpdatePasswordPage() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Update Password
          </CardTitle>
          <CardDescription>
            Enter your new password below. If you get stuck in a redirect loop,
            try clearing site data and re-opening your invitation link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UpdatePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
