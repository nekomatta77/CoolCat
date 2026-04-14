import { ReactNode, useState, useEffect, useRef } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Chat from './Chat';
import { UserProfile } from '../types';
import { Home, Gift, User, Plus, MessageCircle, Trophy, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import DepositModal from './DepositModal';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

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
  const [modalType, setModalType] = useState<'deposit' | 'withdraw' | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Состояние для нашей "таблички-оповещалки"
  const [winNotification, setWinNotification] = useState<{ payout: number, mult: number, game: string } | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Создаем Ref для location, чтобы не перезапускать useEffect при смене страниц
  const locationRef = useRef(location.pathname);
  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  // ГЛОБАЛЬНЫЙ СЛУШАТЕЛЬ ВЫИГРЫШЕЙ (Запускается 1 раз при входе)
  useEffect(() => {
    if (!user?.uid) return;

    // Запоминаем время монтирования приложения. Слушаем только то, что произошло ПОСЛЕ
    const mountTime = new Date().toISOString();

    console.log("🚀 Слушатель выигрышей запущен для:", user.uid);

    const q = query(
      collection(db, 'gameSessions'),
      where('userId', '==', user.uid),
      where('timestamp', '>', mountTime)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          
          console.log("🔥 ПОЙМАНА НОВАЯ ИГРОВАЯ СЕССИЯ:", data);

          // Показываем, только если выигрыш > 0 и мы НЕ на странице самой игры WheelX
          if (data.payout > 0 && locationRef.current !== '/wheelx') {
            setWinNotification({
              payout: data.payout,
              mult: data.multiplier || 0,
              game: data.gameType || 'WheelX'
            });

            // Автоматически скрываем через 7 секунд
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => setWinNotification(null), 7000);
          }
        }
      });
    }, (error) => {
      // ❗️ ЕСЛИ ТАБЛИЧКА НЕ ПОЯВЛЯЕТСЯ - ОШИБКА БУДЕТ ЗДЕСЬ ❗️
      console.error("❌ ОШИБКА СЛУШАТЕЛЯ FIRESTORE (Возможно нужен индекс):", error);
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user?.uid]);

  const mobileNavLeft = [
    { icon: Home, path: '/' },
    { icon: Gift, path: '/bonuses' },
  ];
  
  const mobileNavRight = [
    { icon: MessageCircle, isButton: true, onClick: () => setIsChatOpen(true), id: 'chat' },
    { icon: User, path: '/profile', id: 'profile' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* 🌟 МАКСИМАЛЬНО ЗАМЕТНАЯ ТАБЛИЧКА-ОПОВЕЩАЛКА */}
      <AnimatePresence>
        {winNotification && (
          <motion.div
            initial={{ y: -150, opacity: 0, scale: 0.8 }}
            animate={{ y: 24, opacity: 1, scale: 1 }}
            exit={{ y: -150, opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
            transition={{ type: 'spring', damping: 14, stiffness: 200 }}
            className="fixed top-2 right-4 left-4 sm:left-auto sm:right-8 z-[99999] w-auto sm:w-[400px] bg-slate-900 rounded-3xl shadow-[0_30px_60px_-15px_rgba(16,185,129,0.5)] border-2 border-emerald-500 p-1.5 flex items-center gap-3 overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => setWinNotification(null)}
          >
            {/* Яркие эффекты свечения на фоне */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500 rounded-full blur-[50px] -mr-16 -mt-16 opacity-30 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-500 rounded-full blur-[40px] -ml-10 -mb-10 opacity-20 pointer-events-none" />
            
            <div className="relative w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/50 shrink-0 border border-emerald-300 ml-2">
              <Trophy className="w-8 h-8 text-white drop-shadow-md animate-bounce" style={{ animationDuration: '2s' }} />
            </div>

            <div className="flex-1 relative py-2 px-1">
              <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400 mb-0.5">Успешный улов!</h4>
              <p className="text-base sm:text-lg font-black text-white leading-none">
                Выиграл <span className="text-emerald-400">+{winNotification.payout.toFixed(0)}</span> CAT
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                 <span className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    {winNotification.game === 'wheelx' ? 'WheelX' : winNotification.game}
                 </span>
                 <span className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                    {winNotification.mult}X
                 </span>
              </div>
            </div>

            <button 
              className="relative p-3 text-slate-400 hover:text-white transition-colors mr-1"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar user={user} />
      </div>

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 w-64 bg-white z-[70] transform transition-transform duration-300 ease-in-out lg:hidden",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar user={user} onClose={() => setIsSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0 relative">
        <Header 
          user={user} 
          onLogout={onLogout} 
          onMenuClick={() => setIsSidebarOpen(true)}
          onDepositClick={() => setModalType('deposit')}
          onWithdrawClick={() => setModalType('withdraw')}
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
            onClick={() => setModalType('deposit')}
            className="relative bg-gradient-to-tr from-brand-600 to-brand-400 text-white p-4 rounded-full border-[6px] border-slate-50 shadow-lg transform transition-all active:scale-95 hover:-translate-y-1"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {mobileNavRight.map((item) => {
          if (item.isButton) {
            return (
              <button key={item.id} onClick={item.onClick} className={cn("p-2 rounded-xl transition-all", isChatOpen ? "bg-brand-50 text-brand-600" : "text-slate-400")}>
                <item.icon className="w-6 h-6" />
              </button>
            );
          }
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.id} to={item.path!} className={cn("p-2 rounded-xl transition-all", isActive ? "bg-brand-50 text-brand-600" : "text-slate-400")}>
              <item.icon className="w-6 h-6" />
            </Link>
          );
        })}
      </nav>

      <DepositModal 
        isOpen={modalType !== null} 
        type={modalType || 'deposit'}
        onClose={() => setModalType(null)} 
      />

      <Chat user={user} isOpen={isChatOpen} setIsOpen={setIsChatOpen} />

    </div>
  );
}