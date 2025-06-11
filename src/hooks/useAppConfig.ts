import { useState, useEffect } from 'react';
import { CONFIG_KEYS } from '@/lib/constants';

interface AppConfig {
  hideSettings: boolean;
  libraryStorage: string;
  isLoading: boolean;
  error: string | null;
}

export const useAppConfig = (): AppConfig => {
  const [config, setConfig] = useState<AppConfig>({
    hideSettings: false,
    libraryStorage: 'sqlite',
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config');
        if (!response.ok) {
          throw new Error('Failed to fetch configuration');
        }
        
        const data = await response.json();
        
        setConfig({
          hideSettings: data[CONFIG_KEYS.HIDE_SETTINGS] || false,
          libraryStorage: data[CONFIG_KEYS.LIBRARY_STORAGE] || 'sqlite',
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching app configuration:', error);
        setConfig(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    };

    fetchConfig();
  }, []);

  return config;
}; 