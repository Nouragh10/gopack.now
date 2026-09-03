import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { StatusBar, HomeIndicator, TabBar } from './SharedUI';
import { Bell, Plus, Users, MapPin, Settings, ChevronLeft, ChevronRight } from 'lucide-react';

const BASE_URL = import.meta.env.BASE_URL;

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 3500), // Home -> Create
      setTimeout(() => setPhase(2), 7000), // Create -> Pack
      setTimeout(() => setPhase(3), 10500), // Pack -> Profile
      setTimeout(() => setPhase(4), 13500), // Profile -> Notifications
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="absolute inset-0 bg-[var(--color-bg-light)] overflow-hidden font-[var(--font-body)] text-[var(--color-text-primary)]">
      <StatusBar />
      <div className="noise-overlay" />
      
      {/* 1. Home / Trips (/(tabs)/index) */}
      <motion.div 
        className="absolute inset-0 z-10 pt-[15cqw]"
        initial={{ opacity: 1, x: 0 }}
        animate={{ 
          x: phase === 1 ? '-30%' : phase > 1 ? '-100%' : '0%', 
          filter: phase === 1 ? 'blur(4px)' : 'blur(0px)' 
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 180 }}
      >
        <div className="px-[6cqw] flex justify-between items-center mb-[8cqw]">
          <h1 className="font-[var(--font-display)] font-bold text-[8cqw]">Hi, Traveler</h1>
          <div className="flex gap-[4cqw] items-center">
            <div className="relative">
              <Bell size="6cqw" />
              <div className="absolute top-0 right-0 w-[2cqw] h-[2cqw] bg-[var(--color-primary)] rounded-full" />
            </div>
            <div className="w-[10cqw] h-[10cqw] bg-[#F6F1EA] rounded-full flex items-center justify-center font-bold">T</div>
          </div>
        </div>

        <div className="px-[6cqw] mb-[6cqw]">
          <div className="flex justify-between items-end mb-[4cqw]">
            <h2 className="font-bold text-[5cqw]">Your trips</h2>
            <span className="text-[var(--color-text-muted)] text-[3.5cqw] font-bold">See all</span>
          </div>

          <div className="p-[3cqw] rounded-[4cqw] border border-[var(--color-border)] bg-white flex gap-[4cqw] items-center shadow-sm">
            <img src={`${BASE_URL}images/tokyo.jpg`} className="w-[20cqw] h-[20cqw] rounded-[3cqw] object-cover" />
            <div className="flex-1">
              <h3 className="font-[var(--font-display)] font-bold text-[5cqw] leading-tight">Tokyo</h3>
              <p className="text-[var(--color-text-secondary)] text-[3.5cqw] mt-[1cqw]">7 days</p>
              <div className="flex items-center gap-[1cqw] mt-[1cqw]">
                <Users size="3cqw" className="text-[var(--color-text-muted)]" />
                <span className="text-[var(--color-text-muted)] text-[3cqw]">4 members</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-[6cqw]">
          <div className="h-[14cqw] rounded-full border border-[var(--color-border)] bg-white flex items-center justify-center gap-[2cqw]">
            <Plus size="5cqw" className="text-[var(--color-primary)]" />
            <span className="text-[var(--color-primary)] font-bold text-[4.5cqw]">Create a new trip</span>
          </div>
          <div className="h-[14cqw] rounded-full bg-[var(--color-primary)] flex items-center justify-center gap-[2cqw] mt-[3cqw] text-white">
            <Users size="5cqw" />
            <span className="font-bold text-[4.5cqw]">Join a trip</span>
          </div>
        </div>
        <TabBar activeTab="home" />
      </motion.div>

      {/* 2. Create Trip (/(tabs)/create) */}
      <motion.div
        className="absolute inset-0 bg-[var(--color-bg-light)] z-20 pt-[15cqw]"
        initial={{ x: '100%' }}
        animate={{ x: phase === 1 ? '0%' : phase > 1 ? '-30%' : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="px-[6cqw]">
          <h1 className="font-[var(--font-display)] font-bold text-[8cqw] mb-[2cqw]">Plan a new trip</h1>
          <p className="text-[var(--color-text-secondary)] text-[4cqw] mb-[8cqw]">Where to, or should we decide together?</p>

          <div className="space-y-[4cqw]">
            <div>
              <label className="font-bold text-[3.5cqw] text-[var(--color-text-secondary)] mb-[2cqw] block">Destination</label>
              <div className="h-[14cqw] rounded-[3cqw] border border-[var(--color-border)] bg-white px-[4cqw] flex items-center gap-[3cqw]">
                <MapPin size="5cqw" className="text-[var(--color-text-muted)]" />
                <span className="text-[var(--color-text-primary)] text-[4.5cqw]">Tokyo, Japan</span>
              </div>
            </div>
            
            <div>
              <label className="font-bold text-[3.5cqw] text-[var(--color-text-secondary)] mb-[2cqw] block">How long?</label>
              <div className="h-[14cqw] rounded-[3cqw] border border-[var(--color-border)] bg-white px-[4cqw] flex items-center">
                <span className="text-[var(--color-text-primary)] text-[4.5cqw]">7 days</span>
              </div>
            </div>
            
            <div className="h-[14cqw] bg-[var(--color-primary)] rounded-full flex items-center justify-center text-white font-bold text-[4.5cqw] mt-[8cqw] shadow-lg">
              Start Planning
            </div>
          </div>
        </div>
        <TabBar activeTab="create" />
      </motion.div>

      {/* 3. Manage Pack (/groups/[id]) */}
      <motion.div
        className="absolute inset-0 bg-[var(--color-bg-light)] z-30 pt-[15cqw]"
        initial={{ x: '100%' }}
        animate={{ x: phase === 2 ? '0%' : phase > 2 ? '-30%' : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="px-[4cqw] flex justify-between items-center mb-[4cqw]">
          <ChevronLeft size="6cqw" />
          <h2 className="font-bold text-[4.5cqw]">My Pack</h2>
          <Settings size="5.5cqw" />
        </div>
        
        <div className="items-center flex flex-col pt-[4cqw]">
          <div className="flex -space-x-3 mb-[3cqw]">
            <img src={`${BASE_URL}images/avatar1.jpg`} className="w-[12cqw] h-[12cqw] rounded-full border-2 border-[var(--color-bg-light)] object-cover" />
            <img src={`${BASE_URL}images/avatar2.jpg`} className="w-[12cqw] h-[12cqw] rounded-full border-2 border-[var(--color-bg-light)] object-cover" />
            <div className="w-[12cqw] h-[12cqw] rounded-full border-2 border-[var(--color-bg-light)] bg-[#F4BC55] flex items-center justify-center text-white font-bold">M</div>
          </div>
          <h1 className="font-[var(--font-display)] font-bold text-[7cqw]">The Japan Squad</h1>
          <p className="text-[var(--color-text-muted)] text-[3.5cqw] mt-[1cqw]">3 members · Created recently</p>
        </div>

        <div className="mt-[8cqw] px-[6cqw] space-y-[4cqw]">
          <div className="flex justify-between items-center p-[4cqw] bg-white rounded-[4cqw] border border-[var(--color-border)]">
             <div className="flex gap-[3cqw] items-center">
               <div className="w-[10cqw] h-[10cqw] bg-[var(--color-bg-muted)] rounded-full flex items-center justify-center">
                 <Users size="5cqw" className="text-[var(--color-text-secondary)]" />
               </div>
               <span className="font-bold text-[4cqw]">Invite members</span>
             </div>
             <ChevronRight size="5cqw" className="text-[var(--color-text-muted)]" />
          </div>
        </div>
      </motion.div>

      {/* 4. Profile & Notifications */}
      <motion.div
        className="absolute inset-0 bg-[var(--color-bg-light)] z-40 pt-[15cqw]"
        initial={{ x: '100%' }}
        animate={{ x: phase >= 3 ? '0%' : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="px-[6cqw] flex justify-between items-center mb-[6cqw]">
           <Bell size="6cqw" className={phase === 4 ? "text-[var(--color-primary)]" : ""} />
           <span className="font-bold text-[4.5cqw]">{phase === 4 ? 'Notifications' : 'Profile'}</span>
           <Settings size="6cqw" />
        </div>
        
        {phase === 3 ? (
          <div className="px-[6cqw]">
            <div className="flex items-center gap-[4cqw] mb-[8cqw]">
              <div className="w-[20cqw] h-[20cqw] bg-[#F6F1EA] rounded-full flex items-center justify-center font-bold text-[8cqw]">T</div>
              <div>
                <h1 className="font-bold text-[6cqw]">Traveler</h1>
                <p className="text-[var(--color-text-secondary)] text-[4cqw]">@traveler.packyo</p>
              </div>
            </div>
            <div className="flex gap-[2cqw] mb-[8cqw]">
               <div className="flex-1 border border-[var(--color-border)] rounded-[4cqw] p-[4cqw] flex flex-col items-center">
                 <span className="font-bold text-[6cqw] text-[var(--color-primary)]">3</span>
                 <span className="text-[var(--color-text-secondary)] text-[3.5cqw]">Trips</span>
               </div>
               <div className="flex-1 border border-[var(--color-border)] rounded-[4cqw] p-[4cqw] flex flex-col items-center">
                 <span className="font-bold text-[6cqw] text-[var(--color-primary)]">2</span>
                 <span className="text-[var(--color-text-secondary)] text-[3.5cqw]">Packs</span>
               </div>
            </div>
          </div>
        ) : (
          <div className="px-[6cqw] space-y-[4cqw]">
             <div className="p-[4cqw] border-b border-[var(--color-border)] flex gap-[4cqw]">
               <div className="w-[12cqw] h-[12cqw] bg-[var(--color-bg-muted)] rounded-full flex items-center justify-center">
                 <Users size="5cqw" className="text-[var(--color-primary)]" />
               </div>
               <div className="flex-1">
                 <p className="text-[4cqw]"><span className="font-bold">Alex</span> invited you to <span className="font-bold">Lisbon 2024</span></p>
                 <span className="text-[3.5cqw] text-[var(--color-text-muted)] mt-[1cqw] block">2 hours ago</span>
               </div>
             </div>
          </div>
        )}
        <TabBar activeTab={phase === 4 ? "notifications" : "profile"} />
      </motion.div>

      <HomeIndicator />
    </div>
  );
}
