import { useState, useEffect } from 'react';

export const useHealthCheck = (url: string, interval: number = 10000) => {
  const [isOnline, setIsOnline] = useState(true); // Assume online initially

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(url, { method: 'GET' });
        // The health endpoint should return a 2xx status code if healthy
        if (response.ok) {
          setIsOnline(true);
        } else {
          setIsOnline(false);
        }
      } catch (error) {
        // Any network error likely means the backend is offline
        console.warn("Backend health check failed:", error);
        setIsOnline(false);
      }
    };

    // Check immediately on component mount
    checkStatus();

    // Set up a recurring check
    const id = setInterval(checkStatus, interval);

    // Clean up the interval when the component unmounts
    return () => clearInterval(id);
  }, [url, interval]);

  return isOnline;
};