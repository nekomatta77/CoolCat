import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserProfile } from '../types';
import { Home, Gamepad2, HelpCircle, Gift, TrendingUp, Trophy, Settings, Phone, ShieldAlert } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================================
// 🛠 НАСТРОЙКИ ПОЗИЦИОНИРОВАНИЯ И РАЗМЕРОВ (САЙДБАР)
// ============================================================================
const SIDEBAR_CONFIG = {
  // Настройки для всего блока кнопок меню
  menu: {
    pc: { x: 0, y: 100 },
    mobile: { x: 0, y: 40 },
  },
  
  // Настройки для картинки логотипа (CoolCat_logo.webp)
  logo: {
    pc: { x: 60, y: 35, scale: 3.6, size: 40 },
    mobile: { x: 0, y: 20, scale: 3, size: 36 },
  },

  // Настройки для надписи "CoolCat"
  text: {
    pc: { x: -35, y: 110, scale: 1.35 },
    mobile: { x: 10, y: 50, scale: 1.2 },
  }
};
// ============================================================================

// Вспомогательный хук для определения устройства (ПК или Телефон)
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

interface SidebarProps {
  user: UserProfile;
  onClose?: () => void;
}

export default function Sidebar({ user, onClose }: SidebarProps) {
  const location = useLocation();
  const isMobile = useIsMobile();

  // Применяем настройки в зависимости от устройства
  const logoCfg = isMobile ? SIDEBAR_CONFIG.logo.mobile : SIDEBAR_CONFIG.logo.pc;
  const textCfg = isMobile ? SIDEBAR_CONFIG.text.mobile : SIDEBAR_CONFIG.text.pc;
  const menuCfg = isMobile ? SIDEBAR_CONFIG.menu.mobile : SIDEBAR_CONFIG.menu.pc;

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
          
          {/* КОНТЕЙНЕР ЛОГОТИПА С НАСТРОЙКАМИ */}
          <div 
            className="flex items-center justify-center group-hover:scale-110 transition-transform origin-center"
            style={{ 
              width: `${logoCfg.size}px`, 
              height: `${logoCfg.size}px`,
              transform: `translate(${logoCfg.x}px, ${logoCfg.y}px) scale(${logoCfg.scale})`
            }}
          >
            <img 
              src="/assets/CoolCat_logo.webp" 
              alt="CoolCat Logo" 
              className="w-full h-full object-contain drop-shadow-lg" 
            />
          </div>

          {/* КОНТЕЙНЕР ТЕКСТА С НАСТРОЙКАМИ */}
          <span 
            className="text-2xl font-black text-slate-900 tracking-tighter origin-left block"
            style={{
              transform: `translate(${textCfg.x}px, ${textCfg.y}px) scale(${textCfg.scale})`
            }}
          >
            CoolCat
          </span>

        </Link>
      </div>

      {/* НАВИГАЦИЯ С НАСТРОЙКОЙ СДВИГА */}
      <nav 
        className="flex-1 px-4 space-y-1"
        style={{
          transform: `translate(${menuCfg.x}px, ${menuCfg.y}px)`
        }}
      >
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