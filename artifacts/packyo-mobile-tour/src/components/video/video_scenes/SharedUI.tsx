import React from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';
import { motion } from 'framer-motion';

export function StatusBar({ dark = false }: { dark?: boolean }) {
  const color = dark ? 'var(--color-bg-dark)' : 'var(--color-bg-light)';
  return (
    <div className="absolute top-0 left-0 right-0 h-[4cqw] px-[6cqw] flex justify-between items-center z-50 mix-blend-difference opacity-80" style={{ color: '#fff' }}>
      <span className="text-[3.5cqw] font-medium tracking-tight">9:41</span>
      <div className="flex items-center gap-[1.5cqw]">
        <Signal size="3.5cqw" strokeWidth={3} />
        <Wifi size="3.5cqw" strokeWidth={3} />
        <Battery size="4cqw" strokeWidth={2.5} />
      </div>
    </div>
  );
}

export function HomeIndicator({ dark = false }: { dark?: boolean }) {
  const bg = dark ? 'var(--color-bg-dark)' : 'var(--color-bg-light)';
  return (
    <div className="absolute bottom-[2cqw] left-1/2 -translate-x-1/2 w-[35cqw] h-[1cqw] rounded-full z-50 mix-blend-difference" style={{ backgroundColor: '#fff', opacity: 0.8 }} />
  );
}

export function TabBar({ activeTab = 'home' }: { activeTab?: 'home' | 'discover' | 'create' | 'notifications' | 'profile' }) {
  const tabs = [
    { id: 'home', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
    { id: 'discover', icon: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z' }, // using a search/compass ish 
    { id: 'create', icon: 'M12 5v14M5 12h14', special: true },
    { id: 'notifications', icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0' },
    { id: 'profile', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' }
  ];

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      className="absolute bottom-0 left-0 right-0 h-[22cqw] bg-[var(--color-bg-light)] border-t border-[var(--color-border)] flex items-center justify-around px-[4cqw] pb-[4cqw] z-40"
    >
      {tabs.map(tab => (
        <div key={tab.id} className="relative flex flex-col items-center justify-center w-[12cqw] h-[12cqw]">
          {tab.special ? (
            <div className="absolute -top-[4cqw] w-[14cqw] h-[14cqw] bg-[var(--color-primary)] rounded-full flex items-center justify-center shadow-lg text-white">
               <svg width="6cqw" height="6cqw" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                 <path d={tab.icon} />
               </svg>
            </div>
          ) : (
            <svg width="6cqw" height="6cqw" viewBox="0 0 24 24" fill="none" stroke={activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-muted)'} strokeWidth={activeTab === tab.id ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
              <path d={tab.icon} />
            </svg>
          )}
        </div>
      ))}
    </motion.div>
  );
}
