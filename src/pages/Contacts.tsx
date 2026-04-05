import { MessageCircle, Send, Mail, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Оригинальная иконка VK
function VkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="512" cy="512" r="512" fill="#2787f5" />
      <path d="M585.83 271.5H438.17c-134.76 0-166.67 31.91-166.67 166.67v147.66c0 134.76 31.91 166.67 166.67 166.67h147.66c134.76 0 166.67-31.91 166.67-166.67V438.17c0-134.76-32.25-166.67-166.67-166.67zm74 343.18h-35c-13.24 0-17.31-10.52-41.07-34.62-20.71-20-29.87-22.74-35-22.74-7.13 0-9.17 2-9.17 11.88v31.57c0 8.49-2.72 13.58-25.12 13.58-37 0-78.07-22.4-106.93-64.16-43.45-61.1-55.33-116.43 0-5.09 2-9.84 11.88-9.84h35c8.83 0 12.22 4.07 15.61 13.58 17.31 49.9 46.17 93.69 58 93.69 4.41 0 6.45-2 6.45-13.24v-51.6c-1.36-23.76-13.92-25.8-13.92-34.28 0-4.07 3.39-8.15 8.83-8.15h55c7.47 0 10.18 4.07 10.18 12.9v69.58c0 7.47 3.39 10.18 5.43 10.18 4.41 0 8.15-2.72 16.29-10.86 25.12-28.17 43.11-71.62 43.11-71.62 2.38-5.09 6.45-9.84 15.28-9.84h35c10.52 0 12.9 5.43 10.52 12.9-4.41 20.37-47.18 80.79-47.18 80.79-3.73 6.11-5.09 8.83 0 15.61 3.73 5.09 16 15.61 24.1 25.12 14.94 17 26.48 31.23 29.53 41.07 3.45 9.84-1.65 14.93-11.49 14.93z" fill="#fff" />
    </svg>
  );
}

export default function Contacts() {
  const contacts = [
    { icon: VkIcon, label: 'ВКонтакте', value: 'vk.com/coolcat_casino', color: 'bg-[#2787f5]' },
    { icon: Send, label: 'Telegram', value: '@coolcat_support', color: 'bg-sky-500' },
    { icon: Mail, label: 'Email', value: 'support@coolcat.com', color: 'bg-brand-600' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      <header className="flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 bg-brand-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-brand-200 rotate-3">
          <MessageCircle className="w-10 h-10 text-white" />
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Контакты</h1>
          <p className="text-slate-400 text-lg font-medium">Мы всегда на связи, чтобы помочь вам</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {contacts.map((contact, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 xl:p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col xl:flex-row items-center gap-6 text-center xl:text-left group hover:shadow-brand-100/50 transition-all hover:border-brand-200"
          >
            <div className={cn(
              "w-16 h-16 rounded-2xl flex shrink-0 items-center justify-center shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-6",
              contact.color,
              "shadow-brand-100"
            )}>
              <contact.icon className="w-8 h-8 text-white" />
            </div>
            <div className="overflow-hidden w-full">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{contact.label}</p>
              <p className="text-xl xl:text-2xl font-black text-slate-900 tracking-tight group-hover:text-brand-600 transition-colors truncate">{contact.value}</p>
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
      </section>
    </div>
  );
}