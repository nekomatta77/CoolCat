import { useState, useEffect } from 'react';
import { UserProfile, PromoCode } from '../types';
import { doc, updateDoc, getDocs, query, collection, where, addDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Ticket, Plus, List, Zap, Search, Edit2, Ban, Trash2, ShieldCheck, TrendingUp, Wallet, Key, Cat, CheckCircle2, AlertCircle } from 'lucide-react';
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

  // Promo form
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
    }
  };

  const handleCreatePromo = async (name: string, amount: number, activations: number, wager: number) => {
    try {
      const newPromo = {
        code: name,
        amount,
        maxActivations: activations,
        activations: 0,
        wager,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'promoCodes'), newPromo);
      setPromoName('');
      setNotification({ message: 'Промокод успешно создан!', type: 'success' });
    } catch (error) {
      console.error('Create promo error:', error);
      setNotification({ message: 'Ошибка при создании промокода', type: 'error' });
    }
  };

  const generatePromo = () => {
    const code = 'CAT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    handleCreatePromo(code, 30, 100, 15);
  };

  const filteredUsers = users.filter(u => u.nickname.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-indigo-900 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Cat className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-indigo-900 tracking-tighter">Админ-панель</h1>
            <p className="text-slate-400 font-medium">Управление проектом CoolCat Casino</p>
          </div>
        </div>

        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={cn(
                "fixed top-4 right-4 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border",
                notification.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-red-50 border-red-100 text-red-600"
              )}
            >
              {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="font-bold">{notification.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex bg-white p-1.5 rounded-2xl border border-indigo-100 shadow-sm">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-indigo-600'}`}
          >
            Пользователи
          </button>
          <button
            onClick={() => setActiveTab('promo')}
            className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'promo' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-indigo-600'}`}
          >
            Промокоды
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
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-[2rem] border border-indigo-100 shadow-xl shadow-indigo-100/50 flex items-center gap-4">
              <Search className="w-6 h-6 text-indigo-400" />
              <input
                type="text"
                placeholder="Поиск по никнейму..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none font-bold text-indigo-900 placeholder:text-indigo-200"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredUsers.map((u) => (
                <div key={u.uid} className="bg-white p-6 rounded-[2rem] border border-indigo-100 shadow-xl shadow-indigo-100/50 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 items-center gap-6">
                  <div className="flex items-center gap-4 col-span-1 md:col-span-2">
                    <img src={u.avatar} className="w-12 h-12 rounded-xl" alt="" />
                    <div>
                      <p className="font-black text-indigo-900">{u.nickname}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{u.rank} • LVL {u.level}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Баланс</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        defaultValue={u.balance}
                        onBlur={(e) => handleUpdateUser(u.uid, { balance: Number(e.target.value) })}
                        className="w-24 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1 font-bold text-indigo-900 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Статистика</p>
                    <div className="text-xs font-bold text-slate-500">
                      <p>Деп: {u.totalDeposits}</p>
                      <p>Вывод: {u.totalWithdrawals}</p>
                      <p className="text-indigo-600">Доход: {u.totalDeposits - u.totalWithdrawals}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Пароль</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        defaultValue={u.password || 'N/A'}
                        onBlur={(e) => handleUpdateUser(u.uid, { password: e.target.value })}
                        className="w-24 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1 font-bold text-indigo-900 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleUpdateUser(u.uid, { banned: !u.banned })}
                      className={`p-3 rounded-xl transition-all ${u.banned ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-red-50 text-red-400 hover:bg-red-500 hover:text-white'}`}
                      title={u.banned ? 'Разбанить' : 'Забанить'}
                    >
                      <Ban className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleUpdateUser(u.uid, { rank: u.rank === 'admin' ? 'user' : 'admin' })}
                      className={`p-3 rounded-xl transition-all ${u.rank === 'admin' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-indigo-50 text-indigo-400 hover:bg-indigo-600 hover:text-white'}`}
                      title="Сменить ранг"
                    >
                      <ShieldCheck className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="promo"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="flex bg-white p-1.5 rounded-2xl border border-indigo-100 shadow-sm w-fit">
              <button
                onClick={() => setPromoTab('create')}
                className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${promoTab === 'create' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`}
              >
                Создать
              </button>
              <button
                onClick={() => setPromoTab('list')}
                className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${promoTab === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`}
              >
                Список
              </button>
              <button
                onClick={() => setPromoTab('generator')}
                className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${promoTab === 'generator' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`}
              >
                Генератор
              </button>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border border-indigo-100 shadow-xl shadow-indigo-100/50">
              {promoTab === 'create' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-indigo-400">Название</label>
                      <input
                        type="text"
                        value={promoName}
                        onChange={(e) => setPromoName(e.target.value)}
                        placeholder="COOLCAT2024"
                        className="w-full bg-indigo-50 border-2 border-indigo-100 rounded-2xl px-6 py-4 font-bold text-indigo-900 focus:border-indigo-600 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-indigo-400">Сумма (CAT)</label>
                      <input
                        type="number"
                        value={promoAmount}
                        onChange={(e) => setPromoAmount(Number(e.target.value))}
                        className="w-full bg-indigo-50 border-2 border-indigo-100 rounded-2xl px-6 py-4 font-bold text-indigo-900 focus:border-indigo-600 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-indigo-400">Активаций</label>
                      <input
                        type="number"
                        value={promoActivations}
                        onChange={(e) => setPromoActivations(Number(e.target.value))}
                        className="w-full bg-indigo-50 border-2 border-indigo-100 rounded-2xl px-6 py-4 font-bold text-indigo-900 focus:border-indigo-600 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-indigo-400">Вагер (множитель отыгрыша)</label>
                      <input
                        type="number"
                        value={promoWager}
                        onChange={(e) => setPromoWager(Number(e.target.value))}
                        className="w-full bg-indigo-50 border-2 border-indigo-100 rounded-2xl px-6 py-4 font-bold text-indigo-900 focus:border-indigo-600 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handleCreatePromo(promoName, promoAmount, promoActivations, promoWager)}
                    className="md:col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-indigo-200 uppercase tracking-widest text-sm"
                  >
                    Создать промокод
                  </button>
                </div>
              )}

              {promoTab === 'list' && (
                <div className="space-y-4">
                  {promoCodes.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100">
                      <div>
                        <p className="text-xl font-black text-indigo-900">{p.code}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                          {p.amount} CAT • x{p.wager} Вагер • {p.activations} / {p.maxActivations} Акт.
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          await deleteDoc(doc(db, 'promoCodes', p.id));
                          setPromoCodes(promoCodes.filter(pc => pc.id !== p.id));
                        }}
                        className="p-3 bg-white text-red-400 hover:text-red-600 rounded-xl shadow-sm transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {promoTab === 'generator' && (
                <div className="text-center space-y-8 py-12">
                  <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto border-4 border-dashed border-indigo-200">
                    <Zap className="w-12 h-12 text-indigo-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-indigo-900">Быстрый промокод</h3>
                    <p className="text-slate-400 font-medium">30 CAT • 100 активаций • x15 вагер</p>
                  </div>
                  <button
                    onClick={generatePromo}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-indigo-200"
                  >
                    Сгенерировать сейчас
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
