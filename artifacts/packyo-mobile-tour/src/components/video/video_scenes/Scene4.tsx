import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { StatusBar, HomeIndicator, TabBar } from './SharedUI';
import { ChevronLeft, Compass, CheckCircle, Home, Calendar, Package, Star, MessageSquare } from 'lucide-react';

const BASE_URL = import.meta.env.BASE_URL;

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 3000), // Hub -> Dest Prefs
      setTimeout(() => setPhase(2), 5500), // Dest Prefs -> Dest Vote
      setTimeout(() => setPhase(3), 8500), // Dest Vote -> Accom Prefs
      setTimeout(() => setPhase(4), 11500), // Accom Prefs -> Accom Vote
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="absolute inset-0 bg-[var(--color-bg-light)] overflow-hidden font-[var(--font-body)] text-[var(--color-text-primary)]">
      <StatusBar />
      <div className="noise-overlay" />
      
      {/* 1. Trip Hub (/trip/[id]) */}
      <motion.div 
        className="absolute inset-0 z-10 pt-[12cqw]"
        initial={{ opacity: 1, x: 0 }}
        animate={{ 
          x: phase === 0 ? '0%' : '-30%', 
          filter: phase === 0 ? 'blur(0px)' : 'blur(4px)' 
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 180 }}
      >
        <div className="bg-[var(--color-primary)] absolute top-0 left-0 right-0 h-[35cqw] rounded-b-[6cqw] flex flex-col justify-end pb-[6cqw] px-[6cqw] text-white">
           <div className="flex gap-[2cqw] items-center mb-[2cqw]">
             <ChevronLeft size="6cqw" />
             <h1 className="font-[var(--font-display)] font-bold text-[7cqw]">Destination TBD</h1>
           </div>
           <span className="text-white/80 text-[3.5cqw] pl-[8cqw]">Dates TBD</span>
        </div>

        <div className="mt-[35cqw] px-[6cqw] space-y-[4cqw]">
           {/* Progress */}
           <div className="mb-[6cqw]">
             <h3 className="font-bold text-[4cqw] mb-[1cqw]">Planning progress</h3>
             <div className="h-[2cqw] bg-[var(--color-bg-muted)] rounded-full overflow-hidden">
               <div className="w-[10%] h-full bg-[var(--color-primary)]" />
             </div>
           </div>

           {/* Checklist item 1 */}
           <div className="flex items-center gap-[4cqw] py-[3cqw] border-b border-[var(--color-border)]">
             <div className="w-[10cqw] h-[10cqw] rounded-full bg-[var(--color-bg-muted)] flex items-center justify-center">
               <Compass size="5cqw" className="text-[var(--color-text-primary)]" />
             </div>
             <span className="font-bold text-[4cqw] flex-1">Destination</span>
             <ChevronLeft size="5cqw" className="text-[var(--color-text-muted)] rotate-180" />
           </div>
           {/* Checklist item 2 */}
           <div className="flex items-center gap-[4cqw] py-[3cqw] border-b border-[var(--color-border)]">
             <div className="w-[10cqw] h-[10cqw] rounded-full bg-[var(--color-bg-muted)] flex items-center justify-center">
               <Home size="5cqw" className="text-[var(--color-text-primary)]" />
             </div>
             <span className="font-bold text-[4cqw] flex-1">Accommodation</span>
             <ChevronLeft size="5cqw" className="text-[var(--color-text-muted)] rotate-180" />
           </div>
        </div>
      </motion.div>

      {/* 2. Destination Preferences (/destination-preferences/[id]) */}
      <motion.div
        className="absolute inset-0 bg-[var(--color-bg-light)] z-20 pt-[15cqw]"
        initial={{ x: '100%' }}
        animate={{ x: phase === 1 ? '0%' : phase > 1 ? '-30%' : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="px-[6cqw] flex items-center gap-[2cqw] mb-[6cqw]">
           <ChevronLeft size="6cqw" />
           <h1 className="font-[var(--font-display)] font-bold text-[7cqw]">Preferences</h1>
        </div>
        
        <div className="px-[6cqw]">
           <h2 className="font-bold text-[5cqw] mb-[4cqw]">What's your vibe?</h2>
           <div className="flex flex-wrap gap-[3cqw]">
              {['Beach', 'City', 'Nature', 'Food', 'Culture', 'Nightlife'].map((v, i) => (
                <div key={v} className={`px-[5cqw] py-[2.5cqw] rounded-full border-2 font-bold text-[4cqw] ${i % 2 === 0 ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white' : 'bg-white border-[var(--color-border)] text-[var(--color-text-primary)]'}`}>
                  {v}
                </div>
              ))}
           </div>
        </div>
      </motion.div>

      {/* 3. Destination Vote (/destination-vote/[id]) */}
      <motion.div
        className="absolute inset-0 bg-[var(--color-bg-light)] z-30 pt-[15cqw]"
        initial={{ x: '100%' }}
        animate={{ x: phase === 2 ? '0%' : phase > 2 ? '-30%' : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="px-[6cqw] flex items-center gap-[2cqw] mb-[6cqw]">
           <ChevronLeft size="6cqw" />
           <h1 className="font-[var(--font-display)] font-bold text-[7cqw]">Vote</h1>
        </div>

        <div className="px-[6cqw] space-y-[4cqw]">
           <div className="rounded-[4cqw] border-2 border-[var(--color-primary)] bg-white overflow-hidden p-[4cqw] relative">
              <div className="absolute top-[4cqw] right-[4cqw] w-[8cqw] h-[8cqw] bg-[var(--color-primary)] rounded-full flex items-center justify-center">
                 <CheckCircle size="5cqw" className="text-white" />
              </div>
              <h3 className="font-bold text-[5.5cqw]">Tokyo, Japan</h3>
              <p className="text-[var(--color-text-secondary)] text-[4cqw] mb-[3cqw]">Matches: City, Food, Culture</p>
              <div className="flex -space-x-3">
                 <div className="w-[8cqw] h-[8cqw] rounded-full bg-[#F4BC55] border-2 border-white" />
                 <div className="w-[8cqw] h-[8cqw] rounded-full bg-[#A77BD6] border-2 border-white" />
              </div>
           </div>

           <div className="rounded-[4cqw] border border-[var(--color-border)] bg-white overflow-hidden p-[4cqw] opacity-70">
              <h3 className="font-bold text-[5.5cqw]">Bali, Indonesia</h3>
              <p className="text-[var(--color-text-secondary)] text-[4cqw] mb-[3cqw]">Matches: Beach, Nature</p>
              <div className="flex -space-x-3">
                 <div className="w-[8cqw] h-[8cqw] rounded-full bg-[#6EA6D8] border-2 border-white" />
              </div>
           </div>
        </div>
      </motion.div>
      
      {/* 4. Accom Prefs (/accommodation-preferences/[id]) */}
      <motion.div
        className="absolute inset-0 bg-[var(--color-bg-light)] z-40 pt-[15cqw]"
        initial={{ x: '100%' }}
        animate={{ x: phase === 3 ? '0%' : phase > 3 ? '-30%' : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="px-[6cqw] flex items-center gap-[2cqw] mb-[6cqw]">
           <ChevronLeft size="6cqw" />
           <h1 className="font-[var(--font-display)] font-bold text-[7cqw]">Stays</h1>
        </div>
        <div className="px-[6cqw]">
           <h2 className="font-bold text-[5cqw] mb-[4cqw]">Accommodation type</h2>
           <div className="space-y-[3cqw]">
              {['Hotel', 'Apartment', 'Villa'].map((v, i) => (
                <div key={v} className={`p-[4cqw] rounded-[3cqw] border-2 font-bold text-[4.5cqw] ${i === 0 ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white' : 'bg-white border-[var(--color-border)] text-[var(--color-text-primary)]'}`}>
                  {v}
                </div>
              ))}
           </div>
        </div>
      </motion.div>

      {/* 5. Accom Vote (/accommodation-vote/[id]) */}
      <motion.div
        className="absolute inset-0 bg-[var(--color-bg-light)] z-50 pt-[15cqw]"
        initial={{ x: '100%' }}
        animate={{ x: phase >= 4 ? '0%' : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="px-[6cqw] flex items-center gap-[2cqw] mb-[6cqw]">
           <ChevronLeft size="6cqw" />
           <h1 className="font-[var(--font-display)] font-bold text-[7cqw]">Vote stays</h1>
        </div>
        
        <div className="px-[6cqw]">
           <div className="rounded-[4cqw] border-2 border-[var(--color-primary)] bg-white overflow-hidden shadow-lg">
             <img src={`${BASE_URL}images/bali.jpg`} className="w-full h-[40cqw] object-cover" />
             <div className="p-[4cqw] relative">
               <div className="absolute -top-[6cqw] right-[4cqw] w-[12cqw] h-[12cqw] bg-[var(--color-primary)] rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                 <CheckCircle size="6cqw" className="text-white" />
               </div>
               <h3 className="font-bold text-[5.5cqw]">Sunrise Villa</h3>
               <p className="text-[var(--color-text-secondary)] text-[4cqw] mb-[2cqw]">≈ $120 / night</p>
               <div className="w-full bg-[var(--color-bg-muted)] h-[2cqw] rounded-full overflow-hidden mt-[2cqw]">
                 <div className="bg-[var(--color-primary)] h-full w-[80%]" />
               </div>
               <p className="text-[3.5cqw] text-[var(--color-text-muted)] mt-[1cqw]">4/5 votes</p>
             </div>
           </div>
        </div>
      </motion.div>

      <HomeIndicator />
    </div>
  );
}
