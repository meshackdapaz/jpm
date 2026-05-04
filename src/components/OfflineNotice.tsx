"use client";

import React, { useEffect, useState } from "react";
import { Network, ConnectionStatus } from "@capacitor/network";
import { motion, AnimatePresence } from "framer-motion";
import { WifiIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { useAuth } from "./AuthProvider";

export const OfflineNotice = () => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [hasChecked, setHasChecked] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { refresh } = useAuth();

  useEffect(() => {
    let handler: any;

    const checkStatus = async () => {
      const status = await Network.getStatus();
      setIsConnected(status.connected);
      setHasChecked(true);

      handler = await Network.addListener("networkStatusChange", (s) => {
        setIsConnected(s.connected);
      });
    };

    checkStatus();

    return () => {
      if (handler) {
        handler.remove();
      }
    };
  }, []);

  const handleReconnect = async () => {
    setIsRefreshing(true);
    try {
      const status = await Network.getStatus();
      if (status.connected) {
        // If back online, try to refresh session silently
        await refresh();
        setIsConnected(true);
      } else {
        // Still offline, just wait a bit
        await new Promise(r => setTimeout(r, 800));
      }
    } catch (e) {
      console.error('Reconnect failed:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <AnimatePresence>
      {!isConnected && hasChecked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/20 dark:border-zinc-800/50 rounded-[32px] p-8 max-w-[340px] w-full shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] text-center relative overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-zinc-400 dark:via-zinc-600 to-transparent opacity-20" />
            
            <div className="relative mb-8">
              <motion.div 
                animate={{ 
                  scale: [1, 1.15, 1],
                  opacity: [0.3, 0.6, 0.3] 
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800 rounded-full blur-xl"
              />
              <div className="relative w-16 h-16 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <WifiIcon className="w-8 h-8 text-zinc-900 dark:text-zinc-100" />
              </div>
            </div>
            
            <h2 className="text-[24px] font-bold tracking-tight mb-2 text-zinc-900 dark:text-white">
              No Internet
            </h2>
            
            <p className="text-zinc-500 dark:text-zinc-400 font-medium text-[15px] leading-relaxed mb-8">
              Your connection was interrupted. We'll try to reconnect you automatically.
            </p>

            <button 
              onClick={handleReconnect}
              disabled={isRefreshing}
              className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold py-3.5 rounded-2xl active:scale-[0.97] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 shadow-lg shadow-black/10"
            >
              {isRefreshing ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                "Try Reconnect"
              )}
            </button>
            
            <div className="mt-6 flex items-center justify-center gap-2">
              <div className="flex gap-1">
                <motion.div 
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                  className="w-1.5 h-1.5 rounded-full bg-zinc-400" 
                />
                <motion.div 
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                  className="w-1.5 h-1.5 rounded-full bg-zinc-400" 
                />
                <motion.div 
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                  className="w-1.5 h-1.5 rounded-full bg-zinc-400" 
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
