"use client";

import { useEffect, useMemo, useState } from "react";
import { usePaymentPlanTemplates, useCreatePaymentPlanTemplate, useTemplateInstalments, useReplaceInstalments, useSetTemplateDefault, type PaymentPlanInstalment } from "@/hooks/use-payment-templates";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// No token needed - handled by hooks

type Props = { programId: string };

export const PaymentTemplates = ({ programId }: Props) => {
  const { data: templates } = usePaymentPlanTemplates(programId);
  const createTemplate = useCreatePaymentPlanTemplate();
  const [templateId, setTemplateId] = useState<string>("");
  const { data: instalments } = useTemplateInstalments(templateId);
  const replaceInstalments = useReplaceInstalments();
  const setDefault = useSetTemplateDefault();

  const [open, setOpen] = useState(false);
  const TemplateSchema = z.object({ name: z.string().min(1) });
  const form = useForm<z.infer<typeof TemplateSchema>>({ resolver: zodResolver(TemplateSchema), defaultValues: { name: '' } });
  const [instJson, setInstJson] = useState<string>("");
  const [createAsDefault, setCreateAsDefault] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [rows, setRows] = useState<PaymentPlanInstalment[]>([]);
  const [amountInputs, setAmountInputs] = useState<string[]>([]);

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

  const totalAmount = useMemo(() => rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0), [rows]);

  // Live preview based on enrolment date = today (for now)
  const preview = useMemo(() => {
    const base = new Date();
    const fmt = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
    const items = rows
      .map(r => ({
        description: r.description,
        amount: Number(r.amount) || 0,
        offset: Number(r.offset_days) || 0,
      }))
      .sort((a, b) => a.offset - b.offset)
      .map(r => {
        const d = new Date(base);
        d.setDate(d.getDate() + r.offset);
        return { ...r, due: d, dueLabel: fmt.format(d) };
      });
    const first = items[0]?.dueLabel;
    const last = items[items.length - 1]?.dueLabel;
    return { items, first, last };
  }, [rows]);

  const setPreset = (count: number, intervalDays: number, label: string) => {
    const hasTotal = totalAmount > 0;
    const base = hasTotal ? Math.floor((totalAmount / count) * 100) / 100 : 0;
    const remainder = hasTotal ? Number((totalAmount - base * count).toFixed(2)) : 0;
    const nextRows: PaymentPlanInstalment[] = Array.from({ length: count }).map((_, i) => ({
      description: `${label} ${i + 1}`,
      amount: hasTotal ? Number((base + (i === 0 ? remainder : 0)).toFixed(2)) : 0,
      offset_days: i * intervalDays,
      sort_order: i + 1,
    }));
    setRows(nextRows);
    setAmountInputs(nextRows.map(r => r.amount.toFixed(2)));
  };

  const shiftOffsets = (delta: number) => {
    setRows(prev => prev.map(r => ({ ...r, offset_days: Number(r.offset_days || 0) + delta })));
  };

  const scaleToTarget = (target: number) => {
    if (!(target > 0)) return;
    const current = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    let next: PaymentPlanInstalment[] = [];
    if (current <= 0) {
      const each = Number((target / Math.max(rows.length, 1)).toFixed(2));
      const remainder = Number((target - each * rows.length).toFixed(2));
      next = rows.map((r, i) => ({ ...r, amount: Number((each + (i === 0 ? remainder : 0)).toFixed(2)) }));
    } else {
      const factor = target / current;
      // Round 2dp and fix remainder on first row
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
    // Mirror reorder in amountInputs
    setAmountInputs(prev => {
      const arr = [...prev];
      const t = arr[index];
      arr[index] = arr[target];
      arr[target] = t;
      return arr;
    });
  };
  const handleOpenEditor = (id: string) => { setTemplateId(id); setEditorOpen(true); };
  const handleSaveEditor = () => {
    if (!templateId) return;
    if (rows.length === 0) { toast.error('Add at least one instalment'); return; }
    for (const r of rows) {
      if (!r.description.trim()) { toast.error('Each instalment needs a description'); return; }
      if (!(Number(r.amount) > 0)) { toast.error('Amounts must be greater than 0'); return; }
      if (!Number.isFinite(Number(r.offset_days))) { toast.error('Offset days must be a number'); return; }
    }
    const payload = rows.map((r, i) => ({ description: r.description.trim(), amount: Number(r.amount), offset_days: Number(r.offset_days), sort_order: i + 1 }));
    replaceInstalments.mutate(
      { templateId, items: payload },
      { onSuccess: () => { toast.success('Instalments saved'); setEditorOpen(false); }, onError: () => toast.error('Failed to save instalments') }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Create template</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create payment plan template</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={form.handleSubmit((values) => {
                const n = values.name.trim();
                if (!programId || !n) { toast.error('Select a program'); return; }
                createTemplate.mutate({ programId, name: n, is_default: createAsDefault }, { onSuccess: () => { toast.success('Template created'); setOpen(false); form.reset({ name: '' }); setCreateAsDefault(false); }, onError: () => toast.error('Failed to create template') });
              })}
            >
              <Input placeholder="e.g., Standard 4-instalment plan" {...form.register('name')} />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Make default</div>
                  <div className="text-xs text-muted-foreground">Sets this as the default template for the program</div>
                </div>
                <Switch checked={createAsDefault} onCheckedChange={setCreateAsDefault} aria-label="Make default template" />
              </div>
              <DialogFooter>
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {/* Editor Modal */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="w-[95vw] sm:max-w-3xl p-0">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-4">
            <DialogHeader>
              <DialogTitle>Edit payment plan template</DialogTitle>
            </DialogHeader>
          </div>
          <div className="space-y-4 p-4 max-h-[80vh] overflow-y-auto"> 
            <div className="flex flex-wrap items-center justify-between gap-3 min-w-0">
              <div className="text-sm text-muted-foreground">Total amount: <span className="font-medium text-foreground">{Intl.NumberFormat(undefined, { style: 'currency', currency: 'AUD' }).format(totalAmount || 0)}</span></div>
              <div className="flex flex-wrap items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">Presets</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel>Distribute by</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setPreset(2, 30, 'Instalment')}>50 / 50 (0d, 30d)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPreset(6, 30, 'Monthly')}>Monthly × 6 (30d)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPreset(12, 30, 'Monthly')}>Monthly × 12 (30d)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPreset(4, 14, 'Fortnightly')}>Fortnightly × 4 (14d)</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">Bulk tools</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel>Offsets</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => shiftOffsets(7)}>Shift +7 days</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => shiftOffsets(-7)}>Shift -7 days</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => shiftOffsets(30)}>Shift +30 days</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => shiftOffsets(-30)}>Shift -30 days</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">Scale total</Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Target total (AUD)</label>
                      <Input inputMode="decimal" placeholder="e.g., 0.00" onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const input = (e.target as HTMLInputElement).value.replace(/,/g, '.');
                          if (/^\d*(?:\.\d{0,2})?$/.test(input) && input !== '') {
                            scaleToTarget(Number(input));
                          }
                        }
                      }} />
                      <div className="flex justify-end">
                        <Button size="sm" onClick={(ev) => {
                          const wrap = (ev.currentTarget.closest('[role="dialog"]')?.querySelector('input') as HTMLInputElement | null);
                          const val = wrap?.value?.replace(/,/g, '.');
                          if (val && /^\d*(?:\.\d{0,2})?$/.test(val)) { scaleToTarget(Number(val)); }
                        }}>Apply</Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button size="sm" onClick={() => setRows(prev => [...prev, { description: "", amount: 0, offset_days: 0, sort_order: prev.length + 1 }])}>
                  <Plus className="h-4 w-4 mr-2" /> Add instalment
                </Button>
              </div>
            </div>
            <div className="space-y-2 pr-1">
              {rows.length === 0 && (
                <p className="text-sm text-muted-foreground">No instalments yet. Click “Add instalment”.</p>
              )}
              {rows.map((r, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-center border rounded-md p-3">
                  <div className="col-span-12 md:col-span-5 min-w-0">
                    <label className="text-xs text-muted-foreground">Description</label>
                    <Input value={r.description} onChange={(e) => setRows(prev => prev.map((row, i) => i===idx?{...row, description: e.target.value}:row))} placeholder="e.g., Initial deposit" />
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <label className="text-xs text-muted-foreground">Amount (AUD)</label>
                    <Input
                      inputMode="decimal"
                      value={amountInputs[idx] ?? ""}
                      placeholder="e.g., 0.00"
                      onChange={(e) => {
                        const raw = e.target.value.replace(/,/g, '.');
                        // Allow only digits and at most one dot, and max 2 decimals
                        if (!/^\d*(?:\.\d{0,2})?$/.test(raw)) { return; }
                        setAmountInputs(prev => prev.map((v, i) => i===idx ? raw : v));
                        const num = raw === '' ? NaN : Number(raw);
                        setRows(prev => prev.map((row, i) => i===idx ? { ...row, amount: Number.isFinite(num) ? num : 0 } : row));
                      }}
                      onBlur={() => {
                        setAmountInputs(prev => prev.map((v, i) => i===idx ? (v === '' ? '' : (Number(v).toFixed(2))) : v));
                      }}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <label className="text-xs text-muted-foreground">Offset days</label>
                    <Input type="number" value={r.offset_days} onChange={(e) => setRows(prev => prev.map((row, i) => i===idx?{...row, offset_days: Number(e.target.value)}:row))} placeholder="e.g., 30" />
                  </div>
                  <div className="col-span-12 md:col-span-2 flex md:items-end justify-end gap-2 flex-wrap">
                    <Button variant="outline" size="icon" aria-label="Move up" onClick={() => {
                      const target = idx - 1; if (target < 0) return; const copy = [...rows]; const t = copy[idx]; copy[idx] = copy[target]; copy[target] = t; setRows(copy.map((row, i)=>({...row, sort_order:i+1})));
                    }} disabled={idx===0}><ChevronUp className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" aria-label="Move down" onClick={() => {
                      const target = idx + 1; if (target >= rows.length) return; const copy = [...rows]; const t = copy[idx]; copy[idx] = copy[target]; copy[target] = t; setRows(copy.map((row, i)=>({...row, sort_order:i+1})));
                    }} disabled={idx===rows.length-1}><ChevronDown className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" aria-label="Remove" onClick={() => setRows(prev => prev.filter((_, i)=>i!==idx).map((row, i)=>({...row, sort_order:i+1})))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">Preview assumes enrolment date = today. Due date = enrolment date + offset days.</div>
            {!!preview.items.length && (
              <div className="space-y-2 border rounded-md p-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">Instalments: <span className="text-foreground font-medium">{preview.items.length}</span></div>
                  <div className="text-muted-foreground">Range: <span className="text-foreground font-medium">{preview.first} → {preview.last}</span></div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Due date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.items.map((it, i) => (
                        <TableRow key={i}>
                          <TableCell className="min-w-0">{it.description || '—'}</TableCell>
                          <TableCell>{it.dueLabel}</TableCell>
                          <TableCell className="text-right">{Intl.NumberFormat(undefined, { style: 'currency', currency: 'AUD' }).format(it.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t p-4">
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditorOpen(false)}>Discard</Button>
              <Button onClick={() => {
              if (!templateId) return; if (rows.length===0) { toast.error('Add at least one instalment'); return; }
              for (const r of rows) { if (!r.description.trim()) { toast.error('Each instalment needs a description'); return; } if (!(Number(r.amount)>0)) { toast.error('Amounts must be greater than 0'); return; } if (!Number.isFinite(Number(r.offset_days))) { toast.error('Offset days must be a number'); return; } }
              const payload = rows.map((r,i)=>({ description: r.description.trim(), amount: Number(r.amount), offset_days: Number(r.offset_days), sort_order: i+1 }));
              replaceInstalments.mutate(
                { templateId, items: payload },
                { onSuccess: () => { toast.success('Instalments saved'); setEditorOpen(false); }, onError: () => toast.error('Failed to save instalments') }
              );
            }}>Save</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 border rounded p-3">
          <h3 className="font-medium mb-2">Templates</h3>
          {!templates && <div className="space-y-2">{Array.from({length:3}).map((_,i)=>(<div key={i} className="h-8 bg-muted rounded animate-pulse" />))}</div>}
          {templates?.length===0 && <p className="text-sm text-muted-foreground">No templates. Create one.</p>}
          {!!templates && templates.length>0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map(t => (
                  <TableRow key={t.id} className={templateId===t.id?"bg-muted/50":""}>
                    <TableCell>{t.name}</TableCell>
                    <TableCell><span className={`px-2 py-1 text-xs rounded ${t.is_default?"bg-green-600/20 text-green-400":"bg-zinc-700 text-zinc-300"}`}>{t.is_default?"Yes":"No"}</span></TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenEditor(t.id)}>Edit instalments</Button>
                      {!t.is_default && (
                        <Button size="sm" onClick={() => setDefault.mutate({ templateId: t.id, programId, is_default: true })}>Make default</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="col-span-2 border rounded p-3">
          <h3 className="font-medium mb-2">Instalments</h3>
          <p className="text-sm text-muted-foreground">Use the Edit instalments action to open the guided editor.</p>
        </div>
      </div>
    </div>
  );
};


