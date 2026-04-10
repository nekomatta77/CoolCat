import { useState, useEffect } from 'react';
import { X, Wallet, CreditCard, Banknote } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DepositModalProps {
  isOpen: boolean;
  type: 'deposit' | 'withdraw';
  onClose: () => void;
}

export default function DepositModal({ isOpen, type, onClose }: DepositModalProps) {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>(type);

  // Синхронизируем стейт таба при открытии модалки разными кнопками
  useEffect(() => {
    setActiveTab(type);
  }, [type, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Затемненный фон с размытием */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Само окно */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        
        {/* Шапка модалки: Кнопка закрытия */}
        <div className="absolute top-4 right-4 z-10">
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* Вкладки: Пополнить / Вывести */}
        <div className="flex border-b border-slate-100 bg-slate-50 pt-2 px-2">
          <button 
            onClick={() => setActiveTab('deposit')} 
            className={cn(
              "flex-1 py-4 text-sm font-black uppercase tracking-widest rounded-t-2xl transition-all relative z-0", 
              activeTab === 'deposit' ? "bg-white text-brand-600 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]" : "text-slate-400 hover:text-slate-600"
            )}
          >
             Пополнить
             {activeTab === 'deposit' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('withdraw')} 
            className={cn(
              "flex-1 py-4 text-sm font-black uppercase tracking-widest rounded-t-2xl transition-all relative z-0", 
              activeTab === 'withdraw' ? "bg-white text-slate-900 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]" : "text-slate-400 hover:text-slate-600"
            )}
          >
             Вывести
             {activeTab === 'withdraw' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />}
          </button>
        </div>
        
        {/* Тело модалки */}
        <div className="p-8 flex flex-col gap-4">
          <div className="text-center py-8 space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-2 border border-slate-100 rotate-3">
              {activeTab === 'deposit' 
                ? <CreditCard className="w-10 h-10 text-brand-500" />
                : <Banknote className="w-10 h-10 text-slate-700" />
              }
            </div>
            <h3 className="text-xl font-black text-slate-800">
              {activeTab === 'deposit' ? 'Выберите метод оплаты' : 'Куда выводим средства?'}
            </h3>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">
              Модуль транзакций находится в разработке. Здесь скоро появятся банковские карты, СБП и криптокошельки.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}