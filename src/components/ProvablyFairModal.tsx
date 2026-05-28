// src/components/ProvablyFairModal.tsx
import { X, Copy, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { cn } from '../lib/utils';

interface ProvablyFairModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  hashData: {
    hash: string;
    salt1: string;
    number: number | string;
    salt2: string;
    amount: number;
    percent: string;
    result: number;
  };
}

export default function ProvablyFairModal({ isOpen, onClose, gameId, hashData }: ProvablyFairModalProps) {
  const [copied, setCopied] = useState(false);

  const copyString = `${hashData.salt1}${hashData.number}${hashData.salt2}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(copyString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden z-10 font-mono"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-black text-slate-800 tracking-wider">
              Проверка игры <span className="text-brand-500">#{gameId}</span>
            </h3>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 bg-white rounded-xl shadow-sm border border-slate-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-4">
            {/* Copy String Block */}
            <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 relative group shadow-inner">
              <span className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-1 block">Скопировать для проверки</span>
              <p className="text-sm font-medium text-slate-700 break-all pr-8">
                {copyString}
              </p>
              <button 
                onClick={handleCopy}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-brand-500 hover:bg-brand-100 rounded-lg transition-colors"
              >
                {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            {/* Data Rows */}
            <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-sm">
              <DataRow label="Hash" value={hashData.hash} isBreakAll />
              <DataRow label="Salt1" value={hashData.salt1} />
              <DataRow label="Number" value={hashData.number.toString()} />
              <DataRow label="Salt2" value={hashData.salt2} />
              <DataRow label="Amount" value={hashData.amount.toFixed(2)} />
              <DataRow label="Percent" value={hashData.percent} />
              <DataRow label="Result" value={hashData.result.toFixed(2)} isHighlight={hashData.result > 0} />
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function DataRow({ label, value, isBreakAll = false, isHighlight = false }: { label: string, value: string, isBreakAll?: boolean, isHighlight?: boolean }) {
  return (
    <div className="p-4 bg-white hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-4">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest shrink-0 w-24">
        {label}
      </span>
      <p className={cn(
        "text-sm font-medium text-slate-800",
        isBreakAll && "break-all sm:text-right",
        isHighlight && "font-black text-emerald-500 text-base"
      )}>
        {value}
      </p>
    </div>
  );
}