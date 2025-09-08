"use client";

import { useOfferings, useCreateOffering, useUpdateOffering, useDeleteOffering } from "@/hooks/use-offerings";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useCoursePlans } from "@/hooks/use-course-plans";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// No token needed - handled by hooks

type Props = { programId: string };

export const Offerings = ({ programId }: Props) => {
  const { data: offerings } = useOfferings(programId);
  const createOffering = useCreateOffering();
  const updateOffering = useUpdateOffering();
  const deleteOffering = useDeleteOffering();

  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");
  const [defPlan, setDefPlan] = useState<string>("");
  const { data: plans } = useCoursePlans(programId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox id="rolling" checked={isRolling} onCheckedChange={(checked) => setIsRolling(!!checked)} />
          <label htmlFor="rolling" className="text-sm font-medium">Rolling intake</label>
        </div>
        <Input 
          type="date" 
          placeholder="Start date"
          value={start} 
          onChange={(e) => setStart(e.target.value)}
          className="w-auto"
        />
        <Input 
          type="date" 
          placeholder="End date"
          value={end} 
          onChange={(e) => setEnd(e.target.value)}
          className="w-auto"
        />
        <Select value={defPlan} onValueChange={setDefPlan}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Default plan (optional)" />
          </SelectTrigger>
          <SelectContent>
            {plans?.map(pl => (
              <SelectItem key={pl.id} value={pl.id}>
                {pl.name} v{pl.version}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => {
            if (!programId) return;
            createOffering.mutate(
              { programId, isRolling, startDate: start || null, endDate: end || null, status: 'Scheduled', defaultPlanId: defPlan || null },
              { onSuccess: () => toast.success('Offering created'), onError: () => toast.error('Failed to create offering') }
            );
            setStart(""); setEnd(""); setDefPlan(""); setIsRolling(false);
          }}
        >Create offering</Button>
      </div>

      <div className="border rounded p-3">
        <h3 className="font-medium mb-2">Offerings</h3>
        {!offerings && <div className="space-y-2">{Array.from({length:3}).map((_,i)=>(<div key={i} className="h-8 bg-muted rounded animate-pulse" />))}</div>}
        {offerings?.length===0 && <p className="text-sm text-muted-foreground">No offerings.</p>}
        {!!offerings && offerings.length>0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Rolling</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offerings.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell><span className={`px-2 py-1 text-xs rounded ${o.status==='Active'?"bg-green-600/20 text-green-400":"bg-zinc-700 text-zinc-300"}`}>{o.status}</span></TableCell>
                  <TableCell>{o.is_rolling ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{o.start_date ?? ''}</TableCell>
                  <TableCell>{o.end_date ?? ''}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => updateOffering.mutate({ offeringId: o.id, programId, data: { status: 'Active' } }, { onSuccess: () => toast.success('Offering activated'), onError: () => toast.error('Failed to update offering') })}>Activate</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-400 border-red-400 hover:bg-red-50">Delete</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete offering?</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteOffering.mutate({ offeringId: o.id, programId }, { onSuccess: () => toast.success('Offering deleted'), onError: () => toast.error('Failed to delete offering') })}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};


