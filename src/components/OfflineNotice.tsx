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
          className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[40px] p-10 max-w-sm w-full shadow-2xl text-center"
          >
            <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-8">
              <WifiIcon className="w-10 h-10 text-zinc-900 dark:text-zinc-100 opacity-40" />
            </div>
            
            <h2 className="text-[28px] font-black tracking-tight mb-4 text-zinc-900 dark:text-white leading-tight">
              Connection Lost
            </h2>
            
            <p className="text-zinc-500 font-medium text-[16px] leading-relaxed mb-10 px-2">
              It looks like you're offline. Please check your internet connection to continue.
            </p>

            <button 
              onClick={handleReconnect}
              disabled={isRefreshing}
              className="w-full bg-black dark:bg-white text-white dark:text-black font-black py-4.5 rounded-[24px] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isRefreshing ? (
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
              ) : (
                "Try Reconnect"
              )}
            </button>
            <p className="mt-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">
              Checking status...
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
