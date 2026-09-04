import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { StatusBar, HomeIndicator } from './SharedUI';
import { ChevronLeft, Calendar, Package, MessageCircle, Star, Settings as SettingsIcon, AlertCircle, Send } from 'lucide-react';

const BASE_URL = import.meta.env.BASE_URL;

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 3500), // Itinerary -> Packing
      setTimeout(() => setPhase(2), 6500), // Packing -> Chat
      setTimeout(() => setPhase(3), 9500), // Chat -> Review & Memory
      setTimeout(() => setPhase(4), 13500), // Memory -> Settings/404
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="absolute inset-0 bg-[var(--color-bg-light)] overflow-hidden font-[var(--font-body)] text-[var(--color-text-primary)]">
      <StatusBar />
      <div className="noise-overlay" />
      
      {/* 1. Itinerary (/itinerary/[id]) */}
      <motion.div 
        className="absolute inset-0 z-10 pt-[15cqw]"
        initial={{ opacity: 1, x: 0 }}
        animate={{ 
          x: phase === 0 ? '0%' : '-30%', 
          filter: phase === 0 ? 'blur(0px)' : 'blur(4px)' 
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 180 }}
      >
        <div className="px-[6cqw] flex justify-between items-center mb-[6cqw]">
           <div className="flex items-center gap-[2cqw]">
             <ChevronLeft size="6cqw" />
             <h1 className="font-[var(--font-display)] font-bold text-[7cqw]">Itinerary</h1>
           </div>
           <Calendar size="6cqw" />
        </div>

        <div className="px-[6cqw]">
           <h2 className="font-bold text-[5cqw] mb-[4cqw]">Day 1 <span className="text-[var(--color-text-muted)] font-normal ml-[2cqw]">Tokyo</span></h2>
           
           <div className="relative pl-[8cqw] pb-[8cqw] border-l-2 border-[var(--color-border)] ml-[4cqw]">
              <div className="absolute w-[8cqw] h-[8cqw] bg-[#F15A3A] rounded-full -left-[4.2cqw] top-0 flex items-center justify-center text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[4cqw] h-[4cqw]"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>
              </div>
              <div className="bg-white border border-[var(--color-border)] rounded-[4cqw] p-[4cqw] shadow-sm">
                 <div className="flex justify-between items-start mb-[2cqw]">
                   <span className="text-[var(--color-text-muted)] font-bold text-[3.5cqw]">10:00 AM</span>
                   <span className="bg-[#FFFBEB] text-[#D97706] px-[2cqw] py-[0.5cqw] rounded font-bold text-[3cqw]">★ Sarah's wish</span>
                 </div>
                 <h3 className="font-[var(--font-display)] font-bold text-[5cqw] leading-tight mb-[1cqw]">Tsukiji Outer Market</h3>
                 <p className="text-[var(--color-text-secondary)] text-[3.5cqw]">Explore the best street food spots.</p>
              </div>
           </div>

           <div className="relative pl-[8cqw] pb-[8cqw] border-l-2 border-[var(--color-border)] ml-[4cqw]">
              <div className="absolute w-[8cqw] h-[8cqw] bg-[#9C5544] rounded-full -left-[4.2cqw] top-0 flex items-center justify-center text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[4cqw] h-[4cqw]"><path d="M4 10v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10M4 10h16M4 10a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2M8 4h8M8 8V4M16 8V4"/></svg>
              </div>
              <div className="bg-white border border-[var(--color-border)] rounded-[4cqw] p-[4cqw] shadow-sm">
                 <div className="flex justify-between items-start mb-[2cqw]">
                   <span className="text-[var(--color-text-muted)] font-bold text-[3.5cqw]">2:00 PM</span>
                   <span className="bg-[#F4F1EC] text-[#A8A298] px-[2cqw] py-[0.5cqw] rounded font-bold text-[3cqw]">✦ AI pick</span>
                 </div>
                 <h3 className="font-[var(--font-display)] font-bold text-[5cqw] leading-tight mb-[1cqw]">Senso-ji Temple</h3>
                 <p className="text-[var(--color-text-secondary)] text-[3.5cqw]">Historic Buddhist temple in Asakusa.</p>
              </div>
           </div>
        </div>
      </motion.div>

      {/* 2. Packing List (/packing/[id]) */}
      <motion.div
        className="absolute inset-0 bg-[var(--color-bg-light)] z-20 pt-[15cqw]"
        initial={{ x: '100%' }}
        animate={{ x: phase === 1 ? '0%' : phase > 1 ? '-30%' : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="px-[6cqw] flex items-center gap-[2cqw] mb-[6cqw]">
           <ChevronLeft size="6cqw" />
           <h1 className="font-[var(--font-display)] font-bold text-[7cqw]">Packing</h1>
        </div>

        <div className="px-[6cqw] space-y-[4cqw]">
           <h2 className="font-bold text-[5cqw]">Group items</h2>
           
           <div className="flex items-center gap-[4cqw] py-[3cqw] border-b border-[var(--color-border)]">
             <div className="w-[6cqw] h-[6cqw] rounded-full border-2 border-[var(--color-primary)] bg-[var(--color-primary)] flex items-center justify-center">
               <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-[4cqw] h-[4cqw]"><path d="M20 6L9 17l-5-5"/></svg>
             </div>
             <div className="flex-1">
               <span className="font-bold text-[4cqw] line-through text-[var(--color-text-muted)]">Portable charger</span>
               <p className="text-[3cqw] text-[var(--color-text-muted)]">Alex is bringing this</p>
             </div>
           </div>

           <div className="flex items-center gap-[4cqw] py-[3cqw] border-b border-[var(--color-border)]">
             <div className="w-[6cqw] h-[6cqw] rounded-full border-2 border-[var(--color-border)] bg-white" />
             <div className="flex-1">
               <span className="font-bold text-[4cqw]">Travel adapter</span>
             </div>
             <div className="px-[3cqw] py-[1.5cqw] rounded-full bg-[var(--color-bg-muted)] font-bold text-[3.5cqw]">I'll bring it</div>
           </div>
        </div>
      </motion.div>

      {/* 3. Chat (/chat/[id]) */}
      <motion.div
        className="absolute inset-0 bg-[var(--color-bg-light)] z-30 pt-[15cqw]"
        initial={{ x: '100%' }}
        animate={{ x: phase === 2 ? '0%' : phase > 2 ? '-30%' : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="px-[6cqw] flex items-center gap-[2cqw] mb-[6cqw] border-b border-[var(--color-border)] pb-[4cqw]">
           <ChevronLeft size="6cqw" />
           <div className="flex -space-x-2 mr-[2cqw]">
              <div className="w-[8cqw] h-[8cqw] rounded-full bg-[#F4BC55] border-2 border-[var(--color-bg-light)]" />
              <div className="w-[8cqw] h-[8cqw] rounded-full bg-[#A77BD6] border-2 border-[var(--color-bg-light)]" />
           </div>
           <h1 className="font-bold text-[5cqw]">The Japan Squad</h1>
        </div>

        <div className="px-[6cqw] flex flex-col gap-[4cqw] h-[80cqw] justify-end pb-[20cqw]">
           <div className="self-start bg-[var(--color-bg-muted)] p-[3cqw] rounded-[3cqw] rounded-tl-none max-w-[70%]">
             <span className="font-bold text-[3cqw] text-[#F4BC55] mb-[1cqw] block">Sarah</span>
             <p className="text-[4cqw]">I got the tickets for the museum!</p>
           </div>
           
           <div className="self-end bg-[var(--color-primary)] text-white p-[3cqw] rounded-[3cqw] rounded-tr-none max-w-[70%]">
             <p className="text-[4cqw]">Awesome, can't wait!</p>
           </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-[4cqw] bg-white border-t border-[var(--color-border)] flex gap-[3cqw] items-center">
           <div className="flex-1 h-[12cqw] border border-[var(--color-border)] rounded-full px-[4cqw] flex items-center">
             <span className="text-[var(--color-text-muted)] text-[4cqw]">Message...</span>
           </div>
           <div className="w-[12cqw] h-[12cqw] bg-[var(--color-primary)] rounded-full flex items-center justify-center">
             <Send size="5cqw" className="text-white ml-[1cqw]" />
           </div>
        </div>
      </motion.div>

      {/* 4. Memory (/memory/[id]) */}
      <motion.div
        className="absolute inset-0 bg-black z-40"
        initial={{ y: '100%' }}
        animate={{ y: phase === 3 ? '0%' : phase > 3 ? '-100%' : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
         <img src={`${BASE_URL}images/tokyo.jpg`} className="absolute inset-0 w-full h-full object-cover opacity-60" />
         <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/80" />
         
         <div className="absolute top-[12cqw] left-[4cqw]">
           <div className="w-[10cqw] h-[10cqw] bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center">
             <ChevronLeft size="6cqw" className="text-white" />
           </div>
         </div>
         
         <div className="absolute bottom-[20cqw] left-[6cqw] right-[6cqw]">
            <h1 className="font-[var(--font-display)] font-bold text-[12cqw] text-white leading-tight mb-[2cqw]">Memories from Tokyo</h1>
            <div className="flex items-center gap-[2cqw] mb-[6cqw]">
               <Star size="4cqw" fill="#F59E0B" color="#F59E0B" />
               <Star size="4cqw" fill="#F59E0B" color="#F59E0B" />
               <Star size="4cqw" fill="#F59E0B" color="#F59E0B" />
               <Star size="4cqw" fill="#F59E0B" color="#F59E0B" />
               <Star size="4cqw" fill="#F59E0B" color="#F59E0B" />
            </div>
            
            <div className="bg-white/10 backdrop-blur-md p-[5cqw] rounded-[4cqw] border border-white/20">
               <p className="text-white text-[4cqw] italic font-[var(--font-display)]">"The food was incredible, and the group vibe was perfect. Can't wait for our next trip!"</p>
            </div>
         </div>
      </motion.div>

      {/* 5. Settings / 404 (/settings & /+not-found) */}
      <motion.div
        className="absolute inset-0 bg-[var(--color-bg-light)] z-50 pt-[15cqw]"
        initial={{ y: '100%' }}
        animate={{ y: phase >= 4 ? '0%' : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="px-[6cqw] flex justify-between items-center mb-[8cqw]">
           <div className="flex items-center gap-[2cqw]">
             <ChevronLeft size="6cqw" />
             <h1 className="font-[var(--font-display)] font-bold text-[8cqw]">Settings</h1>
           </div>
        </div>

        <div className="px-[6cqw] space-y-[4cqw]">
           <div className="p-[4cqw] bg-white rounded-[4cqw] border border-[var(--color-border)] flex items-center justify-between">
              <span className="font-bold text-[4.5cqw]">Account</span>
              <ChevronLeft size="5cqw" className="text-[var(--color-text-muted)] rotate-180" />
           </div>
           <div className="p-[4cqw] bg-white rounded-[4cqw] border border-[var(--color-border)] flex items-center justify-between">
              <span className="font-bold text-[4.5cqw]">Notifications</span>
              <ChevronLeft size="5cqw" className="text-[var(--color-text-muted)] rotate-180" />
           </div>
        </div>

        {/* Sneak in a tiny 404 state to prove we covered it */}
        <div className="absolute bottom-[20cqw] left-[6cqw] right-[6cqw] p-[4cqw] bg-[#ef444415] rounded-[4cqw] flex items-center gap-[3cqw]">
           <AlertCircle size="6cqw" className="text-[#ef4444]" />
           <span className="text-[#ef4444] font-bold text-[4cqw]">Page not found (404 test)</span>
        </div>
      </motion.div>

      <HomeIndicator dark={phase === 3} />
    </div>
  );
}
