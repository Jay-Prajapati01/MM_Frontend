import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Car, 
  Bike, 
  Search, 
  Plus, 
  MoreHorizontal,
  Filter,
  User,
  MapPin,
  Calendar
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/components/ui/use-toast";
import { useVehicles, useCreateVehicle, useUpdateVehicle, useDeleteVehicle } from '@/hooks/useVehicles';
import { useMembers } from '@/hooks/useMembers';
import { useHouses } from '@/hooks/useHouses';
import type { Vehicle, Member } from '@/types/models';

const Vehicles = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [vehicleSlots, setVehicleSlots] = useState(0);
  const [multiVehicles, setMultiVehicles] = useState<{ number: string; type: 'Two Wheeler' | 'Four Wheeler'; color: string; owner: string }[]>([
    { number: '', type: 'Two Wheeler', color: '', owner: '' }
  ]);
  const [open, setOpen] = useState(false);

  const { data: vehiclesData = [], isLoading: vehiclesLoading, isError: vehiclesError } = useVehicles();
  const { data: members = [] } = useMembers();
  const { data: houses } = useHouses();
  const vehicles: Vehicle[] = vehiclesData as any;
  const createVehicleMutation = useCreateVehicle();
  const updateVehicleMutation = useUpdateVehicle();
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const deleteVehicleMutation = useDeleteVehicle();

  // Collect options based on existing data for dropdowns
  const memberOptions = useMemo(() => (Array.isArray(members) ? members : []).map((m:any) => m.name || m.fullName).filter(Boolean), [members]);
  const ownerByHouse = useMemo(() => {
    const map: Record<string,string> = {};
    (members as Member[]).forEach(m => {
      if ((m.relationship === 'Owner' || m.role === 'Owner') && !map[m.house]) {
        map[m.house] = m.name;
      }
    });
    return map;
  }, [members]);
  const houseOptions = useMemo(() => {
    if (!houses) return [];
    const list = (houses as any).list || houses; // houses hook returns list wrapper for houses
    return (Array.isArray(list) ? list : []).map((h:any) => h.houseNo || h.number || h.name).filter(Boolean);
  }, [houses]);

  // Form schema
  // Legacy single form schema kept minimal (not used for multi add after refactor)
  const schema = useMemo(() => z.object({
    house: z.string().trim().min(1, 'House is required'),
  }), []);

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { house: '' },
    mode: 'onSubmit'
  });

  // Sync owner and house defaults when options first load or change
  useEffect(() => {
    const houseCurrent = form.getValues('house');
    if ((!houseCurrent || !houseOptions.includes(houseCurrent)) && houseOptions.length > 0) {
      form.setValue('house', houseOptions[0], { shouldDirty: true });
    }
  }, [houseOptions, form]);

  const addVehicleSlot = () => {
    setMultiVehicles(prev => [...prev, { number: '', type: 'Two Wheeler', color: '', owner: memberOptions[0] || '' }]);
  };

  const removeVehicleSlot = (index: number) => {
    if (multiVehicles.length > 1) {
      setMultiVehicles(prev => prev.filter((_,i) => i!== index));
    }
  };

  const updateVehicleField = (index: number, field: 'number' | 'type' | 'color' | 'owner', value: string) => {
    setMultiVehicles(prev => prev.map((v,i) => i===index ? { ...v, [field]: value } : v));
  };

  const onSubmitMulti = async () => {
    const selectedHouse = form.getValues('house');
    if (!selectedHouse) {
      toast({ title: '❌ House required', description: 'Select a house first.' });
      return;
    }
    // validation
    for (const v of multiVehicles) {
      if (!v.number.trim()) {
        toast({ title: '❌ Vehicle number missing', description: 'All vehicle numbers are required.' });
        return;
      }
    }
    // Ensure unique numbers within batch
    const nums = multiVehicles.map(v=>v.number.trim().toLowerCase());
    const dup = nums.find((n,i)=> nums.indexOf(n)!==i);
    if (dup) {
      toast({ title: '❌ Duplicate number', description: `Vehicle number "${dup}" repeated.`});
      return;
    }
    try {
      let count = 0;
      for (const v of multiVehicles) {
        await createVehicleMutation.mutateAsync({
          vehicleNumber: v.number.trim(),
          color: v.color.trim() || undefined,
          type: v.type,
          owner: v.owner || memberOptions[0] || '',
          house: selectedHouse,
          status: 'active'
        });
        count++;
      }
      toast({ title: '✅ Vehicles added', description: `Added ${count} vehicle${count!==1?'s':''} to ${selectedHouse}.` });
      setOpen(false);
      setMultiVehicles([{ number: '', type: 'Two Wheeler', color: '', owner: memberOptions[0] || '' }]);
      setVehicleSlots(0);
    } catch (e:any) {
      toast({ title: '❌ Failed to add vehicles', description: e.message });
    }
  };

  // Group vehicles by house for display
  const groupedVehicles = useMemo(() => {
    const groups: Record<string, Vehicle[]> = {};
    vehicles.forEach(v => {
      const key = v.house;
      if (!groups[key]) groups[key] = [];
      groups[key].push(v);
    });
    const search = searchTerm.toLowerCase();
    const result = Object.entries(groups).map(([house, list]) => {
      const filteredList = list.filter(v => {
        const number = (v.number||'').toLowerCase();
        const owner = (v.ownerName||'').toLowerCase();
        return number.includes(search) || owner.includes(search) || house.toLowerCase().includes(search);
      }).filter(v => filterType === 'all' || (filterType==='two-wheeler' && v.type==='Two Wheeler') || (filterType==='four-wheeler' && v.type==='Four Wheeler'));
      return { house, list: filteredList };
    }).filter(g => g.list.length > 0)
      .sort((a,b) => a.house.localeCompare(b.house));
    return result;
  }, [vehicles, searchTerm, filterType]);

  const getVehicleIcon = (type: string) => {
    return type === "Two Wheeler" ? Bike : Car;
  };

  const getTypeBadge = (type: string) => {
    const variants = {
      "Two Wheeler": "bg-blue-100 text-blue-800 border-blue-200",
      "Four Wheeler": "bg-purple-100 text-purple-800 border-purple-200"
    };
    return variants[type as keyof typeof variants] || variants["Two Wheeler"];
  };

  // Status badge removed in grouped view; keep function commented if needed later
  // const getStatusBadge = (status: string) => {
  //   const variants = {
  //     active: "bg-green-100 text-green-800 border-green-200",
  //     inactive: "bg-gray-100 text-gray-800 border-gray-200"
  //   };
  //   return variants[status as keyof typeof variants] || variants.active;
  // };

  const stats = {
    total: vehicles.length,
    twoWheeler: vehicles.filter(v => v.type === 'Two Wheeler').length,
    fourWheeler: vehicles.filter(v => v.type === 'Four Wheeler').length,
    active: vehicles.filter(v => (v as any).status === 'active').length
  };

  return (
    <div className="min-h-screen p-6">
      <div className="container mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-charcoal mb-2">
              Vehicle <span className="text-gradient">Registry</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage all two-wheelers and four-wheelers with easy tracking
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="btn-premium text-charcoal">
                <Plus className="w-4 h-4 mr-2" />
                Register Vehicle
              </Button>
            </DialogTrigger>
              <DialogContent className="glass-card max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-charcoal">Register Vehicles</DialogTitle>
                <DialogDescription>Select house then add one or more vehicles.</DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                <Form {...form}>
                  <div className="space-y-4">
                    <div>
                      <FormField control={form.control} name="house" render={({ field }) => (
                        <FormItem>
                          <FormLabel>House Number</FormLabel>
                          <FormControl>
                            <Select onValueChange={(val) => {
                              field.onChange(val);
                              const houseObj = (houses as any)?.list?.find((h:any)=> h.houseNo === val);
                              const count = houseObj?.vehiclesCount || 0;
                              setVehicleSlots(count);
                              const lockedOwner = ownerByHouse[val];
                              setMultiVehicles(Array.from({ length: Math.max(count,1)}, () => ({ number: '', type: 'Two Wheeler', color: '', owner: lockedOwner || memberOptions[0] || '' })));
                            }} value={field.value}>
                              <SelectTrigger className="input-premium">
                                <SelectValue placeholder="Select house" />
                              </SelectTrigger>
                              <SelectContent className="glass-card border-white/20 max-h-60 overflow-y-auto">
                                {houseOptions.map(h => (
                                  <SelectItem key={h} value={h}>{h}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="space-y-4">
                      {multiVehicles.map((v, index) => (
                        <div key={index} className="p-4 bg-white/50 rounded-lg border border-white/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-charcoal">Vehicle {index+1}</h3>
                            {index>0 && (
                              <Button variant="destructive" size="sm" className="h-8 px-2" onClick={()=> removeVehicleSlot(index)}>Remove</Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="sm:col-span-2">
                              <label className="block text-sm font-medium text-charcoal mb-1">Vehicle Number *</label>
                              <Input placeholder="e.g., MH 01 AB 1234" className="input-premium" value={v.number} onChange={e=> updateVehicleField(index,'number', e.target.value.toUpperCase())} />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-charcoal mb-1">Type *</label>
                              <Select value={v.type} onValueChange={(val)=> updateVehicleField(index,'type', val)}>
                                <SelectTrigger className="input-premium"><SelectValue /></SelectTrigger>
                                <SelectContent className="glass-card border-white/20">
                                  <SelectItem value="Two Wheeler">Two Wheeler</SelectItem>
                                  <SelectItem value="Four Wheeler">Four Wheeler</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-charcoal mb-1">Color</label>
                              <Input placeholder="e.g., White" className="input-premium" value={v.color} onChange={e=> updateVehicleField(index,'color', e.target.value)} />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-sm font-medium text-charcoal mb-1">Owner Name {ownerByHouse[form.getValues('house')] ? '(Locked)' : ''}</label>
                              {ownerByHouse[form.getValues('house')] ? (
                                <div className="px-3 py-2 rounded-md bg-white/70 border border-white/30 text-sm text-charcoal">
                                  {ownerByHouse[form.getValues('house')]}
                                </div>
                              ) : (
                                <Select value={v.owner} onValueChange={(val)=> updateVehicleField(index,'owner', val)}>
                                  <SelectTrigger className="input-premium"><SelectValue placeholder="Owner" /></SelectTrigger>
                                  <SelectContent className="glass-card border-white/20 max-h-52 overflow-y-auto">
                                    {memberOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {vehicleSlots > 0 && (
                      <div className="flex justify-center">
                        <Button variant="outline" size="sm" className="btn-glass" onClick={addVehicleSlot}>Add Another Vehicle</Button>
                      </div>
                    )}
                  </div>
                </Form>
              </div>
              <DialogFooter className="border-t border-white/20 pt-4 mt-4">
                <Button type="button" variant="outline" className="btn-glass" onClick={()=> setOpen(false)}>Cancel</Button>
                <Button onClick={onSubmitMulti} disabled={createVehicleMutation.isPending} variant="premium" className="text-charcoal">{createVehicleMutation.isPending ? 'Saving...' : `Save ${multiVehicles.length} Vehicle${multiVehicles.length!==1?'s':''}`}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card text-center p-4">
            <div className="text-3xl font-serif font-bold text-charcoal mb-1">
              {stats.total}
            </div>
            <div className="text-sm text-muted-foreground">Total Vehicles</div>
          </Card>
          <Card className="glass-card text-center p-4">
            <div className="text-3xl font-serif font-bold text-blue-600 mb-1">
              {stats.twoWheeler}
            </div>
            <div className="text-sm text-muted-foreground">Two Wheeler</div>
          </Card>
          <Card className="glass-card text-center p-4">
            <div className="text-3xl font-serif font-bold text-purple-600 mb-1">
              {stats.fourWheeler}
            </div>
            <div className="text-sm text-muted-foreground">Four Wheeler</div>
          </Card>
          <Card className="glass-card text-center p-4">
            <div className="text-3xl font-serif font-bold text-green-600 mb-1">
              {stats.active}
            </div>
            <div className="text-sm text-muted-foreground">Active</div>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  className="input-premium pl-10"
                  placeholder="Search by vehicle number, owner, or house..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full lg:w-48 input-premium">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/20">
                  <SelectItem value="all">All Vehicles</SelectItem>
                  <SelectItem value="two-wheeler">Two Wheeler</SelectItem>
                  <SelectItem value="four-wheeler">Four Wheeler</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Grouped Vehicles Grid */}
        <div className="grid gap-6">
          {vehiclesLoading && <div className="text-sm text-muted-foreground">Loading vehicles...</div>}
          {vehiclesError && <div className="text-sm text-destructive">Failed to load vehicles.</div>}
          {!vehiclesLoading && !vehiclesError && groupedVehicles.map(group => (
            <Card key={group.house} className="glass-card hover-lift">
              <CardHeader className="space-y-1 pb-3">
                <CardTitle className="text-lg font-semibold text-charcoal">House {group.house}</CardTitle>
                <CardDescription>{group.list.length} vehicle{group.list.length!==1?'s':''}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {group.list.map(v => {
                    const Icon = getVehicleIcon(v.type);
                    return (
                      <div key={v._id} className="flex-1 min-w-[280px] p-3 bg-white/40 rounded-md border border-white/30 hover:bg-white/50 transition-colors cursor-pointer" onClick={()=> { setEditingVehicle(v); setEditOpen(true); }}>
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-md bg-gradient-primary flex-shrink-0">
                            <Icon className="w-4 h-4 text-charcoal" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-charcoal truncate text-sm">{v.number}</span>
                              <Badge className={`${getTypeBadge(v.type)} text-xs`}>
                                {v.type === 'Two Wheeler' ? '2W' : '4W'}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground flex flex-col gap-0.5">
                              {v.color && <span className="truncate">{v.color}</span>}
                              {v.ownerName && <span className="truncate">• {v.ownerName}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {!vehiclesLoading && !vehiclesError && groupedVehicles.length === 0 && (
          <Card className="glass-card">
            <CardContent className="text-center py-12">
              <Car className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold text-charcoal mb-2">No vehicles found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms or filters
              </p>
            </CardContent>
          </Card>
        )}

        {/* Edit Vehicle Dialog */}
        <Dialog open={editOpen} onOpenChange={(o)=> { if(!o) { setEditOpen(false); setEditingVehicle(null);} }}>
          <DialogContent className="glass-card max-w-md">
            <DialogHeader>
              <DialogTitle className="text-charcoal">Edit Vehicle</DialogTitle>
              <DialogDescription>Update vehicle details.</DialogDescription>
            </DialogHeader>
            {editingVehicle && (
              <form className="space-y-4" onSubmit={async (e)=> {
                e.preventDefault();
                const formData = new FormData(e.currentTarget as HTMLFormElement);
                const number = (formData.get('number') as string).trim();
                const type = formData.get('type') as 'Two Wheeler' | 'Four Wheeler';
                const color = (formData.get('color') as string).trim();
                // Unique check
                if (vehicles.some(v => v.number.toLowerCase() === number.toLowerCase() && v._id !== editingVehicle._id)) {
                  toast({ title: '❌ Duplicate number', description: 'Another vehicle already uses this number.' });
                  return;
                }
                try {
                  await updateVehicleMutation.mutateAsync({ id: editingVehicle._id, updates: { number, type, color } });
                  toast({ title: '✅ Vehicle updated' });
                  setEditOpen(false);
                  setEditingVehicle(null);
                } catch(e:any) {
                  toast({ title: '❌ Update failed', description: e.message });
                }
              }}>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Vehicle Number</label>
                    <Input name="number" defaultValue={editingVehicle.number} className="input-premium" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select name="type" defaultValue={editingVehicle.type} className="w-full input-premium bg-white/70 rounded-md border border-white/30 px-3 py-2 text-sm">
                      <option value="Two Wheeler">Two Wheeler</option>
                      <option value="Four Wheeler">Four Wheeler</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Color</label>
                    <Input name="color" defaultValue={editingVehicle.color} className="input-premium" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Owner (Locked)</label>
                    <div className="px-3 py-2 rounded-md bg-white/70 border border-white/30 text-sm">{editingVehicle.ownerName || ownerByHouse[editingVehicle.house] || 'N/A'}</div>
                  </div>
                </div>
                <DialogFooter className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 flex justify-between gap-3 order-2 sm:order-1">
                    <Button type="button" variant="outline" className="btn-glass flex-1" onClick={()=> { setEditOpen(false); setEditingVehicle(null); }}>Cancel</Button>
                    <Button type="submit" variant="premium" className="text-charcoal flex-1" disabled={updateVehicleMutation.isPending}>{updateVehicleMutation.isPending ? 'Saving...' : 'Save Changes'}</Button>
                  </div>
                  <Button type="button" variant="destructive" className="order-1 sm:order-2"
                    disabled={deleteVehicleMutation.isPending}
                    onClick={async ()=> {
                      if (!editingVehicle) return;
                      if (!confirm(`Delete vehicle ${editingVehicle.number}? This cannot be undone.`)) return;
                      try {
                        await deleteVehicleMutation.mutateAsync(editingVehicle._id);
                        toast({ title: '🗑️ Vehicle deleted', description: editingVehicle.number });
                        setEditOpen(false); setEditingVehicle(null);
                      } catch(e:any) {
                        toast({ title: '❌ Delete failed', description: e.message });
                      }
                    }}>{deleteVehicleMutation.isPending ? 'Deleting...' : 'Delete'}</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Vehicles;