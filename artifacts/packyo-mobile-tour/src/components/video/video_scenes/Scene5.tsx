import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { StatusBar, HomeIndicator, TabBar } from './SharedUI';
import { ChevronLeft, Plus, Heart, X, Sparkles, Send } from 'lucide-react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 3000), // Wishlist -> Swipe Vote
      setTimeout(() => setPhase(2), 7000), // Swipe Vote -> Results
      setTimeout(() => setPhase(3), 10500), // Results -> Building
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="absolute inset-0 bg-[var(--color-bg-light)] overflow-hidden font-[var(--font-body)] text-[var(--color-text-primary)]">
      <StatusBar />
      <div className="noise-overlay" />
      
      {/* 1. Wishlist (/wishlist/[id]) */}
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
             <h1 className="font-[var(--font-display)] font-bold text-[7cqw]">Wishes</h1>
           </div>
        </div>

        <div className="px-[6cqw] space-y-[4cqw]">
           <div className="p-[4cqw] border-b border-[var(--color-border)]">
              <h3 className="font-bold text-[4.5cqw]">Visit a local market at sunrise...</h3>
              <p className="text-[var(--color-text-secondary)] text-[3.5cqw] mt-[1cqw]">Alex</p>
           </div>
           <div className="p-[4cqw] border-b border-[var(--color-border)]">
              <h3 className="font-bold text-[4.5cqw]">Find the best street food spot...</h3>
              <p className="text-[var(--color-text-secondary)] text-[3.5cqw] mt-[1cqw]">Sarah</p>
           </div>
        </div>

        <div className="absolute bottom-[10cqw] left-0 right-0 px-[6cqw]">
           <div className="h-[14cqw] bg-white border border-[var(--color-border)] rounded-full flex items-center px-[4cqw] shadow-lg">
             <input type="text" placeholder="Add a wish..." className="flex-1 bg-transparent text-[4cqw] outline-none" readOnly />
             <div className="w-[10cqw] h-[10cqw] bg-[var(--color-primary)] rounded-full flex items-center justify-center">
               <Send size="4.5cqw" className="text-white" />
             </div>
           </div>
        </div>
      </motion.div>

      {/* 2. Swipe Vote (/wishlist-vote/[id]) */}
      <motion.div
        className="absolute inset-0 bg-[var(--color-bg-light)] z-20 pt-[15cqw]"
        initial={{ x: '100%' }}
        animate={{ x: phase === 1 ? '0%' : phase > 1 ? '-30%' : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="px-[6cqw] flex items-center gap-[2cqw] mb-[4cqw]">
           <ChevronLeft size="6cqw" />
           <h1 className="font-[var(--font-display)] font-bold text-[7cqw]">Vote</h1>
        </div>
        <p className="text-center text-[var(--color-text-muted)] text-[4cqw] mb-[10cqw]">1 / 12</p>
        
        <div className="px-[8cqw] flex flex-col items-center">
           <motion.div 
             className="w-full aspect-[3/4] bg-white rounded-[6cqw] border border-[var(--color-border)] shadow-xl p-[6cqw] flex flex-col items-center justify-center relative"
             animate={phase === 1 ? { rotate: [-2, 2, 0], x: [0, 10, 0] } : {}}
             transition={{ duration: 1, ease: 'easeInOut' }}
           >
              <div className="absolute top-[4cqw] left-[4cqw] flex items-center gap-[2cqw]">
                <div className="w-[8cqw] h-[8cqw] bg-[#F4BC55] rounded-full flex items-center justify-center font-bold text-white text-[3.5cqw]">S</div>
                <span className="text-[var(--color-text-secondary)] font-bold text-[3.5cqw]">Sarah</span>
              </div>
              <h2 className="font-[var(--font-display)] font-bold text-[7cqw] text-center mt-[8cqw]">Find the best street food spot...</h2>
           </motion.div>

           <div className="flex gap-[6cqw] mt-[10cqw]">
             <div className="w-[16cqw] h-[16cqw] rounded-full bg-[#ef444418] flex items-center justify-center">
               <X size="8cqw" className="text-[#ef4444]" />
             </div>
             <div className="w-[16cqw] h-[16cqw] rounded-full bg-[var(--color-primary)] flex items-center justify-center shadow-lg">
               <Heart size="8cqw" className="text-white" fill="white" />
             </div>
           </div>
        </div>
      </motion.div>

      {/* 3. Results (/wishlist-results/[id]) */}
      <motion.div
        className="absolute inset-0 bg-[var(--color-bg-light)] z-30 pt-[15cqw]"
        initial={{ x: '100%' }}
        animate={{ x: phase === 2 ? '0%' : phase > 2 ? '-30%' : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="px-[6cqw] flex items-center gap-[2cqw] mb-[6cqw]">
           <ChevronLeft size="6cqw" />
           <h1 className="font-[var(--font-display)] font-bold text-[7cqw]">Results</h1>
        </div>

        <div className="px-[6cqw] space-y-[4cqw]">
           <div className="p-[4cqw] border-2 border-[var(--color-primary)] bg-white rounded-[4cqw] relative">
              <div className="absolute top-0 right-[4cqw] -translate-y-1/2 bg-[var(--color-primary)] text-white px-[3cqw] py-[1cqw] rounded-full text-[3cqw] font-bold">
                 Pack's Favorite!
              </div>
              <h3 className="font-bold text-[4.5cqw] mb-[2cqw]">Find the best street food spot...</h3>
              <div className="flex items-center gap-[2cqw]">
                <div className="bg-[var(--color-primary)] px-[2cqw] py-[1cqw] rounded text-white text-[3.5cqw] font-bold">+4</div>
              </div>
           </div>
           
           <div className="p-[4cqw] border border-[var(--color-border)] bg-white rounded-[4cqw]">
              <h3 className="font-bold text-[4.5cqw] mb-[2cqw]">Visit a local market at sunrise...</h3>
              <div className="flex items-center gap-[2cqw]">
                <div className="bg-[var(--color-primary)] px-[2cqw] py-[1cqw] rounded text-white text-[3.5cqw] font-bold">+3</div>
              </div>
           </div>
        </div>
      </motion.div>

      {/* 4. AI Building (/building/[id]) */}
      <motion.div
        className="absolute inset-0 bg-[var(--color-primary)] z-40 flex flex-col items-center justify-center p-[6cqw]"
        initial={{ y: '100%' }}
        animate={{ y: phase >= 3 ? '0%' : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
         <motion.div
           animate={{ rotate: 360 }}
           transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
         >
           <Sparkles size="16cqw" className="text-white mb-[8cqw]" />
         </motion.div>
         <h1 className="font-[var(--font-display)] font-bold text-[9cqw] text-white text-center mb-[4cqw] leading-tight">
           Building your perfect trip...
         </h1>
         <p className="text-white/80 text-[4.5cqw] text-center">
           Matching wishes to Tokyo's best spots.
         </p>
      </motion.div>

      <HomeIndicator dark={phase === 3} />
    </div>
  );
}
