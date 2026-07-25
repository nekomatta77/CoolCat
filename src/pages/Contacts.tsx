import { MessageCircle, Send, Mail, MapPin, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useState, useEffect } from 'react';
import { Phone } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Оригинальная иконка VK (адаптированная под стиль Lucide)
function VkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      xmlns="http://www.w3.org/2000/svg" 
      {...props}
    >
      <path d="M15.073 21.053c-8.47 0-13.315-5.835-13.315-15.54h4.156c0 7.375 2.923 10.415 5.143 11.041v-11.04h3.94v6.311c2.18-.24 4.568-2.585 5.35-5.328h3.945c-.538 3.51-3.21 6.066-5.112 7.15 1.902.88 4.908 3.09 5.86 7.406h-4.3c-.71-2.924-3.13-5.188-5.683-5.504v5.504h-4.084z" />
    </svg>
  );
}

export default function Contacts() {
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const contacts = [
    { icon: VkIcon, label: 'ВКонтакте', value: 'vk.com/coolcat_casino', color: 'bg-[#2787f5]', link: 'https://vk.com/coolcat_casino' },
    { icon: Send, label: 'Telegram', value: '@CoolCat_Support', color: 'bg-sky-500', link: 'https://t.me/CoolCat_Support' },
    { icon: Mail, label: 'Email', value: 'CoolCatSup@mail.ru', color: 'bg-brand-600', copy: 'CoolCatSup@mail.ru' },
  ];

  const handleContactClick = (contact: typeof contacts[0]) => {
    if (contact.link) {
      window.open(contact.link, '_blank');
    } else if (contact.copy) {
      navigator.clipboard.writeText(contact.copy);
      setNotification('Почта скопирована в буфер обмена!');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12 relative">
      
      {/* Уведомление о копировании */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto z-100 px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-center gap-3 border backdrop-blur-md bg-emerald-50/95 border-emerald-200 text-emerald-600"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="font-bold text-sm">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-5 lg:p-8 rounded-4xl md:rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 max-w-7xl mx-auto mb-6 md:space-y-0">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-center md:text-left w-full">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-linear-to-br from-brand-400 to-brand-600 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-xl shadow-brand-200 shrink-0">
            <Phone className="w-7 h-7 md:w-8 md:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter">Контакты</h1>
            <p className="text-slate-400 font-medium text-xs md:text-sm mt-1">Свяжись с нашей службой поддержки, мы всегда рады помочь.</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {contacts.map((contact, i) => (
          <motion.div
            key={i}
            onClick={() => handleContactClick(contact)}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 xl:p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col xl:flex-row items-center gap-6 text-center xl:text-left group hover:shadow-brand-100/50 transition-all hover:border-brand-200 cursor-pointer"
          >
            <div className={cn(
              "w-16 h-16 rounded-2xl flex shrink-0 items-center justify-center shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-6",
              contact.color,
              "shadow-brand-100"
            )}>
              <contact.icon className="w-8 h-8 text-white" />
            </div>
            <div className="w-full">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{contact.label}</p>
              <p className="text-lg xl:text-xl font-black text-slate-900 tracking-tight group-hover:text-brand-600 transition-colors wrap-break-word">
                {contact.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <section className="bg-white p-10 lg:p-16 rounded-[4rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-10 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-brand-50 rounded-full blur-3xl opacity-50" />
        <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-brand-50 rounded-full blur-3xl opacity-50" />
        
        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6 text-brand-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Наш офис</h2>
          </div>
          <p className="text-slate-400 text-xl font-bold leading-relaxed max-w-3xl">
            Штаб-квартира CoolCat находится в самом центре Германии. Всегда рады видеть наших партнеров и преданных игроков!
          </p>
          <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 font-black text-slate-900 text-lg shadow-inner inline-block">
            Friedrichstraße 176-179, 10117 Берлин, Германия
          </div>
        </div>
      </section>
    </div>
  );
}