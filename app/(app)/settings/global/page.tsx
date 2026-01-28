'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Save,
  Settings,
  Bell,
  Shield,
  Database,
  Globe,
  Mail,
  Building2,
} from 'lucide-react';
import { useGetRto } from '@/src/hooks/useGetRto';
import { useUpdateRto } from '@/src/hooks/useUpdateRto';
import { RtoProfileImageSection } from '@/app/(app)/rto/_components/RtoProfileImageSection';
import { PageContainer } from '@/components/page-container';

type SettingsSection = {
  id: string;
  title: string;
  icon: React.ElementType;
};

const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: 'general', title: 'General', icon: Settings },
  { id: 'organization', title: 'Organization', icon: Building2 },
  { id: 'notifications', title: 'Notifications', icon: Bell },
  { id: 'security', title: 'Security', icon: Shield },
  { id: 'system', title: 'System', icon: Database },
  { id: 'integrations', title: 'Integrations', icon: Globe },
  { id: 'email', title: 'Email', icon: Mail },
];

export default function GlobalSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get('section') || 'general';
  const { data: rto, isLoading: isLoadingRto } = useGetRto();
  const updateRto = useUpdateRto();

  const [settings, setSettings] = useState({
    applicationName: 'XPortal',
    supportEmail: 'support@xportal.com',
    defaultTimezone: 'Australia/Sydney',
    enableNotifications: true,
    enableEmailAlerts: true,
    maintenanceMode: false,
    maxFileUploadSize: '10',
    sessionTimeout: '60',
    passwordPolicy: 'medium',
    // RTO Organization fields
    rtoName: '',
    rtoCode: '',
    cricosCode: '',
    typeIdentifier: '',
    addressLine1: '',
    suburb: '',
    state: '',
    postcode: '',
    statisticalArea1: '',
    statisticalArea2: '',
    phoneNumber: '',
    facsimileNumber: '',
    emailAddress: '',
    offerLetterEmailAddress: '',
  });

  // Load RTO data when available
  useEffect(() => {
    if (rto) {
      setSettings((prev) => ({
        ...prev,
        rtoName: rto.name || '',
        rtoCode: rto.rto_code || '',
        cricosCode: rto.cricos_code || '',
        typeIdentifier: rto.type_identifier || '',
        addressLine1: rto.address_line_1 || '',
        suburb: rto.suburb || '',
        state: rto.state || '',
        postcode: rto.postcode || '',
        statisticalArea1: rto.statistical_area_1_id || '',
        statisticalArea2: rto.statistical_area_2_id || '',
        phoneNumber: rto.phone_number || '',
        facsimileNumber: rto.facsimile_number || '',
        emailAddress: rto.email_address || '',
        offerLetterEmailAddress:
          (rto as { offer_letter_email_address?: string })
            ?.offer_letter_email_address || '',
      }));
    }
  }, [rto]);

  const handleSectionChange = (sectionId: string) => {
    router.push(`/settings/global?section=${sectionId}`, { scroll: false });
  };

  const handleSave = async () => {
    if (activeSection === 'organization') {
      try {
        await updateRto.mutateAsync({
          name: settings.rtoName,
          rto_code: settings.rtoCode,
          cricos_code: settings.cricosCode || null,
          type_identifier: settings.typeIdentifier || null,
          address_line_1: settings.addressLine1 || null,
          suburb: settings.suburb || null,
          state: settings.state || null,
          postcode: settings.postcode || null,
          statistical_area_1_id: settings.statisticalArea1 || null,
          statistical_area_2_id: settings.statisticalArea2 || null,
          phone_number: settings.phoneNumber || null,
          facsimile_number: settings.facsimileNumber || null,
          email_address: settings.emailAddress || null,
          offer_letter_email_address: settings.offerLetterEmailAddress || null,
        } as Parameters<typeof updateRto.mutateAsync>[0]);
        toast.success('Organization settings saved successfully');
      } catch (error) {
        toast.error('Failed to save organization settings');
        console.error('Error updating RTO:', error);
      }
    } else {
      // TODO: Implement save functionality for other sections
      toast.success('Settings saved successfully');
    }
  };

  const handleChange = (key: string, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <PageContainer
      title="Settings"
      description="Configure application settings and preferences"
    >
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Mobile Section Selector */}
        <div className="md:hidden">
          <Select value={activeSection} onValueChange={handleSectionChange}>
            <SelectTrigger>
              <SelectValue>
                {SETTINGS_SECTIONS.find((s) => s.id === activeSection)?.title}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SETTINGS_SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <SelectItem key={section.id} value={section.id}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{section.title}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Sidebar Navigation */}
        <aside className="hidden w-64 shrink-0 md:block">
          <nav className="space-y-1">
            {SETTINGS_SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => handleSectionChange(section.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  aria-label={section.title}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{section.title}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="min-w-0 flex-1">
          <div className="grid gap-6">
            {/* General Settings */}
            {activeSection === 'general' && (
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>
                    Basic application configuration and branding
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="applicationName">Application Name</Label>
                      <Input
                        id="applicationName"
                        value={settings.applicationName}
                        onChange={(e) =>
                          handleChange('applicationName', e.target.value)
                        }
                        placeholder="Enter application name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supportEmail">Support Email</Label>
                      <Input
                        id="supportEmail"
                        type="email"
                        value={settings.supportEmail}
                        onChange={(e) =>
                          handleChange('supportEmail', e.target.value)
                        }
                        placeholder="support@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultTimezone">Default Timezone</Label>
                    <Select
                      value={settings.defaultTimezone}
                      onValueChange={(value) =>
                        handleChange('defaultTimezone', value)
                      }
                    >
                      <SelectTrigger id="defaultTimezone">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Australia/Sydney">
                          Australia/Sydney (AEST)
                        </SelectItem>
                        <SelectItem value="Australia/Melbourne">
                          Australia/Melbourne (AEST)
                        </SelectItem>
                        <SelectItem value="Australia/Brisbane">
                          Australia/Brisbane (AEST)
                        </SelectItem>
                        <SelectItem value="Australia/Perth">
                          Australia/Perth (AWST)
                        </SelectItem>
                        <SelectItem value="Australia/Adelaide">
                          Australia/Adelaide (ACST)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  <Button onClick={handleSave} className="ml-auto">
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Organization Settings */}
            {activeSection === 'organization' && (
              <div className="grid gap-6">
                {/* RTO Logo Upload Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>RTO Logo</CardTitle>
                    <CardDescription>
                      Upload your organization&apos;s logo or profile image
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingRto ? (
                      <div className="flex items-center justify-center p-8">
                        <p className="text-muted-foreground text-sm">
                          Loading...
                        </p>
                      </div>
                    ) : (
                      <RtoProfileImageSection
                        profileImagePath={rto?.profile_image_path}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* RTO Information Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>RTO Information</CardTitle>
                    <CardDescription>
                      Basic registration and identification details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="rtoName">RTO Name</Label>
                        <Input
                          id="rtoName"
                          value={settings.rtoName}
                          onChange={(e) =>
                            handleChange('rtoName', e.target.value)
                          }
                          placeholder="Enter RTO name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rtoCode">RTO Code</Label>
                        <Input
                          id="rtoCode"
                          value={settings.rtoCode}
                          onChange={(e) =>
                            handleChange('rtoCode', e.target.value)
                          }
                          placeholder="Enter RTO code"
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="cricosCode">CRICOS Code</Label>
                        <Input
                          id="cricosCode"
                          value={settings.cricosCode}
                          onChange={(e) =>
                            handleChange('cricosCode', e.target.value)
                          }
                          placeholder="Enter CRICOS code"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="typeIdentifier">Type Identifier</Label>
                        <Select
                          value={settings.typeIdentifier}
                          onValueChange={(value) =>
                            handleChange('typeIdentifier', value)
                          }
                        >
                          <SelectTrigger id="typeIdentifier" className="w-full">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RTO">RTO</SelectItem>
                            <SelectItem value="CRICOS">CRICOS</SelectItem>
                            <SelectItem value="TEQSA">TEQSA</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Address Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Address</CardTitle>
                    <CardDescription>
                      Organization address and location details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="addressLine1">Address Line 1</Label>
                      <Input
                        id="addressLine1"
                        value={settings.addressLine1}
                        onChange={(e) =>
                          handleChange('addressLine1', e.target.value)
                        }
                        placeholder="Street address"
                      />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="suburb">Suburb</Label>
                        <Input
                          id="suburb"
                          value={settings.suburb}
                          onChange={(e) =>
                            handleChange('suburb', e.target.value)
                          }
                          placeholder="Suburb"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Select
                          value={settings.state}
                          onValueChange={(value) =>
                            handleChange('state', value)
                          }
                        >
                          <SelectTrigger id="state" className="w-full">
                            <SelectValue placeholder="Select a state" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VIC">Victoria</SelectItem>
                            <SelectItem value="NSW">New South Wales</SelectItem>
                            <SelectItem value="QLD">Queensland</SelectItem>
                            <SelectItem value="SA">South Australia</SelectItem>
                            <SelectItem value="WA">
                              Western Australia
                            </SelectItem>
                            <SelectItem value="TAS">Tasmania</SelectItem>
                            <SelectItem value="NT">
                              Northern Territory
                            </SelectItem>
                            <SelectItem value="ACT">
                              Australian Capital Territory
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="postcode">Postcode</Label>
                        <Input
                          id="postcode"
                          value={settings.postcode}
                          onChange={(e) =>
                            handleChange('postcode', e.target.value)
                          }
                          placeholder="Postcode"
                        />
                      </div>
                    </div>
                    <Separator />
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="statisticalArea1">
                          Statistical Area 1
                        </Label>
                        <Input
                          id="statisticalArea1"
                          value={settings.statisticalArea1}
                          onChange={(e) =>
                            handleChange('statisticalArea1', e.target.value)
                          }
                          placeholder="Statistical Area 1 ID"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="statisticalArea2">
                          Statistical Area 2
                        </Label>
                        <Input
                          id="statisticalArea2"
                          value={settings.statisticalArea2}
                          onChange={(e) =>
                            handleChange('statisticalArea2', e.target.value)
                          }
                          placeholder="Statistical Area 2 ID"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Information Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                    <CardDescription>
                      Phone numbers and email addresses
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input
                          id="phoneNumber"
                          type="tel"
                          value={settings.phoneNumber}
                          onChange={(e) =>
                            handleChange('phoneNumber', e.target.value)
                          }
                          placeholder="+61 2 1234 5678"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="facsimileNumber">
                          Facsimile Number
                        </Label>
                        <Input
                          id="facsimileNumber"
                          type="tel"
                          value={settings.facsimileNumber}
                          onChange={(e) =>
                            handleChange('facsimileNumber', e.target.value)
                          }
                          placeholder="+61 2 1234 5679"
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="emailAddress">Main Email Address</Label>
                        <Input
                          id="emailAddress"
                          type="email"
                          value={settings.emailAddress}
                          onChange={(e) =>
                            handleChange('emailAddress', e.target.value)
                          }
                          placeholder="contact@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="offerLetterEmailAddress">
                          Offer Letter Email Address
                        </Label>
                        <Input
                          id="offerLetterEmailAddress"
                          type="email"
                          value={settings.offerLetterEmailAddress}
                          onChange={(e) =>
                            handleChange(
                              'offerLetterEmailAddress',
                              e.target.value
                            )
                          }
                          placeholder="offers@example.com"
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t px-6 py-4">
                    <Button
                      onClick={handleSave}
                      disabled={updateRto.isPending || isLoadingRto}
                      className="ml-auto"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {updateRto.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}

            {/* Notifications Settings */}
            {activeSection === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>
                    Manage notification preferences and alerts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="enableNotifications">
                        Enable Notifications
                      </Label>
                      <p className="text-muted-foreground text-sm">
                        Receive in-app notifications for important events
                      </p>
                    </div>
                    <Switch
                      id="enableNotifications"
                      checked={settings.enableNotifications}
                      onCheckedChange={(checked) =>
                        handleChange('enableNotifications', checked)
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="enableEmailAlerts">Email Alerts</Label>
                      <p className="text-muted-foreground text-sm">
                        Send email notifications for critical updates
                      </p>
                    </div>
                    <Switch
                      id="enableEmailAlerts"
                      checked={settings.enableEmailAlerts}
                      onCheckedChange={(checked) =>
                        handleChange('enableEmailAlerts', checked)
                      }
                    />
                  </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  <Button onClick={handleSave} className="ml-auto">
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Security Settings */}
            {activeSection === 'security' && (
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Configure security and authentication options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="passwordPolicy">Password Policy</Label>
                    <Select
                      value={settings.passwordPolicy}
                      onValueChange={(value) =>
                        handleChange('passwordPolicy', value)
                      }
                    >
                      <SelectTrigger id="passwordPolicy">
                        <SelectValue placeholder="Select policy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">
                          Low - Minimum 6 characters
                        </SelectItem>
                        <SelectItem value="medium">
                          Medium - 8 characters with mixed case
                        </SelectItem>
                        <SelectItem value="high">
                          High - 12 characters with symbols
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  <Button onClick={handleSave} className="ml-auto">
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* System Settings */}
            {activeSection === 'system' && (
              <Card>
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>
                    Advanced system configuration options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="maxFileUploadSize">
                        Max File Upload Size (MB)
                      </Label>
                      <Input
                        id="maxFileUploadSize"
                        type="number"
                        value={settings.maxFileUploadSize}
                        onChange={(e) =>
                          handleChange('maxFileUploadSize', e.target.value)
                        }
                        placeholder="10"
                        min="1"
                        max="100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sessionTimeout">
                        Session Timeout (minutes)
                      </Label>
                      <Input
                        id="sessionTimeout"
                        type="number"
                        value={settings.sessionTimeout}
                        onChange={(e) =>
                          handleChange('sessionTimeout', e.target.value)
                        }
                        placeholder="60"
                        min="15"
                        max="480"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
                      <p className="text-muted-foreground text-sm">
                        Enable maintenance mode to restrict access
                      </p>
                    </div>
                    <Switch
                      id="maintenanceMode"
                      checked={settings.maintenanceMode}
                      onCheckedChange={(checked) =>
                        handleChange('maintenanceMode', checked)
                      }
                    />
                  </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  <Button onClick={handleSave} className="ml-auto">
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Integrations Settings */}
            {activeSection === 'integrations' && (
              <Card>
                <CardHeader>
                  <CardTitle>Integrations</CardTitle>
                  <CardDescription>
                    Manage third-party integrations and API connections
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
                    <p className="text-sm">No integrations configured</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Email Settings */}
            {activeSection === 'email' && (
              <Card>
                <CardHeader>
                  <CardTitle>Email Settings</CardTitle>
                  <CardDescription>
                    Configure email service and delivery options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
                    <p className="text-sm">Email settings coming soon</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
