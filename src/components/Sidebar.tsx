'use client';

import { cn, formatTimeDifference } from '@/lib/utils';
import { BookOpenText, Home, Search, SquarePen, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { useSelectedLayoutSegments } from 'next/navigation';
import React, { useState, useEffect, useRef, type ReactNode } from 'react';
import Layout from './Layout';
import SettingsButton from './SettingsButton';
import { useLanguage } from '@/lib/contexts/LanguageContext';

const VerticalIconContainer = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex flex-col items-center gap-y-3 w-full">{children}</div>
  );
};

interface Chat {
  id: string;
  title: string;
  createdAt: string;
  focusMode: string;
}

const Sidebar = ({ children }: { children: React.ReactNode }) => {
  const segments = useSelectedLayoutSegments();
  const { t } = useLanguage();
  const [showHomeSubmenu, setShowHomeSubmenu] = useState(false);
  const [recentChats, setRecentChats] = useState<Chat[]>([]);
  const [allChats, setAllChats] = useState<Chat[]>([]);
  const [showAllChats, setShowAllChats] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isHomePage = segments.length === 0 || segments.includes('c');

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleMobileMenuToggle = () => {
      if (isMobile && isHomePage) {
        setShowHomeSubmenu(prev => !prev);
      }
    };

    window.addEventListener('toggleMobileMenu', handleMobileMenuToggle);
    
    return () => {
      window.removeEventListener('toggleMobileMenu', handleMobileMenuToggle);
    };
  }, [isMobile, isHomePage]);

  const navLinks = [
    {
      icon: Home,
      href: '/',
      active: isHomePage,
      label: t('sidebar.home'),
      hasSubmenu: true,
    },
    {
      icon: Search,
      href: '/discover',
      active: segments.includes('discover'),
      label: t('sidebar.discover'),
      hasSubmenu: false,
    },
    {
      icon: BookOpenText,
      href: '/library',
      active: segments.includes('library'),
      label: t('sidebar.library'),
      hasSubmenu: false,
    },
  ];

  // Fetch recent chat history
  useEffect(() => {
    const fetchRecentChats = async () => {
      if (!showHomeSubmenu) return;
      
      setLoading(true);
      try {
        // Check storage configuration
        const configRes = await fetch('/api/config');
        const config = await configRes.json();
        
        if (config.libraryStorage === 'local') {
          // Local storage mode
          const { getLocalChats } = await import('@/lib/storage/localStorage');
          const localChats = getLocalChats();
          setAllChats(localChats);
          setRecentChats(localChats.slice(0, 10)); // Show recent 10 chats
        } else {
          // SQLite storage mode
          const res = await fetch(`/api/chats`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          const data = await res.json();
          setAllChats(data.chats);
          setRecentChats(data.chats.slice(0, 10)); // Show recent 10 chats
        }
      } catch (error) {
        console.error('Error fetching recent chats:', error);
        setRecentChats([]);
        setAllChats([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentChats();
  }, [showHomeSubmenu]);

  // Cleanup timers on component unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (isMobile) return;
    
    // Clear leave timer
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    
    hoverTimeoutRef.current = setTimeout(() => {
      setShowHomeSubmenu(true);
    }, 150);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    
    // Clear enter timer
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    leaveTimeoutRef.current = setTimeout(() => {
      setShowHomeSubmenu(false);
    }, 500);
  };

  const handleSubmenuMouseEnter = () => {
    if (isMobile) return;
    
    // Clear leave timer when mouse enters submenu
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  };

  const handleSubmenuMouseLeave = () => {
    if (isMobile) return;
    
    leaveTimeoutRef.current = setTimeout(() => {
      setShowHomeSubmenu(false);
    }, 400);
  };

  const handleHomeClick = (e: React.MouseEvent) => {
    if (!isHomePage) {
      // If not on home page, allow normal navigation
      return;
    }
    // If on home page, prevent default navigation behavior
    e.preventDefault();
  };

  const handleExpandToggle = () => {
    setShowAllChats(!showAllChats);
  };

  const displayChats = showAllChats ? allChats : recentChats;

  const HomeSubmenu = () => (
    <>
      {/* Expanded mouse sensing area - covers gap between sidebar and submenu (desktop only) */}
      {showHomeSubmenu && !isMobile && (
        <div 
          className="fixed top-0 left-16 w-8 h-full z-35"
          onMouseEnter={handleSubmenuMouseEnter}
          onMouseLeave={handleSubmenuMouseLeave}
        />
      )}
      
      {/* Transparent overlay, click to close */}
      {showHomeSubmenu && (
        <div 
          className="fixed inset-0 bg-black/20 z-30"
          onClick={() => setShowHomeSubmenu(false)}
        />
      )}
      
      {/* Render menu elements only when the menu is displayed */}
      {showHomeSubmenu && (
        <div 
          className={cn(
            "fixed h-full bg-light-primary dark:bg-dark-primary shadow-xl z-40",
            "transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            isMobile ? [
              "top-0 left-0 border-r border-light-200 dark:border-dark-200",
              "transform translate-x-0"
            ] : [
              "top-0 left-20 border-l border-light-200 dark:border-dark-200", 
              "transform translate-x-0"
            ]
          )}
          style={{ width: '280px', maxWidth: '280px', minWidth: '280px' }}
          onMouseEnter={!isMobile ? handleSubmenuMouseEnter : undefined}
          onMouseLeave={!isMobile ? handleSubmenuMouseLeave : undefined}
        >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-light-200 dark:border-dark-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-black dark:text-white">
                  {showAllChats ? t('sidebar.allChats') : t('sidebar.recentChats')}
                </h3>
                <span className="text-xs text-black/50 dark:text-white/50 bg-light-secondary dark:bg-dark-secondary px-2 py-1 rounded-full">
                  {displayChats.length}
                </span>
              </div>
              <button
                onClick={handleExpandToggle}
                className={cn(
                  "p-1 rounded-lg transition-all duration-200",
                  "hover:bg-light-secondary dark:hover:bg-dark-secondary",
                  "hover:scale-110 active:scale-95",
                  showAllChats && "bg-blue-50 dark:bg-blue-900/20"
                )}
                title={showAllChats ? t('sidebar.showRecentChats') : t('sidebar.showAllChats')}
              >
                {showAllChats ? (
                  <ChevronUp size={16} className="text-blue-600 dark:text-blue-400 transition-colors" />
                ) : (
                  <ChevronDown size={16} className="text-black/70 dark:text-white/70 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" />
                )}
              </button>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto overflow-hidden-scrollable">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black dark:border-white"></div>
              </div>
            ) : displayChats.length > 0 ? (
              <div className="p-3">
                {displayChats.map((chat, index) => (
                  <Link
                    key={`${showAllChats ? 'all' : 'recent'}-${chat.id}`}
                    href={`/c/${chat.id}`}
                    onClick={() => setShowHomeSubmenu(false)}
                    className="block p-3 mb-2 rounded-lg hover:bg-light-secondary dark:hover:bg-dark-secondary transition-all duration-200 group hover:shadow-sm hover:scale-[1.01] transform w-full"
                    style={{ 
                      animationDelay: `${index * 20}ms`,
                      animation: (showHomeSubmenu || showAllChats) ? 'slideInRight 0.25s ease-out forwards' : 'none'
                    }}
                  >
                    <div className="flex flex-col space-y-1 w-full overflow-hidden">
                      <h4 className="text-sm font-medium text-black dark:text-white group-hover:text-[#24A0ED] line-clamp-2 break-words">
                        {chat.title}
                      </h4>
                      <div className="flex items-center space-x-1 text-xs text-black/60 dark:text-white/60">
                        <Clock size={12} />
                        <span>
                          {formatTimeDifference(new Date(), new Date(chat.createdAt))} ago
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center p-8">
                <p className="text-sm text-black/60 dark:text-white/60">
                  {t('sidebar.noChats')}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-light-200 dark:border-dark-200">
            <Link
              href="/library"
              onClick={() => setShowHomeSubmenu(false)}
              className="block w-full text-center py-2.5 px-4 rounded-lg bg-light-secondary dark:bg-dark-secondary hover:bg-light-100 dark:hover:bg-dark-100 transition-colors text-sm font-medium text-black dark:text-white truncate"
            >
              {t('sidebar.library')}
            </Link>
          </div>
        </div>
      </div>
      )}
    </>
  );

  return (
    <div>
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-20 lg:flex-col">
        <div className="flex grow flex-col items-center justify-between gap-y-5 overflow-y-auto bg-light-secondary dark:bg-dark-secondary px-2 py-8">
          <a href="/">
            <SquarePen className="cursor-pointer" />
          </a>
          <VerticalIconContainer>
            {navLinks.map((link, i) => (
              <div key={i} className="relative w-full">
                <Link
                  href={link.href}
                  onClick={link.hasSubmenu ? handleHomeClick : undefined}
                  onMouseEnter={link.hasSubmenu && isHomePage ? handleMouseEnter : undefined}
                  onMouseLeave={link.hasSubmenu && isHomePage ? handleMouseLeave : undefined}
                  className={cn(
                    'relative flex flex-row items-center justify-center cursor-pointer duration-150 transition w-full py-2 rounded-lg',
                    'hover:bg-black/10 dark:hover:bg-white/10',
                    link.hasSubmenu && isHomePage && 'hover:bg-blue-50 dark:hover:bg-blue-900/20',
                    link.active
                      ? 'text-black dark:text-white'
                      : 'text-black/70 dark:text-white/70',
                  )}
                >
                  <link.icon />
                  {link.active && (
                    <div className="absolute right-0 -mr-2 h-full w-1 rounded-l-lg bg-black dark:bg-white" />
                  )}
                </Link>
              </div>
            ))}
          </VerticalIconContainer>

          <SettingsButton variant="sidebar" />
        </div>
      </div>

      {isHomePage && <HomeSubmenu />}

      <div className="fixed bottom-0 w-full z-50 flex flex-row items-center gap-x-6 bg-light-primary dark:bg-dark-primary px-4 py-4 shadow-sm lg:hidden">
        {navLinks.map((link, i) => (
          <Link
            href={link.href}
            key={i}
            onClick={link.hasSubmenu && !isHomePage ? undefined : undefined}
            className={cn(
              'relative flex flex-col items-center space-y-1 text-center w-full',
              link.active
                ? 'text-black dark:text-white'
                : 'text-black dark:text-white/70',
            )}
          >
            {link.active && (
              <div className="absolute top-0 -mt-4 h-1 w-full rounded-b-lg bg-black dark:bg-white" />
            )}
            <link.icon />
            <p className="text-xs">{link.label}</p>
          </Link>
        ))}
      </div>

      <Layout>{children}</Layout>
    </div>
  );
};

export default Sidebar;
