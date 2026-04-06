import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';

export default function OnlineCounter() {
  // Инициализируем "накрученный" онлайн случайным числом от 40 до 120
  const [fakeOnline, setFakeOnline] = useState(() => Math.floor(Math.random() * (120 - 40 + 1)) + 40);
  
  // Имитация реального онлайна (как минимум 1 - сам пользователь)
  const [realOnline] = useState(1);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const updateOnline = () => {
      setFakeOnline(prev => {
        // Имитируем входы и выходы (от -3 до +4 игроков за раз)
        const delta = Math.floor(Math.random() * 8) - 3;
        let newValue = prev + delta;

        // Лимиты, чтобы не выходить за рамки 40-120
        if (newValue < 40) newValue = 40;
        if (newValue > 120) newValue = 120;

        return newValue;
      });

      // Плавающий интервал обновления от 3 до 10 секунд
      const nextUpdateIn = Math.floor(Math.random() * 7000) + 3000;
      timeoutId = setTimeout(updateOnline, nextUpdateIn);
    };

    // Запускаем первый цикл через 5 секунд после загрузки
    timeoutId = setTimeout(updateOnline, 5000);

    // Очищаем таймер при размонтировании
    return () => clearTimeout(timeoutId);
  }, []);

  const totalOnline = fakeOnline + realOnline;

  return (
    <div className="flex items-center justify-between bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl shadow-sm transition-all hover:bg-slate-100 w-full group">
      
      {/* ЛЕВАЯ ЧАСТЬ: Пульсирующая точка и текст */}
      <div className="flex items-center gap-3">
        <div className="relative flex h-2.5 w-2.5 items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </div>
        <span className="font-bold text-slate-600 text-sm group-hover:text-slate-800 transition-colors">
          Онлайн
        </span>
      </div>
      
      {/* ПРАВАЯ ЧАСТЬ: Иконка юзеров и само число */}
      <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-100 shadow-sm">
        <Users className="w-3.5 h-3.5 text-brand-500" />
        <span className="font-black text-slate-900 text-sm tabular-nums tracking-tight">
          {totalOnline}
        </span>
      </div>

    </div>
  );
}