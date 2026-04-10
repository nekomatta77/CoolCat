export const AVATARS = [
  { id: '/assets/avatars/ava1.webp', type: 'default', hint: 'Базовая' },
  { id: '/assets/avatars/ava2.webp', type: 'default', hint: 'Базовая' },
  { id: '/assets/avatars/ava3.webp', type: 'default', hint: 'Базовая' },
  { id: '/assets/ranks/cat_rank6.webp', type: 'level', reqLevel: 6, hint: 'Уровень 6: Гроза' },
  { id: '/assets/avatars/dice_cat_original.webp', type: 'achievement', hint: 'Достижение: DICE CAT' },
  { id: '/assets/avatars/nine_lives.webp', type: 'achievement', hint: 'Достижение: Девять жизней' },
  { id: '/assets/avatars/sapper.webp', type: 'achievement', hint: 'Достижение: Кот-сапёр III' },
  { id: '/assets/avatars/i_find.webp', type: 'achievement', hint: 'Достижение: В поисках кисы IV' },
  { id: '/assets/avatars/buzz_cat.webp', type: 'achievement', hint: 'Достижение: Бесконечность не предел II' },
  { id: '/assets/avatars/paw.webp', type: 'achievement', hint: 'Достижение: Первая линия III' },
  { id: '/assets/avatars/numbers.webp', type: 'achievement', hint: 'Достижение: Счастливое число' },
  { id: '/assets/avatars/magic_cat.webp', type: 'achievement', hint: 'Достижение: Ностракотус' },
  { id: '/assets/avatars/my_precious.webp', type: 'achievement', hint: 'Достижение: Жадный (WheelX)' },
  { id: '/assets/avatars/patience.webp', type: 'achievement', hint: 'Достижение: Почему бы и нет? (WheelX)' },
  { id: '/assets/avatars/tiger.webp', type: 'achievement', hint: 'Достижение: Азартный хищник (Jackpot)' },
];

export const FRAMES = [
  { id: 'none', name: 'Без рамки', reqLevel: 0, css: 'border-transparent' },
  { id: 'bronze', name: 'Бронзовая', reqLevel: 2, css: 'border-[#cd7f32] shadow-[0_0_10px_rgba(205,127,50,0.4)]' },
  { id: 'silver', name: 'Серебряная', reqLevel: 4, css: 'border-slate-300 shadow-[0_0_10px_rgba(203,213,225,0.5)]' },
  { id: 'gold', name: 'Золотая', reqLevel: 7, css: 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)]' },
  { id: 'platinum', name: 'Платиновая', reqLevel: 10, css: 'border-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.8)]' },
  { id: 'custom_15', name: 'Легенда', reqLevel: 15, css: 'border-fuchsia-500 shadow-[0_0_25px_rgba(217,70,239,0.8)]' },
  { id: 'dice_frame', name: 'Рамка DICE', reqLevel: 99, isAch: true, hint: 'Достижение: Кошачье чутье', css: 'border-transparent', img: '/assets/frames/dice_frame.webp' },
];

export const PREFIXES = [
  { id: 'none', name: 'Без префикса', reqLevel: 0, color: 'text-slate-400 bg-slate-100' },
  { id: 'diamond', name: 'Бриллиант', reqLevel: 11, color: 'text-cyan-600 bg-cyan-100 border border-cyan-200' },
  { id: 'madness', name: 'БЕЗУМИЕ', reqLevel: 99, isAch: true, hint: 'Достижение: Безумец', color: 'text-rose-600 bg-rose-100 border border-rose-200' },
  { id: 'prophet', name: 'ПРОРОК', reqLevel: 99, isAch: true, hint: 'Достижение: Ностракотус', color: 'text-purple-600 bg-purple-100 border border-purple-200' },
  { id: 'midas', name: 'Рука Мидаса', reqLevel: 99, isAch: true, hint: 'Достижение: Мне нужно больше', color: 'text-amber-600 bg-amber-100 border border-amber-200' },
];

export const BACKGROUNDS = [
  { id: 'default', name: 'Стандартный', reqLevel: 0, gradient: 'from-brand-50 to-transparent' },
  { id: 'exclusive', name: 'Эксклюзив', reqLevel: 9, gradient: 'from-emerald-100 via-teal-50 to-transparent' },
  { id: 'custom_14', name: 'Котодракон', reqLevel: 14, gradient: 'from-rose-100 via-red-50 to-transparent' },
  { id: 'dice_bg', name: 'DICE Фон', reqLevel: 99, isAch: true, hint: 'Достижение: Первый бросок III', gradient: 'from-blue-100 via-indigo-50 to-transparent' },
  { id: 'society_bg', name: 'Любимец общества', reqLevel: 99, isAch: true, hint: 'Достижение: Билет в высшее общество III', gradient: 'from-amber-100 via-yellow-50 to-transparent' },
  { id: 'crypto_bg', name: 'CRYPTO', reqLevel: 99, isAch: true, hint: 'Достижение: Крипто-Кот', gradient: 'from-slate-800 via-slate-700 to-transparent' },
];

export const COLORS = ['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a', '#020617', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81', '#1e1b4b', '#10b981', '#059669', '#047857', '#ef4444', '#dc2626', '#b91c1c'];