
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { ArrowRight, FileText, Users, History, Layers, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // After 100ms, trigger the animations
  useEffect(() => {
    const timer = setTimeout(() => {
      document.querySelectorAll('.animate-on-load').forEach((el, index) => {
        setTimeout(() => {
          el.classList.add('animate-in');
        }, index * 100);
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const features = [
    {
      icon: FileText,
      title: 'Inline Manual Editing',
      description: 'Edit manuals directly with a rich text editor, similar to Google Docs.',
    },
    {
      icon: Layers,
      title: 'Amendment Workflow',
      description: 'Three-step approval process from draft to fully approved amendments.',
    },
    {
      icon: History,
      title: 'Revision Tracking',
      description: 'Comprehensive records of temporary and permanent revisions within the manual.',
    },
    {
      icon: Users,
      title: 'Role-Based Permissions',
      description: 'Different access levels for general users, quality managers, and authorities.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="pt-20 pb-20 md:pt-32 md:pb-32 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-semibold mb-6 animate-on-load opacity-0 tracking-tight">
              Manual Amendment Tracking System
            </h1>
            <p className="text-xl text-gray-600 mb-10 animate-on-load opacity-0 delay-100">
              A modern approach to version control, amendments, and revision tracking for your manuals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-on-load opacity-0 delay-200">
              {user ? (
                <Button 
                  className="px-6 py-6 text-base rounded-md" 
                  onClick={() => navigate('/dashboard')}
                >
                  Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <>
                  <Button 
                    className="px-6 py-6 text-base rounded-md" 
                    onClick={() => navigate('/login')}
                  >
                    Login
                    <LogIn className="ml-2 h-5 w-5" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="px-6 py-6 text-base rounded-md"
                    onClick={() => navigate('/login')}
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Abstract shapes */}
        <div className="absolute top-40 right-[5%] w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"></div>
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float delay-300"></div>
        <div className="absolute bottom-32 right-[15%] w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float delay-700"></div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-semibold text-center mb-12">Key Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <GlassCard
                key={index}
                className="p-8 animate-on-load opacity-0"
                style={{ animationDelay: `${index * 100 + 300}ms` }}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-medium mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-semibold mb-6">Ready to Streamline Your Manual Management?</h2>
            <p className="text-lg text-gray-600 mb-8">
              Join organizations that trust our system for their manual amendment and revision tracking needs.
            </p>
            {user ? (
              <Button 
                size="lg" 
                className="px-8 rounded-md"
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <Button 
                size="lg" 
                className="px-8 rounded-md"
                onClick={() => navigate('/login')}
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Abstract background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white opacity-50"></div>
      </section>
    </div>
  );
};

export default Index;
