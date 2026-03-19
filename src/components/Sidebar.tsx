import { Link, useLocation } from 'react-router-dom';
import { UserProfile } from '../types';
import { Home, Gamepad2, HelpCircle, Gift, TrendingUp, Trophy, Settings, Phone, ShieldAlert } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  user: UserProfile;
  onClose?: () => void;
}

export default function Sidebar({ user, onClose }: SidebarProps) {
  const location = useLocation();

  const menuItems = [
    { icon: Home, label: 'Главная', path: '/' },
    { icon: HelpCircle, label: 'FAQ', path: '/faq' },
    { icon: Gift, label: 'Бонусы', path: '/bonuses' },
    { icon: TrendingUp, label: 'Lvl Котика', path: '/level' },
    { icon: Trophy, label: 'Достижения', path: '/achievements' },
    { icon: Settings, label: 'Настройки', path: '/profile' },
    { icon: Phone, label: 'Контакты', path: '/contacts' },
  ];

  if (user.rank === 'admin') {
    menuItems.push({ icon: ShieldAlert, label: 'Админка', path: '/admin' });
  }

  return (
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col sticky top-0 h-screen z-50">
      <div className="p-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group" onClick={onClose}>
          <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-200 group-hover:scale-110 transition-transform">
            <span className="text-white font-black text-2xl">C</span>
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tighter">CoolCat</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all font-bold text-sm group",
                isActive
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-100"
                  : "text-slate-400 hover:bg-slate-50 hover:text-brand-600"
              )}
            >
              <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-white" : "text-slate-400 group-hover:text-brand-600")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-6">
        <div className="bg-slate-50 rounded-3xl p-4 border border-slate-100 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-brand-200/30 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Ваш Ранг</p>
          <p className="text-lg font-black text-slate-900 leading-none mb-1 capitalize">{user.rank}</p>
          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-brand-500 h-full rounded-full transition-all duration-1000"
              style={{ width: `${(user.xp / (user.level * 1000)) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
