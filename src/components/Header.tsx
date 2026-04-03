import { Link } from 'react-router-dom';
import { UserProfile } from '../types';
import { Wallet, LogOut, Menu } from 'lucide-react';
import { cn, useIsMobile } from '../lib/utils';

// ============================================================================
// 🛠 НАСТРОЙКИ ПОЗИЦИОНИРОВАНИЯ И РАЗМЕРОВ (АВАТАРКА В ШАПКЕ)
// ============================================================================
const HEADER_AVATAR_CONFIG = {
  pc: { size: 80, x: 0, y: 0, scale: 1 },
  mobile: { size: 60, x: 0, y: 0, scale: 1 }
};
// ============================================================================

interface HeaderProps {
  user: UserProfile;
  onLogout: () => void;
  onMenuClick?: () => void;
}

export default function Header({ user, onLogout, onMenuClick }: HeaderProps) {
  const isMobile = useIsMobile();
  const avatarCfg = isMobile ? HEADER_AVATAR_CONFIG.mobile : HEADER_AVATAR_CONFIG.pc;

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
        >
          <Menu className="w-6 h-6" />
        </button>
        
        <div className="bg-slate-50 px-4 py-2 rounded-2xl flex items-center gap-2 border border-slate-100 shadow-sm">
          <Wallet className="w-5 h-5 text-brand-600" />
          <span className="font-bold text-slate-900 tracking-tight">
            {user.balance.toLocaleString('ru-RU')} <span className="text-slate-400 text-sm">CAT</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        <Link to="/profile" className="flex items-center gap-3 hover:bg-slate-50 p-1 pr-4 rounded-2xl transition-all group">
          
          {/* КОНТЕЙНЕР АВАТАРКИ: Добавлены динамические backgroundColor и borderColor */}
          <div 
            className="rounded-xl overflow-hidden border-2 transition-all flex items-center justify-center group-hover:opacity-80"
            style={{ 
              width: `${avatarCfg.size}px`, 
              height: `${avatarCfg.size}px`,
              backgroundColor: user.cardStyle.background,
              borderColor: user.cardStyle.border
            }}
          >
            <img 
              src={user.avatar} 
              alt={user.nickname} 
              className="object-cover transition-transform duration-300" 
              style={{
                width: '100%',
                height: '100%',
                transform: `translate(${avatarCfg.x}px, ${avatarCfg.y}px) scale(${avatarCfg.scale})`
              }}
            />
          </div>

          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-800 leading-none mb-1">{user.nickname}</p>
            <p className="text-[10px] uppercase tracking-widest font-black text-brand-400 leading-none">
              {user.rank} • LVL {user.level}
            </p>
          </div>
        </Link>
        <button
          onClick={onLogout}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
          title="Выйти"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}