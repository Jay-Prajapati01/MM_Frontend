import { useState, useMemo } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  Search, 
  Plus, 
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  PieChart,
  FileText,
  Calendar,
  Receipt,
  Download,
  Eye,
  Edit,
  Trash2,
  Upload,
  IndianRupee,
  Filter
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useExpenditures, useCreateExpenditure, useUpdateExpenditure, useDeleteExpenditure } from '@/hooks/useExpenditures';
import { usePayments } from '@/hooks/usePayments';
import { Expenditure } from '@/types/models';

const EXPENSE_CATEGORIES = [
  'Security', 'Cleaning', 'Repairs', 'Utilities', 'Events', 'Maintenance', 'Administration', 'Other'
] as const;

const PAYMENT_MODES = [
  'Cash', 'Bank', 'Online', 'Vendor Transfer'
] as const;

const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff0000', '#0000ff', '#ffff00'
];

const Expenditures = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPaymentMode, setFilterPaymentMode] = useState("all");
  const [filterDateRange, setFilterDateRange] = useState("all");
  
  const { data: expendituresData, isLoading: expendituresLoading } = useExpenditures();
  const { data: paymentsData } = usePayments();
  const createExpenditureMutation = useCreateExpenditure();
  const updateExpenditureMutation = useUpdateExpenditure();
  const deleteExpenditureMutation = useDeleteExpenditure();

  const expenditures = expendituresData?.list || [];
  const summary = expendituresData?.summary || { 
    totalExpenditure: 0, 
    totalCollection: 0, 
    remainingBalance: 0, 
    categoryBreakdown: {} 
  };

  // Enhanced filtering with date range support
  const filteredExpenditures = useMemo(() => {
    return expenditures.filter((expense: Expenditure) => {
      const matchesSearch = 
        expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (expense.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = filterCategory === "all" || expense.category === filterCategory;
      const matchesPaymentMode = filterPaymentMode === "all" || expense.paymentMode === filterPaymentMode;
      
      let matchesDateRange = true;
      if (filterDateRange !== "all") {
        const expenseDate = new Date(expense.date);
        const today = new Date();
        
        switch (filterDateRange) {
          case "today":
            matchesDateRange = expenseDate.toDateString() === today.toDateString();
            break;
          case "week":
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDateRange = expenseDate >= weekAgo;
            break;
          case "month":
            const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
            matchesDateRange = expenseDate >= monthAgo;
            break;
          case "quarter":
            const quarterAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
            matchesDateRange = expenseDate >= quarterAgo;
            break;
        }
      }
      
      return matchesSearch && matchesCategory && matchesPaymentMode && matchesDateRange;
    });
  }, [expenditures, searchTerm, filterCategory, filterPaymentMode, filterDateRange]);

  // Prepare chart data
  const categoryChartData = useMemo(() => {
    return Object.entries(summary.categoryBreakdown).map(([category, amount], index) => ({
      name: category,
      value: amount,
      color: COLORS[index % COLORS.length]
    }));
  }, [summary.categoryBreakdown]);

  const monthlyTrendData = useMemo(() => {
    const monthlyData: Record<string, number> = {};
    
    expenditures.forEach(expense => {
      const monthYear = new Date(expense.date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      monthlyData[monthYear] = (monthlyData[monthYear] || 0) + expense.amount;
    });
    
    return Object.entries(monthlyData)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(-6) // Last 6 months
      .map(([month, amount]) => ({ month, amount }));
  }, [expenditures]);

  // Dialog states
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expenditure | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expenditure | null>(null);

  // Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportMode, setExportMode] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [exportDay, setExportDay] = useState(new Date().toISOString().slice(0,10));
  const [exportWeekStart, setExportWeekStart] = useState(new Date().toISOString().slice(0,10));
  const [exportMonth, setExportMonth] = useState(() => new Date().toISOString().slice(0,7)); // YYYY-MM
  const [exportYear, setExportYear] = useState(() => new Date().getFullYear().toString());

  // Form validation schema
  const expenseSchema = z.object({
    title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
    category: z.enum(EXPENSE_CATEGORIES),
    amount: z.number().min(1, 'Amount must be greater than 0'),
    paymentMode: z.enum(PAYMENT_MODES),
    date: z.string().min(1, 'Date is required'),
    description: z.string().optional(),
  });

  type ExpenseFormValues = z.infer<typeof expenseSchema>;

  const expenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: '',
      category: 'Other',
      amount: 0,
      paymentMode: 'Cash',
      date: new Date().toISOString().slice(0, 10),
      description: '',
    }
  });

  // Handle form submission
  const onSubmitExpense = (values: ExpenseFormValues) => {
    const payload = {
      title: values.title,
      category: values.category,
      amount: values.amount,
      paymentMode: values.paymentMode,
      date: values.date,
      description: values.description,
    };

    if (editingExpense) {
      updateExpenditureMutation.mutate({ 
        id: editingExpense.id, 
        updates: payload 
      }, {
        onSuccess: () => {
          toast({ title: '✅ Expense updated successfully' });
          setExpenseDialogOpen(false);
          setEditingExpense(null);
          expenseForm.reset();
        }
      });
    } else {
      createExpenditureMutation.mutate(payload, {
        onSuccess: () => {
          toast({ title: '✅ Expense recorded successfully' });
          setExpenseDialogOpen(false);
          expenseForm.reset();
        }
      });
    }
  };

  const startEdit = (expense: Expenditure) => {
    setEditingExpense(expense);
    expenseForm.reset({
      title: expense.title,
      category: expense.category,
      amount: expense.amount,
      paymentMode: expense.paymentMode,
      date: expense.date,
      description: expense.description || '',
    });
    setExpenseDialogOpen(true);
  };

  const deleteExpense = (id: number) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    
    deleteExpenditureMutation.mutate(id, {
      onSuccess: () => {
        toast({ title: '🗑️ Expense deleted successfully' });
      }
    });
  };

  const buildCsvAndDownload = (list: Expenditure[], suffix: string) => {
    const headers = ['Title', 'Category', 'Amount', 'Payment Mode', 'Date', 'Description'];
    const rows = list.map(expense => [
      expense.title,
      expense.category,
      expense.amount,
      expense.paymentMode,
      expense.date,
      expense.description || ''
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Expenses_${suffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    // Choose filteredExpenditures as base, then apply time filter
    let list: Expenditure[] = [];
    const today = new Date();
    if (exportMode === 'day') {
      list = filteredExpenditures.filter(e => e.date === exportDay);
      if (!list.length) return toast({ title: '⚠️ No expenses for selected day' });
      buildCsvAndDownload(list, `Daily_${exportDay}`);
    } else if (exportMode === 'week') {
      const start = new Date(exportWeekStart + 'T00:00:00');
      const end = new Date(start.getTime() + 6*24*60*60*1000);
      list = filteredExpenditures.filter(e => {
        const d = new Date(e.date + 'T00:00:00');
        return d >= start && d <= end;
      });
      const startLabel = start.toISOString().slice(0,10);
      const endLabel = end.toISOString().slice(0,10);
      if (!list.length) return toast({ title: '⚠️ No expenses for selected week range' });
      buildCsvAndDownload(list, `Weekly_${startLabel}_to_${endLabel}`);
    } else if (exportMode === 'month') {
      // exportMonth is YYYY-MM
      list = filteredExpenditures.filter(e => e.date.startsWith(exportMonth));
      if (!list.length) return toast({ title: '⚠️ No expenses for selected month' });
      const monthDate = new Date(exportMonth + '-01T00:00:00');
      const monthName = monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' }).replace(/ /g,'_');
      buildCsvAndDownload(list, `Monthly_${monthName}`);
    } else if (exportMode === 'year') {
      list = filteredExpenditures.filter(e => e.date.startsWith(exportYear));
      if (!list.length) return toast({ title: '⚠️ No expenses for selected year' });
      buildCsvAndDownload(list, `Yearly_${exportYear}`);
    }
    setExportDialogOpen(false);
    toast({ title: '📄 Export completed' });
  };

  return (
    <div className="min-h-screen p-6">
      <div className="container mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-charcoal mb-2">
              Expense <span className="text-gradient">Management</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Track society expenses and maintain financial transparency
            </p>
          </div>
          <div className="flex gap-2">
            <Button className="btn-premium text-charcoal" onClick={() => setExpenseDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Collection
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif font-bold text-green-600">
                ₹{summary.totalCollection.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                From maintenance payments
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Expenses
              </CardTitle>
              <TrendingDown className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif font-bold text-red-600">
                ₹{summary.totalExpenditure.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total expenses recorded
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Remaining Balance
              </CardTitle>
              <DollarSign className={`h-5 w-5 ${summary.remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-serif font-bold ${summary.remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{Math.abs(summary.remainingBalance).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.remainingBalance >= 0 ? 'Available funds' : 'Deficit amount'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Category Breakdown Pie Chart */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-charcoal flex items-center">
                <PieChart className="w-5 h-5 mr-2" />
                Category Breakdown
              </CardTitle>
              <CardDescription>
                Spending distribution by expense category
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoryChartData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Amount']}
                        labelStyle={{ color: '#374151' }}
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px' 
                        }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value) => <span style={{ color: '#374151', fontSize: '12px' }}>{value}</span>}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-16">
                  <PieChart className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">No expense data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Trend Bar Chart */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-charcoal flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Monthly Trend
              </CardTitle>
              <CardDescription>
                Expense trends over the last 6 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyTrendData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Amount']}
                        labelStyle={{ color: '#374151' }}
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px' 
                        }}
                      />
                      <Bar dataKey="amount" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-16">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">No trend data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  className="input-premium pl-10"
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full lg:w-40 input-premium">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/20">
                  <SelectItem value="all">All Categories</SelectItem>
                  {EXPENSE_CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterPaymentMode} onValueChange={setFilterPaymentMode}>
                <SelectTrigger className="w-full lg:w-40 input-premium">
                  <SelectValue placeholder="Payment Mode" />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/20">
                  <SelectItem value="all">All Modes</SelectItem>
                  {PAYMENT_MODES.map(mode => (
                    <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                <SelectTrigger className="w-full lg:w-40 input-premium">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/20">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-charcoal flex items-center justify-between">
              <span>Expense Records</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(true)} className="btn-glass">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Detailed expense records and transaction history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expendituresLoading && (
                <div className="text-sm text-muted-foreground">Loading expenses...</div>
              )}
              
              {!expendituresLoading && filteredExpenditures.length === 0 && (
                <div className="text-center py-12">
                  <Receipt className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold text-charcoal mb-2">No expenses found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search terms or filters
                  </p>
                </div>
              )}
              
              {!expendituresLoading && filteredExpenditures.map((expense: Expenditure) => {
                const categoryColor = COLORS[EXPENSE_CATEGORIES.indexOf(expense.category) % COLORS.length];
                
                return (
                  <div 
                    key={expense.id} 
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-white/25 hover:bg-white/35 transition-colors border border-white/30"
                  >
                    <div className="flex items-center space-x-4">
                      <div 
                        className="p-2 rounded-lg text-white"
                        style={{ backgroundColor: categoryColor }}
                      >
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-charcoal">{expense.title}</div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Category: {expense.category}</span>
                          <span>•</span>
                          <span>{new Date(expense.date).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{expense.paymentMode}</span>
                        </div>
                        {expense.description && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {expense.description}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-red-600 flex items-center gap-1">
                          <IndianRupee className="w-4 h-4" />
                          {expense.amount.toLocaleString()}
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-card border-white/20">
                          <DropdownMenuItem onClick={() => setViewingExpense(expense)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => startEdit(expense)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Expense
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteExpense(expense.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Expense Dialog */}
        <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
          <DialogContent className="glass-card max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-charcoal">
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </DialogTitle>
              <DialogDescription>
                {editingExpense ? 'Update the expense details below.' : 'Record a new society expense with all necessary details.'}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...expenseForm}>
              <form onSubmit={expenseForm.handleSubmit(onSubmitExpense)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={expenseForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Expense Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Monthly Security Service" className="input-premium" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={expenseForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger className="input-premium">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent className="glass-card border-white/20">
                              {EXPENSE_CATEGORIES.map(category => (
                                <SelectItem key={category} value={category}>{category}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={expenseForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (₹)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            className="input-premium" 
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={expenseForm.control}
                    name="paymentMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Mode</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger className="input-premium">
                              <SelectValue placeholder="Select payment mode" />
                            </SelectTrigger>
                            <SelectContent className="glass-card border-white/20">
                              {PAYMENT_MODES.map(mode => (
                                <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={expenseForm.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" className="input-premium" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={expenseForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional details about this expense..." 
                            className="input-premium min-h-[80px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="btn-glass" 
                    onClick={() => {
                      setExpenseDialogOpen(false);
                      setEditingExpense(null);
                      expenseForm.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="premium" className="text-charcoal">
                    {editingExpense ? 'Update Expense' : 'Add Expense'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* View Expense Details Dialog */}
        <Dialog open={!!viewingExpense} onOpenChange={(open) => !open && setViewingExpense(null)}>
          <DialogContent className="glass-card max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-charcoal">Expense Details</DialogTitle>
              <DialogDescription>Complete information about this expense</DialogDescription>
            </DialogHeader>
            
            {viewingExpense && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <span className="font-medium">Title:</span> {viewingExpense.title}
                  </div>
                  <div>
                    <span className="font-medium">Category:</span> {viewingExpense.category}
                  </div>
                  <div>
                    <span className="font-medium">Amount:</span> ₹{viewingExpense.amount.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Payment Mode:</span> {viewingExpense.paymentMode}
                  </div>
                  <div>
                    <span className="font-medium">Date:</span> {new Date(viewingExpense.date).toLocaleDateString()}
                  </div>
                  {viewingExpense.description && (
                    <div className="col-span-2">
                      <span className="font-medium">Description:</span>
                      <p className="mt-1 text-muted-foreground">{viewingExpense.description}</p>
                    </div>
                  )}
                  <div className="col-span-2 text-xs text-muted-foreground">
                    <span className="font-medium">Created:</span> {new Date(viewingExpense.createdAt).toLocaleString()}
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" className="btn-glass" onClick={() => startEdit(viewingExpense)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="premium" className="text-charcoal" onClick={() => setViewingExpense(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Export CSV Dialog */}
        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogContent className="glass-card w-full max-w-2xl max-h-[90vh] overflow-auto">
            <DialogHeader className="p-6 border-b border-white/20">
              <DialogTitle className="text-charcoal flex items-center gap-2 text-lg">
                <Download className="w-5 h-5" />
                Expense Export Options
              </DialogTitle>
              <DialogDescription>Select a time scope and configure your export preferences.</DialogDescription>
            </DialogHeader>
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-charcoal block">Export Time Scope</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: 'day', label: 'Daily', icon: '📅' },
                    { value: 'week', label: 'Weekly', icon: '📊' },
                    { value: 'month', label: 'Monthly', icon: '🗓️' },
                    { value: 'year', label: 'Yearly', icon: '📆' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setExportMode(option.value as any)}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2 text-center hover:shadow-md ${
                        exportMode === option.value
                          ? 'border-green-500 bg-green-50/80 text-green-700 shadow-md'
                          : 'border-white/30 bg-white/20 text-charcoal hover:border-white/50 hover:bg-white/30'
                      }`}
                    >
                      <span className="text-xl">{option.icon}</span>
                      <span className="font-medium text-sm">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {exportMode === 'day' && (
                <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-blue-700 font-medium">
                    <span>📅</span>
                    <span>Daily Export Configuration</span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-2">Select Specific Day</label>
                    <Input 
                      type="date" 
                      value={exportDay} 
                      onChange={e => setExportDay(e.target.value)} 
                      className="w-full h-11 px-4 rounded-lg border-2 border-white/30 bg-white/50 focus:border-blue-500 focus:outline-none transition-colors" 
                    />
                  </div>
                  <div className="text-xs text-blue-600 bg-blue-100/50 p-2 rounded">
                    Will export all expenses recorded on <strong>{new Date(exportDay).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                  </div>
                </div>
              )}

              {exportMode === 'week' && (
                <div className="bg-purple-50/80 border border-purple-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-purple-700 font-medium">
                    <span>📊</span>
                    <span>Weekly Export Configuration</span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-2">Week Start Date</label>
                    <Input 
                      type="date" 
                      value={exportWeekStart} 
                      onChange={e => setExportWeekStart(e.target.value)} 
                      className="w-full h-11 px-4 rounded-lg border-2 border-white/30 bg-white/50 focus:border-purple-500 focus:outline-none transition-colors" 
                    />
                  </div>
                  <div className="text-xs text-purple-600 bg-purple-100/50 p-2 rounded">
                    Will export expenses from <strong>{new Date(exportWeekStart).toLocaleDateString()}</strong> to <strong>{new Date(new Date(exportWeekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString()}</strong> (7 days)
                  </div>
                </div>
              )}

              {exportMode === 'month' && (
                <div className="bg-green-50/80 border border-green-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-green-700 font-medium">
                    <span>🗓️</span>
                    <span>Monthly Export Configuration</span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-2">Select Month & Year</label>
                    <Input 
                      type="month" 
                      value={exportMonth} 
                      onChange={e => setExportMonth(e.target.value)} 
                      className="w-full h-11 px-4 rounded-lg border-2 border-white/30 bg-white/50 focus:border-green-500 focus:outline-none transition-colors" 
                    />
                  </div>
                  <div className="text-xs text-green-600 bg-green-100/50 p-2 rounded">
                    Will export all expenses for <strong>{new Date(exportMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</strong>
                  </div>
                </div>
              )}

              {exportMode === 'year' && (
                <div className="bg-orange-50/80 border border-orange-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-orange-700 font-medium">
                    <span>📆</span>
                    <span>Yearly Export Configuration</span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-2">Enter Year</label>
                    <Input 
                      type="number" 
                      value={exportYear} 
                      onChange={e => setExportYear(e.target.value)}
                      min="2020"
                      max="2030"
                      className="w-full h-11 px-4 rounded-lg border-2 border-white/30 bg-white/50 focus:border-orange-500 focus:outline-none transition-colors" 
                    />
                  </div>
                  <div className="text-xs text-orange-600 bg-orange-100/50 p-2 rounded">
                    Will export all expenses for the entire year <strong>{exportYear}</strong>
                  </div>
                </div>
              )}

              <div className="bg-gray-50/80 border border-gray-200 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-charcoal text-sm">Export Summary</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white/70 p-3 rounded border">
                    <span className="text-muted-foreground">Applied Filters:</span>
                    <div className="font-semibold text-charcoal mt-1">
                      {filterCategory !== 'all' ? `Category: ${filterCategory}` : 'All Categories'} • 
                      {filterPaymentMode !== 'all' ? ` Payment: ${filterPaymentMode}` : ' All Payments'}
                    </div>
                  </div>
                  <div className="bg-white/70 p-3 rounded border">
                    <span className="text-muted-foreground">Total Records:</span>
                    <div className="font-semibold text-charcoal mt-1">{filteredExpenditures.length} expenses</div>
                  </div>
                </div>
                <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
                  <div className="font-medium mb-1">💡 Export Information:</div>
                  <p>Export will include all currently filtered expenses within the selected time scope. CSV format includes all expense details.</p>
                </div>
              </div>
            </div>
            
            <DialogFooter className="flex flex-col sm:flex-row items-center justify-end gap-3 p-6 border-t border-white/20">
              <Button 
                variant="outline" 
                onClick={() => setExportDialogOpen(false)}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button 
                variant="premium" 
                onClick={handleExport}
                className="w-full sm:w-auto order-1 sm:order-2 flex items-center gap-2 shadow-lg text-charcoal"
              >
                <Download className="w-4 h-4" />
                Export Data
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
export default Expenditures;