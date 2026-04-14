import { useState, useEffect } from 'react';
import { UserProfile, PromoCode } from '../types';
import { doc, updateDoc, getDocs, query, collection, addDoc, deleteDoc, orderBy, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Ticket, Plus, List, Zap, Search, Ban, Trash2, Cat, CheckCircle2, AlertCircle, Copy, X, ShieldAlert, RefreshCw, ArrowRight, RotateCcw, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface AdminProps {
  user: UserProfile;
}

type UserActionType = 'block' | 'unblock' | 'delete' | 'reset_wager' | 'reset_level';

type EditConfirmData = {
  userTarget: UserProfile;
  changes: { field: string; label: string; oldVal: any; newVal: any }[];
};

const LEVEL_REQUIREMENTS = [
  { id: 0, points: 0, minDeposit: 0 },
  { id: 1, points: 0, minDeposit: 100 },
  { id: 2, points: 100, minDeposit: 1000 },
  { id: 3, points: 500, minDeposit: 2500 },
  { id: 4, points: 1500, minDeposit: 5000 },
  { id: 5, points: 3000, minDeposit: 10000 },
  { id: 6, points: 5000, minDeposit: 25000 },
  { id: 7, points: 10000, minDeposit: 50000 },
  { id: 8, points: 25000, minDeposit: 100000 },
  { id: 9, points: 50000, minDeposit: 250000 },
  { id: 10, points: 100000, minDeposit: 500000 },
  { id: 11, points: 250000, minDeposit: 1000000 },
  { id: 12, points: 500000, minDeposit: 2500000 },
  { id: 13, points: 1000000, minDeposit: 5000000 },
  { id: 14, points: 2500000, minDeposit: 10000000 },
  { id: 15, points: 5000000, minDeposit: 25000000 },
];

export default function Admin({ user }: AdminProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'promo' | 'global'>('users');
  const [promoTab, setPromoTab] = useState<'create' | 'list' | 'generator'>('create');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const [userActionModal, setUserActionModal] = useState<{ userTarget: UserProfile, action: UserActionType } | null>(null);
  const [globalActionModal, setGlobalActionModal] = useState<'clear_history' | null>(null);
  const [editingUsers, setEditingUsers] = useState<Record<string, { balance?: number; level?: number; rank?: 'user'|'vip'|'admin' }>>({});
  const [editConfirmModal, setEditConfirmModal] = useState<EditConfirmData | null>(null);
  const [newPromoId, setNewPromoId] = useState<string | null>(null);

  const [promoName, setPromoName] = useState('');
  const [promoAmount, setPromoAmount] = useState(100);
  const [promoActivations, setPromoActivations] = useState(10);
  const [promoWager, setPromoWager] = useState(15);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (activeTab === 'users') {
        const userSnap = await getDocs(collection(db, 'users'));
        setUsers(userSnap.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile)));
      } else if (activeTab === 'promo') {
        const promoSnap = await getDocs(query(collection(db, 'promoCodes'), orderBy('createdAt', 'desc')));
        setPromoCodes(promoSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as PromoCode)));
      }
      setLoading(false);
    };
    fetchData();
  }, [activeTab]);

  const handleUpdateUser = async (uid: string, data: Partial<UserProfile>) => {
    if (!uid) return;
    try {
      await updateDoc(doc(db, 'users', uid), data);
      setUsers(users.map(u => u.uid === uid ? { ...u, ...data } : u));
    } catch (error) {
      console.error('Update user error:', error);
      setNotification({ message: 'Ошибка обновления пользователя', type: 'error' });
    }
  };

  const clearGameHistory = async () => {
    try {
      // 1. Удаляем все сессии игр (gameSessions)
      const sessionsSnap = await getDocs(collection(db, 'gameSessions'));
      const docs = sessionsSnap.docs;
      
      const chunks = [];
      for (let i = 0; i < docs.length; i += 450) {
          chunks.push(docs.slice(i, i + 450));
      }

      for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
      }

      // 2. Сбрасываем визуальную историю колеса (последние множители)
      await setDoc(doc(db, 'live', 'wheelx'), {
          history: [],
          gameState: 'betting',
          timeLeft: 20
      }, { merge: true });

      // 3. Жестко удаляем все зависшие ставки со стола (если бэкенд выключен или глюканул)
      const betsSnap = await getDocs(collection(db, 'live', 'wheelx', 'bets'));
      if (!betsSnap.empty) {
          const betsBatch = writeBatch(db);
          betsSnap.forEach(b => betsBatch.delete(b.ref));
          await betsBatch.commit();
      }

      setNotification({ message: `Очищено: ${docs.length} игр, история колеса и ставки!`, type: 'success' });
    } catch (e) {
      console.error(e);
      setNotification({ message: 'Ошибка при очистке истории', type: 'error' });
    } finally {
      setGlobalActionModal(null);
    }
  };

  const confirmUserAction = async () => {
    if (!userActionModal) return;
    const { userTarget, action } = userActionModal;
    const targetName = userTarget.nickname || 'Без имени';

    if (!userTarget.uid) {
      setNotification({ message: 'Ошибка: Отсутствует UID пользователя', type: 'error' });
      setUserActionModal(null);
      return;
    }

    try {
      if (action === 'block' || action === 'unblock') {
        const isBanning = action === 'block';
        await handleUpdateUser(userTarget.uid, { banned: isBanning });
        setNotification({ message: `Игрок ${targetName} успешно ${isBanning ? 'заблокирован' : 'разблокирован'}!`, type: 'success' });
      } 
      else if (action === 'delete') {
        await setDoc(doc(db, 'deleted_users', userTarget.uid), {
          deletedAt: new Date().toISOString(),
          nickname: targetName
        });
        await deleteDoc(doc(db, 'users', userTarget.uid));
        setUsers(users.filter(u => u.uid !== userTarget.uid));
        setNotification({ message: `Аккаунт ${targetName} удален навсегда!`, type: 'success' });
      }
      else if (action === 'reset_wager') {
        await handleUpdateUser(userTarget.uid, { wagerRequirement: 0 });
        setNotification({ message: `Отыгрыш игрока ${targetName} обнулен!`, type: 'success' });
      }
      else if (action === 'reset_level') {
        await handleUpdateUser(userTarget.uid, { 
          level: 0,
          xp: 0,
          totalDeposits: 0,
          claimedRanks: [] 
        });
        setNotification({ message: `Уровень игрока ${targetName} полностью аннулирован!`, type: 'success' });
      }
    } catch (error) {
      console.error('Action error:', error);
      setNotification({ message: 'Ошибка при выполнении действия', type: 'error' });
    } finally {
      setUserActionModal(null);
    }
  };

  const handleSaveProfileClick = (u: UserProfile) => {
    const currentEdit = editingUsers[u.uid];
    if (!currentEdit) return;

    const changes = [];
    if (currentEdit.balance !== undefined && currentEdit.balance !== u.balance) {
      changes.push({ field: 'balance', label: 'Баланс (CAT)', oldVal: u.balance, newVal: currentEdit.balance });
    }
    if (currentEdit.level !== undefined && currentEdit.level !== (u.level ?? 0)) {
      changes.push({ field: 'level', label: 'Уровень (Синхронизирует XP и Деп)', oldVal: u.level ?? 0, newVal: currentEdit.level });
    }
    if (currentEdit.rank !== undefined && currentEdit.rank !== u.rank) {
      changes.push({ field: 'rank', label: 'Ранг', oldVal: u.rank || 'user', newVal: currentEdit.rank });
    }

    if (changes.length > 0) {
      setEditConfirmModal({ userTarget: u, changes });
    }
  };

  const confirmEditProfile = async () => {
    if (!editConfirmModal) return;
    
    const updates: Partial<UserProfile> = {};
    editConfirmModal.changes.forEach(c => { updates[c.field as keyof UserProfile] = c.newVal; });
    
    if (updates.level !== undefined) {
      const targetLevel = Math.min(Math.max(Number(updates.level), 0), 15);
      updates.level = targetLevel;
      const req = LEVEL_REQUIREMENTS.find(r => r.id === targetLevel) || LEVEL_REQUIREMENTS[0];
      updates.xp = req.points;
      updates.totalDeposits = req.minDeposit;
    }

    await handleUpdateUser(editConfirmModal.userTarget.uid, updates);
    
    const newEditing = { ...editingUsers };
    delete newEditing[editConfirmModal.userTarget.uid];
    setEditingUsers(newEditing);
    
    setNotification({ message: `Профиль игрока ${editConfirmModal.userTarget.nickname} обновлен!`, type: 'success' });
    setEditConfirmModal(null);
  };

  const handleCreatePromo = async (name: string, amount: number, activations: number, wager: number) => {
    if (!name.trim()) {
      setNotification({ message: 'Введите название промокода', type: 'error' });
      return;
    }

    try {
      const newPromoData = {
        code: name.toUpperCase(),
        amount,
        maxActivations: activations,
        activations: 0,
        wager,
        createdAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'promoCodes'), newPromoData);
      const createdPromo = { id: docRef.id, ...newPromoData } as PromoCode;
      
      setPromoCodes([createdPromo, ...promoCodes]);
      setPromoName('');
      setNotification({ message: 'Промокод успешно создан!', type: 'success' });
      setPromoTab('list');
      
      setNewPromoId(docRef.id);
      setTimeout(() => setNewPromoId(null), 2000); 
    } catch (error) {
      setNotification({ message: 'Ошибка при создании промокода', type: 'error' });
    }
  };

  const generatePromo = () => {
    const code = 'CAT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    handleCreatePromo(code, 30, 80, 15);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setNotification({ message: `Промокод ${text} скопирован!`, type: 'success' });
  };

  const filteredUsers = users.filter(u => (u.nickname || '').toLowerCase().includes((search || '').toLowerCase()));

  const getModalContent = () => {
    if (globalActionModal === 'clear_history') {
      return (
        <div className="flex flex-col items-center text-center space-y-5 md:space-y-6">
           <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl flex items-center justify-center shadow-xl bg-red-100 text-red-500 shadow-red-100">
             <Trash2 className="w-8 h-8 md:w-10 md:h-10" />
           </div>
           <div className="space-y-2">
             <h3 className="text-xl md:text-2xl font-black text-slate-900">Очистка истории</h3>
             <p className="text-slate-500 font-medium text-sm md:text-base leading-relaxed">
               Вы уверены, что хотите безвозвратно удалить <span className="font-bold text-red-500">всю историю ставок, игр и очистить стол рулетки</span>? 
             </p>
           </div>
           <div className="flex flex-col-reverse md:flex-row gap-3 w-full pt-2 md:pt-4">
             <button onClick={() => setGlobalActionModal(null)} className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-black rounded-2xl transition-all">Отмена</button>
             <button onClick={clearGameHistory} className="w-full py-4 text-white font-black rounded-2xl transition-all shadow-lg bg-red-500 hover:bg-red-600 shadow-red-200">
               Да, очистить
             </button>
           </div>
        </div>
      );
    }

    if (editConfirmModal) {
      return (
        <div className="flex flex-col items-center text-center space-y-5 md:space-y-6">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl flex items-center justify-center shadow-xl bg-amber-100 text-amber-500 shadow-amber-100">
            <AlertCircle className="w-8 h-8 md:w-10 md:h-10" />
          </div>
          <div className="space-y-4 w-full">
            <h3 className="text-xl md:text-2xl font-black text-slate-900">Подтверждение изменений</h3>
            <p className="text-slate-500 font-medium text-sm md:text-base leading-relaxed">
              Вы уверены, что хотите применить новые параметры для игрока <span className="font-black text-slate-900">{editConfirmModal.userTarget.nickname}</span>?
            </p>
            <div className="flex flex-col gap-2 w-full text-left">
              {editConfirmModal.changes.map((c, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-xl">
                  <span className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest">{c.label}</span>
                  <div className="flex items-center gap-2 font-black text-sm md:text-base">
                    <span className="text-red-400 line-through truncate max-w-[80px] sm:max-w-xs">{c.oldVal}</span>
                    <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                    <span className="text-emerald-500 truncate max-w-[80px] sm:max-w-xs">{c.newVal}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col-reverse md:flex-row gap-3 w-full pt-2 md:pt-4">
            <button onClick={() => setEditConfirmModal(null)} className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-black rounded-2xl transition-all">Отмена</button>
            <button onClick={confirmEditProfile} className="w-full py-4 text-white font-black rounded-2xl transition-all shadow-lg bg-amber-500 hover:bg-amber-600 shadow-amber-200">Да, применить</button>
          </div>
        </div>
      );
    }

    if (!userActionModal) return null;
    const { action, userTarget } = userActionModal;
    const targetName = userTarget.nickname || 'Без имени';

    const config = {
      block: { title: 'Блокировка аккаунта', color: 'red', icon: ShieldAlert, text: 'заблокировать' },
      unblock: { title: 'Разблокировка аккаунта', color: 'emerald', icon: CheckCircle2, text: 'разблокировать' },
      delete: { title: 'Удаление аккаунта', color: 'red', icon: Trash2, text: 'навсегда удалить' },
      reset_wager: { title: 'Обнуление отыгрыша', color: 'brand', icon: RefreshCw, text: 'обнулить отыгрыш (вагер) для' },
      reset_level: { title: 'Сброс уровня', color: 'amber', icon: RotateCcw, text: 'полностью обнулить уровень, опыт и депозиты' }
    };

    const cfg = config[action];
    const Icon = cfg.icon;

    return (
      <div className="flex flex-col items-center text-center space-y-5 md:space-y-6">
        <div className={cn(
          "w-16 h-16 md:w-20 md:h-20 rounded-3xl flex items-center justify-center shadow-xl",
          cfg.color === 'red' ? "bg-red-100 text-red-500 shadow-red-100" :
          cfg.color === 'emerald' ? "bg-emerald-100 text-emerald-500 shadow-emerald-100" :
          cfg.color === 'amber' ? "bg-amber-100 text-amber-500 shadow-amber-100" :
          "bg-brand-100 text-brand-500 shadow-brand-100"
        )}>
          <Icon className="w-8 h-8 md:w-10 md:h-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl md:text-2xl font-black text-slate-900">{cfg.title}</h3>
          <p className="text-slate-500 font-medium text-sm md:text-base leading-relaxed">
            Вы уверены, что хотите {cfg.text} пользователя <br/>
            <span className="font-black text-slate-900 truncate block max-w-xs mx-auto">"{targetName}"</span>?
            {action === 'delete' && <span className="block mt-2 text-xs text-red-500 font-bold">Это действие необратимо! Игрок больше никогда не сможет войти.</span>}
            {action === 'reset_level' && <span className="block mt-2 text-xs text-amber-500 font-bold">Награды за уровень можно будет получить заново.</span>}
          </p>
        </div>
        <div className="flex flex-col-reverse md:flex-row gap-3 w-full pt-2 md:pt-4">
          <button onClick={() => setUserActionModal(null)} className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-black rounded-2xl transition-all">Отмена</button>
          <button 
            onClick={confirmUserAction}
            className={cn(
              "w-full py-4 text-white font-black rounded-2xl transition-all shadow-lg",
              cfg.color === 'red' ? "bg-red-500 hover:bg-red-600 shadow-red-200" :
              cfg.color === 'emerald' ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200" :
              cfg.color === 'amber' ? "bg-amber-500 hover:bg-amber-600 shadow-amber-200" :
              "bg-brand-500 hover:bg-brand-600 shadow-brand-200"
            )}
          >
            Да, уверен
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[90rem] mx-auto space-y-6 md:space-y-8 pb-12 relative px-2 md:px-0">
      
      <AnimatePresence>
        {(userActionModal || editConfirmModal || globalActionModal) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 relative mx-4"
            >
              <button 
                onClick={() => { setUserActionModal(null); setEditConfirmModal(null); setGlobalActionModal(null); }}
                className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
              {getModalContent()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-5 lg:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-center md:text-left">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-brand-600 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-xl shadow-brand-200 shrink-0">
            <Cat className="w-7 h-7 md:w-8 md:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter">Панель управления</h1>
            <p className="text-slate-400 font-medium text-xs md:text-sm mt-1">Администрирование CoolCat Casino</p>
          </div>
        </div>

        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={cn(
                "fixed top-4 left-4 right-4 md:left-auto md:right-6 md:top-6 z-[100] px-4 md:px-6 py-3 md:py-4 rounded-2xl shadow-2xl flex items-center justify-center md:justify-start gap-3 border backdrop-blur-md max-w-full",
                notification.type === 'success' ? "bg-emerald-50/95 border-emerald-200 text-emerald-600" : "bg-red-50/95 border-red-200 text-red-600"
              )}
            >
              {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <span className="font-bold text-xs md:text-sm truncate">{notification.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap md:flex-nowrap bg-slate-50 p-1.5 rounded-2xl border border-slate-100 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              "flex-1 md:flex-none px-3 md:px-6 py-3 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              activeTab === 'users' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            )}
          >
            <Users className="w-4 h-4" /> <span className="hidden sm:inline">Пользователи</span>
          </button>
          <button
            onClick={() => setActiveTab('promo')}
            className={cn(
              "flex-1 md:flex-none px-3 md:px-6 py-3 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              activeTab === 'promo' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            )}
          >
            <Ticket className="w-4 h-4" /> <span className="hidden sm:inline">Промокоды</span>
          </button>
          <button
            onClick={() => setActiveTab('global')}
            className={cn(
              "flex-1 md:flex-none px-3 md:px-6 py-3 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              activeTab === 'global' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            )}
          >
            <Globe className="w-4 h-4" /> <span className="hidden sm:inline">Глобальные</span>
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        
        {/* Вкладка: Глобальные переменные */}
        {activeTab === 'global' && (
          <motion.div key="global" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 md:space-y-8 max-w-7xl mx-auto">
            <div className="bg-white p-5 md:p-8 lg:p-12 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50">
              <div className="mb-6 md:mb-8 text-center md:text-left">
                <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter">Глобальные настройки</h2>
                <p className="text-slate-500 text-xs md:text-sm font-medium mt-2">Управление системными данными и коллекциями базы данных.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                
                {/* Карточка: Очистка истории */}
                <div className="bg-slate-50 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 flex flex-col justify-between group hover:border-red-200 transition-colors">
                  <div className="mb-6 md:mb-8">
                    <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mb-4 text-red-500 group-hover:scale-110 transition-transform">
                      <Trash2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg md:text-xl font-black text-slate-900 mb-2">История игр</h3>
                    <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
                      Полностью удаляет коллекцию <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700">gameSessions</code>, а также очищает все зависшие ставки со стола в WheelX и визуальную историю.
                    </p>
                  </div>
                  <button 
                    onClick={() => setGlobalActionModal('clear_history')} 
                    className="w-full py-4 bg-white text-red-500 border-2 border-red-100 hover:bg-red-500 hover:text-white hover:border-red-500 rounded-xl font-black text-xs md:text-sm uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    Очистить базу игр
                  </button>
                </div>
                
              </div>
            </div>
          </motion.div>
        )}

        {/* Вкладка: Пользователи */}
        {activeTab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4 md:space-y-6">
            <div className="max-w-7xl mx-auto bg-white p-3 md:p-4 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/50 flex items-center gap-3 md:gap-4 focus-within:border-brand-300 transition-colors">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
                <Search className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
              </div>
              <input type="text" placeholder="Поиск по никнейму..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-transparent border-none outline-none font-bold text-slate-900 placeholder:text-slate-300 text-base md:text-lg w-full" />
            </div>

            <div className="grid grid-cols-1 gap-5 max-w-7xl mx-auto">
              {filteredUsers.map((u) => {
                const currentEdit = editingUsers[u.uid];
                const hasChanges = currentEdit && (
                  (currentEdit.balance !== undefined && currentEdit.balance !== u.balance) ||
                  (currentEdit.level !== undefined && currentEdit.level !== (u.level ?? 0)) ||
                  (currentEdit.rank !== undefined && currentEdit.rank !== (u.rank || 'user'))
                );
                
                return (
                <div key={u.uid} className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl shadow-slate-200/40 transition-all flex flex-col gap-5 md:gap-6 group relative overflow-hidden">
                  
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between w-full gap-4 pb-5 border-b border-slate-100">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative shrink-0">
                        <img src={u.avatar || '/assets/avatars/ava1.webp'} className="w-14 h-14 md:w-16 md:h-16 rounded-2xl object-cover border-2 border-slate-100 shadow-sm" alt="" />
                        {u.banned && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                            <Ban className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 text-lg md:text-xl truncate">{u.nickname || 'Без имени'}</p>
                        <p className={cn("text-xs font-black uppercase tracking-widest mt-0.5", u.rank === 'admin' ? "text-brand-500" : "text-slate-400")}>
                          {u.rank || 'user'} • LVL {u.level ?? 0}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full lg:w-auto shrink-0">
                      
                      <AnimatePresence>
                        {hasChanges && (
                          <motion.button 
                            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                            onClick={() => handleSaveProfileClick(u)} 
                            className="flex-1 lg:flex-none py-2.5 px-4 md:p-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md shadow-emerald-200 flex items-center justify-center gap-2 animate-pulse" 
                            title="Сохранить изменения"
                          >
                            <CheckCircle2 className="w-4 h-4" /> <span className="text-xs font-bold uppercase tracking-widest">Сохранить</span>
                          </motion.button>
                        )}
                      </AnimatePresence>

                      <button onClick={() => setUserActionModal({ userTarget: u, action: 'reset_wager' })} className="flex-1 lg:flex-none py-2.5 px-3 md:p-3 rounded-xl bg-brand-50 text-brand-500 hover:bg-brand-500 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2" title="Сбросить отыгрыш">
                        <RefreshCw className="w-4 h-4" /> <span className="lg:hidden text-[10px] uppercase font-bold tracking-widest">Отыгрыш</span>
                      </button>
                      
                      <button onClick={() => setUserActionModal({ userTarget: u, action: 'reset_level' })} className="flex-1 lg:flex-none py-2.5 px-3 md:p-3 rounded-xl bg-amber-50 text-amber-500 hover:bg-amber-500 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2" title="Аннулировать уровень">
                        <RotateCcw className="w-4 h-4" /> <span className="lg:hidden text-[10px] uppercase font-bold tracking-widest">Уровень</span>
                      </button>

                      <button onClick={() => setUserActionModal({ userTarget: u, action: u.banned ? 'unblock' : 'block' })} className={cn("flex-1 lg:flex-none py-2.5 px-3 md:p-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2", u.banned ? "bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white" : "bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white")} title={u.banned ? 'Разблокировать' : 'Заблокировать'}>
                        {u.banned ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />} <span className="lg:hidden text-[10px] uppercase font-bold tracking-widest">{u.banned ? 'Разбан' : 'Бан'}</span>
                      </button>
                      <button onClick={() => setUserActionModal({ userTarget: u, action: 'delete' })} className="flex-1 lg:flex-none py-2.5 px-3 md:p-3 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2" title="Удалить аккаунт">
                        <Trash2 className="w-4 h-4" /> <span className="lg:hidden text-[10px] uppercase font-bold tracking-widest">Удалить</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
                    <div className="space-y-2 relative">
                      <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 pl-1">Ранг</p>
                      <select value={editingUsers[u.uid]?.rank ?? (u.rank || 'user')} onChange={(e) => setEditingUsers({...editingUsers, [u.uid]: {...(editingUsers[u.uid]||{}), rank: e.target.value as any}})} className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border-2 border-transparent focus:border-brand-500 rounded-xl px-4 py-3 font-black text-slate-900 text-sm md:text-base outline-none transition-all shadow-inner appearance-none cursor-pointer uppercase">
                        <option value="user">User</option><option value="vip">VIP</option><option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="space-y-2 relative">
                      <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 pl-1">Уровень</p>
                      <input type="number" min="0" max="15" value={editingUsers[u.uid]?.level ?? (u.level ?? 0)} onChange={(e) => setEditingUsers({...editingUsers, [u.uid]: {...(editingUsers[u.uid]||{}), level: Number(e.target.value)}})} className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border-2 border-transparent focus:border-brand-500 rounded-xl px-4 py-3 font-black text-slate-900 text-sm md:text-base outline-none transition-all shadow-inner" />
                    </div>
                    <div className="space-y-2 relative">
                      <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 pl-1">Баланс (CAT)</p>
                      <input type="number" value={editingUsers[u.uid]?.balance ?? u.balance} onChange={(e) => setEditingUsers({...editingUsers, [u.uid]: {...(editingUsers[u.uid]||{}), balance: Number(e.target.value)}})} className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border-2 border-transparent focus:border-brand-500 rounded-xl px-4 py-3 font-black text-slate-900 text-sm md:text-base outline-none transition-all shadow-inner" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 pl-1 text-brand-500">Отыгрыш</p>
                      <input type="number" key={`wager-${u.uid}-${u.wagerRequirement}`} defaultValue={u.wagerRequirement || 0} onBlur={(e) => handleUpdateUser(u.uid, { wagerRequirement: Number(e.target.value) })} className="w-full bg-brand-50/50 hover:bg-brand-50 focus:bg-white border-2 border-transparent focus:border-brand-500 rounded-xl px-4 py-3 font-black text-brand-700 text-sm md:text-base outline-none transition-all shadow-inner" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 pl-1">Пароль</p>
                      <input type="text" defaultValue={u.password || 'N/A'} onBlur={(e) => handleUpdateUser(u.uid, { password: e.target.value })} className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border-2 border-transparent focus:border-brand-500 rounded-xl px-4 py-3 font-bold text-slate-900 text-sm md:text-base outline-none transition-all shadow-inner" />
                    </div>
                    <div className="space-y-2 col-span-2 md:col-span-1">
                      <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 pl-1">Статистика</p>
                      <div className="flex flex-row items-center gap-4 text-xs md:text-sm font-black text-slate-500 bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl w-full h-[46px] md:h-[52px]">
                        <span className="text-emerald-500 flex items-center gap-1">+ {u.totalDeposits || 0}</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-red-400 flex items-center gap-1">- {u.totalWithdrawals || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )})}
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-12 bg-white rounded-[2rem] border border-slate-100 max-w-7xl mx-auto w-full">
                  <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold">Игроки не найдены</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Вкладка: Промокоды */}
        {activeTab === 'promo' && (
          <motion.div key="promo" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 md:space-y-8 max-w-7xl mx-auto">
            <div className="grid grid-cols-3 md:flex bg-white p-1.5 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/50 w-full md:w-fit gap-1 md:gap-2">
              <button onClick={() => setPromoTab('create')} className={cn("px-2 md:px-8 py-3 rounded-xl font-black text-[9px] md:text-xs uppercase tracking-widest transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2", promoTab === 'create' ? 'bg-brand-50 text-brand-600' : 'text-slate-400 hover:text-brand-600')}>
                <Plus className="w-4 h-4 md:w-4 md:h-4" /> <span className="truncate w-full text-center">Создать</span>
              </button>
              <button onClick={() => setPromoTab('list')} className={cn("px-2 md:px-8 py-3 rounded-xl font-black text-[9px] md:text-xs uppercase tracking-widest transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2", promoTab === 'list' ? 'bg-brand-50 text-brand-600' : 'text-slate-400 hover:text-brand-600')}>
                <List className="w-4 h-4 md:w-4 md:h-4" /> <span className="truncate w-full text-center">Список</span>
              </button>
              <button onClick={() => setPromoTab('generator')} className={cn("px-2 md:px-8 py-3 rounded-xl font-black text-[9px] md:text-xs uppercase tracking-widest transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2", promoTab === 'generator' ? 'bg-brand-50 text-brand-600' : 'text-slate-400 hover:text-brand-600')}>
                <Zap className="w-4 h-4 md:w-4 md:h-4" /> <span className="truncate w-full text-center">Генератор</span>
              </button>
            </div>

            <div className="bg-white p-5 md:p-8 lg:p-12 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50">
              
              {promoTab === 'create' && (
                <div className="max-w-3xl mx-auto space-y-6 md:space-y-8">
                  <div className="text-center space-y-2 mb-6 md:mb-8">
                    <h2 className="text-xl md:text-2xl font-black text-slate-900">Новый промокод</h2>
                    <p className="text-slate-400 font-medium text-xs md:text-sm">Укажите параметры для ручного создания</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Код купона</label>
                      <input type="text" value={promoName} onChange={(e) => setPromoName(e.target.value.toUpperCase())} placeholder="SUMMER2026" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-3.5 md:py-4 font-black text-slate-900 focus:border-brand-500 outline-none transition-all placeholder:text-slate-300 text-sm md:text-base" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Награда (CAT)</label>
                      <input type="number" value={promoAmount} onChange={(e) => setPromoAmount(Number(e.target.value))} className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-3.5 md:py-4 font-black text-slate-900 focus:border-brand-500 outline-none transition-all text-sm md:text-base" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Макс. Активаций</label>
                      <input type="number" value={promoActivations} onChange={(e) => setPromoActivations(Number(e.target.value))} className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-3.5 md:py-4 font-black text-slate-900 focus:border-brand-500 outline-none transition-all text-sm md:text-base" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Вагер (Множитель)</label>
                      <input type="number" value={promoWager} onChange={(e) => setPromoWager(Number(e.target.value))} className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-3.5 md:py-4 font-black text-slate-900 focus:border-brand-500 outline-none transition-all text-sm md:text-base" />
                    </div>
                  </div>
                  
                  <div className="pt-4 md:pt-6 border-t border-slate-100">
                    <button onClick={() => handleCreatePromo(promoName, promoAmount, promoActivations, promoWager)} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-4 md:py-5 rounded-2xl transition-all shadow-xl shadow-brand-200 uppercase tracking-widest text-xs md:text-sm flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4 md:w-5 md:h-5" /> Создать промокод
                    </button>
                  </div>
                </div>
              )}

              {promoTab === 'list' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {promoCodes.map((p) => (
                    <div key={p.id} onClick={() => copyToClipboard(p.code)} className={cn("relative overflow-hidden flex flex-col p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border-2 border-dashed transition-all duration-500 cursor-pointer group", newPromoId === p.id ? "bg-brand-50 border-brand-500 shadow-xl shadow-brand-200 scale-105 z-10" : "bg-white border-slate-200 hover:border-brand-400 hover:shadow-xl hover:shadow-brand-100")}>
                      <div className="absolute top-4 right-4 text-slate-300 group-hover:text-brand-500 transition-colors">
                        <Copy className="w-4 h-4 md:w-5 h-5" />
                      </div>
                      <div className="mb-4 pr-6">
                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Промокод</p>
                        <p className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter group-hover:text-brand-600 transition-colors truncate">{p.code}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 md:gap-4 mt-auto pt-4 border-t border-slate-100 w-full">
                        <div className="w-full">
                          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Награда</p>
                          <p className="font-bold text-slate-900 text-sm md:text-base">{p.amount} CAT</p>
                        </div>
                        <div className="w-full">
                          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Вагер</p>
                          <p className="font-bold text-slate-900 text-sm md:text-base">x{p.wager}</p>
                        </div>
                        <div className="col-span-2 w-full mt-2 pr-14 md:pr-0">
                          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 flex justify-between w-full">
                            <span>Активации</span> <span>{p.activations} / {p.maxActivations}</span>
                          </p>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(p.activations / p.maxActivations) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteDoc(doc(db, 'promoCodes', p.id)); setPromoCodes(promoCodes.filter(pc => pc.id !== p.id)); setNotification({ message: 'Промокод удален', type: 'success' }); }} className="absolute bottom-4 right-4 p-2.5 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl shadow-sm transition-all md:opacity-0 md:group-hover:opacity-100" title="Удалить промокод">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {promoCodes.length === 0 && (
                    <div className="col-span-full text-center py-10 md:py-12">
                      <Ticket className="w-10 h-10 md:w-12 md:h-12 text-slate-200 mx-auto mb-3 md:mb-4" />
                      <p className="text-slate-400 font-bold text-sm md:text-base">Нет активных промокодов</p>
                    </div>
                  )}
                </div>
              )}

              {promoTab === 'generator' && (
                <div className="max-w-md mx-auto text-center space-y-6 md:space-y-8 py-4 md:py-8">
                  <div className="w-24 h-24 md:w-32 md:h-32 bg-brand-50 rounded-[2rem] md:rounded-[3rem] flex items-center justify-center mx-auto border-4 border-dashed border-brand-200 relative">
                    <div className="absolute inset-0 bg-brand-400 rounded-[2rem] md:rounded-[3rem] blur-xl md:blur-2xl opacity-20 animate-pulse" />
                    <Zap className="w-10 h-10 md:w-14 md:h-14 text-brand-500 relative z-10" />
                  </div>
                  <div className="space-y-2 md:space-y-3">
                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">Генератор</h3>
                    <p className="text-slate-500 font-medium text-xs md:text-sm px-4">Создаст уникальный код со следующими параметрами:</p>
                    <div className="flex items-center justify-center gap-2 md:gap-3 pt-2">
                      <span className="px-2 md:px-3 py-1 bg-slate-50 rounded-lg text-[10px] md:text-xs font-black text-slate-600">30 CAT</span>
                      <span className="text-slate-300">•</span>
                      <span className="px-2 md:px-3 py-1 bg-slate-50 rounded-lg text-[10px] md:text-xs font-black text-slate-600">80 Акт.</span>
                      <span className="text-slate-300">•</span>
                      <span className="px-2 md:px-3 py-1 bg-slate-50 rounded-lg text-[10px] md:text-xs font-black text-slate-600">x15 Вагер</span>
                    </div>
                  </div>
                  <button onClick={generatePromo} className="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 md:py-5 rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest transition-all shadow-xl shadow-brand-200 flex items-center justify-center gap-2 mt-4">
                    <Zap className="w-4 h-4 md:w-5 md:h-5" /> Сгенерировать
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}