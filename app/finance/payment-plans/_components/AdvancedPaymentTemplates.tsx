"use client";

import { useEffect, useMemo, useState } from "react";
import { usePaymentPlanTemplates, useCreatePaymentPlanTemplate, useTemplateInstalments, useReplaceInstalments, useSetTemplateDefault, type PaymentPlanInstalment } from "@/hooks/use-payment-templates";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  ChevronUp, 
  ChevronDown, 
  Trash2, 
  Edit3,
  Copy,
  Star,
  Calendar,
  DollarSign,
  FileText,
  Settings,
  Calculator,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Props = { programId: string };

export const AdvancedPaymentTemplates = ({ programId }: Props) => {
  const { data: templates, isLoading: templatesLoading } = usePaymentPlanTemplates(programId);
  const createTemplate = useCreatePaymentPlanTemplate();
  const [templateId, setTemplateId] = useState<string>("");
  const { data: instalments, isLoading: instalmentsLoading } = useTemplateInstalments(templateId);
  const replaceInstalments = useReplaceInstalments();
  const setDefault = useSetTemplateDefault();

  const [open, setOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateTemplateId, setDuplicateTemplateId] = useState<string>("");
  
  const TemplateSchema = z.object({ name: z.string().min(1, "Template name is required") });
  const form = useForm<z.infer<typeof TemplateSchema>>({ 
    resolver: zodResolver(TemplateSchema), 
    defaultValues: { name: '' } 
  });
  const duplicateForm = useForm<z.infer<typeof TemplateSchema>>({ 
    resolver: zodResolver(TemplateSchema), 
    defaultValues: { name: '' } 
  });
  
  const [instJson, setInstJson] = useState<string>("");
  const [createAsDefault, setCreateAsDefault] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [rows, setRows] = useState<PaymentPlanInstalment[]>([]);
  const [amountInputs, setAmountInputs] = useState<string[]>([]);

  // Enhanced preview calculation
  const preview = useMemo(() => {
    if (rows.length === 0) return { items: [], total: 0, first: '', last: '' };
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
    
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    const first = items[0]?.dueLabel || '';
    const last = items[items.length - 1]?.dueLabel || '';
    
    return { items, total, first, last };
  }, [rows]);

  const totalAmount = useMemo(() => rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0), [rows]);

  useEffect(() => {
    if (!editorOpen) return;
    const seeded: PaymentPlanInstalment[] = (instalments ?? []).map(i => ({
      description: i.description ?? "",
      amount: Number(i.amount ?? 0),
      offset_days: Number(i.offset_days ?? 0),
      sort_order: Number(i.sort_order ?? 0),
    }));
    setRows(seeded);
    setAmountInputs(seeded.map(r => Number.isFinite(r.amount) ? (Math.round((r.amount as number)*100)/100).toFixed(2) : ""));
  }, [editorOpen, instalments]);

  const setPreset = (count: number, interval: number, prefix: string) => {
    const newRows = Array.from({ length: count }, (_, i) => ({
      description: `${prefix} ${i + 1}`,
      amount: 0,
      offset_days: i * interval,
      sort_order: i + 1,
    }));
    setRows(newRows);
    setAmountInputs(newRows.map(() => "0.00"));
  };

  const shiftOffsets = (delta: number) => {
    setRows(prev => prev.map(r => ({ ...r, offset_days: Math.max(0, Number(r.offset_days) + delta) })));
  };

  const scaleToTarget = (target: number) => {
    const current = totalAmount;
    if (current === 0) return;
    let next: PaymentPlanInstalment[];
    if (target === 0) {
      next = rows.map(r => ({ ...r, amount: 0 }));
    } else {
      const factor = target / current;
      const prelim = rows.map(r => Number((Number(r.amount || 0) * factor).toFixed(2)));
      const sum = prelim.reduce((s, n) => s + n, 0);
      const diff = Number((target - sum).toFixed(2));
      next = rows.map((r, i) => ({ ...r, amount: prelim[i] + (i === 0 ? diff : 0) }));
    }
    setRows(next);
    setAmountInputs(next.map(r => (Number(r.amount) || 0).toFixed(2)));
  };

  const handleAddRow = () => {
    setRows(prev => [...prev, { description: "", amount: 0, offset_days: 0, sort_order: prev.length + 1 }]);
    setAmountInputs(prev => [...prev, "0.00"]);
  };

  const handleChangeRow = (index: number, patch: Partial<PaymentPlanInstalment>) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, ...patch } : r));
  };

  const handleRemoveRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index).map((r, i2) => ({ ...r, sort_order: i2 + 1 })));
    setAmountInputs(prev => prev.filter((_, i) => i !== index));
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const copy = [...rows];
    const tmp = copy[index];
    copy[index] = copy[target];
    copy[target] = tmp;
    setRows(copy.map((r, i) => ({ ...r, sort_order: i + 1 })));
    setAmountInputs(prev => {
      const arr = [...prev];
      const t = arr[index];
      arr[index] = arr[target];
      arr[target] = t;
      return arr;
    });
  };

  const handleOpenEditor = (id: string) => { 
    setTemplateId(id); 
    setEditorOpen(true); 
  };

  const handleDuplicateTemplate = (id: string) => {
    setDuplicateTemplateId(id);
    setDuplicateOpen(true);
  };

  const handleSaveEditor = () => {
    if (!templateId) return;
    if (rows.length === 0) { toast.error('Add at least one instalment'); return; }
    for (const r of rows) {
      if (!r.description.trim()) { toast.error('Each instalment needs a description'); return; }
      if (!(Number(r.amount) > 0)) { toast.error('Amounts must be greater than 0'); return; }
      if (!Number.isFinite(Number(r.offset_days))) { toast.error('Offset days must be a number'); return; }
    }
    const payload = rows.map((r, i) => ({ 
      description: r.description.trim(), 
      amount: Number(r.amount), 
      offset_days: Number(r.offset_days), 
      sort_order: i + 1 
    }));
    replaceInstalments.mutate(
      { templateId, items: payload },
      { onSuccess: () => { toast.success('Instalments saved'); setEditorOpen(false); }, onError: () => toast.error('Failed to save instalments') }
    );
  };

  const handleDuplicateSave = () => {
    const template = templates?.find(t => t.id === duplicateTemplateId);
    if (!template) return;
    
    const name = duplicateForm.getValues('name').trim();
    if (!name) {
      toast.error('Template name is required');
      return;
    }
    
    createTemplate.mutate(
      { programId, name, is_default: false },
      { 
        onSuccess: () => { 
          toast.success('Template duplicated successfully'); 
          setDuplicateOpen(false); 
          duplicateForm.reset({ name: '' }); 
        }, 
        onError: () => toast.error('Failed to duplicate template') 
      }
    );
  };

  if (templatesLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Payment Templates</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage payment plan templates for this program
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Payment Plan Template</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit((values) => {
                  const name = values.name.trim();
                  if (!programId || !name) { 
                    toast.error('Template name is required'); 
                    return; 
                  }
                  createTemplate.mutate(
                    { programId, name, is_default: createAsDefault }, 
                    { 
                      onSuccess: () => { 
                        toast.success('Template created successfully'); 
                        setOpen(false); 
                        form.reset({ name: '' }); 
                        setCreateAsDefault(false); 
                      }, 
                      onError: () => toast.error('Failed to create template') 
                    }
                  );
                })}
              >
                <div className="space-y-2">
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input 
                    id="template-name"
                    placeholder="e.g., Standard Payment Plan" 
                    {...form.register('name')} 
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Make Default Template</div>
                    <div className="text-xs text-muted-foreground">
                      Sets this as the default template for new enrolments
                    </div>
                  </div>
                  <Switch 
                    checked={createAsDefault} 
                    onCheckedChange={setCreateAsDefault} 
                    aria-label="Make default template" 
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Template</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Templates</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!templates || templates.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Templates</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first payment template to get started
                </p>
                <Button onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map(template => (
                  <Card key={template.id} className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    templateId === template.id ? 'ring-2 ring-primary bg-primary/5' : ''
                  }`} onClick={() => setTemplateId(template.id)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium truncate">{template.name}</h4>
                            {template.is_default && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {instalments?.length || 0} instalments
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEditor(template.id)}>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Edit Instalments
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateTemplate(template.id)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            {!template.is_default && (
                              <DropdownMenuItem 
                                onClick={() => setDefault.mutate({ templateId: template.id, programId, is_default: true })}
                              >
                                <Star className="h-4 w-4 mr-2" />
                                Make Default
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Template Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="h-5 w-5" />
              <span>Template Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!templateId ? (
              <div className="text-center py-12">
                <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Select a Template</h3>
                <p className="text-muted-foreground">
                  Choose a template from the list to view its details and instalments
                </p>
              </div>
            ) : instalmentsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-32" />
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              </div>
            ) : !instalments || instalments.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Instalments</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This template doesn't have any instalments configured yet
                </p>
                <Button onClick={() => handleOpenEditor(templateId)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Add Instalments
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">
                      {templates?.find(t => t.id === templateId)?.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {instalments.length} instalment{instalments.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Button onClick={() => handleOpenEditor(templateId)}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Instalments
                  </Button>
                </div>
                
                <Separator />
                
                <ScrollArea className="h-64">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Offset Days</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {instalments
                        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                        .map((instalment, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {instalment.description || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {instalment.offset_days || 0} days
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {Intl.NumberFormat(undefined, { 
                              style: 'currency', 
                              currency: 'AUD' 
                            }).format(instalment.amount || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Total Amount</span>
                    </div>
                    <span className="text-lg font-bold">
                      {Intl.NumberFormat(undefined, { 
                        style: 'currency', 
                        currency: 'AUD' 
                      }).format(instalments.reduce((sum, i) => sum + (i.amount || 0), 0))}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Editor Modal */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="w-[95vw] sm:max-w-4xl p-0 flex flex-col h-[90vh]">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-6 flex-shrink-0">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Edit3 className="h-5 w-5" />
                <span>Edit Payment Plan Template</span>
              </DialogTitle>
            </DialogHeader>
          </div>
          
          <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-6 p-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Instalments</span>
                    </div>
                    <div className="text-2xl font-bold">{rows.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Total Amount</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {Intl.NumberFormat(undefined, { style: 'currency', currency: 'AUD' }).format(totalAmount || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Duration</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {rows.length > 0 ? Math.max(...rows.map(r => Number(r.offset_days || 0))) : 0} days
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Presets
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuLabel>Quick Presets</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setPreset(2, 30, 'Instalment')}>
                        50/50 Split (0d, 30d)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPreset(6, 30, 'Monthly')}>
                        Monthly × 6 (30d intervals)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPreset(12, 30, 'Monthly')}>
                        Monthly × 12 (30d intervals)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPreset(4, 14, 'Fortnightly')}>
                        Fortnightly × 4 (14d intervals)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Bulk Tools
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuLabel>Offset Adjustments</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => shiftOffsets(7)}>
                        Shift +7 days
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => shiftOffsets(-7)}>
                        Shift -7 days
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => shiftOffsets(30)}>
                        Shift +30 days
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => shiftOffsets(-30)}>
                        Shift -30 days
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Calculator className="h-4 w-4 mr-2" />
                        Scale Total
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-64">
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm">Target Total (AUD)</Label>
                          <Input 
                            type="number"
                            step="0.01"
                            placeholder="0.00" 
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const input = (e.target as HTMLInputElement).value;
                                if (/^\d+(\.\d{1,2})?$/.test(input) && input !== '') {
                                  scaleToTarget(Number(input));
                                }
                              }
                            }} 
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button size="sm" onClick={(ev) => {
                            const input = (ev.currentTarget.closest('[role="dialog"]')?.querySelector('input') as HTMLInputElement | null);
                            const val = input?.value;
                            if (val && /^\d+(\.\d{1,2})?$/.test(val)) { 
                              scaleToTarget(Number(val)); 
                            }
                          }}>
                            Apply
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                
                <Button onClick={handleAddRow}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Instalment
                </Button>
              </div>

              {/* Instalments Editor */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {rows.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No instalments configured. Click "Add Instalment" to create your first payment.
                    </AlertDescription>
                  </Alert>
                )}
                
                {rows.map((row, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-12 gap-4 items-end">
                      <div className="col-span-12 md:col-span-5">
                        <Label className="text-sm font-medium">Description</Label>
                        <Input 
                          value={row.description} 
                          onChange={(e) => handleChangeRow(index, { description: e.target.value })}
                          placeholder="e.g., Deposit, First Payment, Final Payment" 
                        />
                      </div>
                      <div className="col-span-6 md:col-span-3">
                        <Label className="text-sm font-medium">Amount (AUD)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={amountInputs[index] ?? ""}
                          placeholder="0.00"
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (!/^\d*(\.\d{0,2})?$/.test(raw)) { return; }
                            setAmountInputs(prev => prev.map((v, i) => i === index ? raw : v));
                            const num = raw === '' ? NaN : Number(raw);
                            handleChangeRow(index, { amount: Number.isFinite(num) ? num : 0 });
                          }}
                          onBlur={() => {
                            setAmountInputs(prev => prev.map((v, i) => i === index ? (v === '' ? '' : Number(v).toFixed(2)) : v));
                          }}
                        />
                      </div>
                      <div className="col-span-6 md:col-span-2">
                        <Label className="text-sm font-medium">Offset Days</Label>
                        <Input 
                          type="number" 
                          value={row.offset_days} 
                          onChange={(e) => handleChangeRow(index, { offset_days: Number(e.target.value) })}
                          placeholder="0" 
                        />
                      </div>
                      <div className="col-span-12 md:col-span-2 flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleMove(index, -1)}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleMove(index, 1)}
                          disabled={index === rows.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleRemoveRow(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Preview */}
              {preview.items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      <span>Payment Preview</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-muted-foreground">
                          Instalments: <span className="text-foreground font-medium">{preview.items.length}</span>
                        </div>
                        <div className="text-muted-foreground">
                          Duration: <span className="text-foreground font-medium">{preview.first} → {preview.last}</span>
                        </div>
                      </div>
                      
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {preview.items.map((item, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{item.description}</TableCell>
                              <TableCell>{item.dueLabel}</TableCell>
                              <TableCell className="text-right font-mono">
                                {Intl.NumberFormat(undefined, { 
                                  style: 'currency', 
                                  currency: 'AUD' 
                                }).format(item.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      
                      <div className="bg-primary/10 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Total Amount</span>
                          <span className="text-lg font-bold">
                            {Intl.NumberFormat(undefined, { 
                              style: 'currency', 
                              currency: 'AUD' 
                            }).format(preview.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
          
          <div className="border-t p-6 flex-shrink-0 bg-background">
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEditor}>
                Save Changes
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Template Dialog */}
      <Dialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Template</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={duplicateForm.handleSubmit(handleDuplicateSave)}
          >
            <div className="space-y-2">
              <Label htmlFor="duplicate-name">New Template Name</Label>
              <Input 
                id="duplicate-name"
                placeholder="e.g., Standard Payment Plan - Copy" 
                {...duplicateForm.register('name')} 
              />
              {duplicateForm.formState.errors.name && (
                <p className="text-sm text-red-500">{duplicateForm.formState.errors.name.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDuplicateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Duplicate Template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
