import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

export default function Splash() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLocation("/home");
    }, 2500);
    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="absolute inset-0 bg-primary flex flex-col items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <img 
          src={`${import.meta.env.BASE_URL}ooredoo-logo-white.png`} 
          alt="Ooredoo Logo" 
          className="w-48 h-auto object-contain mb-6 drop-shadow-lg"
        />
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-white font-display text-2xl font-bold tracking-wider"
        >
          BAT VALIDATOR
        </motion.div>
        
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "100px" }}
          transition={{ delay: 1, duration: 1, ease: "easeInOut" }}
          className="h-1 bg-white/30 rounded-full mt-8 overflow-hidden"
        >
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ delay: 1, duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-1/2 h-full bg-white rounded-full"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
