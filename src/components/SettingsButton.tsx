import React from 'react';
import { Settings } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAppConfig } from '@/hooks/useAppConfig';
import { SETTINGS_VISIBILITY } from '@/lib/constants';

interface SettingsButtonProps {
  className?: string;
  variant?: 'sidebar' | 'mobile';
}

const SettingsButton: React.FC<SettingsButtonProps> = ({ 
  className = '', 
  variant = 'sidebar' 
}) => {
  const { hideSettings, isLoading } = useAppConfig();

  // Render a placeholder div when settings are hidden to maintain layout
  if (hideSettings && !isLoading) {
    return (
      <div 
        className={cn(
          'w-6 h-6', // Maintain the same size as the Settings icon
          variant === 'sidebar' && 'cursor-pointer', // Keep same interaction area
          className
        )}
        aria-hidden="true"
      />
    );
  }

  // Show loading state while configuration is being fetched
  if (isLoading) {
    return (
      <div 
        className={cn(
          'w-6 h-6 animate-pulse bg-black/10 dark:bg-white/10 rounded',
          className
        )}
        aria-hidden="true"
      />
    );
  }

  // Render the actual settings button when not hidden
  return (
    <Link href="/settings">
      <Settings 
        className={cn(
          'cursor-pointer',
          variant === 'mobile' && 'lg:hidden',
          className
        )} 
      />
    </Link>
  );
};

export default SettingsButton; 