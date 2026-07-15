// src/components/DepositModal.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, ArrowUpRight, ArrowDownLeft, Wallet, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';

// ==========================================
// НАСТРОЙКИ ПЛАТЕЖНЫХ СИСТЕМ
// imgSize - настройка размера картинки (Tailwind классы)
// ==========================================

const DEPOSIT_METHODS = [
  { id: 'card', name: 'Банковская карта', icon: '/assets/pay/card.svg', min: 100, fee: '0%', imgSize: 'w-30 h-30' },
  { id: 'sbp', name: 'СБП', icon: '/assets/pay/sbp.svg', min: 100, fee: '0%', imgSize: 'w-30 h-30' },
  { id: 'yoomoney', name: 'YooMoney', icon: '/assets/pay/yoomoney.svg', min: 50, fee: '2%', imgSize: 'w-30 h-30' },
  { id: 'fkwallet', name: 'FKWallet', icon: '/assets/pay/fkwallet.svg', min: 50, fee: '0%', imgSize: 'w-30 h-30' },
];

const WITHDRAW_METHODS = [
  { id: 'card', name: 'Банковская карта', icon: '/assets/pay/card.svg', min: 1000, fee: '2%', imgSize: 'w-25 h-25' },
  { id: 'sbp', name: 'СБП', icon: '/assets/pay/sbp.svg', min: 500, fee: '1%', imgSize: 'w-25 h-25' },
  { id: 'yoomoney', name: 'YooMoney', icon: '/assets/pay/yoomoney.svg', min: 100, fee: '3%', imgSize: 'w-25 h-25' },
  { id: 'fkwallet', name: 'FKWallet', icon: '/assets/pay/fkwallet.svg', min: 50, fee: '0%', imgSize: 'w-25 h-25' }, // ВЕРНУЛИ FKWALLET
];

// ==========================================

// Моковые данные: История и Сохраненные реквизиты
const HISTORY = [
  { id: 1, type: 'deposit', method: 'card', amount: 1500, status: 'success', date: '14 Июл, 14:32' },
  { id: 2, type: 'withdraw', method: 'sbp', amount: 500, status: 'pending', date: '13 Июл, 09:15' },
  { id: 3, type: 'deposit', method: 'fkwallet', amount: 300, status: 'success', date: '10 Июл, 21:00' },
];

const SAVED_REQS = [
  { id: 1, name: 'Моя основная карта', method: 'card', val: '4276 8800 5553 3535' },
  { id: 2, name: 'СБП (Сбербанк)', method: 'sbp', val: '+7 (999) 123-45-67' },
  { id: 3, name: 'СБП (Тинькофф)', method: 'sbp', val: '+7 (900) 000-11-22' },
  { id: 4, name: 'FKWallet Основной', method: 'fkwallet', val: 'F123456789' },
];

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  initialTab?: 'deposit' | 'withdraw';
}

export default function DepositModal({ isOpen, onClose, user, initialTab = 'deposit' }: DepositModalProps) {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>(initialTab);
  
  const currentMethods = activeTab === 'deposit' ? DEPOSIT_METHODS : WITHDRAW_METHODS;
  const [activeMethod, setActiveMethod] = useState(currentMethods[0]?.id);
  
  const [amount, setAmount] = useState('1000');
  const [requisites, setRequisites] = useState('');

  const handleTabChange = (tab: 'deposit' | 'withdraw') => {
    setActiveTab(tab);
    setRequisites('');
    setActiveMethod(tab === 'deposit' ? DEPOSIT_METHODS[0].id : WITHDRAW_METHODS[0].id);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} 
        />
        
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} 
          className="relative bg-white rounded-[2rem] w-full max-w-5xl flex flex-col lg:flex-row overflow-hidden shadow-2xl z-10 max-h-[90vh]"
        >
          {/* ЛЕВАЯ ЧАСТЬ: Настройки транзакции */}
          <div className="flex-1 p-6 lg:p-10 flex flex-col overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Wallet className="w-6 h-6 text-brand-500" />
                Касса
              </h2>
              <button onClick={onClose} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8 shrink-0">
              <button 
                onClick={() => handleTabChange('deposit')}
                className={cn("flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition-all", activeTab === 'deposit' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}
              >
                Пополнить
              </button>
              <button 
                onClick={() => handleTabChange('withdraw')}
                className={cn("flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition-all", activeTab === 'withdraw' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}
              >
                Вывести
              </button>
            </div>

            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Способ {activeTab === 'deposit' ? 'пополнения' : 'вывода'}</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8 shrink-0">
              {currentMethods.map(method => (
                <button 
                  key={method.id}
                  onClick={() => { setActiveMethod(method.id); setRequisites(''); }}
                  className={cn(
                    "relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all group",
                    activeMethod === method.id 
                      ? "border-brand-500 bg-brand-50 shadow-md shadow-brand-500/20" 
                      : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                  )}
                >
                  {/* ИСПОЛЬЗУЕМ НАСТРОЙКУ РАЗМЕРА ИЗ МАССИВА */}
                  <div className={cn("mb-3 flex items-center justify-center", method.imgSize || "w-12 h-12")}>
                    <img src={method.icon} alt={method.name} className="w-full h-full object-contain drop-shadow-sm" onError={(e) => (e.currentTarget.src = '/assets/CoolCat_logo.webp')} />
                  </div>
                  <p className={cn("text-[11px] lg:text-xs font-black tracking-tight mb-1 text-center", activeMethod === method.id ? "text-brand-600" : "text-slate-600")}>{method.name}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Мин: <span className={activeMethod === method.id ? "text-brand-500" : "text-slate-500"}>{method.min}</span> | Ком: <span className={activeMethod === method.id ? "text-brand-500" : "text-slate-500"}>{method.fee}</span></p>
                </button>
              ))}
            </div>

            {activeTab === 'withdraw' && (
              <div className="mb-6 shrink-0">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Ваши Реквизиты</h3>
                <input 
                  type="text" 
                  value={requisites}
                  onChange={(e) => setRequisites(e.target.value)}
                  placeholder={activeMethod === 'card' ? "0000 0000 0000 0000" : activeMethod === 'sbp' ? "+7 (999) 000-00-00" : "Введите номер кошелька или карты"}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-900 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            )}

            <div className="mb-8 shrink-0">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Сумма (CAT)</h3>
              <div className="relative mb-3">
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-2xl font-black text-slate-900 focus:outline-none focus:border-brand-500 transition-colors"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-slate-300">CAT</span>
              </div>
              <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                {[500, 1000, 2500, 5000].map(val => (
                  <button key={val} onClick={() => setAmount(val.toString())} className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap">
                    +{val}
                  </button>
                ))}
              </div>
            </div>

            <button className="mt-auto shrink-0 w-full bg-brand-500 hover:bg-brand-600 text-white font-black uppercase tracking-widest py-5 rounded-2xl transition-all shadow-lg shadow-brand-500/30 active:scale-95 flex items-center justify-center gap-2">
              {activeTab === 'deposit' ? <><ArrowDownLeft className="w-5 h-5" /> Оплатить</> : <><ArrowUpRight className="w-5 h-5" /> Создать заявку</>}
            </button>
          </div>

          {/* ПРАВАЯ ЧАСТЬ: История и Шаблоны */}
          <div className="bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-100 p-6 lg:p-8 w-full lg:w-[350px] flex flex-col gap-8 h-auto lg:h-[700px] overflow-y-auto custom-scrollbar">
            {activeTab === 'withdraw' && (
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Мои реквизиты</h3>
                <div className="space-y-3">
                  {SAVED_REQS.filter(r => r.method === activeMethod).length === 0 ? (
                     <p className="text-xs text-slate-400 font-medium bg-white p-4 rounded-xl border border-slate-100 text-center">Нет сохраненных реквизитов для выбранного способа</p>
                  ) : (
                    SAVED_REQS.filter(r => r.method === activeMethod).map(req => (
                      <button key={req.id} onClick={() => setRequisites(req.val)} className="w-full text-left bg-white border border-slate-200 p-3 rounded-xl hover:border-brand-500 hover:shadow-md transition-all group">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-brand-500 mb-1">{req.name}</p>
                        <p className="text-sm font-black text-slate-800 tracking-tight">{req.val}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">История {activeTab === 'deposit' ? 'пополнений' : 'выводов'}</h3>
              <div className="space-y-3">
                 {HISTORY.filter(h => h.type === activeTab).length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium text-center py-4">Список пуст</p>
                 ) : (
                    HISTORY.filter(h => h.type === activeTab).map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3">
                           <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", item.type === 'deposit' ? "bg-emerald-100 text-emerald-600" : "bg-brand-100 text-brand-600")}>
                              {item.type === 'deposit' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                           </div>
                           <div>
                             <p className="text-sm font-black text-slate-800">{item.amount} CAT</p>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.date}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.status === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                          {item.status === 'pending' && <Clock className="w-5 h-5 text-amber-500" />}
                        </div>
                      </div>
                    ))
                 )}
              </div>
            </div>
            
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}