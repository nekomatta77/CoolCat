import { MessageCircle, Send, Mail, Phone, MapPin, Share2, Cat, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Contacts() {
  const contacts = [
    { icon: MessageCircle, label: 'ВКонтакте', value: 'vk.com/coolcat_casino', color: 'bg-blue-500' },
    { icon: Send, label: 'Telegram', value: '@coolcat_support', color: 'bg-sky-500' },
    { icon: Mail, label: 'Email', value: 'support@coolcat.com', color: 'bg-brand-600' },
    { icon: Phone, label: 'Телефон', value: '+7 (999) 000-00-00', color: 'bg-emerald-500' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      <header className="flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 bg-brand-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-brand-200 rotate-3">
          <Phone className="w-10 h-10 text-white" />
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Контакты</h1>
          <p className="text-slate-400 text-lg font-medium">Мы всегда на связи, чтобы помочь вам</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {contacts.map((contact, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center gap-8 group hover:shadow-brand-100/50 transition-all hover:border-brand-200"
          >
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-6",
              contact.color,
              "shadow-brand-100"
            )}>
              <contact.icon className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{contact.label}</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight group-hover:text-brand-600 transition-colors">{contact.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <section className="bg-white p-10 lg:p-16 rounded-[4rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-10 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-brand-50 rounded-full blur-3xl opacity-50" />
        <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-brand-50 rounded-full blur-3xl opacity-50" />
        
        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center">
              <MapPin className="w-6 h-6 text-brand-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Наш офис</h2>
          </div>
          <p className="text-slate-400 text-xl font-bold leading-relaxed max-w-3xl">
            Мы находимся в самом сердце кошачьего города. Заходите к нам на чашечку молока и обсуждение новых игр!
          </p>
          <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 font-black text-slate-900 text-lg shadow-inner">
            ул. Мурлыкающая, д. 7, Котоград, 123456
          </div>
        </div>

        <div className="relative z-10 pt-10 border-t border-slate-100 flex flex-wrap gap-4">
          <button className="flex items-center gap-3 bg-brand-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-700 transition-all shadow-xl shadow-brand-200 group">
            <Share2 className="w-5 h-5" /> Поделиться проектом <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
          </button>
        </div>
      </section>
    </div>
  );
}
