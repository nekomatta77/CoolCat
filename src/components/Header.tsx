import { Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { Wallet, Menu, Plus, Minus, Bell, User } from 'lucide-react';
import { useIsMobile, cn } from '../lib/utils'; 
import { FRAMES } from '../lib/customization';
import { motion, AnimatePresence } from 'motion/react';

const HEADER_AVATAR_CONFIG = {
  pc: { size: 80, x: 0, y: 0, scale: 1 },
  mobile: { size: 60, x: 0, y: 0, scale: 1 }
};

const formatBalance = (val: number) => {
  const truncated = Math.floor(val * 100) / 100;
  const isInteger = truncated === Math.floor(truncated);
  const fixed = isInteger ? truncated.toString() : truncated.toFixed(2);
  const parts = fixed.split('.');
  const formattedInt = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return parts.length > 1 ? `${formattedInt}.${parts[1]}` : formattedInt;
};

interface HeaderProps {
  user: UserProfile | null;
  onLogout?: () => void;
  onMenuClick?: () => void;
  onDepositClick?: () => void;
  onWithdrawClick?: () => void;
  onLogin?: () => void;
  onRegister?: () => void;
}

export default function Header({ user, onMenuClick, onDepositClick, onWithdrawClick, onLogin, onRegister }: HeaderProps) {
  const isMobile = useIsMobile();
  const avatarCfg = isMobile ? HEADER_AVATAR_CONFIG.mobile : HEADER_AVATAR_CONFIG.pc;
  
  const activeFrameObj = user 
    ? FRAMES.find(f => f.id === (user.equippedFrame || 'none')) || FRAMES[0]
    : FRAMES[0];

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [localRead, setLocalRead] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const defaultNotifs = [{
    id: 'welcome',
    title: 'Успешная регистрация',
    message: 'Добро пожаловать в CoolCat! Получите свой первый бонус в разделе "Бонусы".',
    type: 'system',
    read: false,
    createdAt: new Date().toISOString()
  }];
  
  const notifications = user?.notifications && user.notifications.length > 0 ? user.notifications : defaultNotifs;
  const unreadCount = localRead ? 0 : notifications.filter(n => !n.read).length;

  const handleBellClick = async () => {
    const newState = !isNotifOpen;
    setIsNotifOpen(newState);
    
    if (newState && unreadCount > 0 && user) {
      setLocalRead(true);
      try {
        const updatedNotifs = notifications.map(n => ({ ...n, read: true }));
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { notifications: updatedNotifs });
      } catch (err) {
        console.error("Ошибка при обновлении статуса уведомлений:", err);
      }
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-3 sm:px-4 lg:px-8 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-50">
      
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-1.5 sm:p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all shrink-0"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        
        {user && (
          <>
            <div className="lg:hidden flex items-center bg-slate-50 border border-slate-100 rounded-2xl p-1 pl-1.5 gap-2.5 max-w-[180px] sm:max-w-[220px]">
              <div className="bg-white shadow-sm rounded-xl w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-brand-600" />
              </div>
              <div className="flex flex-col justify-center min-w-0 pr-2">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Баланс</span>
                <span className="font-black text-slate-800 text-sm sm:text-base tracking-tight leading-none truncate block">
                  {formatBalance(user.balance)} <span className="text-brand-500 text-[10px] sm:text-xs ml-0.5">CAT</span>
                </span>
              </div>
            </div>

            <div className="hidden lg:flex items-center bg-slate-50 border border-slate-100 rounded-[1.2rem] p-1.5 pl-2 gap-3 group hover:bg-white hover:shadow-sm transition-all cursor-default">
              <div className="bg-white shadow-sm rounded-[0.9rem] p-2 flex items-center justify-center shrink-0">
                 <Wallet className="w-6 h-6 text-brand-600" />
              </div>
              <div className="flex flex-col justify-center min-w-[100px]">
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Баланс котика</span>
                 <span className="font-black text-slate-800 text-lg tracking-tight leading-none whitespace-nowrap">
                   {formatBalance(user.balance)} <span className="text-brand-500 text-sm ml-0.5">CAT</span>
                 </span>
              </div>
              <div className="flex items-center gap-1.5 border-l border-slate-200/60 pl-3 pr-1">
                 <button onClick={onDepositClick} className="w-8 h-8 bg-brand-500 hover:bg-brand-600 text-white rounded-xl flex items-center justify-center transition-all shadow-md shadow-brand-200 active:scale-95" title="Пополнить">
                   <Plus className="w-5 h-5" />
                 </button>
                 <button onClick={onWithdrawClick} className="w-8 h-8 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-sm" title="Вывести">
                   <Minus className="w-4 h-4 stroke-[3]" />
                 </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 lg:gap-4 shrink-0">
        
        {!user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={onLogin} 
              className="px-3 py-2 sm:px-4 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-500 hover:text-brand-600 transition-colors"
            >
              Войти
            </button>
            <button 
              onClick={onRegister} 
              className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-brand-200 flex items-center gap-2"
            >
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Регистрация</span>
            </button>
          </div>
        ) : (
          <>
            {/* АВАТАРКА ПРОФИЛЯ (ТЕПЕРЬ СЛЕВА ОТ КОЛОКОЛЬЧИКА) */}
            <Link to="/profile" className="flex items-center gap-2 sm:gap-3 hover:bg-slate-50 p-1 sm:pr-4 rounded-xl sm:rounded-2xl transition-all group">
              <div className="relative shrink-0 flex items-center justify-center" style={{ width: `${avatarCfg.size}px`, height: `${avatarCfg.size}px` }}>
                <div className={cn("absolute inset-0 rounded-lg sm:rounded-xl overflow-hidden border-2 transition-all flex items-center justify-center group-hover:opacity-80", activeFrameObj.css)} style={{ backgroundColor: user.cardStyle.background, borderColor: activeFrameObj.id === 'none' ? user.cardStyle.border : undefined }}>
                  <img src={user.avatar} alt={user.nickname} className="object-cover w-full h-full" />
                </div>
                {activeFrameObj.img && (
                  <img src={activeFrameObj.img} className="absolute w-[125%] h-[125%] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain pointer-events-none z-10 drop-shadow-md" alt="frame" />
                )}
              </div>
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-slate-800 leading-none mb-1">{user.nickname}</p>
                <p className="text-[10px] uppercase tracking-widest font-black text-brand-400 leading-none">{user.rank} • LVL {user.level || 0}</p>
              </div>
            </Link>

            {/* КОЛОКОЛЬЧИК УВЕДОМЛЕНИЙ (ТЕПЕРЬ СПРАВА) */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={handleBellClick}
                className={cn("p-2 sm:p-2.5 rounded-xl sm:rounded-2xl transition-all relative flex items-center justify-center", isNotifOpen ? "bg-brand-50 text-brand-600" : "text-slate-400 hover:text-brand-600 hover:bg-brand-50")}
              >
                <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotifOpen && (
                   <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute top-full right-0 mt-2 w-[300px] sm:w-[350px] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 origin-top-right">
                     <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <span className="text-sm font-black text-slate-900">Уведомления</span>
                        {unreadCount > 0 && <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">{unreadCount} новых</span>}
                     </div>
                     <div className="max-h-80 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 flex flex-col items-center justify-center text-center">
                            <Bell className="w-8 h-8 text-slate-200 mb-2" />
                            <span className="text-xs font-bold text-slate-400">Уведомлений пока нет</span>
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div key={n.id} className={cn("px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3", (!n.read && !localRead) && "bg-brand-50/30")}>
                              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0 mt-0.5">
                                <Bell className="w-4 h-4 text-brand-600" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                 <span className="text-xs font-black text-slate-900 truncate">{n.title}</span>
                                 <span className="text-[10px] font-medium text-slate-500 line-clamp-2 mt-0.5 leading-snug">{n.message}</span>
                                 <span className="text-[9px] font-bold text-slate-300 mt-1">{new Date(n.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          ))
                        )}
                     </div>
                   </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

      </div>
    </header>
  );
}