import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Building2, 
  Users, 
  Car, 
  CreditCard, 
  Shield, 
  BarChart3,
  ArrowRight,
  CheckCircle,
  Receipt
} from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-society.jpg";

const Home = () => {
  const features = [
    {
      icon: Building2,
      title: "House Management",
      description: "Track all houses, residents, and property details in one place"
    },
    {
      icon: Users,
      title: "Member Directory",
      description: "Maintain comprehensive member profiles and contact information"
    },
    {
      icon: Car,
      title: "Vehicle Registration",
      description: "Manage all two-wheelers and four-wheelers with easy tracking"
    },
    {
      icon: CreditCard,
      title: "Maintenance Collection",
      description: "Transparent payment tracking with automated reminders"
    },
    {
      icon: Receipt,
      title: "Expense Management",
      description: "Track society expenses and maintain financial transparency"
    },
    {
      icon: BarChart3,
      title: "Detailed Reports",
      description: "Generate comprehensive reports and financial summaries"
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Your community data is safe with enterprise-grade security"
    }
  ];

  const stats = [
    { value: "500+", label: "Houses Managed" },
    { value: "1,200+", label: "Residents" },
    { value: "98%", label: "Collection Rate" },
    { value: "24/7", label: "Support" }
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-up">
              <h1 className="text-5xl lg:text-6xl font-serif font-bold text-charcoal mb-6 leading-tight">
                Simple & Transparent
                <span className="text-gradient block">Maintenance</span>
                for Our Community
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Streamline your society management with our premium platform. 
                From maintenance collection to member management, everything you need in one elegant solution.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/dashboard">
                  <Button className="btn-premium text-charcoal">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button variant="outline" className="btn-glass">
                  View Demo
                </Button>
              </div>
            </div>
            
            <div className="relative animate-float">
              <div className="glass-card p-8 hover-lift">
                <img 
                  src={heroImage} 
                  alt="Premium Society Management" 
                  className="w-full h-80 object-cover rounded-xl shadow-soft"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-serif font-bold text-charcoal mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-bold text-charcoal mb-4">
              Everything You Need for
              <span className="text-gradient"> Society Management</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive features designed specifically for modern residential communities
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="glass-card p-8 hover-lift group">
                <div className="p-3 rounded-xl bg-gradient-primary w-fit mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-charcoal" />
                </div>
                <h3 className="text-xl font-semibold text-charcoal mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-charcoal relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary opacity-10"></div>
        <div className="container mx-auto px-6 relative">
          <div className="text-center">
            <h2 className="text-4xl font-serif font-bold text-white mb-6">
              Ready to Transform Your Society Management?
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Join hundreds of societies already using our platform for seamless community management
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/dashboard">
                <Button className="btn-glass">
                  Start Free Trial
                </Button>
              </Link>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 btn-premium text-charcoal">
                Schedule Demo
              </Button>
            </div>
            
            <div className="flex items-center justify-center mt-8 space-x-6 text-white/60">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-sage-green" />
                No Setup Fees
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-sage-green" />
                24/7 Support
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-sage-green" />
                Easy Migration
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;