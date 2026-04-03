import { useState, useEffect } from 'react';
import * as Network from 'expo-network';

export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        setIsOnline(state.isConnected && state.isInternetReachable);
      } catch {
        setIsOnline(true);
      }
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  return isOnline;
}
