import { ReactNode, useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { UserProfile } from '../types';
import { Home, Gamepad2, Gift, TrendingUp, Trophy, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: ReactNode;
  user: UserProfile;
  onLogout: () => void;
}

export default function Layout({ children, user, onLogout }: LayoutProps) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const mobileNavItems = [
    { icon: Home, path: '/' },
    { icon: Gift, path: '/bonuses' },
    { icon: TrendingUp, path: '/level' },
    { icon: Trophy, path: '/achievements' },
    { icon: User, path: '/profile' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar user={user} />
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 w-64 bg-white z-[70] transform transition-transform duration-300 ease-in-out lg:hidden",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar user={user} onClose={() => setIsSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        <Header 
          user={user} 
          onLogout={onLogout} 
          onMenuClick={() => setIsSidebarOpen(true)} 
        />
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-6 py-3 flex items-center justify-between lg:hidden z-50">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "p-2 rounded-xl transition-all",
                isActive ? "bg-brand-500 text-white shadow-lg shadow-brand-200" : "text-slate-400"
              )}
            >
              <item.icon className="w-6 h-6" />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
