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

// Функция для форматирования баланса (отсекаем тысячные и убираем .00)
const formatBalance = (val: number) => {
  const truncated = Math.floor(val * 100) / 100;
  const isInteger = truncated === Math.floor(truncated);
  const fixed = isInteger ? truncated.toString() : truncated.toFixed(2);
  const parts = fixed.split('.');
  const formattedInt = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return parts.length > 1 ? `${formattedInt}.${parts[1]}` : formattedInt;
};

interface HeaderProps {
  user: UserProfile;
  onLogout: () => void;
  onMenuClick?: () => void;
}

export default function Header({ user, onLogout, onMenuClick }: HeaderProps) {
  const isMobile = useIsMobile();
  const avatarCfg = isMobile ? HEADER_AVATAR_CONFIG.mobile : HEADER_AVATAR_CONFIG.pc;

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-3 sm:px-4 lg:px-8 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-50">
      
      {/* Левая часть: Меню и Баланс */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-1.5 sm:p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all shrink-0"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        
        {/* Адаптированный блок баланса (ДЛЯ МОБИЛОК) */}
        <div className="lg:hidden bg-slate-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 border border-slate-100 shadow-sm min-w-0 max-w-[200px] sm:max-w-none">
          <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600 shrink-0" />
          <span className="font-bold text-slate-900 tracking-tight text-sm sm:text-base whitespace-nowrap overflow-hidden text-ellipsis">
            {formatBalance(user.balance)} <span className="text-slate-400 text-xs sm:text-sm ml-0.5">CAT</span>
          </span>
        </div>

        {/* НОВЫЙ БОЛЬШОЙ БЛОК БАЛАНСА (ДЛЯ ПК) */}
        <div className="hidden lg:flex items-center bg-white border border-slate-200 shadow-sm rounded-[1.2rem] p-1.5 pr-6 gap-4 group hover:shadow-md transition-all cursor-default">
          <div className="bg-brand-50 rounded-[0.9rem] p-2.5 flex items-center justify-center">
             <Wallet className="w-6 h-6 text-brand-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex flex-col justify-center">
             <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Ваш баланс</span>
             <span className="font-black text-slate-900 text-xl tracking-tight leading-none whitespace-nowrap">
               {formatBalance(user.balance)} <span className="text-brand-500 text-base ml-1">CAT</span>
             </span>
          </div>
        </div>
      </div>

      {/* Правая часть: Профиль и Выход */}
      <div className="flex items-center gap-2 lg:gap-4 shrink-0">
        <Link to="/profile" className="flex items-center gap-2 sm:gap-3 hover:bg-slate-50 p-1 sm:pr-4 rounded-xl sm:rounded-2xl transition-all group">
          
          {/* КОНТЕЙНЕР АВАТАРКИ */}
          <div 
            className="rounded-lg sm:rounded-xl overflow-hidden border-2 transition-all flex items-center justify-center group-hover:opacity-80 shrink-0"
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

          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-slate-800 leading-none mb-1">{user.nickname}</p>
            <p className="text-[10px] uppercase tracking-widest font-black text-brand-400 leading-none">
              {user.rank} • LVL {user.level}
            </p>
          </div>
        </Link>
        <button
          onClick={onLogout}
          className="p-1.5 sm:p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0"
          title="Выйти"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}