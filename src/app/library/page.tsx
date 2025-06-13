'use client';

import DeleteChat from '@/components/DeleteChat';
import { cn, formatTimeDifference } from '@/lib/utils';
import { BookOpenText, ClockIcon, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export interface Chat {
  id: string;
  title: string;
  createdAt: string;
  focusMode: string;
}

interface ChatWithMessages {
  chat: Chat;
  messages: Array<{
    id: string;
    content: string;
    role: 'user' | 'assistant';
  }>;
}

const Page = () => {
  const [allChats, setAllChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<ChatWithMessages[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);

  useEffect(() => {
    const fetchChats = async () => {
      setLoading(true);

      try {
        // Check storage configuration
        const configRes = await fetch('/api/config');
        const config = await configRes.json();
        
        if (config.libraryStorage === 'local') {
          // For local storage, get chats from localStorage
          const { getLocalChats } = await import('@/lib/storage/localStorage');
          const localChats = getLocalChats();
          setAllChats(localChats);
        } else {
          // For sqlite storage, use existing API
          const res = await fetch(`/api/chats`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          const data = await res.json();
          setAllChats(data.chats);
        }
      } catch (error) {
        console.error('Error fetching chats:', error);
        setAllChats([]);
      }

      setLoading(false);
    };

    fetchChats();
  }, []);

  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setFilteredChats([]);
        setIsSearchMode(false);
        return;
      }

      setIsSearchMode(true);

      try {
        // Check storage configuration
        const configRes = await fetch('/api/config');
        const config = await configRes.json();
        
        if (config.libraryStorage === 'local') {
          // For local storage, use search function
          const { searchLocalChats } = await import('@/lib/storage/localStorage');
          const searchResults = searchLocalChats(searchQuery);
          setFilteredChats(searchResults.map(result => ({
            chat: result.chat,
            messages: result.messages.map(msg => ({
              id: msg.id,
              content: msg.content,
              role: msg.role
            }))
          })));
        } else {
          // For sqlite storage, implement search API call if needed
          // For now, just filter the existing chats by title
          const filtered = allChats
            .filter(chat => 
              chat.title.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map(chat => ({
              chat,
              messages: []
            }));
          setFilteredChats(filtered);
        }
      } catch (error) {
        console.error('Error searching chats:', error);
        setFilteredChats([]);
      }
    };

    const timeoutId = setTimeout(performSearch, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [searchQuery, allChats]);

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredChats([]);
    setIsSearchMode(false);
  };

  const displayChats = isSearchMode ? filteredChats : allChats.map(chat => ({ chat, messages: [] }));

  const getSearchHighlight = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {part}
        </span>
      ) : part
    );
  };

  return loading ? (
    <div className="flex flex-row items-center justify-center min-h-screen">
      <svg
        aria-hidden="true"
        className="w-8 h-8 text-light-200 fill-light-secondary dark:text-[#202020] animate-spin dark:fill-[#ffffff3b]"
        viewBox="0 0 100 101"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M100 50.5908C100.003 78.2051 78.1951 100.003 50.5908 100C22.9765 99.9972 0.997224 78.018 1 50.4037C1.00281 22.7993 22.8108 0.997224 50.4251 1C78.0395 1.00281 100.018 22.8108 100 50.4251ZM9.08164 50.594C9.06312 73.3997 27.7909 92.1272 50.5966 92.1457C73.4023 92.1642 92.1298 73.4365 92.1483 50.6308C92.1669 27.8251 73.4392 9.0973 50.6335 9.07878C27.8278 9.06026 9.10003 27.787 9.08164 50.594Z"
          fill="currentColor"
        />
        <path
          d="M93.9676 39.0409C96.393 38.4037 97.8624 35.9116 96.9801 33.5533C95.1945 28.8227 92.871 24.3692 90.0681 20.348C85.6237 14.1775 79.4473 9.36872 72.0454 6.45794C64.6435 3.54717 56.3134 2.65431 48.3133 3.89319C45.869 4.27179 44.3768 6.77534 45.014 9.20079C45.6512 11.6262 48.1343 13.0956 50.5786 12.717C56.5073 11.8281 62.5542 12.5399 68.0406 14.7911C73.527 17.0422 78.2187 20.7487 81.5841 25.4923C83.7976 28.5886 85.4467 32.059 86.4416 35.7474C87.1273 38.1189 89.5423 39.6781 91.9676 39.0409Z"
          fill="currentFill"
        />
      </svg>
    </div>
  ) : (
    <div>
      <div className="flex flex-col pt-4">
        <div className="flex items-center">
          <BookOpenText />
          <h1 className="text-3xl font-medium p-2">Library</h1>
        </div>
        
        {/* Search Box */}
        <div className="relative mx-2 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="搜索历史记录标题或内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-800 text-black dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         placeholder-gray-500 dark:placeholder-gray-400"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {isSearchMode && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              找到 {filteredChats.length} 条相关记录
            </div>
          )}
        </div>
        
        <hr className="border-t border-[#2B2C2C] my-4 w-full" />
      </div>
      
      {displayChats.length === 0 && !loading && (
        <div className="flex flex-row items-center justify-center min-h-screen">
          <p className="text-black/70 dark:text-white/70 text-sm">
            {isSearchMode ? '没有找到匹配的记录' : '没有找到聊天记录'}
          </p>
        </div>
      )}
      
      {displayChats.length > 0 && (
        <div className="flex flex-col pb-20 lg:pb-2">
          {displayChats.map((item, i) => {
            const { chat } = item;
            const matchingMessages = isSearchMode ? 
              item.messages.filter(msg => 
                msg.content.toLowerCase().includes(searchQuery.toLowerCase())
              ).slice(0, 2) : []; // Show max 2 matching messages
              
            return (
              <div
                className={cn(
                  'flex flex-col space-y-4 py-6',
                  i !== displayChats.length - 1
                    ? 'border-b border-white-200 dark:border-dark-200'
                    : '',
                )}
                key={i}
              >
                <Link
                  href={`/c/${chat.id}`}
                  className="text-black dark:text-white lg:text-xl font-medium truncate transition duration-200 hover:text-[#24A0ED] dark:hover:text-[#24A0ED] cursor-pointer"
                >
                  {isSearchMode ? getSearchHighlight(chat.title, searchQuery) : chat.title}
                </Link>
                
                {/* Show matching message content when searching */}
                {isSearchMode && matchingMessages.length > 0 && (
                  <div className="ml-4 space-y-2">
                    {matchingMessages.map((msg, msgIndex) => (
                      <div key={msgIndex} className="text-sm text-gray-600 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="font-medium text-xs uppercase tracking-wide text-gray-500 dark:text-gray-500">
                          {msg.role === 'user' ? '问题' : '回答'}:
                        </span>
                        <div className="mt-1 line-clamp-2">
                          {getSearchHighlight(msg.content, searchQuery)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex flex-row items-center justify-between w-full">
                  <div className="flex flex-row items-center space-x-1 lg:space-x-1.5 text-black/70 dark:text-white/70">
                    <ClockIcon size={15} />
                    <p className="text-xs">
                      {formatTimeDifference(new Date(), chat.createdAt)} Ago
                    </p>
                  </div>
                  <DeleteChat
                    chatId={chat.id}
                    chats={allChats}
                    setChats={setAllChats}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Page;
