import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Lock, Cat } from 'lucide-react';
import { collection, addDoc, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';
import { FRAMES, PREFIXES } from '../lib/customization';

interface ChatProps {
  user: UserProfile;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}

interface ChatMessage {
  id: string;
  uid: string;
  nickname: string;
  avatar: string;
  rank: string;
  level: number;
  text: string;
  createdAt: string;
  // Добавлены поля кастомизации
  frame: string;
  prefix: string;
}

export default function Chat({ user, isOpen, setIsOpen }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setMessages(msgs.reverse()); 
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || (user.level || 0) < 1) return;

    try {
      await addDoc(collection(db, 'messages'), {
        uid: user.uid,
        nickname: user.nickname,
        avatar: user.avatar,
        rank: user.rank || 'user',
        level: user.level || 0,
        text: newMessage.trim(),
        createdAt: new Date().toISOString(),
        // Отправляем в чат надетые шмотки
        frame: user.equippedFrame || 'none',
        prefix: user.equippedPrefix || 'none'
      });
      setNewMessage('');
    } catch (error) {
      console.error("Ошибка отправки сообщения:", error);
    }
  };

  const isLocked = (user.level || 0) < 1;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-[90] hidden lg:flex items-center justify-center w-16 h-16 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group",
          isOpen ? "opacity-0 pointer-events-none scale-75" : "opacity-100 scale-100 bg-brand-600 shadow-brand-300 hover:shadow-brand-400"
        )}
      >
        <MessageCircle className="w-7 h-7 text-white group-hover:animate-bounce" />
        <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-pulse" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-0 right-0 lg:bottom-6 lg:right-6 z-[100] w-full lg:w-[400px] h-[80vh] lg:h-[600px] max-h-screen bg-white lg:rounded-[2rem] rounded-t-[2rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
          >
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0 relative z-10 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 leading-tight text-lg">Чат Котиков</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Онлайн</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scroll-smooth relative pb-20 lg:pb-4">
              {isLocked ? (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-center p-6">
                  <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                    <Lock className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">Чат заблокирован</h3>
                  <p className="text-slate-500 font-medium text-sm leading-relaxed">
                    Общение доступно только опытным котикам. <br/>
                    Достигните <span className="font-black text-brand-600">1-го уровня</span> (депозит от 100 CAT), чтобы писать и читать сообщения.
                  </p>
                </div>
              ) : (
                <>
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                      <Cat className="w-12 h-12 mb-2" />
                      <p className="font-bold text-sm">Здесь пока тихо...</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const msgFrameObj = FRAMES.find(f => f.id === msg.frame) || FRAMES[0];
                      const msgPrefixObj = PREFIXES.find(p => p.id === msg.prefix);

                      return (
                        <div key={msg.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                          
                          {/* АВАТАРКА ОТПРАВИТЕЛЯ С РАМКОЙ */}
                          <div className="relative w-10 h-10 shrink-0 flex items-center justify-center mt-1">
                            <div className={cn("absolute inset-0 rounded-xl overflow-hidden border-2 shadow-sm", msgFrameObj.css, msgFrameObj.id === 'none' && 'border-slate-200')}>
                              <img src={msg.avatar || '/assets/avatars/ava1.webp'} alt="avatar" className="w-full h-full object-cover bg-white" />
                            </div>
                            {msgFrameObj.img && (
                               <img src={msgFrameObj.img} className="absolute w-[130%] h-[130%] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain pointer-events-none z-10" />
                            )}
                          </div>
                          
                          <div className="flex flex-col flex-1 min-w-0">
                            {/* ПРЕФИКС И ИМЯ */}
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                              {msgPrefixObj && msgPrefixObj.id !== 'none' && (
                                <span className={cn("text-[8px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded-md", msgPrefixObj.color)}>
                                  {msgPrefixObj.name}
                                </span>
                              )}
                              <span className="font-black text-slate-900 text-sm tracking-tight truncate">{msg.nickname}</span>
                              <span className={cn(
                                "text-[9px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded-md",
                                msg.rank === 'admin' ? "bg-brand-50 text-brand-600" : "bg-slate-100 text-slate-400"
                              )}>
                                LVL {msg.level}
                              </span>
                              <span className="text-[10px] text-slate-300 font-bold ml-auto">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            
                            <div className={cn(
                              "px-4 py-2.5 rounded-2xl text-sm font-medium w-fit max-w-[280px] break-words shadow-sm border",
                              msg.uid === user.uid 
                                ? "bg-brand-600 text-white rounded-tr-sm border-brand-500" 
                                : "bg-white text-slate-700 rounded-tl-sm border-slate-100"
                            )}>
                              {msg.text}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
              <form onSubmit={handleSendMessage} className="relative flex items-center">
                <input
                  type="text"
                  placeholder={isLocked ? "Доступно с 1-го уровня..." : "Написать сообщение..."}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={isLocked}
                  maxLength={150}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-5 pr-14 py-4 font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-400 focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isLocked}
                  className="absolute right-2 top-2 bottom-2 w-10 bg-brand-600 text-white rounded-xl flex items-center justify-center transition-all hover:bg-brand-700 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400"
                >
                  <Send className="w-4 h-4 -ml-0.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}