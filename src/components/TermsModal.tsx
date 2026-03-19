import { motion, AnimatePresence } from 'motion/react';
import { X, ScrollText, ShieldCheck, AlertTriangle, Scale, UserCheck } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 lg:p-8 border-bottom border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                  <ScrollText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Условия использования</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Последнее обновление: 19 марта 2026</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-200 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 custom-scrollbar">
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-indigo-600">
                  <UserCheck className="w-5 h-5" />
                  <h3 className="font-black uppercase tracking-widest text-sm">1. Принятие условий</h3>
                </div>
                <p className="text-slate-600 leading-relaxed text-sm font-medium">
                  Регистрируясь в CoolCat Casino, вы подтверждаете, что вам исполнилось 18 лет (или вы достигли возраста совершеннолетия в вашей юрисдикции) и вы полностью согласны с данными Условиями использования. Если вы не согласны с каким-либо пунктом, пожалуйста, прекратите использование сервиса.
                </p>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3 text-indigo-600">
                  <ShieldCheck className="w-5 h-5" />
                  <h3 className="font-black uppercase tracking-widest text-sm">2. Аккаунт и безопасность</h3>
                </div>
                <p className="text-slate-600 leading-relaxed text-sm font-medium">
                  Вы несете полную ответственность за сохранность ваших учетных данных. CoolCat Casino не несет ответственности за любой ущерб, возникший в результате несанкционированного доступа к вашему аккаунту. Один пользователь может иметь только один активный аккаунт. Создание мультиаккаунтов карается перманентной блокировкой всех связанных учетных записей.
                </p>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3 text-indigo-600">
                  <Coins className="w-5 h-5" />
                  <h3 className="font-black uppercase tracking-widest text-sm">3. Виртуальная валюта (CAT)</h3>
                </div>
                <p className="text-slate-600 leading-relaxed text-sm font-medium">
                  Валюта CAT является исключительно виртуальной игровой единицей и не имеет реальной денежной ценности за пределами платформы CoolCat Casino. CAT не могут быть обналичены, проданы или переданы другим пользователям за реальные деньги. Любые попытки торговли игровыми ценностями вне платформы приведут к блокировке.
                </p>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3 text-indigo-600">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="font-black uppercase tracking-widest text-sm">4. Ответственная игра</h3>
                </div>
                <p className="text-slate-600 leading-relaxed text-sm font-medium">
                  CoolCat Casino создано исключительно в развлекательных целях. Мы призываем пользователей играть ответственно. Если вы чувствуете, что игра начинает негативно влиять на вашу жизнь, вы можете воспользоваться функцией самоограничения или обратиться в службу поддержки для временной блокировки аккаунта.
                </p>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3 text-indigo-600">
                  <Scale className="w-5 h-5" />
                  <h3 className="font-black uppercase tracking-widest text-sm">5. Ограничение ответственности</h3>
                </div>
                <p className="text-slate-600 leading-relaxed text-sm font-medium">
                  Сервис предоставляется по принципу "как есть". CoolCat Casino не гарантирует бесперебойную работу платформы и не несет ответственности за технические сбои, потерю данных или прерывание игрового процесса, вызванное внешними факторами. Мы оставляем за собой право изменять коэффициенты и правила игр в любое время.
                </p>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3 text-indigo-600">
                  <X className="w-5 h-5" />
                  <h3 className="font-black uppercase tracking-widest text-sm">6. Нарушения и блокировки</h3>
                </div>
                <p className="text-slate-600 leading-relaxed text-sm font-medium">
                  Использование стороннего ПО, скриптов для автоматизации игры, поиск и эксплуатация багов, а также оскорбительное поведение в чате являются грубыми нарушениями. Администрация оставляет за собой право заблокировать доступ к сервису без объяснения причин в случае подозрения в мошенничестве.
                </p>
              </section>
            </div>

            {/* Footer */}
            <div className="p-6 lg:p-8 bg-slate-50 border-t border-slate-100">
              <button
                onClick={onClose}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-indigo-200 uppercase tracking-widest text-xs"
              >
                Я принимаю условия
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Re-importing missing icons for the component
import { Coins } from 'lucide-react';
