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
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-10 left-0 right-0 z-[10000] flex justify-center px-6 pointer-events-none"
        >
          <div className="bg-zinc-900/90 dark:bg-white/90 backdrop-blur-xl border border-white/10 dark:border-black/10 rounded-full pl-6 pr-2 py-2 flex items-center gap-4 shadow-[0_20px_40px_rgba(0,0,0,0.4)] pointer-events-auto max-w-sm w-full">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative">
                <motion.div 
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-red-500 rounded-full"
                />
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full relative z-10" />
              </div>
              <span className="text-white dark:text-black font-bold text-[14px] whitespace-nowrap">
                You're Offline
              </span>
            </div>

            <button 
              onClick={handleReconnect}
              disabled={isRefreshing}
              className="bg-white dark:bg-black text-black dark:text-white px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-tight active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isRefreshing ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                "Reconnect"
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
