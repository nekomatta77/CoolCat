import { Link } from 'react-router-dom';
import { UserProfile } from '../types';
import { Wallet, LogOut, Menu, Plus, Minus } from 'lucide-react';
import { useIsMobile } from '../lib/utils';

// ============================================================================
// 🛠 НАСТРОЙКИ ПОЗИЦИОНИРОВАНИЯ И РАЗМЕРОВ (АВАТАРКА В ШАПКЕ)
// ============================================================================
const HEADER_AVATAR_CONFIG = {
  pc: { size: 80, x: 0, y: 0, scale: 1 },
  mobile: { size: 60, x: 0, y: 0, scale: 1 }
};
// ============================================================================

// Функция для форматирования баланса
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
  onDepositClick?: () => void;
  onWithdrawClick?: () => void;
}

export default function Header({ user, onLogout, onMenuClick, onDepositClick, onWithdrawClick }: HeaderProps) {
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
        
        {/* НОВЫЙ ЭСТЕТИЧНЫЙ БЛОК БАЛАНСА (ДЛЯ МОБИЛОК) */}
        <div className="lg:hidden flex items-center bg-white border border-slate-200 shadow-sm rounded-2xl p-1 pl-1.5 gap-2.5 max-w-[180px] sm:max-w-[220px]">
          <div className="bg-brand-50 rounded-xl w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-brand-600" />
          </div>
          <div className="flex flex-col justify-center min-w-0 pr-2">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Баланс</span>
            <span className="font-black text-slate-900 text-sm sm:text-base tracking-tight leading-none truncate block">
              {formatBalance(user.balance)} <span className="text-brand-500 text-[10px] sm:text-xs ml-0.5">CAT</span>
            </span>
          </div>
        </div>

        {/* БОЛЬШОЙ БЛОК БАЛАНСА С КНОПКАМИ (ДЛЯ ПК) */}
        <div className="hidden lg:flex items-center bg-white border border-slate-200 shadow-sm rounded-[1.2rem] p-1.5 pl-2 gap-3 group hover:shadow-md transition-all cursor-default">
          <div className="bg-brand-50 rounded-[0.9rem] p-2 flex items-center justify-center shrink-0">
             <Wallet className="w-6 h-6 text-brand-600" />
          </div>
          <div className="flex flex-col justify-center min-w-[100px]">
             <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Баланс котика</span>
             <span className="font-black text-slate-900 text-lg tracking-tight leading-none whitespace-nowrap">
               {formatBalance(user.balance)} <span className="text-brand-500 text-sm ml-0.5">CAT</span>
             </span>
          </div>
          {/* Кнопки Депозита и Вывода */}
          <div className="flex items-center gap-1.5 border-l border-slate-100 pl-3 pr-1">
             <button 
               onClick={onDepositClick} 
               className="w-8 h-8 bg-brand-500 hover:bg-brand-600 text-white rounded-xl flex items-center justify-center transition-all shadow-md shadow-brand-200 active:scale-95" 
               title="Пополнить"
             >
               <Plus className="w-5 h-5" />
             </button>
             <button 
               onClick={onWithdrawClick} 
               className="w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center transition-all active:scale-95" 
               title="Вывести"
             >
               <Minus className="w-4 h-4 stroke-[3]" />
             </button>
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
              {user.rank} • LVL {user.level || 0}
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