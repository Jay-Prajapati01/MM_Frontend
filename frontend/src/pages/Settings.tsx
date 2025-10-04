import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Settings as SettingsIcon, 
  Moon, 
  Sun, 
  Monitor,
  Palette
} from 'lucide-react';

const Settings = () => {
  const { theme, setTheme, isDarkMode } = useTheme();

  const handleThemeChange = (mode: string) => {
    setTheme(mode as 'light' | 'dark' | 'system');
    toast({ 
      title: '🎨 Theme Updated', 
      description: `Switched to ${mode} mode` 
    });
  };

  const ThemeOption = ({ 
    mode, 
    icon: Icon, 
    title, 
    description, 
    isActive 
  }: {
    mode: string;
    icon: any;
    title: string;
    description: string;
    isActive: boolean;
  }) => (
    <div 
      className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all cursor-pointer ${
        isActive 
          ? 'border-gradient-primary bg-soft-gold/20' 
          : 'border-white/20 bg-white/10 hover:bg-white/20'
      }`}
      onClick={() => handleThemeChange(mode)}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isActive ? 'bg-gradient-primary' : 'bg-white/20'}`}>
          <Icon className={`w-5 h-5 ${isActive ? 'text-charcoal' : 'text-muted-foreground'}`} />
        </div>
        <div>
          <h4 className={`font-medium ${isActive ? 'text-charcoal' : 'text-muted-foreground'}`}>
            {title}
          </h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className={`w-4 h-4 rounded-full border-2 ${
        isActive ? 'bg-gradient-primary border-gradient-primary' : 'border-white/30'
      }`}>
        {isActive && <div className="w-2 h-2 bg-charcoal rounded-full m-0.5" />}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-6">
      <div className="container mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-serif font-bold text-charcoal mb-2">
            <span className="text-gradient">Settings</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Customize your experience
          </p>
        </div>

        {/* Theme Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center text-charcoal">
              <Palette className="w-5 h-5 mr-2"/>
              Appearance
            </CardTitle>
            <CardDescription>
              Choose your preferred theme mode. The system mode will automatically switch between light and dark based on your device settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Theme Display */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-primary">
                  {isDarkMode ? (
                    <Moon className="w-5 h-5 text-charcoal" />
                  ) : (
                    <Sun className="w-5 h-5 text-charcoal" />
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-charcoal">Current Theme</h4>
                  <p className="text-sm text-muted-foreground">
                    {isDarkMode ? 'Dark Mode' : 'Light Mode'} 
                    {theme === 'system' && ' (System)'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-charcoal capitalize">
                  {theme} Mode
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* Theme Options */}
            <div className="space-y-4">
              <h4 className="font-medium text-charcoal">Choose Theme Mode</h4>
              
              <ThemeOption
                mode="light"
                icon={Sun}
                title="Light Mode"
                description="Always use light theme"
                isActive={theme === 'light'}
              />
              
              <ThemeOption
                mode="dark"
                icon={Moon}
                title="Dark Mode"
                description="Always use dark theme"
                isActive={theme === 'dark'}
              />
              
              <ThemeOption
                mode="system"
                icon={Monitor}
                title="System Mode"
                description="Follow system preference"
                isActive={theme === 'system'}
              />
            </div>

            {/* Theme Preview */}
            <div className="space-y-3">
              <h4 className="font-medium text-charcoal">Preview</h4>
              <div className="grid grid-cols-2 gap-4">
                {/* Light Preview */}
                <div className="p-4 rounded-lg bg-white border-2 border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-3 bg-blue-500 rounded"></div>
                    <Sun className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="space-y-2">
                    <div className="w-full h-2 bg-gray-200 rounded"></div>
                    <div className="w-3/4 h-2 bg-gray-200 rounded"></div>
                  </div>
                  <div className="mt-3 text-center">
                    <div className="text-xs font-medium text-gray-800">Light</div>
                  </div>
                </div>
                
                {/* Dark Preview */}
                <div className="p-4 rounded-lg bg-gray-900 border-2 border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-3 bg-blue-400 rounded"></div>
                    <Moon className="w-4 h-4 text-gray-300" />
                  </div>
                  <div className="space-y-2">
                    <div className="w-full h-2 bg-gray-700 rounded"></div>
                    <div className="w-3/4 h-2 bg-gray-700 rounded"></div>
                  </div>
                  <div className="mt-3 text-center">
                    <div className="text-xs font-medium text-gray-200">Dark</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/10 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20">
                  <SettingsIcon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <Label htmlFor="quick-toggle" className="font-medium text-charcoal">
                    Quick Dark Mode Toggle
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Override system preference temporarily
                  </p>
                </div>
              </div>
              <Switch
                id="quick-toggle"
                checked={isDarkMode}
                onCheckedChange={(checked) => {
                  setTheme(checked ? 'dark' : 'light');
                }}
                className="data-[state=checked]:bg-gradient-primary"
              />
            </div>

            {/* Reset Button */}
            <div className="pt-4 border-t border-white/20">
              <Button 
                variant="outline" 
                className="w-full btn-glass"
                onClick={() => {
                  setTheme('system');
                  toast({ 
                    title: '🔄 Settings Reset', 
                    description: 'Theme preferences restored to system default' 
                  });
                }}
              >
                Reset to System Default
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="text-center space-y-2">
              <h4 className="font-medium text-charcoal">About Themes</h4>
              <p className="text-sm text-muted-foreground">
                Your theme preference is saved locally and will be remembered across sessions. 
                System mode automatically adapts to your device's appearance settings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;