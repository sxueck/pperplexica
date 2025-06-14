'use client';

import DeleteChat from '@/components/DeleteChat';
import { cn, formatTimeDifference } from '@/lib/utils';
import { BookOpenText, ClockIcon, Search, X, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogBackdrop,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { Fragment } from 'react';

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

// Add interface for chat with summary
interface ChatWithSummary {
  chat: Chat;
  messages: Array<{
    id: string;
    content: string;
    role: 'user' | 'assistant';
  }>;
  summary?: string; // First assistant response summary
}

const Page = () => {
  const { t } = useLanguage();
  const [allChats, setAllChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<ChatWithSummary[]>([]);
  const [chatsWithSummaries, setChatsWithSummaries] = useState<ChatWithSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [sharingChatId, setSharingChatId] = useState<string | null>(null);
  const [shareConfirmDialog, setShareConfirmDialog] = useState<{
    open: boolean;
    chat: Chat | null;
    summary: string | null;
  }>({
    open: false,
    chat: null,
    summary: null,
  });
  const [spacesConfig, setSpacesConfig] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Function to get first assistant response and create summary
  const getChatSummary = async (chatId: string, storageType: string): Promise<string> => {
    try {
      if (storageType === 'local') {
        const { getLocalMessagesByChatId } = await import('@/lib/storage/localStorage');
        const messages = getLocalMessagesByChatId(chatId);
        const firstAssistantMsg = messages.find(msg => msg.role === 'assistant');
        if (firstAssistantMsg && firstAssistantMsg.content) {
          // Get first 180 characters of assistant response
          return firstAssistantMsg.content.slice(0, 180);
        }
      } else {
        // For SQLite storage, fetch chat messages
        const res = await fetch(`/api/chats/${chatId}`);
        if (res.ok) {
          const data = await res.json();
          const messages = data.messages.map((msg: any) => ({
            ...msg,
            ...JSON.parse(msg.metadata || '{}'),
          }));
          const firstAssistantMsg = messages.find((msg: any) => msg.role === 'assistant');
          if (firstAssistantMsg && firstAssistantMsg.content) {
            // Get first 180 characters of assistant response
            return firstAssistantMsg.content.slice(0, 180);
          }
        }
      }
    } catch (error) {
      console.error('Error getting chat summary:', error);
    }
    return '';
  };

  useEffect(() => {
    const fetchSpacesConfig = async () => {
      try {
        const response = await fetch('/api/spaces/config');
        if (response.ok) {
          const config = await response.json();
          setSpacesConfig(config);
        }
      } catch (error) {
        console.error('Error fetching spaces config:', error);
      }
    };
    
    fetchSpacesConfig();
  }, []);

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
          
          // Get summaries for each chat
          const chatsWithSummaries = await Promise.all(
            localChats.map(async (chat) => {
              const summary = await getChatSummary(chat.id, 'local');
              return {
                chat,
                messages: [],
                summary
              };
            })
          );
          setChatsWithSummaries(chatsWithSummaries);
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
          
          // Get summaries for each chat
          const chatsWithSummaries = await Promise.all(
            data.chats.map(async (chat: Chat) => {
              const summary = await getChatSummary(chat.id, 'sqlite');
              return {
                chat,
                messages: [],
                summary
              };
            })
          );
          setChatsWithSummaries(chatsWithSummaries);
        }
      } catch (error) {
        console.error('Error fetching chats:', error);
        setAllChats([]);
        setChatsWithSummaries([]);
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
          const filteredWithSummaries = await Promise.all(
            searchResults.map(async (result) => {
              const summary = await getChatSummary(result.chat.id, 'local');
              return {
                chat: result.chat,
                messages: result.messages.map(msg => ({
                  id: msg.id,
                  content: msg.content,
                  role: msg.role
                })),
                summary
              };
            })
          );
          setFilteredChats(filteredWithSummaries);
        } else {
          // For sqlite storage, implement search API call if needed
          // For now, just filter the existing chats by title
          const filtered = allChats
            .filter(chat => 
              chat.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
          const filteredWithSummaries = await Promise.all(
            filtered.map(async (chat) => {
              const summary = await getChatSummary(chat.id, 'sqlite');
              return {
                chat,
                messages: [],
                summary
              };
            })
          );
          setFilteredChats(filteredWithSummaries);
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

  const displayChats = isSearchMode ? filteredChats : chatsWithSummaries;

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

  const handleShareToSpaces = async (chat: Chat, summary?: string) => {
    if (sharingChatId === chat.id) return; // Prevent double sharing
    
    setSharingChatId(chat.id);
    
    try {
      const response = await fetch('/api/spaces/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: chat.id,
          title: chat.title,
          content: summary || t('loading'),
          category: selectedCategory || undefined,
        }),
      });

      if (response.ok) {
        toast.success(t('spaces.shareSuccess'));
      } else {
        const error = await response.json();
        toast.error(error.message || t('spaces.shareFailed'));
      }
    } catch (error) {
      console.error('Error sharing to spaces:', error);
      toast.error(t('spaces.shareError'));
    } finally {
      setSharingChatId(null);
      setShareConfirmDialog({ open: false, chat: null, summary: null });
    }
  };

  const openShareConfirmDialog = (chat: Chat, summary?: string) => {
    setShareConfirmDialog({
      open: true,
      chat,
      summary: summary || null,
    });
  };

  const closeShareConfirmDialog = () => {
    setShareConfirmDialog({ open: false, chat: null, summary: null });
    setSelectedCategory('');
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
              placeholder={t('search.placeholder') || "搜索历史记录标题或内容..."}
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
            {isSearchMode ? '没有找到匹配的记录' : t('sidebar.noChats')}
          </p>
        </div>
      )}
      
      {displayChats.length > 0 && (
        <div className="flex flex-col pb-20 lg:pb-2">
          {displayChats.map((item, i) => {
            const { chat, summary } = item;
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
                
                {/* Add summary below title */}
                {summary && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {/* Summary content aligned with title width */}
                    <p className="line-clamp-3">
                      {isSearchMode ? getSearchHighlight(summary, searchQuery) : summary}
                      {summary.length >= 200 && '...'}
                    </p>
                  </div>
                )}
                
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
                  <div className="flex flex-row items-center space-x-2">
                    <button
                      onClick={() => openShareConfirmDialog(chat, summary)}
                      disabled={sharingChatId === chat.id}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={t('spaces.shareToSpaces')}
                    >
                      <Share2 size={16} />
                    </button>
                    <DeleteChat
                      chatId={chat.id}
                      chats={allChats}
                      setChats={setAllChats}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share Confirmation Dialog */}
      <Transition appear show={shareConfirmDialog.open} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeShareConfirmDialog}>
          <DialogBackdrop className="fixed inset-0 bg-black/30" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-100"
                leaveFrom="opacity-100 scale-200"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-md transform rounded-2xl bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex items-center space-x-2 mb-4">
                    <Share2 size={20} className="text-blue-600 dark:text-blue-400" />
                    <DialogTitle className="text-lg font-medium leading-6 dark:text-white">
                      {t('spaces.shareConfirmTitle')}
                    </DialogTitle>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                        ⚠️ {t('spaces.shareWarning')}
                      </p>
                    </div>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p className="mb-3">
                        <strong className="text-black dark:text-white">{t('spaces.shareItemTitle')}:</strong> {shareConfirmDialog.chat?.title}
                      </p>
                    </div>
                    
                    {/* Category Selection */}
                    {spacesConfig && (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-black dark:text-white">
                          {t('spaces.category')}
                        </label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">{t('spaces.selectCategory') || '选择分类'}</option>
                          {Object.keys(spacesConfig.spaces).map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-row items-center justify-end space-x-3 mt-6">
                    <button
                      onClick={closeShareConfirmDialog}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    >
                      {t('delete.cancel')}
                    </button>
                    <button
                      onClick={() => {
                        if (shareConfirmDialog.chat) {
                          handleShareToSpaces(shareConfirmDialog.chat, shareConfirmDialog.summary || undefined);
                        }
                      }}
                      disabled={sharingChatId === shareConfirmDialog.chat?.id}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {sharingChatId === shareConfirmDialog.chat?.id ? t('spaces.sharing') : t('spaces.confirmShare')}
                    </button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default Page;
