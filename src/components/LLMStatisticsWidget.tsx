import { BarChart3, MessageSquare, Hash, Database, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/contexts/LanguageContext';

interface Statistics {
  totalQuestions: number;
  totalChats: number;
  useLocalStorage?: boolean;
}

const AnimatedChart = ({ className }: { className?: string }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(prev => !prev);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <BarChart3 
        className={`h-10 w-10 transition-all duration-500 ${
          isAnimating 
            ? 'text-blue-600 dark:text-blue-300 scale-110' 
            : 'text-blue-500 dark:text-blue-400 scale-100'
        }`}
      />
      <div 
        className={`absolute inset-0 rounded-full transition-all duration-1000 ${
          isAnimating 
            ? 'bg-blue-500/20 scale-150' 
            : 'bg-blue-500/0 scale-100'
        }`}
      />
    </div>
  );
};

const LLMStatisticsWidget = () => {
  const { t } = useLanguage();
  const [data, setData] = useState<Statistics>({
    totalQuestions: 0,
    totalChats: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadStatistics = async () => {
      try {
        const res = await fetch('/api/statistics');
        const statistics: Statistics = await res.json();
        
        if (statistics.useLocalStorage) {
          // Compute statistics from localStorage
          try {
            const chatsData = localStorage.getItem('perplexica_chats');
            const messagesData = localStorage.getItem('perplexica_messages');
            
            const chats = chatsData ? JSON.parse(chatsData) : [];
            const messages = messagesData ? JSON.parse(messagesData) : [];
            
            const userMessages = messages.filter((msg: any) => msg.role === 'user');
            
            setData({
              totalQuestions: userMessages.length,
              totalChats: chats.length,
            });
          } catch (localError) {
            console.error('Error reading from localStorage:', localError);
            setData(statistics);
          }
        } else {
          setData(statistics);
        }
        setLoading(false);
      } catch (error) {
        setError(true);
        setLoading(false);
      }
    };

    loadStatistics();
  }, []);

  return (
    <div className="bg-light-secondary dark:bg-dark-secondary rounded-xl border border-light-200 dark:border-dark-200 shadow-sm flex flex-row items-center w-full h-24 min-h-[96px] max-h-[96px] px-3 py-2 gap-3">
      {loading ? (
        <>
          <div className="flex flex-col items-center justify-center w-16 min-w-16 max-w-16 h-full animate-pulse">
            <div className="h-10 w-10 rounded-full bg-light-200 dark:bg-dark-200 mb-2" />
            <div className="h-4 w-10 rounded bg-light-200 dark:bg-dark-200" />
          </div>
          <div className="flex flex-col justify-between flex-1 h-full py-1 animate-pulse">
            <div className="flex flex-row items-center justify-between">
              <div className="h-3 w-20 rounded bg-light-200 dark:bg-dark-200" />
              <div className="h-3 w-12 rounded bg-light-200 dark:bg-dark-200" />
            </div>
            <div className="h-3 w-16 rounded bg-light-200 dark:bg-dark-200 mt-1" />
            <div className="flex flex-row justify-between w-full mt-auto pt-1 border-t border-light-200 dark:border-dark-200">
              <div className="h-3 w-16 rounded bg-light-200 dark:bg-dark-200" />
              <div className="h-3 w-8 rounded bg-light-200 dark:bg-dark-200" />
            </div>
          </div>
        </>
      ) : error ? (
        <div className="w-full text-xs text-red-400">{t('statistics.loadError')}</div>
      ) : (
        <>
          <div className="flex flex-col items-center justify-center w-16 min-w-16 max-w-16 h-full">
            <AnimatedChart />
            <span className="text-base font-semibold text-black dark:text-white">
              {t('statistics.title')}
            </span>
          </div>
          <div className="flex flex-col justify-between flex-1 h-full py-1">
            <div className="flex flex-row items-center justify-between">
              <span className="text-xs font-medium text-black dark:text-white">
                {t('statistics.llmUsage')}
              </span>
              <span className="flex items-center text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                <Database className="w-3 h-3 mr-1" />
                {t('statistics.localCache')}
              </span>
            </div>
            <span className="text-xs text-black/60 dark:text-white/60 mt-1">
              {t('statistics.questionsAsked')} {data.totalQuestions} {t('statistics.questions')}
            </span>
            <div className="flex flex-row justify-between w-full mt-auto pt-1 border-t border-light-200 dark:border-dark-200 text-xs text-black/60 dark:text-white/60">
              <span className="flex items-center">
                <MessageSquare className="w-3 h-3 mr-1" />
                {t('statistics.chats')}: {data.totalChats}
              </span>
              <span className="flex items-center">
                <Activity className="w-3 h-3 mr-1" />
                {t('statistics.total')}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LLMStatisticsWidget; 