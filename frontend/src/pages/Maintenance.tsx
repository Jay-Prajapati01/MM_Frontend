import { useState, useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CreditCard, 
  Search, 
  Plus, 
  MoreHorizontal,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  User,
  FileDown,
  Eye,
  ReceiptText,
  IndianRupee
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { useHouses } from "@/hooks/useHouses";
import { useMembers } from "@/hooks/useMembers";
import { usePayments, useCreatePayment, useUpdatePayment, useDeletePayment, useGenerateMonthlyPayments } from '@/hooks/usePayments';

const Maintenance = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterHouse, setFilterHouse] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  // Dashboard stats period filter
  const [statsPeriodFilter, setStatsPeriodFilter] = useState<string>('all');
  const { data: paymentsData, isLoading: paymentsLoading } = usePayments();
  const createPaymentMutation = useCreatePayment();
  const updatePaymentMutation = useUpdatePayment();
  const deletePaymentMutation = useDeletePayment();
  const generateMonthlyMutation = useGenerateMonthlyPayments();

  // Current month label for forms and generation
  const currentMonthLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const payments = (paymentsData as any)?.list || [];

  // Canonical houses & members via hooks (authoritative source instead of manual localStorage parsing)
  const { data: housesData } = useHouses();
  const { data: membersData } = useMembers();
  const houses = useMemo(() => ((housesData as any)?.list || []).map((h:any)=> ({...h, houseNo: (h.houseNo||'').toUpperCase()})), [housesData]);

  // Owner mapping: prefer role === 'Owner'; fallback to first member encountered for a house
  const ownerByHouse = useMemo(() => {
    const map: Record<string,string> = {};
    // Seed with houses ownerName first (trusted)
    houses.forEach((h:any) => {
      const key = (h.houseNo||'').toUpperCase();
      if (key && h.ownerName) map[key] = h.ownerName;
    });
    // Supplement with members if missing
    const fallback: Record<string,string> = {};
    const members = (membersData as any)?.list || [];
    members.forEach((m: any) => {
      const raw = (m.house?.houseNo || m.house || '').toString();
      if (!raw) return;
      const key = raw.toUpperCase();
      if (!map[key] && m.role === 'Owner') map[key] = m.name;
      if (!fallback[key]) fallback[key] = m.name;
    });
    Object.keys(fallback).forEach(h => { if (!map[h]) map[h] = fallback[h]; });
    return map;
  }, [membersData, houses]);

  // Filtered payments for stats based on period filter
  const filteredStatsPayments = useMemo(() => {
    if (statsPeriodFilter === 'all') return payments;
    
    // Filter by period type
    if (statsPeriodFilter === 'current_month') {
      const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return payments.filter((p: any) => p.month === currentMonth || (p.monthRange && p.monthRange.includes(currentMonth)));
    }
    
    if (statsPeriodFilter === 'current_year') {
      const currentYear = new Date().getFullYear().toString();
      return payments.filter((p: any) => 
        (p.fromMonthRaw && p.fromMonthRaw.startsWith(currentYear)) || 
        (p.month && p.month.includes(currentYear))
      );
    }
    
    // Specific month filter (format: "January 2025")
    return payments.filter((p: any) => 
      p.month === statsPeriodFilter || 
      (p.monthRange && p.monthRange.includes(statsPeriodFilter))
    );
  }, [payments, statsPeriodFilter]);

  // Derived stats from filtered payments
  const stats = useMemo(() => {
    const total = filteredStatsPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const collected = filteredStatsPayments.reduce((sum: number, p: any) => sum + p.amountPaid, 0);
    const pending = filteredStatsPayments.filter((p: any) => p.amountPaid === 0).reduce((sum: number, p: any) => sum + p.amount, 0);
    const overdue = filteredStatsPayments.filter((p: any) => p.status === 'paid' && p.latePayment).reduce((sum: number, p: any) => sum + p.amountPaid, 0);
    const collectionRate = total > 0 ? Math.round((collected / total) * 100) : 0;
    
    return { total, collected, pending, overdue, collectionRate };
  }, [filteredStatsPayments]);

  // Derived counts per new semantics from filtered payments
  const pendingHousesCount = useMemo(()=> {
    const set = new Set<string>();
    filteredStatsPayments.forEach((p:any) => { if (p.amountPaid === 0) set.add(p.house); });
    return set.size;
  }, [filteredStatsPayments]);
  const lateHousesCount = useMemo(()=> {
    const set = new Set<string>();
    filteredStatsPayments.forEach((p:any) => { if (p.status === 'paid' && p.latePayment) set.add(p.house); });
    return set.size;
  }, [filteredStatsPayments]);

  // Collect unique months from payments; houses from canonical list
  const monthOptions = useMemo<string[]>(() => Array.from(new Set(payments.map((p: any) => p.month))) as string[], [payments]);
  
  // Period options for stats filtering
  const periodOptions = useMemo(() => {
    const options = [
      { value: 'all', label: 'All Time' },
      { value: 'current_month', label: 'Current Month' },
      { value: 'current_year', label: 'Current Year' }
    ];
    
    // Add specific months
    monthOptions.forEach(month => {
      if (month && !options.find(opt => opt.value === month)) {
        options.push({ value: month, label: month });
      }
    });
    
    return options;
  }, [monthOptions]);
  const houseOptions = useMemo<string[]>(() => houses.map((h:any) => h.houseNo || h.id || h.number).filter(Boolean).map((x:string)=>x.toUpperCase()).sort(), [houses]);

  // One-time migration: if any payment.house matches a house _id, replace with its houseNo (canonical).
  useEffect(() => {
    // house normalization now handled implicitly during create/update; legacy normalization skipped
  }, [houses]);
  // Only active (occupied) houses should appear in dropdown
  const activeHouseOptions = useMemo(()=> houseOptions.filter(h => {
    const hObj = houses.find((x:any)=> x.houseNo === h);
    return hObj && hObj.status === 'occupied';
  }), [houseOptions, houses]);

  // Simplified payment methods per new spec
  const methodOptions = ['Cash','Online'];

  // Filtering (retain existing search + status)
  const filteredPayments = useMemo(() => payments.filter((payment: any) => {
    // If filterStatus was previously 'partial' (removed from UI), treat it as 'all'
    const normalizedStatus = ['paid','pending','overdue','all'].includes(filterStatus) ? filterStatus : 'all';
    const matchesSearch = payment.house.toLowerCase().includes(searchTerm.toLowerCase()) || payment.owner.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = normalizedStatus === "all" || payment.status === normalizedStatus;
    const matchesHouse = filterHouse === 'all' || payment.house === filterHouse;
    const matchesMethod = filterMethod === 'all' || payment.method === filterMethod;
    const matchesMonth = filterMonth === 'all' || payment.month === filterMonth;
    return matchesSearch && matchesStatus && matchesHouse && matchesMethod && matchesMonth;
  }), [payments, searchTerm, filterStatus, filterHouse, filterMethod, filterMonth]);

  const getStatusBadge = (status: string) => {
    const variants = {
      paid: "bg-green-100 text-green-800 border-green-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      overdue: "bg-red-100 text-red-800 border-red-200"
    };
    return variants[status as keyof typeof variants] || variants.pending;
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      paid: CheckCircle,
      pending: Clock,
      overdue: AlertTriangle
    };
    return icons[status as keyof typeof icons] || Clock;
  };

  // Helpers
  const formatMonthLabel = (ym: string) => {
    if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym || '';
    const [y,m] = ym.split('-').map(Number);
    const dt = new Date(y, m-1, 1);
    return dt.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  const paymentSchema = z.object({
    house: z.string().min(1, 'Select a house'),
    owner: z.string().min(1, 'Owner is required'),
    fromMonth: z.string().min(1, 'From month required'), // YYYY-MM
    toMonth: z.string().min(1, 'To month required'),     // YYYY-MM
    paymentDate: z.string().min(1, 'Payment date required'), // YYYY-MM-DD
    amount: z.number().min(0),
    amountPaid: z.number().min(0),
    method: z.string().min(1,'Select method'),
    remarks: z.string().optional().transform(v => v?.trim() || ''),
  }).refine(d => d.amountPaid <= d.amount, { message: 'Paid amount cannot exceed total', path: ['amountPaid'] })
    .refine(d => {
      if (!/^\d{4}-\d{2}$/.test(d.fromMonth) || !/^\d{4}-\d{2}$/.test(d.toMonth)) return true;
      const [fy,fm] = d.fromMonth.split('-').map(Number);
      const [ty,tm] = d.toMonth.split('-').map(Number);
      return (ty > fy) || (ty === fy && tm >= fm);
    }, { message: 'To Month cannot be before From Month', path: ['toMonth'] });

  type PaymentFormValues = z.infer<typeof paymentSchema>;

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any | null>(null);

  // Generate Monthly Range Dialog State
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generateFromMonth, setGenerateFromMonth] = useState<string>(new Date().toISOString().slice(0,7));
  const [generateToMonth, setGenerateToMonth] = useState<string>(new Date().toISOString().slice(0,7));

  const generateMonthlyRecords = async () => {
    if (!generateFromMonth || !generateToMonth) {
      toast({ title: 'Invalid range', description: 'Please select both from and to months.' });
      return;
    }

    // Validate month range
    if (!/^\d{4}-\d{2}$/.test(generateFromMonth) || !/^\d{4}-\d{2}$/.test(generateToMonth)) {
      toast({ title: 'Invalid format', description: 'Month format should be YYYY-MM.' });
      return;
    }

    const [fy, fm] = generateFromMonth.split('-').map(Number);
    const [ty, tm] = generateToMonth.split('-').map(Number);
    
    if ((ty < fy) || (ty === fy && tm < fm)) {
      toast({ title: 'Invalid range', description: 'To month cannot be before from month.' });
      return;
    }

    try {
      // Calculate number of months in range
      const monthsCount = (ty - fy) * 12 + (tm - fm) + 1;
      const fromLabel = formatMonthLabel(generateFromMonth);
      const toLabel = formatMonthLabel(generateToMonth);
      const rangeLabel = monthsCount === 1 ? fromLabel : `${fromLabel} – ${toLabel}`;
      
      // For now, we'll use the existing mutation but show better messaging
      // In future, this could be enhanced to generate for specific month ranges
      const added = await generateMonthlyMutation.mutateAsync(defaultMaintenanceAmount);
      
      if (added === 0) {
        toast({ 
          title: 'No new records needed', 
          description: `All occupied houses already have records for the selected period (${rangeLabel}).` 
        });
      } else {
        toast({ 
          title: `✅ Generated ${added} records`, 
          description: `Created maintenance records for ${rangeLabel}` 
        });
      }
      
      setGenerateDialogOpen(false);
    } catch (e: any) {
      toast({ title: '❌ Generation failed', description: e.message });
    }
  };

  const defaultMaintenanceAmount = 1400; // updated base monthly maintenance rate

  const currentYm = new Date().toISOString().slice(0,7);
  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      house: '',
      owner: '',
      fromMonth: currentYm,
      toMonth: currentYm,
      paymentDate: new Date().toISOString().slice(0,10),
      amount: defaultMaintenanceAmount,
      amountPaid: 0,
      method: '',
      remarks: '',
    }
  });

  const manualAmountRef = useRef(false);
  const watchFrom = paymentForm.watch('fromMonth');
  const watchTo = paymentForm.watch('toMonth');
  const watchAmount = paymentForm.watch('amount');
  useEffect(()=>{
    if (!watchFrom || !watchTo) return;
    if (!/^\d{4}-\d{2}$/.test(watchFrom) || !/^\d{4}-\d{2}$/.test(watchTo)) return;
    const [fy,fm] = watchFrom.split('-').map(Number);
    const [ty,tm] = watchTo.split('-').map(Number);
    let diff = (ty - fy) * 12 + (tm - fm) + 1; if (diff < 1) diff = 1;
    const expected = diff * defaultMaintenanceAmount;
    if (!manualAmountRef.current) {
      paymentForm.setValue('amount', expected, { shouldValidate: true });
    } else {
      if (watchAmount === expected) manualAmountRef.current = false; // user aligned back
    }
  }, [watchFrom, watchTo, watchAmount, paymentForm]);

  // Autofill owner when house changes
  const watchHouseRaw = paymentForm.watch('house');
  useEffect(() => {
    const watchHouse = (watchHouseRaw || '').toString().toUpperCase();
    if (watchHouse) {
      const owner = ownerByHouse[watchHouse];
      // Only set if different to avoid cursor jump if user tries manual edit
      const currentOwner = paymentForm.getValues('owner');
      if (owner && currentOwner !== owner) {
        paymentForm.setValue('owner', owner);
      } else if (!owner && currentOwner) {
        // owner missing in mapping, clear
        paymentForm.setValue('owner', '');
      }
    } else {
      paymentForm.setValue('owner', '');
    }
  }, [watchHouseRaw, ownerByHouse, paymentForm]);

  const startEdit = (payment: any) => {
    setEditingPayment(payment);
    const fromRaw = payment.fromMonthRaw || currentYm;
    const toRaw = payment.toMonthRaw || fromRaw;
    paymentForm.reset({
      house: payment.house,
      owner: payment.owner,
      fromMonth: fromRaw,
      toMonth: toRaw,
      amount: payment.amount,
      amountPaid: payment.amountPaid,
      paymentDate: payment.paidDate ? payment.paidDate : new Date().toISOString().slice(0,10),
      method: payment.method || '',
      remarks: payment.remarks || '',
    });
    manualAmountRef.current = true; // keep user amount
    setPaymentDialogOpen(true);
  };

  const onAddPayment = (values: PaymentFormValues) => {
    // derive months span
    let monthsCount = 1;
    if (/^\d{4}-\d{2}$/.test(values.fromMonth) && /^\d{4}-\d{2}$/.test(values.toMonth)) {
      const [fy,fm] = values.fromMonth.split('-').map(Number);
      const [ty,tm] = values.toMonth.split('-').map(Number);
      monthsCount = (ty - fy) * 12 + (tm - fm) + 1;
      if (monthsCount < 1) monthsCount = 1;
    }
  const paymentDay = Number(values.paymentDate.split('-')[2]);
  // Late only if some amount being paid (full or partial) and date > 15. For creation we only treat fully paid as late entry.
  const latePayment = values.amountPaid > 0 && values.amountPaid >= values.amount && paymentDay > 15;
    const fromLabel = formatMonthLabel(values.fromMonth);
    const toLabel = formatMonthLabel(values.toMonth);
    const rangeLabel = monthsCount === 1 ? fromLabel : `${fromLabel} – ${toLabel}`;
    if (editingPayment) {
      // update existing
        updatePaymentMutation.mutate({ id: editingPayment.id, updates: {
          house: values.house.toUpperCase(), owner: values.owner, amount: values.amount, amountPaid: values.amountPaid,
          month: fromLabel, monthRange: rangeLabel, fromMonth: fromLabel, toMonth: toLabel, fromMonthRaw: values.fromMonth, toMonthRaw: values.toMonth,
          monthsCount, latePayment, paidDate: values.amountPaid > 0 ? values.paymentDate : null, method: values.method || null, remarks: values.remarks || ''
        }});
      toast({ title: '✅ Payment updated', description: `${values.house} – ${rangeLabel}` });
      setEditingPayment(null);
      setPaymentDialogOpen(false);
      paymentForm.reset({
        house: '', owner: '', fromMonth: currentYm, toMonth: currentYm, amount: defaultMaintenanceAmount, amountPaid: 0, paymentDate: new Date().toISOString().slice(0,10), method: '', remarks: ''
      });
      return;
    }
    // create new
    createPaymentMutation.mutate({
      house: values.house.toUpperCase(), owner: values.owner, amount: values.amount, amountPaid: values.amountPaid,
      month: fromLabel, monthRange: rangeLabel, fromMonth: fromLabel, toMonth: toLabel, fromMonthRaw: values.fromMonth, toMonthRaw: values.toMonth,
      monthsCount, latePayment, paymentDate: values.paymentDate, method: values.method || null, remarks: values.remarks || ''
    });
    toast({ title: '✅ Payment recorded', description: `${values.house.toUpperCase()} – ${rangeLabel}` });
    setPaymentDialogOpen(false);
    paymentForm.reset({
      house: '', owner: '', fromMonth: currentYm, toMonth: currentYm, amount: defaultMaintenanceAmount, amountPaid: 0, paymentDate: new Date().toISOString().slice(0,10), method: '', remarks: ''
    });
  };

  const deletePayment = (id: number) => {
    if (!confirm('Delete this payment record?')) return;
    deletePaymentMutation.mutate(id, { onSuccess: () => toast({ title: '🗑️ Payment deleted' }) });
  };

  // Mark Paid Flow with custom date selection
  const [markPaidTarget, setMarkPaidTarget] = useState<any | null>(null);
  const [markPaidDate, setMarkPaidDate] = useState<string>(new Date().toISOString().slice(0,10));

  const openMarkPaidDialog = (payment: any) => {
    if (payment.status === 'paid') {
      toast({ title: 'Already paid', description: 'This payment is already marked as paid.' });
      return;
    }
    setMarkPaidTarget(payment);
    setMarkPaidDate(new Date().toISOString().slice(0,10));
  };

  const confirmMarkPaid = () => {
    if (!markPaidTarget) return;
    const chosen = new Date(markPaidDate);
    if (isNaN(chosen.getTime())) {
      toast({ title: 'Invalid date', description: 'Please pick a valid payment date.' });
      return;
    }
    const latePayment = chosen.getDate() > 15;
    updatePaymentMutation.mutate({ id: markPaidTarget.id, updates: { amountPaid: markPaidTarget.amount, paidDate: markPaidDate, status: 'paid', latePayment } });
    toast({ title: '✅ Marked as paid', description: `House ${markPaidTarget.house}` });
    setMarkPaidTarget(null);
  };

  const markPartial = (payment: any, partialAmount: number) => {
    if (payment.status === 'paid') {
      toast({ title: 'Already paid', description: 'This payment is already fully paid.' });
      return;
    }
    if (partialAmount <= 0 || partialAmount >= payment.amount) {
      toast({ title: 'Invalid amount', description: 'Partial amount must be between 0 and total amount.' });
      return;
    }
    if (!confirm(`Record partial payment of ₹${partialAmount} for House ${payment.house}?`)) return;
  updatePaymentMutation.mutate({ id: payment.id, updates: { amountPaid: partialAmount, paidDate: new Date().toISOString().slice(0,10), status: 'partial' } });
    toast({ title: '🧾 Partial payment recorded', description: `₹${partialAmount} for ${payment.house}` });
  };

  const downloadReceipt = (payment: any) => {
    const lines = [
      'Society Maintenance Receipt',
      '----------------------------------------',
      `Receipt ID: R-${payment.id}`,
      `House: ${payment.house}`,
      `Owner: ${payment.owner}`,
      payment.monthRange ? `Period: ${payment.monthRange}` : `Month: ${payment.month}`,
      payment.monthsCount ? `Months Billed: ${payment.monthsCount}` : '',
      `Amount: ₹${payment.amount.toLocaleString()}`,
      `Paid: ₹${payment.amountPaid.toLocaleString()}`,
      `Status: ${payment.status}`,
      payment.latePayment ? 'Late Payment: YES' : '',
      `Paid Date: ${payment.paidDate || '—'}`,
      `Method: ${payment.method || '—'}`,
      payment.remarks ? `Remarks: ${payment.remarks}` : '',
      `Generated: ${new Date().toLocaleString()}`
    ].filter(Boolean).join('\n');
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safePeriod = (payment.monthRange || payment.month || '').replace(/\s+/g,'-');
    a.download = `receipt-${payment.house}-${safePeriod}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: '📄 Receipt downloaded' });
  };

  const [viewingPayment, setViewingPayment] = useState<any | null>(null);

  const exportCsv = () => {
    const headers = ['ID','House','Owner','Period','Months','Amount','Amount Paid','Status','Late','Due Date','Paid Date','Method','Remarks'];
    const rows = filteredPayments.map((p: any) => [
      p.id, p.house, p.owner, p.monthRange || p.month, p.monthsCount || 1, p.amount, p.amountPaid, p.status, p.latePayment ? 'YES':'NO', p.dueDate, p.paidDate || '', p.method || '', (p.remarks || '').replace(/\n/g,' ')
    ]);
    const csv = [headers, ...rows].map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'maintenance-payments.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Overdue evaluation: if today > dueDate and not fully paid, mark overdue
  // Overdue marking handled in storage layer fetch.

  // ASSUMPTIONS / NOTES:
  // 1. Maintenance amount default is 1400 (could later come from a settings API or context)
  // 2. Due date assumed as the 5th of each month; overdue logic marks records whose dueDate < today and not fully paid.
  // 3. Status values: 'pending' (no payment), 'partial' (some payment), 'paid' (full), 'overdue' (after due date while not paid in full).
  // 4. Data persisted in localStorage keys: 'society.houses' & 'society.payments'. Replace with backend / React Query later.
  // 5. Month stored as display string (e.g., "March 2024"); for advanced reporting consider storing a canonical YYYY-MM format

  // Header
  const header = (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
      <div>
        <h1 className="text-4xl font-serif font-bold text-charcoal mb-2">
          Maintenance <span className="text-gradient">Collection</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Transparent payment tracking with automated reminders
        </p>
      </div>
      <div className="flex gap-2">
        <Button className="btn-premium text-charcoal" onClick={() => setGenerateDialogOpen(true)}>
          <Calendar className="w-4 h-4 mr-2" />
          Generate Monthly
        </Button>
        <Button className="btn-premium text-charcoal" onClick={() => setPaymentDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Record Payment
        </Button>
      </div>
    </div>
  );

  // Stats Overview with Period Filter
  const statsOverview = (
    <>
      {/* Period Filter for Dashboard Stats */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-charcoal">Dashboard Overview</h3>
              <p className="text-sm text-muted-foreground">Financial summary based on selected period</p>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Select value={statsPeriodFilter} onValueChange={setStatsPeriodFilter}>
                <SelectTrigger className="w-48 input-premium">
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/20 max-h-72 overflow-auto">
                  {periodOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expected
            </CardTitle>
            <DollarSign className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif font-bold text-charcoal">
              ₹{stats.total.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {statsPeriodFilter === 'all' ? 'All Time' : 
               statsPeriodFilter === 'current_month' ? 'This Month' :
               statsPeriodFilter === 'current_year' ? 'This Year' : 
               periodOptions.find(p => p.value === statsPeriodFilter)?.label || 'Selected Period'}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Collected
            </CardTitle>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif font-bold text-green-600">
              ₹{stats.collected.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.collectionRate}% collection rate
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <Clock className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif font-bold text-yellow-600">
              ₹{stats.pending.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingHousesCount} houses
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Late Payment
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif font-bold text-red-600">
              ₹{stats.overdue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {lateHousesCount} houses
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );

  // Collection Progress
  const collectionProgress = (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-charcoal">Collection Progress</CardTitle>
        <CardDescription>
          Overall maintenance collection status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Collection Progress</span>
            <span className="text-2xl font-serif font-bold text-charcoal">
              {stats.collectionRate}%
            </span>
          </div>
          <Progress value={stats.collectionRate} className="h-4" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>₹{stats.collected.toLocaleString()} collected</span>
            <span>₹{(stats.pending + stats.overdue).toLocaleString()} remaining</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Search and Filters
  const searchAndFilters = (
    <Card className="glass-card">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              className="input-premium pl-10"
              placeholder="Search by house or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full lg:w-40 input-premium">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="glass-card border-white/20">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Late (legacy)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterHouse} onValueChange={setFilterHouse}>
            <SelectTrigger className="w-full lg:w-40 input-premium">
              <SelectValue placeholder="House" />
            </SelectTrigger>
            <SelectContent className="glass-card border-white/20 max-h-72 overflow-auto">
              <SelectItem value="all">All Houses</SelectItem>
              {houseOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-full lg:w-48 input-premium">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent className="glass-card border-white/20">
              <SelectItem value="all">All Months</SelectItem>
              {monthOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterMethod} onValueChange={setFilterMethod}>
            <SelectTrigger className="w-full lg:w-48 input-premium">
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent className="glass-card border-white/20">
              <SelectItem value="all">All Methods</SelectItem>
              {methodOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );

  // Payments Table
  const paymentsTable = (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-charcoal flex items-center justify-between">
          <span>Payment Records</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} className="btn-glass">Export CSV</Button>
          </div>
        </CardTitle>
        <CardDescription>
          Detailed maintenance payment status for all houses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {paymentsLoading && <div className="text-sm text-muted-foreground">Loading payments...</div>}
          {!paymentsLoading && filteredPayments.map((payment: any) => {
            const statusClassMap: Record<string, string> = {
              paid: "bg-green-100 text-green-800 border-green-200",
              pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
              overdue: "bg-red-100 text-red-800 border-red-200",
              partial: "bg-blue-100 text-blue-800 border-blue-200"
            };
            const statusBadge = statusClassMap[payment.status] || statusClassMap.pending;
            const StatusIcon = payment.status === 'paid' ? CheckCircle : payment.latePayment ? AlertTriangle : Clock;
            return (
              <div key={payment.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-white/25 hover:bg-white/35 transition-colors border border-white/30">
                <div className="flex items-center space-x-4">
                  <div className="p-2 rounded-lg bg-gradient-primary">
                    <StatusIcon className="w-5 h-5 text-charcoal" />
                  </div>
                  <div>
                    <div className="font-semibold text-charcoal">
                      House {payment.house}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <User className="w-3 h-3 mr-1" />
                      {payment.owner}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">{payment.monthRange ? payment.monthRange : payment.month}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-6 md:gap-10 flex-1 justify-start md:justify-center">
                  <div className="text-center min-w-[90px]">
                    <div className="font-semibold text-charcoal flex items-center justify-center gap-1"><IndianRupee className="w-3 h-3" />{payment.amount.toLocaleString()}</div>
                    <div className="text-[11px] text-muted-foreground">Amount</div>
                  </div>
                  <div className="text-center min-w-[90px]">
                    <div className="font-semibold text-green-700">₹{payment.amountPaid.toLocaleString()}</div>
                    <div className="text-[11px] text-muted-foreground">Paid</div>
                  </div>
                  <div className="text-center min-w-[110px]">
                    <div className="text-xs text-muted-foreground">Due {new Date(payment.dueDate).toLocaleDateString()}</div>
                    {payment.paidDate && (
                      <div className="text-[11px] text-green-600 font-medium">Paid {new Date(payment.paidDate).toLocaleDateString()}</div>
                    )}
                    {payment.amountPaid > 0 && payment.amountPaid < payment.amount && (
                      <div className="text-[11px] text-blue-600 font-medium">Partial ₹{payment.amountPaid.toLocaleString()}</div>
                    )}
                    {payment.status === 'paid' && payment.latePayment && (
                      <div className="text-[11px] text-red-600 font-semibold">Late Payment</div>
                    )}
                  </div>
                  <div className="flex flex-col items-center justify-center gap-1 min-w-[80px]">
                    <Badge className={statusBadge}>{payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</Badge>
                    {payment.status === 'paid' && payment.latePayment && <Badge className="bg-red-100 text-red-700 border-red-200">Late</Badge>}
                    {payment.status !== 'paid' && (
                      <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => openMarkPaidDialog(payment)}>Mark Paid</Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start md:self-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass-card border-white/20 w-52">
                      <DropdownMenuItem onClick={() => setViewingPayment(payment)}><Eye className="w-4 h-4 mr-2" />View Details</DropdownMenuItem>
                      {payment.status !== 'paid' && (
                        <DropdownMenuItem onClick={() => startEdit(payment)}><CheckCircle className="w-4 h-4 mr-2" />Record / Edit</DropdownMenuItem>
                      )}
                      {payment.status !== 'paid' && (
                        <DropdownMenuItem onClick={() => markPartial(payment, Math.floor(payment.amount / 2))}><Clock className="w-4 h-4 mr-2" />Mark Half Paid</DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => downloadReceipt(payment)}><ReceiptText className="w-4 h-4 mr-2" />Download Receipt</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => deletePayment(payment.id)} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen p-6">
      <div className="container mx-auto space-y-8">
        {/* Header */}
        {header}

        {/* Stats Overview */}
        {statsOverview}

        {/* Collection Progress */}
        {collectionProgress}

        {/* Search and Filters */}
        {searchAndFilters}

        {/* Payments Table */}
        {paymentsTable}

        {/* View Payment Details Dialog */}
        <Dialog open={!!viewingPayment} onOpenChange={(o)=> !o && setViewingPayment(null)}>
          <DialogContent className="glass-card max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-charcoal">Payment Details - House {viewingPayment?.house}</DialogTitle>
              <DialogDescription>Comprehensive maintenance payment information.</DialogDescription>
            </DialogHeader>
            {viewingPayment && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><span className="font-medium">Period:</span> {viewingPayment.monthRange || viewingPayment.month}</div>
                  <div><span className="font-medium">Status:</span> {viewingPayment.status}</div>
                  <div><span className="font-medium">Amount:</span> ₹{viewingPayment.amount.toLocaleString()}</div>
                  <div><span className="font-medium">Paid:</span> ₹{viewingPayment.amountPaid.toLocaleString()}</div>
                  <div><span className="font-medium">Due Date:</span> {new Date(viewingPayment.dueDate).toLocaleDateString()}</div>
                  <div><span className="font-medium">Paid Date:</span> {viewingPayment.paidDate ? new Date(viewingPayment.paidDate).toLocaleDateString() : '—'}</div>
                  <div><span className="font-medium">Method:</span> {viewingPayment.method || '—'}</div>
                  <div><span className="font-medium">Months Billed:</span> {viewingPayment.monthsCount || 1}</div>
                  <div><span className="font-medium">Late Payment:</span> {viewingPayment.latePayment ? 'Yes' : 'No'}</div>
                </div>
                {viewingPayment.remarks && <div><span className="font-medium">Remarks:</span> {viewingPayment.remarks}</div>}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" className="btn-glass" onClick={() => downloadReceipt(viewingPayment)}><FileDown className="w-4 h-4 mr-2" />Receipt</Button>
                  {viewingPayment.status !== 'paid' && <Button variant="outline" className="btn-glass" onClick={() => startEdit(viewingPayment)}>Update</Button>}
                  <Button variant="premium" className="text-charcoal" onClick={() => setViewingPayment(null)}>Close</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {filteredPayments.length === 0 && (
          <Card className="glass-card">
            <CardContent className="text-center py-12">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold text-charcoal mb-2">No payments found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms or filters
              </p>
            </CardContent>
          </Card>
        )}

        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-premium text-charcoal">
              <Plus className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-charcoal">{editingPayment ? 'Edit Maintenance Payment' : 'Record Maintenance Payment'}</DialogTitle>
              <DialogDescription>
                {editingPayment ? 'Update this maintenance payment entry.' : 'Select a period; amount auto-calculates (override allowed).'}
              </DialogDescription>
            </DialogHeader>
            <Form {...paymentForm}>
              <form onSubmit={paymentForm.handleSubmit(onAddPayment, () => toast({ title: '❌ Please fix the errors' }))} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={paymentForm.control} name="house" render={({ field }) => (
                    <FormItem>
                      <FormLabel>House Number</FormLabel>
                      <FormControl>
                        <select className="input-premium w-full bg-background/50 rounded-md border px-3 py-2" {...field}>
                          <option value="">Select house</option>
                          {activeHouseOptions.map(hn => <option key={hn} value={hn}>{hn}</option>)}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={paymentForm.control} name="owner" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Member / Owner</FormLabel>
                      <FormControl>
                        <Input disabled placeholder="Auto-filled" className="input-premium" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={paymentForm.control} name="fromMonth" render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Month</FormLabel>
                      <FormControl>
                        <Input type="month" className="input-premium" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={paymentForm.control} name="toMonth" render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Month</FormLabel>
                      <FormControl>
                        <Input type="month" className="input-premium" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={paymentForm.control} name="paymentDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Date</FormLabel>
                      <FormControl>
                        <Input type="date" className="input-premium" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={paymentForm.control} name="amount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maintenance Amount</FormLabel>
                      <FormControl>
                        <Input type="number" className="input-premium" {...field} onChange={(e) => { manualAmountRef.current = true; field.onChange(Number(e.target.value)); }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={paymentForm.control} name="amountPaid" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount Paid</FormLabel>
                      <FormControl>
                        <Input type="number" className="input-premium" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={paymentForm.control} name="method" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <FormControl>
                        <select className="input-premium w-full bg-background/50 rounded-md border px-3 py-2" {...field}>
                          <option value="">Select method</option>
                          {methodOptions.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={paymentForm.control} name="remarks" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Remarks / Notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Any comments" className="input-premium min-h-[90px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="sm:col-span-2 text-xs text-muted-foreground flex flex-wrap gap-4">
                    <span>Base Rate: ₹{defaultMaintenanceAmount.toLocaleString()} / month</span>
                    {watchFrom && watchTo && /^\d{4}-\d{2}$/.test(watchFrom) && /^\d{4}-\d{2}$/.test(watchTo) && (()=>{
                      const [fy,fm] = watchFrom.split('-').map(Number);
                      const [ty,tm] = watchTo.split('-').map(Number);
                      let diff = (ty - fy) * 12 + (tm - fm) + 1; if (diff < 1) diff = 1;
                      const auto = diff * defaultMaintenanceAmount;
                      return <span>Months: {diff} | Auto Total: ₹{auto.toLocaleString()} {manualAmountRef.current && watchAmount !== auto && <em className="text-amber-600 ml-2">(manual override)</em>}</span>;
                    })()}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" className="btn-glass" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" variant="premium" className="text-charcoal">Save Payment</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        {/* Mark Paid Date Dialog */}
        <Dialog open={!!markPaidTarget} onOpenChange={(o)=> { if(!o) setMarkPaidTarget(null); }}>
          <DialogContent className="glass-card max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-charcoal">Mark Paid - House {markPaidTarget?.house}</DialogTitle>
              <DialogDescription>Select the date on which the payment was received. Late payment logic flags payments if the day is greater than 15.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Payment Date</label>
                <Input type="date" className="input-premium" value={markPaidDate} max={new Date().toISOString().slice(0,10)} onChange={(e)=> setMarkPaidDate(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-2">If the selected date's day is after 15, it will be flagged as a late payment once saved.</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" className="btn-glass" onClick={()=> setMarkPaidTarget(null)}>Cancel</Button>
                <Button variant="premium" className="text-charcoal" onClick={confirmMarkPaid}>Confirm & Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Generate Monthly Range Dialog */}
        <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
          <DialogContent className="glass-card max-w-md">
            <DialogHeader>
              <DialogTitle className="text-charcoal">Generate Monthly Records</DialogTitle>
              <DialogDescription>
                Select the month range for which you want to generate maintenance records for all occupied houses.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">From Month</label>
                  <Input 
                    type="month" 
                    className="input-premium" 
                    value={generateFromMonth} 
                    onChange={(e) => setGenerateFromMonth(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">To Month</label>
                  <Input 
                    type="month" 
                    className="input-premium" 
                    value={generateToMonth} 
                    onChange={(e) => setGenerateToMonth(e.target.value)} 
                  />
                </div>
              </div>
              
              {generateFromMonth && generateToMonth && (() => {
                if (!/^\d{4}-\d{2}$/.test(generateFromMonth) || !/^\d{4}-\d{2}$/.test(generateToMonth)) {
                  return null;
                }
                const [fy, fm] = generateFromMonth.split('-').map(Number);
                const [ty, tm] = generateToMonth.split('-').map(Number);
                const monthsCount = Math.max(1, (ty - fy) * 12 + (tm - fm) + 1);
                const fromLabel = formatMonthLabel(generateFromMonth);
                const toLabel = formatMonthLabel(generateToMonth);
                const rangeLabel = monthsCount === 1 ? fromLabel : `${fromLabel} – ${toLabel}`;
                
                return (
                  <div className="p-3 bg-white/20 rounded-md">
                    <p className="text-sm text-muted-foreground">
                      <strong>Range:</strong> {rangeLabel} ({monthsCount} month{monthsCount !== 1 ? 's' : ''})
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Amount per house:</strong> ₹{(defaultMaintenanceAmount * monthsCount).toLocaleString()}
                    </p>
                  </div>
                );
              })()}
              
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" className="btn-glass" onClick={() => setGenerateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="premium" className="text-charcoal" onClick={generateMonthlyRecords}>
                  Generate Records
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Maintenance;