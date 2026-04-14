import { ReactNode, useState, useEffect, useRef } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Chat from './Chat';
import { UserProfile } from '../types';
import { Home, Gift, User, Plus, MessageCircle, Trophy, X, Coins } from 'lucide-react';
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

  // Состояние уведомления о выигрыше
  const [winNotification, setWinNotification] = useState<{ game: string, payout: number, mult: number } | null>(null);
  
  const initialLoadRef = useRef(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Слушаем новые выигрыши в реальном времени
  useEffect(() => {
    if (!user?.uid) return;

    // Первичный мягкий запрос на пуш-уведомления (дополнительно дублируется при ставке)
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    // Запрос на последнюю игровую сессию пользователя
    const q = query(
      collection(db, 'gameSessions'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Пропускаем старые записи при первой загрузке страницы
      if (initialLoadRef.current) {
        initialLoadRef.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();

          // Показываем уведомление только для выигрышей (payout > 0)
          if (data.payout > 0) {
            
            // 1. СИСТЕМНОЕ УВЕДОМЛЕНИЕ (если вкладка браузера скрыта/свернута)
            if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
              const notif = new Notification(`🎉 Крутой Кот: Выигрыш!`, {
                body: `Сумма: ${data.payout.toFixed(0)} CAT\nМножитель: ${data.multiplier}X`,
                icon: '/assets/CoolCat_trophey.webp'
              });
              
              // При клике на пуш - перекидываем обратно на вкладку
              notif.onclick = () => {
                window.focus();
                notif.close();
              };
            }

            // 2. ВНУТРИИГРОВОЕ УВЕДОМЛЕНИЕ (если мы НЕ на странице самой игры)
            if (location.pathname !== '/wheelx') {
              setWinNotification({
                game: data.gameType,
                payout: data.payout,
                mult: data.multiplier
              });

              if (timerRef.current) clearTimeout(timerRef.current);
              timerRef.current = setTimeout(() => setWinNotification(null), 6000);
            }
          }
        }
      });
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user?.uid, location.pathname]);

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
      
      {/* КРАСИВОЕ УВЕДОМЛЕНИЕ О ВЫИГРЫШЕ (TOP CENTER) */}
      <AnimatePresence>
        {winNotification && (
          <motion.div
            initial={{ y: -150, x: '-50%', opacity: 0, scale: 0.9 }}
            animate={{ y: 24, x: '-50%', opacity: 1, scale: 1 }}
            exit={{ y: -150, x: '-50%', opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className="fixed top-0 left-1/2 z-[9999] w-[92%] sm:w-[400px] bg-white rounded-2xl shadow-[0_20px_60px_rgba(16,185,129,0.2)] border-2 border-emerald-400 p-3 sm:p-4 flex items-center gap-3 sm:gap-4 overflow-hidden"
          >
            {/* Декоративные свечения на фоне уведомления */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full blur-2xl -mr-16 -mt-16 opacity-60 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-brand-100 rounded-full blur-xl -ml-10 -mb-10 opacity-50 pointer-events-none" />
            
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-tr from-emerald-500 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-300/50 shrink-0 border border-emerald-300">
              <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-sm" />
            </div>

            <div className="flex-1 relative z-10">
              <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] text-emerald-500 mb-0.5 drop-shadow-sm">Успешный улов!</h4>
              <p className="text-sm sm:text-base font-black text-slate-800 leading-tight">
                Выигрыш WheelX <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md ml-1">{winNotification.payout.toFixed(0)} CAT</span>
              </p>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-1">Множитель: <span className="text-slate-600">{winNotification.mult}X</span></p>
            </div>

            <button 
              onClick={() => setWinNotification(null)}
              className="relative z-10 p-2 sm:p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
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