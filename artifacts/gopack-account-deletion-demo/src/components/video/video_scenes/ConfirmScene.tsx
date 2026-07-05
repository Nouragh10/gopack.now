import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import confirmImg from '@assets/account_deletion_demo/02-password-confirm.jpg';

export function ConfirmScene() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000), // Start typing dots
      setTimeout(() => setPhase(2), 2200), // Finished typing
      setTimeout(() => setPhase(3), 2600), // Tap confirm
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-between px-[10vw] z-10"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100, scale: 0.95 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-[40%] h-[80vh] relative order-2 md:order-1">
        <motion.div 
          className="w-full h-full rounded-[2vw] overflow-hidden shadow-2xl border-4 border-white bg-slate-900 relative"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, type: "spring" }}
        >
          <img src={confirmImg} alt="Confirm Password Modal" className="w-full h-full object-cover object-center" />
          
          {/* Simulated typing dots overlaying the input field (approximate location) */}
          <div className="absolute top-[48%] left-[20%] right-[20%] flex gap-1 h-8 items-center px-4 bg-white/0">
            {phase >= 1 && [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-slate-800"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1, duration: 0.2 }}
              />
            ))}
          </div>

          {/* Tap ripple on Confirm Delete */}
          {phase >= 3 && (
            <motion.div
              className="absolute left-[15%] right-[15%] bottom-[25%] h-[8%] bg-red-600/50 rounded-xl pointer-events-none mix-blend-overlay"
              initial={{ scale: 0.9, opacity: 1 }}
              animate={{ scale: 1.05, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          )}
        </motion.div>
      </div>

      <div className="w-[40%] flex flex-col gap-6 order-1 md:order-2">
        <motion.div 
          className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-2xl"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
        >
          2
        </motion.div>
        
        <motion.h2 
          className="text-[4vw] font-display font-bold text-slate-900 leading-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          Confirm deletion
        </motion.h2>
        
        <motion.p 
          className="text-[1.5vw] text-slate-600 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          For your security, you must enter your password to confirm. This action is permanent and cannot be undone.
        </motion.p>
      </div>
    </motion.div>
  );
}
