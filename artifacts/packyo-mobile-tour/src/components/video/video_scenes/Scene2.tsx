import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { StatusBar, HomeIndicator, TabBar } from './SharedUI';
import { Search, Star, MapPin, ChevronLeft, Bookmark } from 'lucide-react';

const BASE_URL = import.meta.env.BASE_URL;

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 4000), // Discover -> Detail
      setTimeout(() => setPhase(2), 9000), // Detail -> Saved
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="absolute inset-0 bg-[var(--color-bg-light)] overflow-hidden font-[var(--font-body)] text-[var(--color-text-primary)]">
      <StatusBar />
      <div className="noise-overlay" />
      
      {/* 1. Discover Tab (/(tabs)/discover) */}
      <motion.div 
        className="absolute inset-0 z-10 pt-[15cqw]"
        initial={{ opacity: 1, x: 0 }}
        animate={{ x: phase >= 1 ? '-30%' : '0%', filter: phase >= 1 ? 'blur(4px)' : 'blur(0px)' }}
        transition={{ type: 'spring', damping: 25, stiffness: 180 }}
      >
        <div className="px-[6cqw]">
          <h1 className="font-[var(--font-display)] font-bold text-[8cqw] mb-[4cqw]">Discover</h1>
          <div className="h-[12cqw] rounded-full border border-[var(--color-border)] bg-white px-[4cqw] flex items-center gap-[3cqw] mb-[8cqw]">
            <Search size="4.5cqw" className="text-[var(--color-text-muted)]" />
            <span className="text-[var(--color-text-muted)] text-[4cqw]">Search destinations, vibes...</span>
          </div>
          
          <div className="flex justify-between items-end mb-[4cqw]">
            <h2 className="font-bold text-[5cqw]">Top rated trips</h2>
          </div>
        </div>

        <div className="px-[6cqw] space-y-[4cqw]">
          {/* Card 1 */}
          <div className="p-[3cqw] rounded-[4cqw] border border-[var(--color-border)] bg-white flex gap-[3cqw] items-center relative overflow-hidden">
            <img src={`${BASE_URL}images/lisbon.jpg`} className="w-[18cqw] h-[18cqw] rounded-[3cqw] object-cover" />
            <div className="flex-1">
              <h3 className="font-bold text-[4cqw]">4 days in Lisbon</h3>
              <p className="text-[var(--color-text-secondary)] text-[3.2cqw] mb-[1cqw]">By Alex & Friends</p>
              <p className="text-[var(--color-text-muted)] text-[3cqw] italic">"Amazing food and views!"</p>
            </div>
            <div className="flex flex-col items-center">
              <Star size="3.5cqw" fill="#F59E0B" color="#F59E0B" />
              <span className="font-bold text-[3.2cqw] mt-[0.5cqw]">4.9</span>
            </div>
          </div>
          {/* Card 2 */}
          <div className="p-[3cqw] rounded-[4cqw] border border-[var(--color-border)] bg-white flex gap-[3cqw] items-center relative overflow-hidden">
            <img src={`${BASE_URL}images/tokyo.jpg`} className="w-[18cqw] h-[18cqw] rounded-[3cqw] object-cover" />
            <div className="flex-1">
              <h3 className="font-bold text-[4cqw]">7 days in Tokyo</h3>
              <p className="text-[var(--color-text-secondary)] text-[3.2cqw] mb-[1cqw]">By Sarah's Pack</p>
              <p className="text-[var(--color-text-muted)] text-[3cqw] italic">"Best trip ever."</p>
            </div>
            <div className="flex flex-col items-center">
              <Star size="3.5cqw" fill="#F59E0B" color="#F59E0B" />
              <span className="font-bold text-[3.2cqw] mt-[0.5cqw]">4.8</span>
            </div>
          </div>
        </div>

        <TabBar activeTab="discover" />
      </motion.div>

      {/* 2. Public Itinerary Detail (/discover-itinerary/[id]) */}
      <motion.div
        className="absolute inset-0 bg-[var(--color-bg-light)] z-20 overflow-hidden shadow-[-10px_0_20px_rgba(0,0,0,0.1)]"
        initial={{ x: '100%' }}
        animate={{ x: phase === 1 ? '0%' : phase > 1 ? '-30%' : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="relative h-[65cqw]">
          <img src={`${BASE_URL}images/lisbon.jpg`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
          <div className="absolute top-[12cqw] left-[4cqw] right-[4cqw] flex justify-between items-center text-white">
            <div className="w-[10cqw] h-[10cqw] bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center">
              <ChevronLeft size="6cqw" />
            </div>
            <div className="w-[10cqw] h-[10cqw] bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center">
              <Bookmark size="5cqw" className="text-white" />
            </div>
          </div>
          <div className="absolute bottom-[4cqw] left-[4cqw] right-[4cqw]">
            <h1 className="font-[var(--font-display)] font-bold text-[9cqw] text-white leading-tight">4 days in Lisbon</h1>
            <p className="text-white/80 text-[3.5cqw] mt-[1cqw]">Curated by Alex & Friends</p>
          </div>
        </div>

        <div className="px-[6cqw] pt-[6cqw]">
          <div className="flex gap-[2cqw] mb-[6cqw]">
            <span className="px-[3cqw] py-[1cqw] rounded-full bg-[var(--color-bg-muted)] text-[var(--color-primary)] font-bold text-[3cqw]">Food</span>
            <span className="px-[3cqw] py-[1cqw] rounded-full bg-[var(--color-bg-muted)] text-[var(--color-primary)] font-bold text-[3cqw]">Culture</span>
          </div>
          
          <h2 className="font-bold text-[5cqw] mb-[4cqw]">Itinerary Preview</h2>
          <div className="border-l-2 border-[var(--color-border)] ml-[2.5cqw] pl-[5cqw] pb-[4cqw] relative">
            <div className="absolute w-[3cqw] h-[3cqw] rounded-full bg-[var(--color-primary)] -left-[1.6cqw] top-[1cqw]" />
            <h3 className="font-bold text-[4cqw]">Day 1: Arrival & Alfama</h3>
            <p className="text-[var(--color-text-secondary)] text-[3.5cqw] mt-[1cqw]">Pastéis de Belém, Castelo de S. Jorge, Fado dinner.</p>
          </div>
          <div className="border-l-2 border-[var(--color-border)] ml-[2.5cqw] pl-[5cqw] pb-[4cqw] relative">
            <div className="absolute w-[3cqw] h-[3cqw] rounded-full bg-[var(--color-primary)] -left-[1.6cqw] top-[1cqw]" />
            <h3 className="font-bold text-[4cqw]">Day 2: Sintra Day Trip</h3>
            <p className="text-[var(--color-text-secondary)] text-[3.5cqw] mt-[1cqw]">Pena Palace, Quinta da Regaleira.</p>
          </div>
        </div>
        
        <div className="absolute bottom-[8cqw] left-[6cqw] right-[6cqw] h-[14cqw] bg-[var(--color-primary)] rounded-[4cqw] flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-[4.5cqw]">Save this trip</span>
        </div>
      </motion.div>

      {/* 3. Saved (/saved) */}
      <motion.div
        className="absolute inset-0 bg-[var(--color-bg-light)] z-30 pt-[15cqw]"
        initial={{ x: '100%' }}
        animate={{ x: phase >= 2 ? '0%' : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="px-[6cqw] flex items-center gap-[4cqw] mb-[6cqw]">
           <ChevronLeft size="6cqw" />
           <h1 className="font-[var(--font-display)] font-bold text-[8cqw]">Saved</h1>
        </div>

        <div className="flex px-[6cqw] gap-[4cqw] mb-[6cqw] border-b border-[var(--color-border)]">
          <div className="pb-[2cqw] border-b-2 border-[var(--color-primary)]">
            <span className="font-bold text-[4cqw] text-[var(--color-primary)]">Destinations (1)</span>
          </div>
          <div className="pb-[2cqw]">
            <span className="font-bold text-[4cqw] text-[var(--color-text-muted)]">Activities</span>
          </div>
        </div>

        <div className="px-[6cqw]">
          <div className="rounded-[4cqw] border border-[var(--color-border)] bg-white overflow-hidden shadow-sm">
            <img src={`${BASE_URL}images/lisbon.jpg`} className="w-full h-[35cqw] object-cover" />
            <div className="p-[4cqw] flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[4.5cqw]">Lisbon, Portugal</h3>
                <p className="text-[var(--color-text-secondary)] text-[3.5cqw]">4 days · Saved just now</p>
              </div>
              <div className="w-[10cqw] h-[10cqw] bg-[var(--color-bg-muted)] rounded-full flex items-center justify-center">
                 <Bookmark size="4.5cqw" className="text-[var(--color-primary)]" fill="var(--color-primary)" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <HomeIndicator />
    </div>
  );
}
