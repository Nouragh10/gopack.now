import { motion } from 'framer-motion';
import deletingImg from '@assets/account_deletion_demo/03-deleting.jpg';

export function DeletingScene() {
  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-between px-[10vw] z-10"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-[40%] flex flex-col gap-6">
        <motion.div 
          className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-2xl"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
        >
          3
        </motion.div>
        
        <motion.h2 
          className="text-[4vw] font-display font-bold text-slate-900 leading-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          Processing...
        </motion.h2>
        
        <motion.p 
          className="text-[1.5vw] text-slate-600 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          Your personal data, preferences, and account details are securely removed.
        </motion.p>
      </div>

      <div className="w-[40%] h-[80vh] relative">
        <motion.div 
          className="w-full h-full rounded-[2vw] overflow-hidden shadow-2xl border-4 border-white bg-slate-50 relative"
          initial={{ opacity: 0, y: -50, rotateZ: 5 }}
          animate={{ opacity: 1, y: 0, rotateZ: 0 }}
          transition={{ duration: 0.8, type: "spring" }}
        >
          <img src={deletingImg} alt="Deleting State" className="w-full h-full object-cover object-center" />
          
          {/* Subtle animated overlay to emphasize the loading state */}
          <motion.div
            className="absolute inset-0 bg-white/10 mix-blend-overlay"
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
