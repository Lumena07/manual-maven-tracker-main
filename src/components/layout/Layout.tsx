
import { Header } from './Header';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export function Layout({ children, className, fullWidth = false }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main 
        className={cn(
          "flex-1 pt-20 pb-16",
          fullWidth ? "w-full" : "container mx-auto px-4",
          className
        )}
      >
        {children}
      </main>
      
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} ManualTrack. All rights reserved.
            </p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <span className="text-sm text-gray-500 hover:text-gray-800 transition-colors">Terms</span>
              <span className="text-sm text-gray-500 hover:text-gray-800 transition-colors">Privacy</span>
              <span className="text-sm text-gray-500 hover:text-gray-800 transition-colors">Help</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
