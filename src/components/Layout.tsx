// src/components/Layout.tsx
import { ReactNode, useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Chat from './Chat';
import { UserProfile } from '../types';
import { Home, Gift, User, Plus, MessageCircle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import DepositModal from './DepositModal';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: ReactNode;
  user: UserProfile | null;
  onLogout: () => void;
  onLogin?: () => void;
  onRegister?: () => void;
}

export default function Layout({ children, user, onLogout, onLogin, onRegister }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [modalType, setModalType] = useState<'deposit' | 'withdraw' | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const mobileNavLeft = [
    { icon: Home, path: '/' },
    { icon: Gift, path: '/bonuses' },
  ];
  
  const handleChatClick = () => {
    if (!user && onLogin) return onLogin();
    setIsChatOpen(true);
  };

  const handleProfileClick = () => {
    if (!user && onLogin) return onLogin();
    navigate('/profile');
  };

  const handleDepositClick = () => {
    if (!user && onLogin) return onLogin();
    setModalType('deposit');
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar user={user} />
      </div>

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-60 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 w-64 bg-white z-70 transform transition-transform duration-300 ease-in-out lg:hidden",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar user={user} onClose={() => setIsSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0 relative">
        <Header 
          user={user} 
          onLogout={onLogout} 
          onMenuClick={() => setIsSidebarOpen(true)}
          onDepositClick={handleDepositClick}
          onWithdrawClick={() => setModalType('withdraw')}
          onLogin={onLogin}
          onRegister={onRegister}
        />
        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 px-6 py-2 flex items-center justify-between lg:hidden z-50">
        {mobileNavLeft.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className={cn("p-2 rounded-xl transition-all", isActive ? "bg-brand-50 text-brand-600" : "text-slate-400")}>
              <item.icon className="w-6 h-6" />
            </Link>
          );
        })}

        <div className="relative -mt-8 flex justify-center">
          <div className="absolute inset-0 bg-brand-500 rounded-full blur-xl opacity-40" />
          <button 
            onClick={handleDepositClick}
            className="relative bg-linear-to-tr from-brand-600 to-brand-400 text-white p-4 rounded-full border-[6px] border-slate-50 shadow-lg transform transition-all active:scale-95 hover:-translate-y-1"
          >
            <Plus className="w-6 h-6 stroke-3" />
          </button>
        </div>

        <button onClick={handleChatClick} className={cn("p-2 rounded-xl transition-all", isChatOpen ? "bg-brand-50 text-brand-600" : "text-slate-400")}>
          <MessageCircle className="w-6 h-6" />
        </button>
        <button onClick={handleProfileClick} className={cn("p-2 rounded-xl transition-all", location.pathname === '/profile' ? "bg-brand-50 text-brand-600" : "text-slate-400")}>
          <User className="w-6 h-6" />
        </button>
      </nav>

      {user && <DepositModal isOpen={modalType !== null} initialTab={modalType || 'deposit'} onClose={() => setModalType(null)} user={user} />}
      {user && <Chat user={user} isOpen={isChatOpen} setIsOpen={setIsChatOpen} />}

    </div>
  );
}