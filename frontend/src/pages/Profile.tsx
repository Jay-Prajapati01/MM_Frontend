import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  Edit3, 
  Save, 
  X, 
  Camera,
  Key,
  Bell,
  Clock,
  Award,
  Building
} from 'lucide-react';

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: 'Pramukh Admin',
    email: 'admin@society.com',
    phone: '+91 98765 43210',
    address: 'Society Management Office, Block A',
    bio: 'Society Administrator with 5+ years of experience in managing residential communities.',
    joinDate: '2020-01-15',
    role: 'Super Admin',
    permissions: ['Full Access', 'User Management', 'Financial Operations', 'Reports']
  });

  const [activityStats] = useState({
    totalLogins: 1250,
    lastLogin: '2025-09-29 11:45 AM',
    sessionsThisMonth: 45,
    averageSessionTime: '2h 15m'
  });

  const handleSave = () => {
    // Save profile data logic here
    toast({ 
      title: '✅ Profile Updated', 
      description: 'Your profile information has been saved successfully.' 
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    // Reset form or fetch original data
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen p-6">
      <div className="container mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-charcoal mb-2">
              Profile <span className="text-gradient">Management</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage your account settings and preferences
            </p>
          </div>
          <div className="flex gap-3">
            {!isEditing ? (
              <Button className="btn-premium" onClick={() => setIsEditing(true)}>
                <Edit3 className="w-4 h-4 mr-2"/>
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" className="btn-glass" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-2"/>
                  Cancel
                </Button>
                <Button className="btn-premium" onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2"/>
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center text-charcoal">
                  <User className="w-5 h-5 mr-2"/>
                  Basic Information
                </CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24 shadow-soft">
                      <AvatarFallback className="bg-gradient-primary text-charcoal font-bold text-2xl">
                        PM
                      </AvatarFallback>
                    </Avatar>
                    {isEditing && (
                      <Button 
                        size="icon"
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow-lg"
                      >
                        <Camera className="w-4 h-4"/>
                      </Button>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-charcoal">{profileData.name}</h3>
                    <p className="text-sm text-muted-foreground">{profileData.email}</p>
                    <Badge className="mt-2 bg-gradient-primary text-charcoal border-0">
                      <Shield className="w-3 h-3 mr-1"/>
                      {profileData.role}
                    </Badge>
                  </div>
                </div>

                <Separator className="bg-white/20"/>

                {/* Form Fields */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      disabled={!isEditing}
                      className="input-premium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={!isEditing}
                      className="input-premium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      disabled={!isEditing}
                      className="input-premium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={profileData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      disabled={!isEditing}
                      className="input-premium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    disabled={!isEditing}
                    className="input-premium min-h-[100px]"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center text-charcoal">
                  <Key className="w-5 h-5 mr-2"/>
                  Security Settings
                </CardTitle>
                <CardDescription>Manage your account security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/20">
                  <div>
                    <h4 className="font-medium text-charcoal">Change Password</h4>
                    <p className="text-sm text-muted-foreground">Update your account password</p>
                  </div>
                  <Button variant="outline" className="btn-glass">
                    Update Password
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/20">
                  <div>
                    <h4 className="font-medium text-charcoal">Two-Factor Authentication</h4>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <Button variant="outline" className="btn-glass">
                    Enable 2FA
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Stats */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center text-charcoal">
                  <Award className="w-5 h-5 mr-2"/>
                  Account Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-charcoal">{activityStats.totalLogins}</div>
                  <div className="text-xs text-muted-foreground">Total Logins</div>
                </div>
                <Separator className="bg-white/20"/>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Last Login</span>
                    <span className="text-sm font-medium">{activityStats.lastLogin}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Sessions This Month</span>
                    <span className="text-sm font-medium">{activityStats.sessionsThisMonth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Session Time</span>
                    <span className="text-sm font-medium">{activityStats.averageSessionTime}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Permissions */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center text-charcoal">
                  <Shield className="w-5 h-5 mr-2"/>
                  Permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {profileData.permissions.map((permission, index) => (
                    <Badge key={index} variant="secondary" className="w-full justify-start">
                      {permission}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center text-charcoal">
                  <Building className="w-5 h-5 mr-2"/>
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full btn-glass justify-start">
                  <Bell className="w-4 h-4 mr-2"/>
                  Notification Settings
                </Button>
                <Button variant="outline" className="w-full btn-glass justify-start">
                  <Clock className="w-4 h-4 mr-2"/>
                  Activity Log
                </Button>
                <Button variant="outline" className="w-full btn-glass justify-start">
                  <Calendar className="w-4 h-4 mr-2"/>
                  Schedule Settings
                </Button>
              </CardContent>
            </Card>

            {/* Account Info */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center text-charcoal">
                  <Calendar className="w-5 h-5 mr-2"/>
                  Account Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground"/>
                  <span className="text-muted-foreground">Joined:</span>
                  <span className="font-medium">{new Date(profileData.joinDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground"/>
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-medium">Mumbai, India</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;