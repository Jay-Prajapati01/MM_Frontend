import { useMemo, useState } from 'react';
import { useHouses } from '@/hooks/useHouses';
import { useMembers } from '@/hooks/useMembers';
import { useVehicles } from '@/hooks/useVehicles';
import { usePayments } from '@/hooks/usePayments';
import { useExpenditures } from '@/hooks/useExpenditures';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Progress } from "@/components/ui/progress";
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Building2, Users, Car, DollarSign, TrendingUp, AlertCircle, Plus, BarChart3, PieChart, IndianRupee, AlertTriangle, Clock, CheckCircle2, Calendar, Home, RefreshCw, ChevronDown 
} from 'lucide-react';

const Dashboard = () => {
  // Data with loading states for sync indication
  const { data: housesData, isLoading: housesLoading } = useHouses();
  const { data: membersData, isLoading: membersLoading } = useMembers();
  const { data: vehiclesData, isLoading: vehiclesLoading } = useVehicles();
  const { data: paymentsData, isLoading: paymentsLoading, refetch: refetchPayments } = usePayments();
  const { data: expendituresData } = useExpenditures();

  const houses = Array.isArray((housesData as any)?.list) ? (housesData as any).list : (Array.isArray(housesData)? housesData: []);
  const payments = Array.isArray((paymentsData as any)?.list) ? (paymentsData as any).list : (Array.isArray(paymentsData)? paymentsData: []);
  const members = Array.isArray(membersData)? membersData as any[] : (Array.isArray((membersData as any)?.list) ? (membersData as any).list : []);
  const vehicles = Array.isArray(vehiclesData)? vehiclesData as any[] : (Array.isArray((vehiclesData as any)?.list)? (vehiclesData as any).list: []);
  const expenditures = expendituresData?.list || [];
  const expSummary = expendituresData?.summary || { totalExpenditure:0,totalCollection:0,remainingBalance:0,categoryBreakdown:{} };

  // Derived Metrics - Enhanced for proper sync with maintenance section
  const currentMonth = new Date().toISOString().slice(0,7); // yyyy-mm
  const currentMonthLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  
  // Monthly payments - filter by current month using both raw format and month label
  const monthlyPayments = useMemo(() => {
    return payments.filter((p: any) => {
      // Check if payment is for current month using multiple criteria
      const isCurrentMonthRaw = p.fromMonthRaw === currentMonth;
      const isCurrentMonthLabel = p.month === currentMonthLabel;
      const isCurrentMonthInRange = p.monthRange && p.monthRange.includes(currentMonthLabel);
      
      return isCurrentMonthRaw || isCurrentMonthLabel || isCurrentMonthInRange;
    });
  }, [payments, currentMonth, currentMonthLabel]);

  // Collection metrics based on monthly payments
  const monthlyCollected = useMemo(() => {
    return monthlyPayments
      .filter((p: any) => p.status === 'paid')
      .reduce((sum: number, p: any) => sum + (p.amountPaid || 0), 0);
  }, [monthlyPayments]);

  const monthlyBilled = useMemo(() => {
    return monthlyPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  }, [monthlyPayments]);

  // House counts - for current month only
  const housesPaidCount = useMemo(() => {
    return new Set(
      monthlyPayments
        .filter((p: any) => p.status === 'paid')
        .map((p: any) => p.house)
    ).size;
  }, [monthlyPayments]);

  // All pending payments (not just current month) for dashboard overview
  const allPendingPayments = useMemo(() => {
    return payments.filter((p: any) => p.status === 'pending' || p.status === 'overdue' || p.amountPaid === 0);
  }, [payments]);

  const pendingHousesCount = useMemo(() => {
    return new Set(allPendingPayments.map((p: any) => p.house)).size;
  }, [allPendingPayments]);

  // Collection rate for current month
  const collectionRate = useMemo(() => {
    return monthlyBilled > 0 ? Math.round((monthlyCollected / monthlyBilled) * 100) : 0;
  }, [monthlyCollected, monthlyBilled]);

  const vacantHouses = houses.filter((h:any)=> h.status==='vacant');
  const occupiedHouses = houses.filter((h:any)=> h.status==='occupied');
  // Vacancy count (user requested count instead of percentage)
  const vacancyCount = vacantHouses.length;

  // Expenditures monthly
  const monthlyExpenses = useMemo(()=> expenditures.filter((e:any)=> e.date.startsWith(currentMonth)), [expenditures,currentMonth]);
  const monthlyExpenseTotal = monthlyExpenses.reduce((s:number,e:any)=> s+ e.amount,0);
  const balanceThisMonth = monthlyCollected - monthlyExpenseTotal;

  // Top 4 expense categories this month
  const topExpenseCats = useMemo(()=> {
    const map: Record<string,number> = {};
    monthlyExpenses.forEach((e:any)=> { map[e.category] = (map[e.category]||0)+ e.amount; });
    return Object.entries(map).sort((a,b)=> b[1]-a[1]).slice(0,4);
  },[monthlyExpenses]);

  // Activity log integration
  const [activityLimit, setActivityLimit] = useState(40);
  const { list: activitySlice, fullList: activityFull, isLoading: activityLoading } = useActivityLog({ limit: activityLimit });

  const recentFinancial = useMemo(()=> activitySlice.filter(a=> a.type==='payment' || a.type==='expenditure').slice(0,12),[activitySlice]);
  const formattedActivities = useMemo(()=> activitySlice.map(a => ({
    id: a.id,
    ts: a.ts,
    type: a.type,
    action: a.action,
    summary: a.summary,
    amount: a.amount,
    badge: a.type==='payment' ? (a.action==='create' ? 'Payment' : a.action) : a.type==='expenditure' ? 'Expense' : a.action,
  })), [activitySlice]);

  // Tasks derived from data
  const tasks = [
    { task: 'Pending Maintenance Payments', count: `${pendingHousesCount} houses`, priority: pendingHousesCount>0? 'high':'low' },
    { task: 'Vacant Houses', count: `${vacantHouses.length} units`, priority: vacantHouses.length>0? 'medium':'low' },
    { task: 'Recorded Expenses This Month', count: `${monthlyExpenses.length} entries`, priority: 'low' }
  ];

  const quickMetricCards = [
    { title:'Total Houses', value: houses.length, change: occupiedHouses.length? `${occupiedHouses.length} occupied`:'', icon: Building2, color:'text-blue-600' },
    { title:'Members', value: members.length, change: '', icon: Users, color:'text-green-600' },
    { title:'Vacant Houses', value: vacancyCount, change: '', icon: Home, color:'text-purple-600' },
    { title:'Collection Rate', value: collectionRate + '%', change: `${housesPaidCount} paid / ${pendingHousesCount} pending`, icon: DollarSign, color:'text-orange-600' }
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="container mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-charcoal mb-2">Welcome back, <span className="text-gradient">Pramukh</span></h1>
            <p className="text-muted-foreground text-lg">Unified overview of society operations</p>
          </div>
          <div className="flex gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="btn-premium hover:shadow-lg hover:scale-105 transition-all duration-300 text-black">
                  <Plus className="w-4 h-4 mr-2 text-black"/>
                  Quick Actions
                  <ChevronDown className="w-4 h-4 ml-2 text-black"/>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-56 glass-card border-white/20 shadow-lg animate-fade-in-up"
                sideOffset={5}
              >
                <DropdownMenuItem className="hover:bg-white/20 transition-colors cursor-pointer">
                  <Link to="/houses" className="flex items-center w-full">
                    <Building2 className="w-4 h-4 mr-3 text-blue-600"/>
                    <div>
                      <div className="font-medium text-charcoal">Houses</div>
                      <div className="text-xs text-muted-foreground">Manage property units</div>
                    </div>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem className="hover:bg-white/20 transition-colors cursor-pointer">
                  <Link to="/members" className="flex items-center w-full">
                    <Users className="w-4 h-4 mr-3 text-green-600"/>
                    <div>
                      <div className="font-medium text-charcoal">Members</div>
                      <div className="text-xs text-muted-foreground">Resident management</div>
                    </div>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem className="hover:bg-white/20 transition-colors cursor-pointer">
                  <Link to="/vehicles" className="flex items-center w-full">
                    <Car className="w-4 h-4 mr-3 text-purple-600"/>
                    <div>
                      <div className="font-medium text-charcoal">Vehicles</div>
                      <div className="text-xs text-muted-foreground">Vehicle registration</div>
                    </div>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem className="hover:bg-white/20 transition-colors cursor-pointer">
                  <Link to="/maintenance" className="flex items-center w-full">
                    <IndianRupee className="w-4 h-4 mr-3 text-orange-600"/>
                    <div>
                      <div className="font-medium text-charcoal">Maintenance</div>
                      <div className="text-xs text-muted-foreground">Payment collection</div>
                    </div>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem className="hover:bg-white/20 transition-colors cursor-pointer">
                  <Link to="/expenditures" className="flex items-center w-full">
                    <PieChart className="w-4 h-4 mr-3 text-red-600"/>
                    <div>
                      <div className="font-medium text-charcoal">Expenditures</div>
                      <div className="text-xs text-muted-foreground">Expense tracking</div>
                    </div>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem className="hover:bg-white/20 transition-colors cursor-pointer">
                  <Link to="/reports" className="flex items-center w-full">
                    <BarChart3 className="w-4 h-4 mr-3 text-indigo-600"/>
                    <div>
                      <div className="font-medium text-charcoal">Reports</div>
                      <div className="text-xs text-muted-foreground">Analytics & insights</div>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickMetricCards.map((m,i)=>(
            <Card key={i} className="glass-card hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{m.title}</CardTitle>
                <m.icon className={`h-5 w-5 ${m.color}`}/>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-serif font-bold text-charcoal">{m.value}</div>
                {m.change && <p className="text-xs text-muted-foreground mt-1">{m.change}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Maintenance Collection Summary */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-charcoal">
                <div className="flex items-center">
                  <IndianRupee className="w-5 h-5 mr-2"/>
                  Collection Summary
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => refetchPayments()}
                  disabled={paymentsLoading}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className={`w-4 h-4 ${paymentsLoading ? 'animate-spin' : ''}`} />
                </Button>
              </CardTitle>
              <CardDescription>{currentMonthLabel} maintenance collection status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Collection Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-700">₹{monthlyCollected.toLocaleString()}</div>
                    <div className="text-sm text-green-600">Collected This Month</div>
                    {monthlyPayments.length > 0 && (
                      <div className="text-xs text-green-500 mt-1">
                        from {monthlyPayments.filter((p: any) => p.status === 'paid').length} payments
                      </div>
                    )}
                  </div>
                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-lg border border-orange-200">
                    <div className="text-2xl font-bold text-orange-700">₹{Math.max(0, monthlyBilled - monthlyCollected).toLocaleString()}</div>
                    <div className="text-sm text-orange-600">Pending This Month</div>
                    {monthlyPayments.length > 0 && (
                      <div className="text-xs text-orange-500 mt-1">
                        from {monthlyPayments.filter((p: any) => p.status !== 'paid').length} pending payments
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-charcoal">Collection Progress</span>
                    <span className="text-lg font-bold text-charcoal">{collectionRate}%</span>
                  </div>
                  <Progress value={collectionRate} className="h-3" />
                  <div className="text-xs text-muted-foreground">
                    {housesPaidCount} houses paid this month • {pendingHousesCount} houses have pending payments
                  </div>
                  {monthlyBilled === 0 && (
                    <div className="text-xs text-amber-600 font-medium">
                      No maintenance records generated for {currentMonthLabel}
                    </div>
                  )}
                </div>

                {/* Quick Action Button */}
                <div className="flex justify-between items-center pt-4 border-t border-white/20">
                  <Link to="/maintenance" className="flex-1">
                    <Button variant="outline" className="w-full btn-glass text-sm">
                      Manage Maintenance
                    </Button>
                  </Link>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-4 gap-3 pt-4 border-t border-white/20">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{housesPaidCount}</div>
                    <div className="text-xs text-muted-foreground">Paid This Month</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">{pendingHousesCount}</div>
                    <div className="text-xs text-muted-foreground">All Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{vacancyCount}</div>
                    <div className="text-xs text-muted-foreground">Vacant Houses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">{occupiedHouses.length}</div>
                    <div className="text-xs text-muted-foreground">Occupied</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center text-charcoal"><AlertCircle className="w-5 h-5 mr-2"/>Priority Items</CardTitle>
              <CardDescription>Operational attention points</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks.map((t,i)=>(
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/30 hover:bg-white/40 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-charcoal">{t.task}</p>
                    <p className="text-[11px] text-muted-foreground">{t.count}</p>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${t.priority==='high'?'bg-red-500':t.priority==='medium'?'bg-orange-500':'bg-green-500'}`}/>
                </div>
              ))}
              <Link to="/maintenance"><Button variant="outline" className="w-full btn-glass mt-2">View Details</Button></Link>
            </CardContent>
          </Card>
        </div>

        {/* Expenses & Balance */}
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center text-charcoal"><PieChart className="w-5 h-5 mr-2"/>Expenses This Month</CardTitle>
              <CardDescription>Total & top categories</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-3xl font-serif font-bold text-charcoal">₹{monthlyExpenseTotal.toLocaleString()}</div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${balanceThisMonth>=0?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{balanceThisMonth>=0? 'Surplus':'Deficit'}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {topExpenseCats.map(([cat,amt])=> (
                  <div key={cat} className="p-2 rounded bg-white/30 flex items-center justify-between">
                    <span className="font-medium text-charcoal truncate pr-2">{cat}</span>
                    <span className="text-muted-foreground">₹{amt.toLocaleString()}</span>
                  </div>
                ))}
                {topExpenseCats.length===0 && <div className="text-muted-foreground col-span-2 text-sm">No expenses recorded this month.</div>}
              </div>
              <div className="text-[11px] text-muted-foreground pt-2 border-t border-white/20">Balance after expenses: <span className={balanceThisMonth>=0? 'text-green-600 font-medium':'text-red-600 font-medium'}>₹{balanceThisMonth.toLocaleString()}</span></div>
              <Link to="/expenditures"><Button size="sm" variant="outline" className="btn-glass mt-2">Manage Expenses</Button></Link>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center text-charcoal"><IndianRupee className="w-5 h-5 mr-2"/>Recent Payments & Expenses</CardTitle>
              <CardDescription>Latest financial activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[320px] overflow-auto pr-2">
              {recentFinancial.map((a:any)=> (
                <div key={a.id} className="flex items-center justify-between p-2 rounded-md bg-white/25 hover:bg-white/35 transition-colors text-sm">
                  <div className="flex items-center gap-2">
                    {a.type==='payment' ? (
                      (a.amount && a.amount>0) ? <CheckCircle2 className="w-4 h-4 text-green-600"/> : <Clock className="w-4 h-4 text-orange-500"/>
                    ) : <AlertTriangle className="w-4 h-4 text-red-600"/>}
                    <div>
                      <div className="font-medium text-charcoal">{a.summary}</div>
                      <div className="text-[11px] text-muted-foreground">{new Date(a.ts).toLocaleString()}</div>
                    </div>
                  </div>
                  {typeof a.amount==='number' && a.amount!==0 && (
                    <div className={`text-xs font-semibold ${a.amount<0?'text-red-600':'text-green-600'}`}>{a.amount<0? `-₹${Math.abs(a.amount).toLocaleString()}`:`₹${a.amount.toLocaleString()}`}</div>
                  )}
                </div>
              ))}
              {recentFinancial.length===0 && !activityLoading && <div className="text-sm text-muted-foreground">No recent activity.</div>}
              {activityLoading && <div className="text-sm text-muted-foreground">Loading...</div>}
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center text-charcoal"><Calendar className="w-5 h-5 mr-2"/>Detailed Activity Feed</CardTitle>
            <CardDescription>Combined chronological log</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-auto pr-2">
              {formattedActivities.map((a:any)=> (
                <div key={a.id} className="flex items-start gap-4 p-3 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-2 ${a.type==='expenditure'? 'bg-red-500': a.type==='payment' ? 'bg-green-500':'bg-blue-500'}`}></div>
                  <div className="flex-1">
                    <div className="font-medium text-charcoal flex items-center gap-2">
                      {a.summary}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/40 text-charcoal">{a.badge}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{new Date(a.ts).toLocaleString()}</div>
                  </div>
                  {typeof a.amount==='number' && a.amount!==0 && (
                    <div className={`text-xs font-semibold ${a.amount<0?'text-red-600':'text-green-600'}`}>{a.amount<0? `-₹${Math.abs(a.amount).toLocaleString()}`:`₹${a.amount.toLocaleString()}`}</div>
                  )}
                </div>
              ))}
              {formattedActivities.length===0 && !activityLoading && <div className="text-sm text-muted-foreground">No activity available.</div>}
              {activityLoading && <div className="text-sm text-muted-foreground">Loading activity...</div>}
              {activityFull.length > activitySlice.length && (
                <div className="flex justify-center pt-2">
                  <Button size="sm" variant="outline" onClick={()=> setActivityLimit(l=> l+20)}>Load More</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;