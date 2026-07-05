import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import profileImg from '@assets/account_deletion_demo/01-profile.jpg';

export function ProfileScene() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),  // Start tap animation
      setTimeout(() => setPhase(2), 1600), // Tap lands on delete
      setTimeout(() => setPhase(3), 2000), // Ripple effect
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
      <div className="w-[40%] flex flex-col gap-6">
        <motion.div 
          className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
        >
          1
        </motion.div>
        
        <motion.h2 
          className="text-[4vw] font-display font-bold text-slate-900 leading-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          Navigate to your profile
        </motion.h2>
        
        <motion.p 
          className="text-[1.5vw] text-slate-600 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          Scroll to the bottom of the profile settings page and locate the Delete Account option.
        </motion.p>
      </div>

      <div className="w-[40%] h-[80vh] relative">
        <motion.div 
          className="w-full h-full rounded-[2vw] overflow-hidden shadow-2xl border-4 border-white bg-white relative"
          initial={{ opacity: 0, y: 50, rotateY: -15 }}
          animate={{ opacity: 1, y: 0, rotateY: 0 }}
          transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
          style={{ perspective: 1000 }}
        >
          <img src={profileImg} alt="Profile Screen" className="w-full h-full object-cover object-bottom" />
          
          {/* Simulated tap pointer */}
          <motion.div 
            className="absolute w-12 h-12 rounded-full bg-blue-500/40 border-2 border-blue-400 z-20 pointer-events-none"
            initial={{ opacity: 0, scale: 2, x: '50%', y: '40%' }}
            animate={
              phase >= 2 
                ? { opacity: 0, scale: 0, x: '50%', y: '85%' } 
                : phase >= 1 
                  ? { opacity: 1, scale: 1, x: '50%', y: '85%' }
                  : { opacity: 0, scale: 2, x: '50%', y: '40%' }
            }
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />

          {/* Ripple effect on "Delete account" */}
          {phase >= 2 && (
            <motion.div
              className="absolute left-[10%] right-[10%] bottom-[8%] h-[6%] bg-red-500/30 rounded-lg pointer-events-none mix-blend-multiply"
              initial={{ scale: 0.8, opacity: 1 }}
              animate={{ scale: 1.1, opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
