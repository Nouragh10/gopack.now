import { motion } from 'framer-motion';

export function OutroScene() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-blue-900 z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8, type: "spring" }}
      >
        <h1 className="text-[8vw] font-display font-bold text-white leading-tight tracking-tight text-center">
          GoPackNow
        </h1>
      </motion.div>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="mt-6"
      >
        <p className="text-[2vw] font-medium text-blue-200 tracking-wider">
          Control your data, always.
        </p>
      </motion.div>
    </motion.div>
  );
}
