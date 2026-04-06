import { X, Wallet } from 'lucide-react';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DepositModal({ isOpen, onClose }: DepositModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Затемненный фон с размытием */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Само окно */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Шапка модалки */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Пополнение баланса</h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Тело модалки */}
        <div className="p-6 flex flex-col gap-4">
          <div className="text-center py-10">
            <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-10 h-10 text-brand-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Выберите метод оплаты</h3>
            <p className="text-slate-500 text-sm">Здесь скоро появятся платежные системы, крипта и карты.</p>
          </div>
        </div>

      </div>
    </div>
  );
}