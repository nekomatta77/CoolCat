// src/components/Layout.tsx
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
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
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

  // Глобальное уведомление о победе
  const [winNotification, setWinNotification] = useState<{ game: string, payout: number, mult: number } | null>(null);
  
  // Рефы для контроля состояния без вызова лишних ререндеров
  const locationRef = useRef(location.pathname);
  const initialLoadRef = useRef(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Синхронизируем locationRef с текущим путем
  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  // Слушатель новых выигрышей в реальном времени
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'gameSessions'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Игнорируем первую загрузку, чтобы не показывать старые победы при входе на сайт
      if (initialLoadRef.current) {
        initialLoadRef.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const gamePath = `/${data.gameType}`; 

          // Показываем уведомление, только если это победа и мы НЕ находимся на странице этой игры
          if (data.payout > 0 && locationRef.current !== gamePath) {
            setWinNotification({
              game: data.gameType,
              payout: data.payout,
              mult: data.multiplier
            });

            // Очищаем предыдущий таймер, если игрок выиграл дважды подряд очень быстро
            if (timerRef.current) clearTimeout(timerRef.current);
            
            // Автоматически скрываем через 5 секунд
            timerRef.current = setTimeout(() => {
              setWinNotification(null);
            }, 5000);
          }
        }
      });
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

  // Маппинг названий игр для красивого вывода
  const getGameName = (gameId: string) => {
    const names: Record<string, string> = {
      'wheelx': 'WheelX',
      'dice': 'Dice',
      'mines': 'Mines',
      'keno': 'Keno'
    };
    return names[gameId.toLowerCase()] || gameId;
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 relative">
      
      {/* ГЛОБАЛЬНОЕ УВЕДОМЛЕНИЕ О ПОБЕДЕ */}
      <AnimatePresence>
        {winNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-4 md:top-6 left-4 right-4 md:left-auto md:right-6 z-[200] bg-white rounded-2xl md:rounded-3xl shadow-2xl border border-brand-100 p-4 md:p-5 flex items-center gap-4 max-w-md w-auto md:w-96 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-brand-50 to-transparent opacity-50 pointer-events-none" />
            
            <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-tr from-brand-500 to-brand-400 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-brand-200 shrink-0 relative z-10">
              <Trophy className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            
            <div className="flex-1 relative z-10 pr-6">
              <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-brand-500 mb-0.5">Ваша ставка сыграла!</p>
              <p className="text-sm md:text-base font-black text-slate-900 leading-tight">
                Победа в {getGameName(winNotification.game)}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-sm md:text-base font-black text-emerald-500">+{winNotification.payout.toFixed(0)} CAT</span>
                <span className="text-[10px] md:text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">x{winNotification.mult}</span>
              </div>
            </div>

            <button
              onClick={() => setWinNotification(null)}
              className="absolute top-3 right-3 text-slate-300 hover:text-slate-500 hover:bg-slate-50 p-1.5 rounded-lg transition-all z-10"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* BOTTOM NAVIGATION (MOBILE) */}
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

      {/* ЧАТ */}
      <Chat user={user} isOpen={isChatOpen} setIsOpen={setIsChatOpen} />

    </div>
  );
}