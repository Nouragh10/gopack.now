import { motion } from 'framer-motion';
import signedOutImg from '@assets/account_deletion_demo/04-signed-out.jpg';

export function SignedOutScene() {
  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center z-10"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex flex-col items-center gap-12 w-full max-w-[80vw]">
        
        <motion.div 
          className="w-[30vw] h-[60vh] relative z-20"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
        >
          <div className="w-full h-full rounded-[2vw] overflow-hidden shadow-2xl border-4 border-white bg-white">
            <img src={signedOutImg} alt="Signed Out" className="w-full h-full object-cover object-center" />
          </div>
        </motion.div>
        
        <div className="text-center z-10">
          <motion.h2 
            className="text-[4vw] font-display font-bold text-slate-900 leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            Successfully Deleted
          </motion.h2>
          
          <motion.p 
            className="text-[1.8vw] text-slate-600 leading-relaxed mt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            You have been signed out and your data is removed.
          </motion.p>
        </div>

      </div>
    </motion.div>
  );
}
