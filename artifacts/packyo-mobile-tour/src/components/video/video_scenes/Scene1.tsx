import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { StatusBar, HomeIndicator } from './SharedUI';
import { useVideoPlayer } from '@/lib/video';

const BASE_URL = import.meta.env.BASE_URL;

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 2500), // Landing -> Sign-in
      setTimeout(() => setPhase(2), 6500), // Sign-in -> Welcome
      setTimeout(() => setPhase(3), 8500), // Welcome -> Join trip
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="absolute inset-0 bg-[var(--color-bg-light)] overflow-hidden font-[var(--font-body)] text-[var(--color-text-primary)]">
      <StatusBar />
      <div className="noise-overlay" />
      
      {/* Background image for landing */}
      <motion.div 
        className="absolute inset-0 z-0"
        initial={{ scale: 1.1 }}
        animate={{ scale: 1, filter: phase > 0 ? 'blur(10px)' : 'blur(0px)' }}
        transition={{ duration: 4, ease: 'easeOut' }}
      >
        <img src={`${BASE_URL}images/bali.jpg`} className="w-full h-full object-cover opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80" />
      </motion.div>

      {/* 1. Landing Screen (/) */}
      <motion.div 
        className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-[20cqw] px-[8cqw] text-center"
        initial={{ opacity: 1 }}
        animate={{ opacity: phase === 0 ? 1 : 0, y: phase === 0 ? 0 : -20 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mb-auto mt-[40cqw]"
        >
          <div className="w-[18cqw] h-[18cqw] bg-[var(--color-primary)] rounded-[4cqw] flex items-center justify-center text-white shadow-2xl mx-auto mb-[6cqw]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[8cqw] h-[8cqw]"><path d="M4 10v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10M4 10h16M4 10a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2M8 4h8M8 8V4M16 8V4"/></svg>
          </div>
          <h1 className="font-[var(--font-display)] font-bold text-[12cqw] text-white tracking-tight">Packyo</h1>
        </motion.div>
        
        <h2 className="font-[var(--font-display)] font-bold text-[8.5cqw] text-white leading-tight mb-[4cqw]">
          Plan trips together.
        </h2>
        <p className="text-white/80 text-[4cqw] mb-[10cqw]">
          Discover, vote, and build the perfect itinerary with your friends.
        </p>
      </motion.div>

      {/* 2. Sign-in Screen (/sign-in) */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 bg-[var(--color-bg-light)] rounded-t-[8cqw] p-[8cqw] z-20 shadow-2xl"
        initial={{ y: '100%' }}
        animate={{ y: phase === 1 ? '0%' : phase > 1 ? '100%' : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="w-[12cqw] h-[1.5cqw] bg-[var(--color-border)] rounded-full mx-auto mb-[8cqw]" />
        <h2 className="font-[var(--font-display)] font-bold text-[8cqw] text-[var(--color-text-primary)] mb-[2cqw]">
          Welcome to Packyo
        </h2>
        <p className="text-[var(--color-text-secondary)] text-[4cqw] mb-[8cqw]">
          Sign in to start planning your next adventure.
        </p>
        
        <div className="space-y-[4cqw]">
          <div className="h-[14cqw] bg-black rounded-[4cqw] flex items-center justify-center gap-[3cqw] text-white font-medium text-[4cqw]">
             Continue with Apple
          </div>
          <div className="h-[14cqw] bg-white border-2 border-[var(--color-border)] rounded-[4cqw] flex items-center justify-center gap-[3cqw] text-[var(--color-text-primary)] font-medium text-[4cqw]">
             Continue with Google
          </div>
        </div>
      </motion.div>

      {/* 3. Welcome / Join Interstitial */}
      <motion.div
        className="absolute inset-0 bg-[var(--color-bg-light)] z-30 flex flex-col items-center justify-center p-[8cqw]"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 2 ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        {phase === 2 && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className="w-[24cqw] h-[24cqw] bg-[#F6F1EA] rounded-full flex items-center justify-center mx-auto mb-[6cqw]">
              <span className="font-bold text-[8cqw]">T</span>
            </div>
            <h2 className="font-[var(--font-display)] font-bold text-[8cqw]">Hi, Traveler</h2>
          </motion.div>
        )}

        {/* Join Trip (/join) */}
        <motion.div
          className="absolute inset-0 bg-[var(--color-bg-light)] pt-[25cqw] px-[6cqw]"
          initial={{ x: '100%' }}
          animate={{ x: phase >= 3 ? '0%' : '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        >
           <div className="w-[8cqw] h-[8cqw] mb-[6cqw] text-[var(--color-text-primary)]">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
           </div>
           
           <h2 className="font-[var(--font-display)] font-bold text-[9cqw] mb-[4cqw]">Join a trip</h2>
           <p className="text-[var(--color-text-secondary)] text-[4.5cqw] mb-[10cqw]">
             Enter the invite code from your pack to join the planning.
           </p>

           <div className="flex justify-between mb-[12cqw]">
             {[1,2,3,4,5,6].map((i) => (
               <div key={i} className="w-[12cqw] h-[16cqw] rounded-[3cqw] border-2 border-[var(--color-border)] flex items-center justify-center font-bold text-[6cqw] bg-white">
                 <motion.span
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 10 }}
                   transition={{ delay: i * 0.15 + 0.5 }}
                 >
                   {"PACKYO"[i-1]}
                 </motion.span>
               </div>
             ))}
           </div>
           
           <motion.div 
             className="h-[14cqw] bg-[var(--color-primary)] rounded-[4cqw] flex items-center justify-center text-white font-bold text-[4.5cqw]"
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: phase >= 3 ? 1 : 0, scale: phase >= 3 ? 1 : 0.95 }}
             transition={{ delay: 1.5 }}
           >
             Join Trip
           </motion.div>
        </motion.div>
      </motion.div>

      <HomeIndicator dark={phase === 0} />
    </div>
  );
}
