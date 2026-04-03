import { useState, useEffect } from 'react';
import { UserProfile, PromoCode } from '../types';
import { doc, updateDoc, getDocs, query, collection, addDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Ticket, Plus, List, Zap, Search, Ban, Trash2, Cat, CheckCircle2, AlertCircle, Copy, X, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface AdminProps {
  user: UserProfile;
}

export default function Admin({ user }: AdminProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'promo'>('users');
  const [promoTab, setPromoTab] = useState<'create' | 'list' | 'generator'>('create');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // Модальное окно блокировки
  const [blockModal, setBlockModal] = useState<{ userTarget: UserProfile, action: 'block' | 'unblock' } | null>(null);

  // ID только что созданного промокода для анимации
  const [newPromoId, setNewPromoId] = useState<string | null>(null);

  // Форма промокодов
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
      const userSnap = await getDocs(collection(db, 'users'));
      setUsers(userSnap.docs.map(doc => doc.data() as UserProfile));
      
      const promoSnap = await getDocs(query(collection(db, 'promoCodes'), orderBy('createdAt', 'desc')));
      setPromoCodes(promoSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as PromoCode));
      setLoading(false);
    };
    fetchData();
  }, [activeTab]);

  const handleUpdateUser = async (uid: string, data: Partial<UserProfile>) => {
    try {
      await updateDoc(doc(db, 'users', uid), data);
      setUsers(users.map(u => u.uid === uid ? { ...u, ...data } : u));
    } catch (error) {
      console.error('Update user error:', error);
      setNotification({ message: 'Ошибка обновления пользователя', type: 'error' });
    }
  };

  const confirmBlockAction = async () => {
    if (!blockModal) return;
    const isBanning = blockModal.action === 'block';
    await handleUpdateUser(blockModal.userTarget.uid, { banned: isBanning });
    setNotification({ 
      message: `Игрок ${blockModal.userTarget.nickname} успешно ${isBanning ? 'заблокирован' : 'разблокирован'}!`, 
      type: 'success' 
    });
    setBlockModal(null);
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
      setTimeout(() => {
        setNewPromoId(null);
      }, 2000); 

    } catch (error) {
      console.error('Create promo error:', error);
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

  const filteredUsers = users.filter(u => u.nickname.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-12 relative px-2 md:px-0">
      
      <AnimatePresence>
        {blockModal && (
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
                onClick={() => setBlockModal(null)}
                className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="flex flex-col items-center text-center space-y-5 md:space-y-6">
                <div className={cn(
                  "w-16 h-16 md:w-20 md:h-20 rounded-3xl flex items-center justify-center shadow-xl",
                  blockModal.action === 'block' ? "bg-red-100 text-red-500 shadow-red-100" : "bg-emerald-100 text-emerald-500 shadow-emerald-100"
                )}>
                  {blockModal.action === 'block' ? <ShieldAlert className="w-8 h-8 md:w-10 md:h-10" /> : <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10" />}
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl md:text-2xl font-black text-slate-900">
                    {blockModal.action === 'block' ? 'Блокировка аккаунта' : 'Разблокировка аккаунта'}
                  </h3>
                  <p className="text-slate-500 font-medium text-sm md:text-base leading-relaxed">
                    Вы уверены, что хотите {blockModal.action === 'block' ? 'заблокировать' : 'разблокировать'} пользователя <br/>
                    <span className="font-black text-slate-900 truncate block max-w-xs mx-auto">"{blockModal.userTarget.nickname}"</span>?
                  </p>
                </div>

                <div className="flex flex-col-reverse md:flex-row gap-3 w-full pt-2 md:pt-4">
                  <button 
                    onClick={() => setBlockModal(null)}
                    className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-black rounded-2xl transition-all"
                  >
                    Отмена
                  </button>
                  <button 
                    onClick={confirmBlockAction}
                    className={cn(
                      "w-full py-4 text-white font-black rounded-2xl transition-all shadow-lg",
                      blockModal.action === 'block' 
                        ? "bg-red-500 hover:bg-red-600 shadow-red-200" 
                        : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200"
                    )}
                  >
                    Да, уверен
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-5 lg:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
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

        <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              "flex-1 md:flex-none px-4 md:px-6 py-3 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              activeTab === 'users' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            )}
          >
            <Users className="w-4 h-4" /> <span className="hidden sm:inline">Пользователи</span>
          </button>
          <button
            onClick={() => setActiveTab('promo')}
            className={cn(
              "flex-1 md:flex-none px-4 md:px-6 py-3 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              activeTab === 'promo' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            )}
          >
            <Ticket className="w-4 h-4" /> <span className="hidden sm:inline">Промокоды</span>
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'users' ? (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4 md:space-y-6"
          >
            <div className="bg-white p-3 md:p-4 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/50 flex items-center gap-3 md:gap-4 focus-within:border-brand-300 transition-colors">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
                <Search className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Поиск по никнейму..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none font-bold text-slate-900 placeholder:text-slate-300 text-base md:text-lg w-full"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredUsers.map((u) => (
                <div key={u.uid} className="bg-white p-4 md:p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl shadow-slate-200/40 transition-all flex flex-col md:flex-row gap-5 md:gap-6 group relative overflow-hidden">
                  
                  <div className="flex items-center justify-between w-full md:w-1/4">
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                      <div className="relative shrink-0">
                        <img src={u.avatar} className="w-12 h-12 md:w-14 md:h-14 rounded-2xl object-cover border-2 border-slate-100" alt="" />
                        {u.banned && (
                          <div className="absolute -top-2 -right-2 w-5 h-5 md:w-6 md:h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                            <Ban className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 text-base md:text-lg truncate">{u.nickname}</p>
                        <p className={cn("text-[10px] font-black uppercase tracking-widest truncate", u.rank === 'admin' ? "text-brand-500" : "text-slate-400")}>
                          {u.rank} • LVL {u.level}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setBlockModal({ userTarget: u, action: u.banned ? 'unblock' : 'block' })}
                      className={cn(
                        "md:hidden p-3 rounded-xl transition-all shrink-0 ml-2",
                        u.banned 
                          ? "bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white" 
                          : "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white"
                      )}
                      title={u.banned ? 'Разблокировать' : 'Заблокировать'}
                    >
                      {u.banned ? <CheckCircle2 className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:flex flex-1 w-full gap-3 md:gap-0">
                    <div className="w-full md:flex-1 md:border-l md:border-r border-slate-100 md:px-4">
                      <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 pl-1">Баланс (CAT)</p>
                      <input
                        type="number"
                        defaultValue={u.balance}
                        onBlur={(e) => handleUpdateUser(u.uid, { balance: Number(e.target.value) })}
                        className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border-2 border-transparent focus:border-brand-500 rounded-xl px-3 py-2 font-black text-slate-900 text-sm outline-none transition-all"
                      />
                    </div>

                    <div className="w-full md:flex-1 md:border-r border-slate-100 md:px-4">
                      <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 pl-1">Пароль</p>
                      <input
                        type="text"
                        defaultValue={u.password || 'N/A'}
                        onBlur={(e) => handleUpdateUser(u.uid, { password: e.target.value })}
                        className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border-2 border-transparent focus:border-brand-500 rounded-xl px-3 py-2 font-bold text-slate-900 text-sm outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="w-full md:w-auto md:flex-1 md:px-4">
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 pl-1">Статистика</p>
                    <div className="flex gap-4 text-xs font-bold text-slate-500 bg-slate-50 p-2.5 rounded-xl w-full justify-center md:justify-start">
                      <span className="text-emerald-500 flex items-center gap-1">+ {u.totalDeposits}</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-red-400 flex items-center gap-1">- {u.totalWithdrawals}</span>
                    </div>
                  </div>

                  <div className="hidden md:flex items-center justify-end px-2 shrink-0">
                    <button
                      onClick={() => setBlockModal({ userTarget: u, action: u.banned ? 'unblock' : 'block' })}
                      className={cn(
                        "p-4 rounded-2xl transition-all flex items-center justify-center",
                        u.banned 
                          ? "bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white shadow-sm" 
                          : "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white shadow-sm"
                      )}
                      title={u.banned ? 'Разблокировать' : 'Заблокировать'}
                    >
                      {u.banned ? <CheckCircle2 className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              ))}
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-12 bg-white rounded-[2rem] border border-slate-100">
                  <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold">Игроки не найдены</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="promo"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6 md:space-y-8"
          >
            <div className="grid grid-cols-3 md:flex bg-white p-1.5 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/50 w-full md:w-fit gap-1 md:gap-2">
              <button
                onClick={() => setPromoTab('create')}
                className={cn("px-2 md:px-8 py-3 rounded-xl font-black text-[9px] md:text-xs uppercase tracking-widest transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2", promoTab === 'create' ? 'bg-brand-50 text-brand-600' : 'text-slate-400 hover:text-brand-600')}
              >
                <Plus className="w-4 h-4 md:w-4 md:h-4" /> <span className="truncate w-full text-center">Создать</span>
              </button>
              <button
                onClick={() => setPromoTab('list')}
                className={cn("px-2 md:px-8 py-3 rounded-xl font-black text-[9px] md:text-xs uppercase tracking-widest transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2", promoTab === 'list' ? 'bg-brand-50 text-brand-600' : 'text-slate-400 hover:text-brand-600')}
              >
                <List className="w-4 h-4 md:w-4 md:h-4" /> <span className="truncate w-full text-center">Список</span>
              </button>
              <button
                onClick={() => setPromoTab('generator')}
                className={cn("px-2 md:px-8 py-3 rounded-xl font-black text-[9px] md:text-xs uppercase tracking-widest transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2", promoTab === 'generator' ? 'bg-brand-50 text-brand-600' : 'text-slate-400 hover:text-brand-600')}
              >
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
                      <input
                        type="text"
                        value={promoName}
                        onChange={(e) => setPromoName(e.target.value.toUpperCase())}
                        placeholder="SUMMER2026"
                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-3.5 md:py-4 font-black text-slate-900 focus:border-brand-500 outline-none transition-all placeholder:text-slate-300 text-sm md:text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Награда (CAT)</label>
                      <input
                        type="number"
                        value={promoAmount}
                        onChange={(e) => setPromoAmount(Number(e.target.value))}
                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-3.5 md:py-4 font-black text-slate-900 focus:border-brand-500 outline-none transition-all text-sm md:text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Макс. Активаций</label>
                      <input
                        type="number"
                        value={promoActivations}
                        onChange={(e) => setPromoActivations(Number(e.target.value))}
                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-3.5 md:py-4 font-black text-slate-900 focus:border-brand-500 outline-none transition-all text-sm md:text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Вагер (Множитель)</label>
                      <input
                        type="number"
                        value={promoWager}
                        onChange={(e) => setPromoWager(Number(e.target.value))}
                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-3.5 md:py-4 font-black text-slate-900 focus:border-brand-500 outline-none transition-all text-sm md:text-base"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4 md:pt-6 border-t border-slate-100">
                    <button
                      onClick={() => handleCreatePromo(promoName, promoAmount, promoActivations, promoWager)}
                      className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-4 md:py-5 rounded-2xl transition-all shadow-xl shadow-brand-200 uppercase tracking-widest text-xs md:text-sm flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4 md:w-5 md:h-5" /> Создать промокод
                    </button>
                  </div>
                </div>
              )}

              {promoTab === 'list' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {promoCodes.map((p) => (
                    <div 
                      key={p.id} 
                      onClick={() => copyToClipboard(p.code)}
                      className={cn(
                        "relative overflow-hidden flex flex-col p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border-2 border-dashed transition-all duration-500 cursor-pointer group",
                        newPromoId === p.id 
                          ? "bg-brand-50 border-brand-500 shadow-xl shadow-brand-200 scale-105 z-10" 
                          : "bg-white border-slate-200 hover:border-brand-400 hover:shadow-xl hover:shadow-brand-100"
                      )}
                    >
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
                        
                        {/* ДОБАВЛЕН ОТСТУП pr-14 md:pr-0, чтобы кнопка удаления не перекрывала текст */}
                        <div className="col-span-2 w-full mt-2 pr-14 md:pr-0">
                          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 flex justify-between w-full">
                            <span>Активации</span>
                            <span>{p.activations} / {p.maxActivations}</span>
                          </p>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                            <div 
                              className="h-full bg-brand-500 rounded-full" 
                              style={{ width: `${(p.activations / p.maxActivations) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDoc(doc(db, 'promoCodes', p.id));
                          setPromoCodes(promoCodes.filter(pc => pc.id !== p.id));
                          setNotification({ message: 'Промокод удален', type: 'success' });
                        }}
                        className="absolute bottom-4 right-4 p-2.5 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl shadow-sm transition-all md:opacity-0 md:group-hover:opacity-100"
                        title="Удалить промокод"
                      >
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
                    <p className="text-slate-500 font-medium text-xs md:text-sm px-4">
                      Создаст уникальный код со следующими параметрами:
                    </p>
                    <div className="flex items-center justify-center gap-2 md:gap-3 pt-2">
                      <span className="px-2 md:px-3 py-1 bg-slate-50 rounded-lg text-[10px] md:text-xs font-black text-slate-600">30 CAT</span>
                      <span className="text-slate-300">•</span>
                      <span className="px-2 md:px-3 py-1 bg-slate-50 rounded-lg text-[10px] md:text-xs font-black text-slate-600">80 Акт.</span>
                      <span className="text-slate-300">•</span>
                      <span className="px-2 md:px-3 py-1 bg-slate-50 rounded-lg text-[10px] md:text-xs font-black text-slate-600">x15 Вагер</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={generatePromo}
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 md:py-5 rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest transition-all shadow-xl shadow-brand-200 flex items-center justify-center gap-2 mt-4"
                  >
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