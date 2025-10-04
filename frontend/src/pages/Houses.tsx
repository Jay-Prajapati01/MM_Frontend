import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useHouses, useCreateHouse, useUpdateHouse, useDeleteHouse } from '@/hooks/useHouses';
import { useMembers } from '@/hooks/useMembers';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/components/ui/use-toast";
import type { House } from '@/types/models';
import { 
  Building2, 
  Search, 
  Plus, 
  MoreHorizontal,
  Users
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Houses = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: housesData, isLoading: housesLoading, isError: housesError } = useHouses();
  const { data: membersData } = useMembers();
  const houses: House[] = housesData?.list || [];
  const members = membersData || [];
  const createHouseMutation = useCreateHouse();
  const updateHouseMutation = useUpdateHouse();
  const deleteHouseMutation = useDeleteHouse();

  // Dialog state
  const [openCreate, setOpenCreate] = useState(false);
  const [viewing, setViewing] = useState<House | null>(null);
  const [editing, setEditing] = useState<House | null>(null);
  const [deleting, setDeleting] = useState<House | null>(null);

  // Track current member count for house being entered
  const [currentHouseMembers, setCurrentHouseMembers] = useState<number | null>(null);

  // Form schema and setup
  const schema = useMemo(() => z.object({
    houseNo: z.string().trim().min(1, 'House Number is required'),
    block: z.string().trim().min(1, 'Block is required').transform(v => v.toUpperCase()),
    floor: z.union([
      z.string().trim().min(1, 'Floor is required'),
      z.number().or(z.nan()).transform(v => String(v))
    ]),
    status: z.enum(['vacant','occupied']).default('vacant'),
    membersCount: z
      .union([
        z.string().trim().regex(/^[0-9]+$/, 'Must be a whole number'),
        z.number()
      ])
      .transform(v => typeof v === 'number' ? v : Number(v))
      .refine(v => v >= 0, 'Cannot be negative'),
    vehiclesCount: z
      .union([
        z.string().trim().regex(/^[0-9]+$/, 'Must be a whole number'),
        z.number()
      ])
      .transform(v => typeof v === 'number' ? v : Number(v))
      .refine(v => v >= 0, 'Cannot be negative'),
    notes: z.string().optional().transform(v => v?.trim() || ''),
  }), []);

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      houseNo: '',
      block: '',
      floor: '',
      status: 'vacant',
      membersCount: 0,
      vehiclesCount: 0,
      notes: ''
    } as any,
    mode: "onSubmit",
  });

  // Edit form (separate to avoid interfering with create form dirty state)
  const editForm = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      houseNo: '',
      block: '',
      floor: '',
      status: 'vacant',
      membersCount: 0,
      vehiclesCount: 0,
      notes: ''
    } as any,
    mode: 'onSubmit'
  });

  // Populate edit form when a house is selected
  useEffect(() => {
    if (editing) {
      editForm.reset({
        houseNo: editing.houseNo,
        block: editing.block,
        floor: String(editing.floor ?? ''),
        status: editing.status,
        membersCount: editing.membersCount || 0,
        vehiclesCount: editing.vehiclesCount || 0,
        notes: editing.notes || ''
      } as any);
    }
  }, [editing, editForm]);

  // Watch house number field and update member count
  useEffect(() => {
    const subscription = form.watch((value) => {
      const houseNo = value.houseNo?.trim();
      if (houseNo) {
        const memberCount = members.filter((member: any) => 
          member.house?.toLowerCase() === houseNo.toLowerCase()
        ).length;
        setCurrentHouseMembers(memberCount);
      } else {
        setCurrentHouseMembers(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, members]);

  const onSubmit = async (values: FormValues) => {
    // Uniqueness: ensure house number does not exist (case-insensitive)
    const exists = houses.some((h:any) => (h.houseNo).toLowerCase() === values.houseNo.toLowerCase());
    if (exists) {
      form.setError("houseNo", { type: "manual", message: "House Number must be unique" });
      toast({ title: "❌ Please check the form fields.", description: "House number already exists." });
      return;
    }
    const payload = {
      houseNo: values.houseNo.trim().toUpperCase(),
      block: values.block.trim().toUpperCase(),
      floor: values.floor,
      status: values.membersCount > 0 ? 'occupied' : values.status,
      notes: values.notes || undefined,
      membersCount: values.membersCount,
      vehiclesCount: values.vehiclesCount
    } as any;
    try {
      await createHouseMutation.mutateAsync(payload);
      toast({ title: '✅ House added successfully.', description: `House ${payload.houseNo} added.` });
      form.reset();
      setOpenCreate(false);
    } catch (e:any) {
      toast({ title: '❌ Failed to add house', description: e.message });
    }
  };

  const editOnSubmit = async (values: FormValues) => {
    if (!editing) return;
    // Uniqueness check if changed
    if (values.houseNo.trim().toUpperCase() !== editing.houseNo) {
      const exists = houses.some(h => h.houseNo.toLowerCase() === values.houseNo.trim().toLowerCase());
      if (exists) {
        editForm.setError('houseNo', { type: 'manual', message: 'House number already exists' });
        toast({ title: '❌ Duplicate house number', description: 'Choose a different number.' });
        return;
      }
    }
    try {
      await updateHouseMutation.mutateAsync({ id: editing._id, updates: {
        houseNo: values.houseNo.trim().toUpperCase(),
        block: values.block.trim().toUpperCase(),
        floor: values.floor,
        status: values.status,
        membersCount: values.membersCount,
        vehiclesCount: values.vehiclesCount,
        notes: values.notes?.trim() || undefined
      }});
      toast({ title: '✅ House updated', description: `House ${values.houseNo.trim().toUpperCase()} saved.` });
      setEditing(null);
    } catch (e:any) {
      toast({ title: 'Update failed', description: e.message });
    }
  };

  const handleDeleteHouse = async () => {
    if (!deleting) return;
    try {
      await deleteHouseMutation.mutateAsync(deleting._id);
      toast({ title: '✅ House deleted', description: `House ${deleting.houseNo} has been removed.` });
      setDeleting(null);
    } catch (e:any) {
      toast({ title: '❌ Delete failed', description: e.message });
    }
  };

  const [statusFilter, setStatusFilter] = useState<'all' | 'occupied' | 'vacant' | 'maintenance'>('all');
  const filteredHouses = houses.filter(h => {
    const matchesSearch = h.houseNo.toLowerCase().includes(searchTerm.toLowerCase()) || (h.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ? true : h.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      occupied: "bg-green-100 text-green-800 border-green-200",
      vacant: "bg-blue-100 text-blue-800 border-blue-200",
      maintenance: "bg-yellow-100 text-yellow-800 border-yellow-200"
    };
    return variants[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getMaintenanceBadge = (status: string) => {
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <>
      <div className="min-h-screen p-6">
        <div className="container mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-4xl font-serif font-bold text-charcoal mb-2">
                House <span className="text-gradient">Management</span>
              </h1>
              <p className="text-muted-foreground text-lg">
                Manage all properties and resident information
              </p>
            </div>
            <Dialog open={openCreate} onOpenChange={(open) => {
              setOpenCreate(open);
              if (!open) {
                setCurrentHouseMembers(null);
                form.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="btn-premium text-charcoal">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New House
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card">
                <DialogHeader>
                  <DialogTitle className="text-charcoal">Add New House</DialogTitle>
                  <DialogDescription>Enter the details below to add a new house to the registry.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit, () => toast({ title: "❌ Please check the form fields." }))} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField control={form.control} name="houseNo" render={({ field }) => (
                        <FormItem>
                          <FormLabel>House Number</FormLabel>
                          <FormControl><Input placeholder="e.g., A-104" className="input-premium" {...field} /></FormControl>
                          {currentHouseMembers !== null && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Users className="w-3 h-3" /> {currentHouseMembers} current
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="block" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Block</FormLabel>
                          <FormControl><Input placeholder="e.g., A" className="input-premium" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="floor" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Floor</FormLabel>
                          <FormControl><Input placeholder="e.g., 1" className="input-premium" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange} disabled={(form.getValues().membersCount || 0) > 0}>
                              <SelectTrigger className="input-premium"><SelectValue placeholder="Select status" /></SelectTrigger>
                              <SelectContent className="glass-card border-white/20">
                                <SelectItem value="vacant">Vacant</SelectItem>
                                <SelectItem value="occupied">Occupied</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          {(form.getValues().membersCount || 0) > 0 && <p className="text-xs text-muted-foreground">Status locked to Occupied because members {'>'} 0</p>}
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="membersCount" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Initial Members Count</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} className="input-premium" value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="vehiclesCount" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Vehicles</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} className="input-premium" value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes / Additional Info (optional)</FormLabel>
                        <FormControl><Textarea placeholder="Any special notes..." className="input-premium min-h-[96px]" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <DialogFooter>
                      <Button type="button" variant="outline" className="btn-glass" onClick={() => setOpenCreate(false)}>Cancel</Button>
                      <Button type="submit" variant="premium" className="text-charcoal">Save House</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search & Filters */}
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input className="input-premium pl-10" placeholder="Search by house number or owner name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge onClick={() => setStatusFilter('all')} variant={statusFilter==='all' ? 'default':'outline'} className="cursor-pointer transition-colors">All ({houses.length})</Badge>
                  <Badge onClick={() => setStatusFilter('occupied')} variant={statusFilter==='occupied' ? 'default':'outline'} className="cursor-pointer transition-colors">Occupied ({houses.filter(h => h.status === 'occupied').length})</Badge>
                  <Badge onClick={() => setStatusFilter('vacant')} variant={statusFilter==='vacant' ? 'default':'outline'} className="cursor-pointer transition-colors">Vacant ({houses.filter(h => h.status === 'vacant').length})</Badge>
                  <Badge onClick={() => setStatusFilter('maintenance')} variant={statusFilter==='maintenance' ? 'default':'outline'} className="cursor-pointer transition-colors">Maintenance ({houses.filter(h => h.status === 'maintenance').length})</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Houses Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {housesLoading && <div className="text-sm text-muted-foreground">Loading houses...</div>}
            {housesError && <div className="text-sm text-destructive">Failed to load houses.</div>}
            {!housesLoading && !housesError && filteredHouses.map((house:any) => (
              <Card key={house._id || house.id || house.houseNo} className="glass-card hover-lift">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-gradient-primary">
                      <Building2 className="w-5 h-5 text-charcoal" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-serif text-charcoal">House {house.houseNo}</CardTitle>
                      <CardDescription>
                        {house.status === 'occupied' ? (house.ownerName ? `Owner: ${house.ownerName}` : 'Occupied') : 'Available'}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass-card border-white/20">
                      <DropdownMenuItem onClick={() => setViewing(house)}>View Details</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditing(house)}>Edit House</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleting(house)} className="text-destructive focus:text-destructive">Delete House</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast({ title: 'Coming soon', description: 'Contact owner feature will be added.' })}>Contact Owner</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Badge className={getStatusBadge(house.status)}>{house.status?.charAt(0).toUpperCase() + house.status?.slice(1)}</Badge>
                    <Badge className={getMaintenanceBadge('n/a')}>{house.vehiclesCount ?? 0} vehicle{(house.vehiclesCount ?? 0) === 1 ? '' : 's'}</Badge>
                  </div>
                  {house.status === 'occupied' && (
                    <div className="space-y-3 pt-3 border-t border-white/10 text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center"><Users className="w-4 h-4 mr-2" />{house.membersCount ?? 0} members</div>
                        <div>{house.vehiclesCount ?? 0} vehicles</div>
                      </div>
                      <div className="text-xs text-muted-foreground">Block {house.block} · Floor {house.floor}</div>
                    </div>
                  )}
                  {house.status === 'vacant' && (
                    <div className="text-center py-4 text-muted-foreground">
                      <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Property available for rent</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {filteredHouses.length === 0 && !housesLoading && (
            <Card className="glass-card">
              <CardContent className="text-center py-12">
                <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold text-charcoal mb-2">No houses found</h3>
                <p className="text-muted-foreground">Try adjusting your search terms or filters</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* View Details Dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="glass-card max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-charcoal">House Details - {viewing?.houseNo}</DialogTitle>
            <DialogDescription>Comprehensive information of the selected house.</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="font-medium">House No:</span> {viewing.houseNo}</div>
                <div><span className="font-medium">Block:</span> {viewing.block}</div>
                <div><span className="font-medium">Floor:</span> {viewing.floor}</div>
                <div><span className="font-medium">Status:</span> {viewing.status}</div>
                <div><span className="font-medium">Owner:</span> {viewing.ownerName || '—'}</div>
                <div><span className="font-medium">Members:</span> {viewing.membersCount ?? 0}</div>
                <div><span className="font-medium">Vehicles:</span> {viewing.vehiclesCount ?? 0}</div>
              </div>
              {viewing.notes && <div><span className="font-medium">Notes:</span> {viewing.notes}</div>}
              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-white/10">
                <div>Created: {new Date(viewing.createdAt).toLocaleString()}</div>
                <div>Updated: {new Date(viewing.updatedAt).toLocaleString()}</div>
              </div>
              <div className="flex justify-end pt-4">
                <Button variant="outline" className="btn-glass" onClick={() => setViewing(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => { if(!o) { setEditing(null); editForm.reset(); } }}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="text-charcoal">Edit House {editing?.houseNo}</DialogTitle>
            <DialogDescription>Update house information below.</DialogDescription>
          </DialogHeader>
          {editing && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(editOnSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField name="houseNo" control={editForm.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>House Number</FormLabel>
                      <FormControl><Input className="input-premium" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField name="block" control={editForm.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Block</FormLabel>
                      <FormControl><Input className="input-premium" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField name="floor" control={editForm.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Floor</FormLabel>
                      <FormControl><Input className="input-premium" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField name="status" control={editForm.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="input-premium"><SelectValue /></SelectTrigger>
                          <SelectContent className="glass-card border-white/20">
                            <SelectItem value="vacant">Vacant</SelectItem>
                            <SelectItem value="occupied">Occupied</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField name="membersCount" control={editForm.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Members Count</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} className="input-premium" value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField name="vehiclesCount" control={editForm.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicles Count</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} className="input-premium" value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField name="notes" control={editForm.control} render={({ field }) => (
                    <FormItem className="sm:col-span-3">
                      <FormLabel>Notes</FormLabel>
                      <FormControl><Textarea className="input-premium" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" className="btn-glass" onClick={() => { setEditing(null); editForm.reset(); }}>Cancel</Button>
                  <Button disabled={updateHouseMutation.isPending} type="submit" variant="premium" className="text-charcoal">{updateHouseMutation.isPending ? 'Saving...' : 'Save Changes'}</Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="glass-card max-w-md">
          <DialogHeader>
            <DialogTitle className="text-charcoal">Delete House</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete House {deleting?.houseNo}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleting && (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <div className="text-sm text-destructive font-medium mb-2">This will permanently delete:</div>
                <ul className="text-sm text-destructive/80 space-y-1">
                  <li>• House {deleting.houseNo} ({deleting.block})</li>
                  <li>• All associated member and vehicle data</li>
                  <li>• Any notes or additional information</li>
                </ul>
              </div>
              <DialogFooter>
                <Button variant="outline" className="btn-glass" onClick={() => setDeleting(null)}>Cancel</Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteHouse}
                  disabled={deleteHouseMutation.isPending}
                >
                  {deleteHouseMutation.isPending ? 'Deleting...' : 'Delete House'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Houses;