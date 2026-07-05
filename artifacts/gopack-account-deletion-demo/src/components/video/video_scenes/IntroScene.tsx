import { motion } from 'framer-motion';

export function IntroScene() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -50, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
      >
        <h1 className="text-[6vw] font-display font-bold text-slate-900 leading-tight tracking-tight text-center">
          GoPackNow
        </h1>
      </motion.div>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
        className="mt-4 px-8 py-3 rounded-full bg-blue-100/50 backdrop-blur-md border border-blue-200"
      >
        <p className="text-[1.8vw] font-medium text-blue-900 tracking-wide uppercase">
          Account Deletion Walkthrough
        </p>
      </motion.div>
    </motion.div>
  );
}
