import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';

export default function OnlineCounter() {
  const [online, setOnline] = useState(0);

  useEffect(() => {
    const updateOnline = () => {
      const now = Date.now();
      
      // 🔮 МАГИЯ СИНХРОНИЗАЦИИ: Используем математическую функцию на основе времени (миллисекунд).
      // Это гарантирует, что у КАЖДОГО пользователя на планете будет отображаться
      // абсолютно одинаковая цифра в одну и ту же секунду без нагрузки на Базу Данных!
      
      const base = 75; // Средний онлайн
      
      // Создаем три разные синусоидные волны, чтобы график казался случайным и живым
      const wave1 = Math.sin(now / 20000) * 20;  // Медленная волна (вверх-вниз на 20 чел)
      const wave2 = Math.sin(now / 5000) * 8;    // Быстрая волна (вверх-вниз на 8 чел)
      const wave3 = Math.sin(now / 85000) * 15;  // Долгий тренд (смена онлайна днем/вечером)
      
      // Складываем их вместе
      const fakeOnline = Math.floor(base + wave1 + wave2 + wave3);
      
      // Гарантируем, что число не будет ниже 40 или выше 120
      const clampedOnline = Math.max(40, Math.min(120, fakeOnline));
      
      setOnline(clampedOnline + 1); // +1 это сам пользователь
    };

    updateOnline();
    // Обновляем плавно каждую секунду
    const interval = setInterval(updateOnline, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-between bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl shadow-sm transition-all hover:bg-slate-100 w-full group">
      <div className="flex items-center gap-3">
        <div className="relative flex h-2.5 w-2.5 items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </div>
        <span className="font-bold text-slate-600 text-sm group-hover:text-slate-800 transition-colors">
          Онлайн
        </span>
      </div>
      
      <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-100 shadow-sm">
        <Users className="w-3.5 h-3.5 text-brand-500" />
        <span className="font-black text-slate-900 text-sm tabular-nums tracking-tight">
          {online}
        </span>
      </div>
    </div>
  );
}