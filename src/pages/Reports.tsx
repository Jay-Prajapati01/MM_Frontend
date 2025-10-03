import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, PieChart, Clock, CheckCircle, AlertTriangle, ListFilter, History } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useHouses } from '@/hooks/useHouses';
import { useMembers } from '@/hooks/useMembers';
import { useVehicles } from '@/hooks/useVehicles';
import { usePayments } from '@/hooks/usePayments';
import { toast } from '@/components/ui/use-toast';

interface ReportLogEntry { id: string; title: string; category: string; format: string; createdAt: string; }
const REPORTS_KEY = 'offline.reports.log';
function readReports(): ReportLogEntry[] { try { return JSON.parse(localStorage.getItem(REPORTS_KEY)||'[]'); } catch { return []; } }
function writeReports(list: ReportLogEntry[]) { localStorage.setItem(REPORTS_KEY, JSON.stringify(list)); }
function addReport(entry: Omit<ReportLogEntry,'id'|'createdAt'>) {
  const list = readReports();
  const rec: ReportLogEntry = { id: Math.random().toString(36).slice(2,10), createdAt: new Date().toISOString(), ...entry };
  list.unshift(rec); writeReports(list); return rec;
}

const DATASETS = ['Members','Houses','Vehicles','Maintenance'];
// Conditions per dataset (streamlined per user request: removed Tenants/With Vehicles for Members and With Late Payment for Houses)
const CONDITIONS: Record<string,string[]> = {
  Members: ['All','Owner Only','Family Members'],
  Houses: ['All','Vacant','Occupied'],
  Vehicles: ['All','Two Wheeler','Four Wheeler'],
  Maintenance: ['All','Paid','Unpaid','Late Payment']
};

// Smart templates config
const SMART_TEMPLATES = [
  { key: 'housewiseStatus', title: 'Housewise Maintenance Paid Status', category: 'Financial' },
  { key: 'memberVehicle', title: 'Member Directory with Vehicle Details', category: 'Membership' },
  { key: 'latePaymentList', title: 'Late Payment List by Month', category: 'Financial' },
  { key: 'vacantWithLast', title: 'Vacant Properties with Last Payment Info', category: 'Property' },
];

const Reports = () => {
  const { data: housesData } = useHouses();
  const { data: membersData } = useMembers();
  const { data: vehiclesData } = useVehicles();
  const { data: paymentsData } = usePayments();

  // Normalized data extraction (different hooks return different shapes)
  // houses & payments -> { list: [...] }
  // members & vehicles -> direct array
  const houses = Array.isArray((housesData as any)?.list) ? (housesData as any).list : (Array.isArray(housesData) ? housesData : []);
  const payments = Array.isArray((paymentsData as any)?.list) ? (paymentsData as any).list : (Array.isArray(paymentsData) ? paymentsData : []);
  const members = Array.isArray(membersData) ? membersData as any[] : (Array.isArray((membersData as any)?.list) ? (membersData as any).list : []);
  const vehicles = Array.isArray(vehiclesData) ? vehiclesData as any[] : (Array.isArray((vehiclesData as any)?.list) ? (vehiclesData as any).list : []);

  const [dataset, setDataset] = useState('Members');
  const [condition, setCondition] = useState('All');
  const [historyOpen, setHistoryOpen] = useState(false);
  // Maintenance scoped export dialog state
  const [maintenanceExportOpen, setMaintenanceExportOpen] = useState(false);
  const [scopeType, setScopeType] = useState<'day'|'week'|'month'|'year'>('month');
  const todayIso = new Date().toISOString().slice(0,10);
  const firstOfWeek = (()=> { const d=new Date(); const idx=(d.getDay()+6)%7; d.setDate(d.getDate()-idx); return d.toISOString().slice(0,10); })();
  const currentMonth = new Date().toISOString().slice(0,7); // yyyy-mm
  const currentYear = new Date().getFullYear().toString();
  const [scopeDay, setScopeDay] = useState<string>(todayIso);
  const [scopeWeekStart, setScopeWeekStart] = useState<string>(firstOfWeek);
  const [scopeMonth, setScopeMonth] = useState<string>(currentMonth);
  const [scopeYear, setScopeYear] = useState<string>(currentYear);
  const [refreshFlag, setRefreshFlag] = useState(0); // trigger re-read after generation
  const reportsLog = useMemo(()=> readReports(), [refreshFlag]);
  const totalReports = reportsLog.length;

  // ---------------- Enhanced Report Stats ----------------
  const nowTs = Date.now();
  const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
  const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
  // Week starts Monday
  const dayIdx = (startOfDay.getDay()+6)%7; // 0 = Monday
  const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfDay.getDate()-dayIdx);
  const todayCount = reportsLog.filter(r => new Date(r.createdAt) >= startOfDay).length;
  const weekCount = reportsLog.filter(r => new Date(r.createdAt) >= startOfWeek).length;
  const monthCount = reportsLog.filter(r => new Date(r.createdAt) >= startOfMonth).length;
  const categoryBreakdown = reportsLog.reduce<Record<string,number>>((acc,r)=>{ acc[r.category] = (acc[r.category]||0)+1; return acc; }, {});
  const last7 = Array.from({length:7}).map((_,i)=> {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dayStart = new Date(d); dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayStart.getDate()+1);
    const count = reportsLog.filter(r => { const t = new Date(r.createdAt).getTime(); return t>=dayStart.getTime() && t<dayEnd.getTime(); }).length;
    return { label: d.toLocaleDateString('en-US',{ weekday:'short'}), count };
  });
  const maxBar = Math.max(1, ...last7.map(x=> x.count));

  // Filter preview count (lightweight) – actual export uses full dataset
  const filteredCount = useMemo(()=> {
    switch(dataset) {
      case 'Members':
        if (condition === 'Owner Only') return members.filter((m:any)=> m.role==='Owner').length; 
        if (condition === 'Family Members') return members.filter((m:any)=> m.role==='Family Member').length;
        return members.length;
      case 'Houses':
        if (condition === 'Vacant') return houses.filter((h:any)=> h.status==='vacant').length;
        if (condition === 'Occupied') return houses.filter((h:any)=> h.status==='occupied').length;
        return houses.length;
      case 'Vehicles':
        if (condition === 'Two Wheeler') return vehicles.filter((v:any)=> v.type==='Two Wheeler').length;
        if (condition === 'Four Wheeler') return vehicles.filter((v:any)=> v.type==='Four Wheeler').length;
        return vehicles.length;
      case 'Maintenance':
        if (condition === 'Paid') return payments.filter((p:any)=> p.status==='paid').length;
        if (condition === 'Unpaid') return payments.filter((p:any)=> p.amountPaid===0).length;
        if (condition === 'Late Payment') return payments.filter((p:any)=> p.status==='paid' && p.latePayment).length;
        return payments.length;
      default: return 0;
    }
  }, [dataset, condition, members, houses, vehicles, payments]);

  // Condition counts for current dataset to keep dropdown and rest of app in sync
  const computeConditionCount = (c: string) => {
    switch(dataset) {
      case 'Members':
        if (c==='Owner Only') return members.filter((m:any)=> m.role==='Owner').length;
        if (c==='Family Members') return members.filter((m:any)=> m.role==='Family Member').length;
        return members.length;
      case 'Houses':
        if (c==='Vacant') return houses.filter((h:any)=> h.status==='vacant').length;
        if (c==='Occupied') return houses.filter((h:any)=> h.status==='occupied').length;
        return houses.length;
      case 'Vehicles':
        if (c==='Two Wheeler') return vehicles.filter((v:any)=> v.type==='Two Wheeler').length;
        if (c==='Four Wheeler') return vehicles.filter((v:any)=> v.type==='Four Wheeler').length;
        return vehicles.length;
      case 'Maintenance':
        if (c==='Paid') return payments.filter((p:any)=> p.status==='paid').length;
        if (c==='Unpaid') return payments.filter((p:any)=> p.amountPaid===0).length;
        if (c==='Late Payment') return payments.filter((p:any)=> p.status==='paid' && p.latePayment).length;
        return payments.length;
      default: return 0;
    }
  };
  const conditionCounts = useMemo(()=> CONDITIONS[dataset].map(c => ({ c, count: computeConditionCount(c) })), [dataset, members, houses, vehicles, payments]);

  function exportToCsv(title: string, rows: any[], headers: string[], category: string) {
    const csv = [headers, ...rows].map(r => r.map((x:any)=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download = title.replace(/\s+/g,'_') + '.csv'; a.click(); URL.revokeObjectURL(url);
    addReport({ title, category, format: 'Excel' });
    setRefreshFlag(f=> f+1);
    toast({ title: '📄 Report generated', description: title });
  }

  function handleGenerate() {
    // Intercept Maintenance to open scoped export dialog
    if (dataset==='Maintenance') {
      setMaintenanceExportOpen(true);
      return;
    }
    let rows: any[] = []; let headers: string[] = []; let title = `${dataset} - ${condition}`; let category='General';
    switch(dataset) {
      case 'Members':
        headers = ['Name','House','Role','Phone'];
        rows = members.filter((m:any)=> {
          if (condition==='Owner Only') return m.role==='Owner';
          if (condition==='Family Members') return m.role==='Family Member';
          return true;
        }).map((m:any)=> [m.name,m.house,m.role,m.phone]);
        category='Membership';
        break;
      case 'Houses':
        headers = ['House','Status','Members','Vehicles'];
        rows = houses.filter((h:any)=> {
          if (condition==='Vacant') return h.status==='vacant';
          if (condition==='Occupied') return h.status==='occupied';
          return true;
        }).map((h:any)=> [h.houseNo,h.status,h.membersCount||0,h.vehiclesCount||0]);
        category='Property';
        break;
      case 'Vehicles':
        headers = ['Number','Type','House','Owner'];
        rows = vehicles.filter((v:any)=> {
          if (condition==='Two Wheeler') return v.type==='Two Wheeler';
          if (condition==='Four Wheeler') return v.type==='Four Wheeler';
          return true;
        }).map((v:any)=> [v.number,v.type,v.house,v.ownerName||'']);
        category='Vehicle';
        break;
      // Maintenance handled separately via dialog
    }
    exportToCsv(title, rows, headers, category);
  }

  function performMaintenanceExport() {
    // Base filter for condition
    let filtered = payments.filter((p:any)=> {
      if (condition==='Paid') return p.status==='paid';
      if (condition==='Unpaid') return p.amountPaid===0;
      if (condition==='Late Payment') return p.status==='paid' && p.latePayment;
      return true;
    });

    // Apply scope filter
    const parseDate = (s:string)=> { if(!s) return null; const d=new Date(s); return isNaN(d.getTime())? null: d; };
    const weekStartDate = parseDate(scopeWeekStart);
    let scopeLabel = '';
    if (scopeType==='day') {
      const target = parseDate(scopeDay);
      filtered = filtered.filter((p:any)=> {
        const d = parseDate(p.paidDate || p.createdAt);
        return d && target && d.getFullYear()===target.getFullYear() && d.getMonth()===target.getMonth() && d.getDate()===target.getDate();
      });
      scopeLabel = new Date(scopeDay).toLocaleDateString('en-US',{ day:'2-digit', month:'long', year:'numeric'});
    } else if (scopeType==='week') {
      if (weekStartDate) {
        const end = new Date(weekStartDate); end.setDate(end.getDate()+6);
        filtered = filtered.filter((p:any)=> {
          const d = parseDate(p.paidDate || p.createdAt);
          return d && d>=weekStartDate && d<=end;
        });
        const endLabel = end.toISOString().slice(0,10);
        scopeLabel = `Week ${weekStartDate.toISOString().slice(0,10)} to ${endLabel}`;
      }
    } else if (scopeType==='month') {
      filtered = filtered.filter((p:any)=> (p.fromMonthRaw && p.fromMonthRaw === scopeMonth) || (p.month && p.month.toLowerCase().includes(new Date(scopeMonth+'-01').toLocaleString('en-US',{ month:'long'}).toLowerCase())));
      scopeLabel = new Date(scopeMonth+'-01').toLocaleString('en-US',{ month:'long', year:'numeric'});
    } else if (scopeType==='year') {
      filtered = filtered.filter((p:any)=> (p.fromMonthRaw && p.fromMonthRaw.startsWith(scopeYear)) || (p.month && p.month.includes(scopeYear)));
      scopeLabel = scopeYear;
    }

    if (!filtered.length) {
      toast({ title: 'No data for selection', description: 'Try adjusting scope or condition.' });
      return;
    }

    const headers = ['House','Owner','Period','Amount','Paid','Status','Late','Paid Date'];
    const rows = filtered.map((p:any)=> [p.house,p.owner,p.monthRange||p.month,p.amount,p.amountPaid,p.status,p.latePayment?'YES':'NO',p.paidDate||'']);
    const scopeTag = scopeType==='day'? 'Daily': scopeType==='week'? 'Weekly': scopeType==='month'? 'Monthly': 'Yearly';
    const title = `Maintenance - ${condition} - ${scopeTag} - ${scopeLabel}`;
    exportToCsv(title, rows, headers, 'Financial');
    setMaintenanceExportOpen(false);
  }

  function runTemplate(key: string) {
    switch(key) {
      case 'housewiseStatus': {
        const headers = ['House','Period','Amount','Paid','Status','Late'];
        const rows = payments.map((p:any)=> [p.house,p.monthRange||p.month,p.amount,p.amountPaid,p.status,p.latePayment?'YES':'NO']);
        return exportToCsv('Housewise Maintenance Paid Status', rows, headers,'Financial');
      }
      case 'memberVehicle': {
        const headers = ['Member','House','Role','Vehicles'];
        const rows = members.map((m:any)=> [m.name,m.house,m.role,vehicles.filter((v:any)=> v.house===m.house).length]);
        return exportToCsv('Member Directory with Vehicle Details', rows, headers,'Membership');
      }
      case 'latePaymentList': {
        const headers = ['House','Owner','Period','Amount','Paid Date'];
        const rows = payments.filter((p:any)=> p.status==='paid' && p.latePayment).map((p:any)=> [p.house,p.owner,p.monthRange||p.month,p.amount,p.paidDate||'']);
        return exportToCsv('Late Payment List by Month', rows, headers,'Financial');
      }
      case 'vacantWithLast': {
        const headers = ['House','Status','Last Payment Period','Amount','Paid'];
        const rows = houses.filter((h:any)=> h.status==='vacant').map((h:any)=> {
          const last = payments.filter((p:any)=> p.house===h.houseNo).sort((a:any,b:any)=> (b.paidDate||'').localeCompare(a.paidDate||''))[0];
          return [h.houseNo,h.status,last? (last.monthRange||last.month):'', last? last.amount:'', last? last.amountPaid:''];
        });
        return exportToCsv('Vacant Properties with Last Payment Info', rows, headers,'Property');
      }
    }
  }

  // Collection distribution - only paid vs late payment (no unpaid)
  const [periodFilter, setPeriodFilter] = useState<string>('all'); // yyyy-mm or 'all'
  const uniqueMonths = useMemo(()=> Array.from(new Set(payments.map((p:any)=> p.fromMonthRaw).filter(Boolean))).sort().reverse().slice(0,24), [payments]);
  const filteredPaymentsForChart = useMemo(()=> {
    if (periodFilter==='all') return payments;
    // match on fromMonthRaw or month single
    return payments.filter((p:any)=> (p.fromMonthRaw && p.fromMonthRaw.startsWith(periodFilter)) || (p.month && p.month.toLowerCase().includes(new Date(periodFilter+'-01').toLocaleString('en-US',{ month:'long', year:'numeric'}).split(' ')[0].toLowerCase())));
  }, [payments, periodFilter]);
  
  // Only consider paid payments - split between on-time and late
  const paidOnTimeAmount = filteredPaymentsForChart.filter((p:any)=> p.status==='paid' && !p.latePayment).reduce((s:number,p:any)=> s + p.amount, 0);
  const latePaymentAmount = filteredPaymentsForChart.filter((p:any)=> p.status==='paid' && p.latePayment).reduce((s:number,p:any)=> s + p.amount, 0);
  const totalPaidAmount = paidOnTimeAmount + latePaymentAmount;
  
  // Pie chart data
  const pieData = [
    { name: 'Paid On-Time', value: paidOnTimeAmount, color: '#10b981' },
    { name: 'Late Payment', value: latePaymentAmount, color: '#ef4444' }
  ].filter(item => item.value > 0); // Only show segments with data

  return (
    <div className="min-h-screen p-6">
      <div className="container mx-auto space-y-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-charcoal mb-2">Reports & <span className="text-gradient">Analytics</span></h1>
            <p className="text-muted-foreground text-lg">Flexible data exports & collection insights</p>
          </div>
        </div>

        {/* Top row: Total Reports & Collection Distribution */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                <span>Total Reports Generated</span>
                <FileText className="h-5 w-5 text-blue-600" />
              </CardTitle>
              <CardDescription>Historical count of exported reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-serif font-bold text-charcoal">{totalReports}</div>
              <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                <div className="p-2 rounded-md bg-white/20">
                  <div className="text-xs text-muted-foreground">Today</div>
                  <div className="text-sm font-semibold text-charcoal">{todayCount}</div>
                </div>
                <div className="p-2 rounded-md bg-white/20">
                  <div className="text-xs text-muted-foreground">This Week</div>
                  <div className="text-sm font-semibold text-charcoal">{weekCount}</div>
                </div>
                <div className="p-2 rounded-md bg-white/20">
                  <div className="text-xs text-muted-foreground">This Month</div>
                  <div className="text-sm font-semibold text-charcoal">{monthCount}</div>
                </div>
              </div>
              <div className="flex items-end gap-1 mt-4 h-16">
                {last7.map(d => (
                  <div key={d.label} className="flex-1 flex flex-col items-center justify-end">
                    <div className="w-full bg-gradient-to-t from-green-200 to-green-500 rounded-sm" style={{ height: `${(d.count/maxBar)*100}%`, minHeight: d.count>0? '8px':'3px' }} title={`${d.label}: ${d.count}`}></div>
                    <div className="text-[10px] mt-1 text-muted-foreground truncate w-full text-center">{d.label.slice(0,2)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                {Object.entries(categoryBreakdown).map(([k,v])=> (
                  <span key={k} className="px-2 py-1 rounded-full bg-white/30 text-charcoal font-medium">{k}: {v}</span>
                ))}
                {Object.keys(categoryBreakdown).length===0 && <span className="text-muted-foreground">No categories yet</span>}
              </div>
              <Button variant="link" className="px-0 mt-3 text-sm" onClick={()=> setHistoryOpen(true)}>View All History</Button>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                <span>Collection Distribution</span>
                <PieChart className="h-5 w-5 text-green-600" />
              </CardTitle>
              <CardDescription>Payment status breakdown - Paid On-Time vs Late Payment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground">Filter Period</label>
                  <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger className="input-premium mt-1 h-8">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/20 max-h-64 overflow-auto">
                      <SelectItem value="all">All</SelectItem>
                      {uniqueMonths.map((m:any)=> {
                        const label = new Date(m+'-01').toLocaleString('en-US',{ month:'long', year:'numeric'});
                        return <SelectItem key={m} value={m}>{label}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                
                {totalPaidAmount > 0 ? (
                  <>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
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
                    
                    <div className="space-y-2 mt-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center text-sm text-muted-foreground">
                          <CheckCircle className="w-4 h-4 text-green-600 mr-1"/>Paid On-Time
                        </span>
                        <span className="font-semibold">₹{paidOnTimeAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center text-sm text-muted-foreground">
                          <AlertTriangle className="w-4 h-4 text-red-600 mr-1"/>Late Payment
                        </span>
                        <span className="font-semibold">₹{latePaymentAmount.toLocaleString()}</span>
                      </div>
                      <div className="pt-2 border-t border-white/20">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="text-sm text-charcoal">Total Collected</span>
                          <span className="text-charcoal">₹{totalPaidAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <PieChart className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">No payment data available for the selected period</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Reports */}
        <Card className="glass-card">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-charcoal"><ListFilter className="w-5 h-5 mr-2"/>Available Reports</CardTitle>
            <CardDescription>Choose a dataset and condition, then export instantly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid lg:grid-cols-12 gap-4">
              <div className="lg:col-span-4">
                <label className="text-xs uppercase tracking-wide font-medium text-muted-foreground">Primary Dataset</label>
                <Select value={dataset} onValueChange={v=> { setDataset(v); setCondition('All'); }}>
                  <SelectTrigger className="input-premium mt-1 h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="glass-card border-white/20">
                    {DATASETS.map(d=> <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="lg:col-span-4">
                <label className="text-xs uppercase tracking-wide font-medium text-muted-foreground">Attribute / Condition</label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger className="input-premium mt-1 h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="glass-card border-white/20 max-h-72 overflow-auto">
                    {conditionCounts.map(obj=> <SelectItem key={obj.c} value={obj.c}>{obj.c} ({obj.count})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="lg:col-span-4 flex flex-col justify-end">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:justify-end">
                  <div className="text-xs text-muted-foreground bg-white/20 px-3 py-2 rounded-md">
                    <span className="block sm:inline">Records found:</span>{' '}
                    <span className="font-semibold text-charcoal text-sm">{filteredCount}</span>
                  </div>
                  <Button 
                    onClick={handleGenerate} 
                    variant="premium" 
                    className="w-full sm:w-auto text-charcoal font-medium px-6 py-2.5 h-10 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200"
                    disabled={filteredCount === 0}
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Generate</span> Excel
                  </Button>
                </div>
              </div>
            </div>
            {conditionCounts.length > 0 && (
              <div className="grid md:grid-cols-4 sm:grid-cols-2 gap-2 text-[11px]">
                {conditionCounts.map(obj => (
                  <div key={obj.c} className={`px-2 py-1 rounded-md bg-white/20 ${obj.c===condition? 'ring-1 ring-green-500':''}`}>{obj.c}: <span className="font-semibold">{obj.count}</span></div>
                ))}
              </div>
            )}
            <div>
              <h4 className="text-sm font-semibold text-charcoal mb-2">Smart Templates</h4>
              <div className="grid md:grid-cols-2 gap-3">
                {SMART_TEMPLATES.map(t => (
                  <div key={t.key} className="flex items-center justify-between p-3 rounded-md bg-white/20 hover:bg-white/30 transition-colors">
                    <div>
                      <div className="text-sm font-medium text-charcoal">{t.title}</div>
                      <div className="text-[11px] text-muted-foreground">{t.category}</div>
                    </div>
                    <Button size="sm" variant="outline" className="btn-glass" onClick={()=> runTemplate(t.key)}>
                      <Download className="w-3 h-3 mr-1"/>Excel
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Reports */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-charcoal"><FileText className="w-5 h-5 mr-2"/>Recent Reports</CardTitle>
            <CardDescription>Most recently generated exports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {reportsLog.slice(0,6).map(r => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded-md bg-white/20">
                <div>
                  <div className="text-sm font-medium text-charcoal">{r.title}</div>
                  <div className="text-[11px] text-muted-foreground">{r.category} • {r.format} • {new Date(r.createdAt).toLocaleString()}</div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={()=> toast({ title: 'File already downloaded' })}>
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {reportsLog.length === 0 && <div className="text-sm text-muted-foreground">No reports generated yet.</div>}
          </CardContent>
        </Card>
        {historyOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={()=> setHistoryOpen(false)}>
            <div className="glass-card w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e=> e.stopPropagation()}>
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-charcoal"><History className="w-4 h-4"/>Report History</div>
                <Button variant="outline" size="sm" onClick={()=> setHistoryOpen(false)}>Close</Button>
              </div>
              <div className="p-4 overflow-auto text-sm space-y-2">
                {reportsLog.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2 rounded bg-white/20">
                    <div>
                      <div className="font-medium text-charcoal">{r.title}</div>
                      <div className="text-[11px] text-muted-foreground">{r.category} • {r.format} • {new Date(r.createdAt).toLocaleString()}</div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Download className="w-4 h-4"/></Button>
                  </div>
                ))}
                {reportsLog.length===0 && <div className="text-muted-foreground">No history yet.</div>}
              </div>
            </div>
          </div>
        )}
        {maintenanceExportOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={()=> setMaintenanceExportOpen(false)}>
            <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={e=> e.stopPropagation()}>
              <div className="p-6 border-b border-white/20 flex items-center justify-between">
                <div className="font-semibold text-charcoal flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5"/>
                  Maintenance Export Options
                </div>
                <Button variant="outline" size="sm" onClick={()=> setMaintenanceExportOpen(false)}>Close</Button>
              </div>
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
                        onClick={() => setScopeType(option.value as any)}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2 text-center hover:shadow-md ${
                          scopeType === option.value
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
                {scopeType==='day' && (
                  <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-blue-700 font-medium">
                      <span>📅</span>
                      <span>Daily Export Configuration</span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-2">Select Specific Day</label>
                      <input 
                        type="date" 
                        value={scopeDay} 
                        onChange={e=> setScopeDay(e.target.value)} 
                        className="w-full h-11 px-4 rounded-lg border-2 border-white/30 bg-white/50 focus:border-blue-500 focus:outline-none transition-colors" 
                      />
                    </div>
                    <div className="text-xs text-blue-600 bg-blue-100/50 p-2 rounded">
                      Will export all maintenance records paid on <strong>{new Date(scopeDay).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                    </div>
                  </div>
                )}
                {scopeType==='week' && (
                  <div className="bg-purple-50/80 border border-purple-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-purple-700 font-medium">
                      <span>📊</span>
                      <span>Weekly Export Configuration</span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-2">Week Start Date (Monday)</label>
                      <input 
                        type="date" 
                        value={scopeWeekStart} 
                        onChange={e=> setScopeWeekStart(e.target.value)} 
                        className="w-full h-11 px-4 rounded-lg border-2 border-white/30 bg-white/50 focus:border-purple-500 focus:outline-none transition-colors" 
                      />
                    </div>
                    <div className="text-xs text-purple-600 bg-purple-100/50 p-2 rounded">
                      Will export payments from <strong>{new Date(scopeWeekStart).toLocaleDateString()}</strong> to <strong>{new Date(new Date(scopeWeekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString()}</strong> (7 days)
                    </div>
                  </div>
                )}
                {scopeType==='month' && (
                  <div className="bg-green-50/80 border border-green-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-green-700 font-medium">
                      <span>🗓️</span>
                      <span>Monthly Export Configuration</span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-2">Select Month & Year</label>
                      <input 
                        type="month" 
                        value={scopeMonth} 
                        onChange={e=> setScopeMonth(e.target.value)} 
                        className="w-full h-11 px-4 rounded-lg border-2 border-white/30 bg-white/50 focus:border-green-500 focus:outline-none transition-colors" 
                      />
                    </div>
                    <div className="text-xs text-green-600 bg-green-100/50 p-2 rounded">
                      Will export all maintenance records for <strong>{new Date(scopeMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</strong>
                    </div>
                  </div>
                )}
                {scopeType==='year' && (
                  <div className="bg-orange-50/80 border border-orange-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-orange-700 font-medium">
                      <span>📆</span>
                      <span>Yearly Export Configuration</span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-2">Enter Year</label>
                      <input 
                        type="number" 
                        value={scopeYear} 
                        onChange={e=> setScopeYear(e.target.value)}
                        min="2020"
                        max="2030"
                        className="w-full h-11 px-4 rounded-lg border-2 border-white/30 bg-white/50 focus:border-orange-500 focus:outline-none transition-colors" 
                      />
                    </div>
                    <div className="text-xs text-orange-600 bg-orange-100/50 p-2 rounded">
                      Will export all maintenance records for the entire year <strong>{scopeYear}</strong>
                    </div>
                  </div>
                )}
                <div className="bg-gray-50/80 border border-gray-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-charcoal text-sm">Export Summary</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white/70 p-3 rounded border">
                      <span className="text-muted-foreground">Filter Condition:</span>
                      <div className="font-semibold text-charcoal mt-1">{condition}</div>
                    </div>
                    <div className="bg-white/70 p-3 rounded border">
                      <span className="text-muted-foreground">Total Records:</span>
                      <div className="font-semibold text-charcoal mt-1">{payments.length} payments</div>
                    </div>
                  </div>
                  <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
                    <div className="font-medium mb-1">⚠️ Important Note:</div>
                    <p>Scope filters apply to payment dates. Unpaid items without payment dates may be excluded in daily/weekly exports.</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-white/20">
                  <Button 
                    variant="outline" 
                    onClick={()=> setMaintenanceExportOpen(false)}
                    className="w-full sm:w-auto order-2 sm:order-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="premium" 
                    onClick={performMaintenanceExport}
                    className="w-full sm:w-auto order-1 sm:order-2 flex items-center gap-2 shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    Export Data
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;