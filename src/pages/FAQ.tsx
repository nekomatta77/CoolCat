import { 
  HelpCircle, ShieldCheck, Zap, MessageCircle, ArrowRight, 
  Wallet, Users, Terminal, Lock 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function FAQ() {
  const faqs = [
    {
      icon: Wallet,
      title: 'Как пополнить счет?',
      content: 'На мобильных устройствах в нижней панели есть кнопка плюса для перехода в пополнения. На десктопе в верхней панели — кнопки около вашего баланса. Укажите сумму, и вас перебросит на агрегатор для безопасной оплаты. Внутри CoolCat курс стабилен: 1 CAT = 1 RUB.'
    },
    {
      icon: ShieldCheck,
      title: 'Возрастные ограничения',
      content: 'Играть в CoolCat могут только лица, достигшие 18 лет! Если вам меньше 18, пожалуйста, немедленно покиньте наш проект.'
    },
    {
      icon: Users,
      title: 'Аккаунты и рефералы',
      content: 'Разрешено иметь только 1 учетную запись. Создание мультиаккаунтов, регистрация по своей реферальной ссылке, сговоры с игроками и использование фейков строго запрещены. Нарушение ведет к блокировке всех связанных профилей.'
    },
    {
      icon: Zap,
      title: 'Финансы и выводы',
      content: 'Используйте только личные реквизиты. Транзитные операции (депозит и моментальный вывод без игры) запрещены — такие выплаты отменяются. Проект не является финансовым сервисом, а внутренний баланс — собственность CoolCat.'
    },
    {
      icon: Terminal,
      title: 'Честная игра',
      content: 'Использование софта, ботов, автокликеров и консольных команд строго запрещено. Злоупотребление бонусной системой ведет к бану. Если нашли баг или уязвимость — сообщите в поддержку, и мы вознаградим вас за честность!'
    },
    {
      icon: Lock,
      title: 'Безопасность профиля',
      content: 'Никогда не передавайте доступ к своему аккаунту третьим лицам. Вход в аккаунт с устройства знакомых или вывод на чужие реквизиты рассматривается как передача доступа и может привести к вечной блокировке всех бонусов или аккаунта.'
    },
    {
      icon: MessageCircle,
      title: 'Правила чата',
      content: 'Мы за дружелюбное комьюнити! В чате CoolCat запрещены: спам, попрошайничество, оскорбления, продажа "тактик" или услуг по раскрутке баланса. За нарушение выдается ограничение на отправку сообщений или полная блокировка.'
    },
    {
      icon: HelpCircle,
      title: 'Как начать играть?',
      content: 'Просто войдите в аккаунт, получите начальный баланс и выберите любую игру на главной странице. Все игры основаны на криптографическом хешировании (Provably Fair), что гарантирует абсолютную честность каждого раунда.'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      <header className="flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 bg-brand-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-brand-200 -rotate-6">
          <HelpCircle className="w-10 h-10 text-white" />
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Правила и FAQ</h1>
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
            <Link to="/contacts" className="bg-white text-brand-600 px-12 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-50 transition-all shadow-xl inline-flex items-center gap-3 group">
              Связаться с нами <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}