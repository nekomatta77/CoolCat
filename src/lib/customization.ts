// src/lib/customization.ts

// === ЦВЕТА ПРОФИЛЯ ===
export const COLORS = [
  { id: 'brand', name: 'Фирменный', value: '#6366f1' },
  { id: 'rose', name: 'Розовый', value: '#f43f5e' },
  { id: 'emerald', name: 'Изумрудный', value: '#10b981' },
  { id: 'amber', name: 'Янтарный', value: '#f59e0b' },
  { id: 'violet', name: 'Фиолетовый', value: '#8b5cf6' },
  { id: 'cyan', name: 'Бирюзовый', value: '#06b6d4' },
  { id: 'slate', name: 'Серый', value: '#64748b' }
];

// === АВАТАРКИ ===
export const AVATARS = [
  // Базовые
  { id: '/assets/avatars/ava1.webp', type: 'avatar', name: 'Базовая 1', unlockType: 'default', config: { x: 0, y: 0, scale: 1 } },
  { id: '/assets/avatars/ava2.webp', type: 'avatar', name: 'Базовая 2', unlockType: 'default', config: { x: 0, y: 0, scale: 1 } },
  { id: '/assets/avatars/ava3.webp', type: 'avatar', name: 'Базовая 3', unlockType: 'default', config: { x: 0, y: 0, scale: 1 } },
  
  // За уровни
  { id: '/assets/avatars/storm.webp', type: 'avatar', name: 'Гроза', unlockType: 'level', unlockValue: 6, config: { x: 0, y: 0, scale: 1.3 } },
  
  // За достижения: DICE
  { id: '/assets/avatars/ava_dice.webp', type: 'avatar', name: 'DICE CAT', unlockType: 'achievement', unlockValue: 'dice_fb1', config: { x: 0, y: 0, scale: 1.15 } },
  { id: '/assets/avatars/nine.webp', type: 'avatar', name: '9 Жизней', unlockType: 'achievement', unlockValue: 'dice_nine_lives', config: { x: 0, y: 0, scale: 2 } },
  
  // За достижения: MINES
  { id: '/assets/avatars/bomb.webp', type: 'avatar', name: 'Кот-сапёр', unlockType: 'achievement', unlockValue: 'mines_sapper3', config: { x: 0, y: 0, scale: 1.3 } },
  { id: '/assets/avatars/find.webp', type: 'avatar', name: 'Искатель', unlockType: 'achievement', unlockValue: 'mines_kitty4', config: { x: 0, y: -5, scale: 1.14 } },
  { id: '/assets/avatars/astrocat.webp', type: 'avatar', name: 'Астрокот', unlockType: 'achievement', unlockValue: 'mines_infinity2', config: { x: 0, y: 0, scale: 1.15 } },
  
  // За достижения: KENO
  { id: '/assets/avatars/brain_cat.webp', type: 'avatar', name: 'Счастливое число', unlockType: 'achievement', unlockValue: 'keno_lucky_num', config: { x: 0, y: 0, scale: 1.5 } },
  { id: '/assets/avatars/magic_cat.webp', type: 'avatar', name: 'Маг', unlockType: 'achievement', unlockValue: 'keno_nostracat', config: { x: 0, y: 0, scale: 1.3 } },
  
  // За достижения: WHEELX
  { id: '/assets/avatars/money_cat.webp', type: 'avatar', name: 'Жадность', unlockType: 'achievement', unlockValue: 'wx_greedy', config: { x: 0, y: 0, scale: 1 } },
  { id: '/assets/avatars/meditation_cat.webp', type: 'avatar', name: 'Терпение', unlockType: 'achievement', unlockValue: 'wx_why_not', config: { x: 0, y: 5, scale: 1.2 } },
  
  // За достижения: ARENA
  { id: '/assets/avatars/fight_cat.webp', type: 'avatar', name: 'Арена', unlockType: 'achievement', unlockValue: 'arena_underdog', config: { x: 0, y: 0, scale: 1.15 } }
];

export const FRAMES = [
  { id: 'none', name: 'Без рамки', css: 'border-transparent', unlockType: 'default' },
  { id: 'bronze', name: 'Бронзовая', css: 'border-[#cd7f32] shadow-[#cd7f32]/50', unlockType: 'level', unlockValue: 2 },
  { id: 'silver', name: 'Серебряная', css: 'border-slate-300 shadow-slate-300/50', unlockType: 'level', unlockValue: 4 },
  { id: 'gold', name: 'Золотая', css: 'border-amber-400 shadow-amber-400/50', unlockType: 'level', unlockValue: 7 },
  { id: 'platinum', name: 'Платиновая', css: 'border-cyan-300 shadow-cyan-300/50', unlockType: 'level', unlockValue: 10 },
  { id: 'legend', name: 'Легенда', css: 'border-rose-500 shadow-rose-500/50', unlockType: 'level', unlockValue: 15 },
  { id: 'dice_frame', name: 'Рамка DICE', css: 'border-transparent', img: '/assets/frame/dice_frame.webp', unlockType: 'achievement', unlockValue: 'dice_cat_sense' },
];

export const BACKGROUNDS = [
  { id: 'default', name: 'Стандартный', gradient: 'bg-gradient-to-br from-slate-100 to-slate-200', textColor: 'text-slate-900', subTextColor: 'text-slate-500', unlockType: 'default' },
  { id: 'exclusive', name: 'Эксклюзив', gradient: 'bg-pattern-exclusive', textColor: 'text-white', subTextColor: 'text-white/80', unlockType: 'level', unlockValue: 9 },
  { id: 'dragon', name: 'Котодракон', gradient: 'bg-pattern-dragon', textColor: 'text-white', subTextColor: 'text-white/80', unlockType: 'level', unlockValue: 14 },
  { id: 'dice_bg', name: 'DICE Фон', gradient: 'bg-pattern-dice', textColor: 'text-white', subTextColor: 'text-white/80', unlockType: 'achievement', unlockValue: 'dice_fb3' },
  { id: 'society_bg', name: 'Любимец общества', gradient: 'bg-pattern-hearts', textColor: 'text-slate-900', subTextColor: 'text-slate-600', unlockType: 'achievement', unlockValue: 'jackpot_ticket3' },
  { id: 'crypto_bg', name: 'CRYPTO', gradient: 'bg-pattern-crypto', textColor: 'text-white', subTextColor: 'text-white/80', unlockType: 'achievement', unlockValue: 'gen_crypto_cat' },
];

export const PREFIXES = [
  { id: 'none', name: 'Без префикса', css: 'text-slate-400', unlockType: 'default' },
  { id: 'madness', name: 'БЕЗУМИЕ', css: 'text-rose-500 font-black drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]', unlockType: 'achievement', unlockValue: 'dice_madman' },
  { id: 'prophet', name: 'ПРОРОК', css: 'text-violet-500 font-black drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]', unlockType: 'achievement', unlockValue: 'keno_nostracat' },
  { id: 'midas', name: 'Рука Мидаса', css: 'text-amber-400 font-black drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]', unlockType: 'achievement', unlockValue: 'wx_more' },
  { id: 'gladiator', name: 'ГЛАДИАТОР', css: 'text-rose-500 font-black drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]', unlockType: 'achievement', unlockValue: 'arena_gladiator' },
];