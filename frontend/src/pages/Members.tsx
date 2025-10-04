import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  Search, 
  Plus, 
  Phone,
  Mail,
  MapPin,
  Calendar,
  MessageSquare,
  Edit,
  Trash2,
  Eye
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { useMembers, useCreateMember, useUpdateMember, useDeleteMember } from '@/hooks/useMembers';
import { useHouses } from "@/hooks/useHouses";
import { useEffect } from 'react';
import type { Member } from '@/types/models';

const Members = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  // Single expanded house instead of multiple
  const [expandedHouse, setExpandedHouse] = useState<string | null>(null);
  const { data: members = [], isLoading: membersLoading, isError: membersError } = useMembers();
  const createMemberMutation = useCreateMember();
  const updateMemberMutation = useUpdateMember();
  const deleteMemberMutation = useDeleteMember();

  // Dialog states
  const [viewing, setViewing] = useState<Member | null>(null);
  const [editing, setEditing] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState<Member | null>(null);

  const [memberSlots, setMemberSlots] = useState(0);
  const [multiMembers, setMultiMembers] = useState<{ name: string; phone: string; relationship?: string }[]>([
    { name: '', phone: '', relationship: 'Owner' }
  ]);

  const addMemberSlot = () => {
    setMultiMembers(prev => [...prev, { name: '', phone: '', relationship: 'Other' }]);
  };

  const removeMemberSlot = (index: number) => {
    if (multiMembers.length > 1) {
      const newMembers = [...multiMembers];
      newMembers.splice(index, 1);
      setMultiMembers(newMembers);
    }
  };

  const updateMemberField = (index: number, field: 'name' | 'phone' | 'relationship', value: string) => {
    setMultiMembers(prev => prev.map((m,i) => i===index ? { ...m, [field]: field === 'phone' ? value.replace(/\D/g,'') : value } : m));
  };

  const { data: housesData, isLoading: housesLoading, isError: housesError } = useHouses();
  const housesList = (housesData?.list || []) as any[];
  const houseOptions = useMemo(
    () => housesList.map((h: any) => h.houseNo || h.number || h.name).filter(Boolean).sort(),
    [housesList],
  );

  const getHouseByNo = (no:string) => housesList.find(h => (h.houseNo||'').toLowerCase() === no.toLowerCase());

  // Form schema
  const schema = useMemo(
    () =>
      z.object({
        fullName: z.string().trim().min(1, "Full Name is required"),
        house: z.string().trim().min(1, "House is required"),
        role: z.enum(["Owner", "Tenant", "Family Member"], { required_error: "Role is required" }),
        phone: z
          .string()
          .trim()
          .transform((v) => v.replace(/\D/g, ""))
          .refine((v) => /^\d{10}$/.test(v), { message: "Enter a valid 10-digit phone number" }),
        email: z
          .union([z.string().email({ message: "Enter a valid email" }), z.literal("")])
          .optional()
          .transform((v) => v ?? ""),
        isActive: z.boolean().default(true),
      }),
    [],
  );

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      house: "",
      role: "Owner",
      phone: "",
      email: "",
      isActive: true,
    },
    mode: "onSubmit",
  });

  // Edit form (separate to avoid interfering with create form dirty state)
  const editForm = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      house: "",
      role: "Owner",
      phone: "",
      email: "",
      isActive: true,
    },
    mode: "onSubmit",
  });

  // Auto-select first house when list changes if current value is empty or removed
  useEffect(() => {
    const current = form.getValues('house');
    if (!current || !houseOptions.includes(current)) {
      if (houseOptions.length > 0) {
        form.setValue('house', houseOptions[0], { shouldDirty: true });
      }
    }
  }, [houseOptions, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      await createMemberMutation.mutateAsync({
        name: values.fullName.trim(),
        house: values.house, // may need to send house id if API expects _id
        role: values.role,
        relationship: values.role === 'Owner' ? 'Owner' : 'Other',
        phone: values.phone,
        email: values.email || undefined,
        status: values.isActive ? 'active' : 'inactive'
      });
      toast({ title: '✅ Member added successfully.' });
  form.reset({ fullName: '', house: houseOptions[0] || '', role: 'Owner', phone: '', email: '', isActive: true });
      setOpen(false);
    } catch (e:any) {
      toast({ title: '❌ Failed to add member', description: e.message });
    }
  };

  // Populate edit form when a member is selected
  useEffect(() => {
    if (editing) {
      editForm.reset({
        fullName: editing.name,
        house: editing.house,
        role: editing.role,
        phone: editing.phone,
        email: editing.email || '',
        isActive: editing.status === 'active',
      });
    }
  }, [editing, editForm]);

  const onEditSubmit = async (values: FormValues) => {
    if (!editing) return;
    try {
      await updateMemberMutation.mutateAsync({
        id: editing._id,
        updates: {
          name: values.fullName.trim(),
          house: values.house,
          // Role is now immutable in edit dialog; keep original
          role: editing.role,
          phone: values.phone,
          email: values.email || undefined,
          status: values.isActive ? 'active' : 'inactive'
        }
      });
      toast({ title: '✅ Member updated successfully.' });
      setEditing(null);
    } catch (e:any) {
      toast({ title: '❌ Failed to update member', description: e.message });
    }
  };

  const onSubmitMulti = async () => {
    // Validate all required fields
    const emptyNames = multiMembers.filter(m => !m.name.trim());
    if (emptyNames.length > 0) {
      toast({ title: '❌ All names are required', description: 'Please fill in all member names.' });
      return;
    }

    // Validate owner phone number
    if (!multiMembers[0].phone || multiMembers[0].phone.length !== 10) {
      toast({ title: '❌ Owner phone required', description: 'Owner must have a valid 10-digit phone number.' });
      return;
    }

    // Check if house is selected
    const selectedHouse = form.watch('house');
    if (!selectedHouse) {
      toast({ title: '❌ House selection required', description: 'Please select a house first.' });
      return;
    }

    try {
      let successCount = 0;
      for (let i = 0; i < multiMembers.length; i++) {
        const member = multiMembers[i];
        await createMemberMutation.mutateAsync({
          name: member.name.trim(),
          house: selectedHouse,
          role: i === 0 ? 'Owner' : 'Family Member',
          relationship: member.relationship || (i===0 ? 'Owner' : 'Other'),
          phone: i === 0 ? member.phone : '',
          email: undefined,
          status: 'active'
        });
        successCount++;
      }

      toast({ 
        title: '✅ Members added successfully!', 
        description: `Added ${successCount} member${successCount !== 1 ? 's' : ''} to House ${selectedHouse}.` 
      });

      // Reset form
      setOpen(false);
  setMultiMembers([{ name: '', phone: '', relationship: 'Owner' }]);
      setMemberSlots(0);
      form.reset({ house: houseOptions[0] || '' });

    } catch (e: any) {
      toast({ 
        title: '❌ Failed to add members', 
        description: e.message || 'An error occurred while adding members.' 
      });
    }
  };

  const filteredMembers = members.filter((member: any) => {
    const needle = searchTerm.toLowerCase();
    const name = (member.name || '').toLowerCase();
    // offline model stores house as string (houseNo)
    const houseStr = (member.house?.houseNo || member.house || '').toString().toLowerCase();
    const email = (member.email || '').toLowerCase();
    return name.includes(needle) || houseStr.includes(needle) || email.includes(needle);
  });

  // Group ALL members by house; apply search only to house selection, not to which members are shown inside
  const groupedByHouse = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const m of members as any[]) {
      const houseVal: any = (m as any).house;
      const key = (houseVal && typeof houseVal === 'object' ? houseVal.houseNo : houseVal) || '';
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }
    Object.values(groups).forEach(arr => arr.sort((a,b) => {
      if (a.role === 'Owner') return -1;
      if (b.role === 'Owner') return 1;
      return a.name.localeCompare(b.name);
    }));
    const search = searchTerm.trim().toLowerCase();
    const entries = Object.entries(groups).map(([house, mems]) => ({ house, members: mems }));
    const filtered = search ? entries.filter(g => {
      if (g.house.toLowerCase().includes(search)) return true;
      return g.members.some(m => (m.name||'').toLowerCase().includes(search) || (m.email||'').toLowerCase().includes(search));
    }) : entries;
    return filtered.sort((a,b) => a.house.localeCompare(b.house));
  }, [members, searchTerm]);

  const getRoleBadge = (role: string) => {
    const variants = {
      "Owner": "bg-purple-100 text-purple-800 border-purple-200",
      "Tenant": "bg-blue-100 text-blue-800 border-blue-200",
      "Family Member": "bg-green-100 text-green-800 border-green-200"
    };
    return variants[role as keyof typeof variants] || variants["Family Member"];
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-green-100 text-green-800 border-green-200",
      inactive: "bg-gray-100 text-gray-800 border-gray-200"
    };
    return variants[status as keyof typeof variants] || variants.active;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };
  // Removed erroneous setOpen implementation, now using useState's setOpen.

  const toggleHouse = (house:string) => {
    setExpandedHouse(prev => prev === house ? null : house);
  };

  // Defensive: if the currently expanded house disappears (filter/search/data change), collapse it
  useEffect(() => {
    if (expandedHouse) {
      const stillExists = groupedByHouse.some(g => g.house === expandedHouse);
      if (!stillExists) {
        setExpandedHouse(null);
      }
    }
  }, [groupedByHouse, expandedHouse]);

  return (
    <div className="min-h-screen p-6">
      <div className="container mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-charcoal mb-2">
              Member <span className="text-gradient">Directory</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Comprehensive member profiles and contact information
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="btn-premium text-charcoal">
                <Plus className="w-4 h-4 mr-2" />
                Add New Member
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle className="text-charcoal">Add New Member</DialogTitle>
                <DialogDescription>Register new members to the directory.</DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-charcoal mb-1">House Number</label>
                    <Select onValueChange={(val) => {
                      form.setValue('house', val);
                      const house = getHouseByNo(val);
                      if (house) {
                        const slots = house.membersCount || 0;
                        setMemberSlots(slots);
                        if (slots > 0) {
                          setMultiMembers(Array.from({ length: Math.max(slots,1)}, (_,i) => ({ name: '', phone: '', relationship: i===0 ? 'Owner':'Other' })));
                        } else {
                          setMultiMembers([{ name: '', phone: '', relationship: 'Owner' }]);
                        }
                      }
                    }}>
                      <SelectTrigger className="input-premium">
                        <SelectValue placeholder="Select house" />
                      </SelectTrigger>
                      <SelectContent className="glass-card border-white/20 max-h-60 overflow-y-auto">
                        {houseOptions.length === 0 && (
                          <div className="text-xs text-muted-foreground px-2 py-1">No houses found</div>
                        )}
                        {housesList.map((house: any) => (
                          <SelectItem key={house.houseNo} value={house.houseNo}>
                            <div className="flex items-center justify-between w-full">
                              <span>{house.houseNo}</span>
                              <Badge variant="secondary" className="ml-2 text-xs">
                                {house.membersCount || 0} member{(house.membersCount || 0) !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-4">
                  {multiMembers.map((member, index) => (
                    <div key={index} className="p-4 rounded-lg bg-white/50 shadow-sm border border-white/30">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-charcoal">
                          {index === 0 ? 'Owner' : `Member ${index + 1}`}
                        </h3>
                        {index > 0 && (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => removeMemberSlot(index)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className={`grid grid-cols-1 ${index === 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
                        <div>
                          <label className="block text-sm font-medium text-charcoal mb-1">Name *</label>
                          <Input 
                            placeholder="e.g., Neha Sharma" 
                            className="input-premium" 
                            value={member.name} 
                            onChange={(e) => updateMemberField(index, 'name', e.target.value)} 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-charcoal mb-1">Relationship *</label>
                          <select
                            className="input-premium w-full rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                            value={member.relationship || (index===0 ? 'Owner':'Other')}
                            onChange={(e)=> updateMemberField(index,'relationship', e.target.value)}
                          >
                            {index===0 && <option value="Owner">Owner</option>}
                            <option value="Father">Father</option>
                            <option value="Mother">Mother</option>
                            <option value="Son">Son</option>
                            <option value="Daughter">Daughter</option>
                            <option value="Spouse">Spouse</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        {index === 0 && (
                          <div>
                            <label className="block text-sm font-medium text-charcoal mb-1">Phone Number *</label>
                            <Input 
                              placeholder="10-digit number" 
                              inputMode="numeric" 
                              maxLength={10}
                              className="input-premium" 
                              value={member.phone} 
                              onChange={(e) => updateMemberField(index, 'phone', e.target.value)} 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {memberSlots > 0 && (
                  <div className="flex justify-center pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={addMemberSlot}
                      className="btn-glass"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Another Member
                    </Button>
                  </div>
                )}
              </div>
              <DialogFooter className="flex-shrink-0 border-t border-white/20 pt-4 mt-4">
                <Button variant="outline" className="btn-glass" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="premium" 
                  className="text-charcoal" 
                  onClick={onSubmitMulti} 
                  disabled={memberSlots === 0 || createMemberMutation.isPending}
                >
                  {createMemberMutation.isPending ? 'Saving...' : `Save ${multiMembers.length} Member${multiMembers.length !== 1 ? 's' : ''}`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Stats */}
        <div className="grid lg:grid-cols-4 gap-6">
          <Card className="glass-card lg:col-span-3">
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  className="input-premium pl-10"
                  placeholder="Search by name, house, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-serif font-bold text-charcoal mb-1">
                {members.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Members</div>
            </CardContent>
          </Card>
        </div>

        {/* Grouped Members Grid (one card per house) */}
        <div className="grid gap-6">
          {membersLoading && <div className="text-sm text-muted-foreground">Loading members...</div>}
          {membersError && <div className="text-sm text-destructive">Failed to load members.</div>}
          {!membersLoading && !membersError && groupedByHouse.map(group => {
            const owner = group.members.find((m:any) => m.role === 'Owner');
            return (
              <Card
                key={group.house}
                className="glass-card transition-all"
              >
                <CardHeader
                  className="pb-4 flex flex-row items-start space-y-0 gap-4"
                >
                  <Avatar className="h-12 w-12 shadow-soft">
                    <AvatarFallback className="bg-gradient-primary text-charcoal font-semibold">
                      {getInitials(owner?.name || group.members[0].name || 'H')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <CardTitle className="text-lg font-semibold text-charcoal flex items-center justify-between">
                      <span>House {group.house}</span>
                    </CardTitle>
                    <CardDescription>{group.members.length} member{group.members.length !== 1 ? 's' : ''}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <div className="flex flex-wrap gap-4">
                    {group.members.map((m:any) => (
                      <div
                        key={m._id}
                        className="flex-1 min-w-[280px] p-4 rounded-lg bg-white/50 border border-white/30 hover:bg-white/60 transition-colors cursor-pointer shadow-sm"
                        onClick={() => setViewing(m)}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 shadow-soft flex-shrink-0">
                            <AvatarFallback className="bg-gradient-primary text-charcoal font-semibold text-sm">
                              {getInitials(m.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium text-charcoal truncate text-sm" title={m.name}>{m.name}</p>
                              <div className="flex items-center gap-1" onClick={(e)=> e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  title="Edit"
                                  onClick={() => setEditing(m)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive"
                                  title="Delete"
                                  onClick={() => setDeleting(m)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge className={`${getRoleBadge(m.role)} text-xs`}>
                                {m.role === 'Owner' ? 'Owner' : m.role === 'Family Member' ? 'Family' : m.role}
                              </Badge>
                              {m.relationship && m.relationship !== m.role && (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                                  {m.relationship}
                                </Badge>
                              )}
                              <Badge className={`${getStatusBadge(m.status)} text-xs`}>
                                {m.status}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-[11px] text-muted-foreground">
                              {m.phone && (
                                <div className="flex items-center">
                                  <Phone className="w-3 h-3 mr-1 flex-shrink-0" />
                                  <span className="truncate">{m.phone}</span>
                                </div>
                              )}
                              {m.email && (
                                <div className="flex items-center">
                                  <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
                                  <span className="truncate">{m.email}</span>
                                </div>
                              )}
                              <div className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span>{format(new Date(m.createdAt || Date.now()), 'MMM yyyy')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredMembers.length === 0 && (
          <Card className="glass-card">
            <CardContent className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold text-charcoal mb-2">No members found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card text-center p-4">
            <div className="text-2xl font-serif font-bold text-purple-600 mb-1">
              {members.filter((m:any) => m.role === 'Owner').length}
            </div>
            <div className="text-sm text-muted-foreground">Owners</div>
          </Card>
          <Card className="glass-card text-center p-4">
            <div className="text-2xl font-serif font-bold text-blue-600 mb-1">
              {members.filter((m:any) => m.role === 'Tenant').length}
            </div>
            <div className="text-sm text-muted-foreground">Tenants</div>
          </Card>
          <Card className="glass-card text-center p-4">
            <div className="text-2xl font-serif font-bold text-green-600 mb-1">
              {members.filter((m:any) => m.role === 'Family Member').length}
            </div>
            <div className="text-sm text-muted-foreground">Family</div>
          </Card>
          <Card className="glass-card text-center p-4">
            <div className="text-2xl font-serif font-bold text-orange-600 mb-1">
              {members.filter((m:any) => m.status === 'active').length}
            </div>
            <div className="text-sm text-muted-foreground">Active</div>
          </Card>
        </div>
      </div>

      {/* View Profile Dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="glass-card max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-charcoal">Member Profile</DialogTitle>
            <DialogDescription>Complete profile information for {viewing?.name}</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16 shadow-soft">
                  <AvatarFallback className="bg-gradient-primary text-charcoal font-semibold text-lg">
                    {getInitials(viewing.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold text-charcoal">{viewing.name}</h3>
                  <p className="text-muted-foreground">{viewing.role}{viewing.relationship && viewing.relationship !== viewing.role ? ` • ${viewing.relationship}`: ''}</p>
                  <Badge className={getStatusBadge(viewing.status)}>{viewing.status}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <MapPin className="w-4 h-4 mr-3 text-muted-foreground" />
                    <span>House {viewing.house}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Phone className="w-4 h-4 mr-3 text-muted-foreground" />
                    <span>{viewing.phone}</span>
                  </div>
                  {viewing.email && (
                    <div className="flex items-center text-sm">
                      <Mail className="w-4 h-4 mr-3 text-muted-foreground" />
                      <span>{viewing.email}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm">
                    <Calendar className="w-4 h-4 mr-3 text-muted-foreground" />
                    <span>Joined {format(new Date(viewing.createdAt), 'MMMM yyyy')}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button variant="outline" className="btn-glass" onClick={() => setViewing(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => { if(!o) { setEditing(null); editForm.reset(); } }}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="text-charcoal">Edit Member</DialogTitle>
            <DialogDescription>Update member information below.</DialogDescription>
          </DialogHeader>
          {editing && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Neha Sharma" className="input-premium" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="house"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>House Number</FormLabel>
                        <FormControl>
                          {housesLoading ? (
                            <div className="text-sm text-muted-foreground px-2 py-2">Loading houses...</div>
                          ) : housesError ? (
                            <div className="text-sm text-destructive px-2 py-2">Failed to load houses</div>
                          ) : (
                            <Select onValueChange={val => field.onChange(val)} value={field.value}>
                              <SelectTrigger className="input-premium">
                                <SelectValue placeholder="Select house" />
                              </SelectTrigger>
                              <SelectContent className="glass-card border-white/20 max-h-60 overflow-y-auto">
                                {houseOptions.length === 0 && (
                                  <div className="text-xs text-muted-foreground px-2 py-1">No houses found</div>
                                )}
                                {housesList.map((house: any) => (
                                  <SelectItem key={house.houseNo} value={house.houseNo}>
                                    <div className="flex items-center justify-between w-full">
                                      <span>{house.houseNo}</span>
                                      <Badge variant="secondary" className="ml-2 text-xs">
                                        {house.membersCount || 0} member{(house.membersCount || 0) !== 1 ? 's' : ''}
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="role"
                    render={() => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <div className="mt-2">
                          <Badge className={getRoleBadge(editing.role)}>{editing.role}</Badge>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="10-digit number" inputMode="numeric" className="input-premium" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Email ID (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="name@example.com" className="input-premium" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2 flex items-center justify-between rounded-xl bg-white/40 px-4 py-3 border border-white/30">
                        <FormLabel className="m-0">Status</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" className="btn-glass" onClick={() => { setEditing(null); editForm.reset(); }}>Cancel</Button>
                  <Button disabled={updateMemberMutation.isPending} type="submit" variant="premium" className="text-charcoal">
                    {updateMemberMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleting} onOpenChange={(o) => { if(!o) setDeleting(null); }}>
        <DialogContent className="glass-card max-w-md">
          <DialogHeader>
            <DialogTitle className="text-charcoal">Delete Member</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {deleting && (
            <div className="space-y-4 text-sm">
              <p>Are you sure you want to delete <strong>{deleting.name}</strong>? This will permanently remove the member record.</p>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" className="btn-glass" onClick={() => setDeleting(null)}>Cancel</Button>
                <Button variant="destructive" disabled={deleteMemberMutation.isPending} onClick={async () => {
                  try {
                    await deleteMemberMutation.mutateAsync(deleting._id);
                    toast({ title: '🗑️ Member deleted', description: `${deleting.name} removed.` });
                    setDeleting(null);
                  } catch (e:any) {
                    toast({ title: 'Delete failed', description: e.message });
                  }
                }}>
                  {deleteMemberMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


    </div>
  );
};

export default Members;