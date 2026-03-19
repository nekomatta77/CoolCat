import { HelpCircle, ShieldCheck, Zap, Coins, Cat, MessageCircle, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function FAQ() {
  const faqs = [
    {
      icon: HelpCircle,
      title: 'Как начать играть?',
      content: 'Просто войдите через Google, получите начальный баланс и выберите любую игру на главной странице. Удачи!'
    },
    {
      icon: ShieldCheck,
      title: 'Честная ли игра?',
      content: 'Да! Мы используем алгоритмы Provably Fair, основанные на криптографическом хешировании, что гарантирует честность каждого раунда.'
    },
    {
      icon: Zap,
      title: 'Как повысить уровень?',
      content: 'Ваш уровень повышается за счет суммы сделанных ставок. Чем больше вы играете, тем выше ваш уровень и круче бонусы!'
    },
    {
      icon: Coins,
      title: 'Как работают промокоды?',
      content: 'Перейдите в раздел "Бонусы", введите промокод и нажмите "Активировать". Бонус будет мгновенно зачислен на ваш баланс.'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      <header className="flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 bg-brand-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-brand-200 -rotate-6">
          <HelpCircle className="w-10 h-10 text-white" />
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Часто задаваемые вопросы</h1>
          <p className="text-slate-400 text-lg font-medium">Все, что вам нужно знать о CoolCat Casino</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {faqs.map((faq, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-brand-100/50 transition-all group hover:border-brand-200"
          >
            <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-brand-600 group-hover:text-white transition-all duration-500 group-hover:rotate-3">
              <faq.icon className="w-7 h-7 text-brand-600 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight group-hover:text-brand-600 transition-colors">{faq.title}</h3>
            <p className="text-slate-400 leading-relaxed font-bold text-sm">{faq.content}</p>
          </motion.div>
        ))}
      </div>

      <section className="bg-brand-600 rounded-[4rem] p-12 lg:p-20 text-white text-center space-y-8 shadow-2xl shadow-brand-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        
        <div className="relative z-10 space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tighter">Остались вопросы?</h2>
          <p className="text-brand-100 text-lg font-bold max-w-2xl mx-auto leading-relaxed">
            Наша команда поддержки всегда готова помочь вам. Свяжитесь с нами через раздел контактов.
          </p>
          <div className="flex justify-center pt-4">
            <button className="bg-white text-brand-600 px-12 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-50 transition-all shadow-xl flex items-center gap-3 group">
              Связаться с нами <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
