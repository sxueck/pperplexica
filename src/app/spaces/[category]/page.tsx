'use client';

import { ArrowLeft, Clock, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { formatTimeDifference, formatDetailedTime } from '@/lib/utils';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface SpaceEntry {
  id: string;
  chatId: string;
  title: string;
  content: string;
  createdAt: string;
  author: string;
  spaceSharing: boolean;
  category?: string;
  subcategory?: string;
}

const SpacePage = () => {
  const { t } = useLanguage();
  const params = useParams();
  const category = params.category as string;
  const [entries, setEntries] = useState<SpaceEntry[]>([]);
  const [spaceInfo, setSpaceInfo] = useState<{ Description: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch entries for this category
        const entriesResponse = await fetch(`/api/spaces/${category}`);
        if (entriesResponse.ok) {
          const entriesData = await entriesResponse.json();
          setEntries(entriesData.entries || []);
        } else {
          console.error('Failed to fetch entries for category');
          setEntries([]);
        }

        // Get space info from config
        const configResponse = await fetch('/api/spaces/config');
        if (configResponse.ok) {
          const config = await configResponse.json();
          if (config.spaces[category]) {
            setSpaceInfo(config.spaces[category]);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };

    if (category) {
      fetchData();
    }
  }, [category]);

  if (loading) {
    return (
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
    );
  }

  return (
    <div>
      <div className="flex flex-col pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Link
              href="/spaces"
              className="flex items-center space-x-2 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors duration-200"
            >
              <ArrowLeft size={20} />
              <span className="text-sm">{t('spaces.backToSpaces')}</span>
            </Link>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 mb-2">
          <h1 className="text-3xl font-medium">{category}</h1>
          <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
            {entries.length} {t('spaces.entriesCount')}
          </div>
        </div>
        
        {spaceInfo && (
          <p className="text-black/70 dark:text-white/70 text-sm mb-4 max-w-3xl">
            {spaceInfo.Description}
          </p>
        )}
        
        <hr className="border-t border-[#2B2C2C] my-4 w-full" />
      </div>
      
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
          <div className="flex items-center justify-center w-16 h-16 bg-light-secondary dark:bg-dark-secondary rounded-full">
            <Users size={32} className="text-black/50 dark:text-white/50" />
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-lg font-medium text-black dark:text-white">
              {t('spaces.noSpaces')}
            </h3>
            <p className="text-black/60 dark:text-white/60 text-sm max-w-md">
              {t('spaces.description')}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col pb-20 lg:pb-2">
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className={`flex flex-col space-y-4 py-6 px-2 ${
                i !== entries.length - 1
                  ? 'border-b border-white-200 dark:border-dark-200'
                  : ''
              }`}
            >
              <div className="flex flex-col space-y-2">
                <Link
                  href={`/c/${entry.chatId}`}
                  className="text-black dark:text-white lg:text-xl font-medium transition duration-200 hover:text-[#24A0ED] dark:hover:text-[#24A0ED] cursor-pointer"
                >
                  {entry.title}
                </Link>
                
                <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  <p className="line-clamp-4">
                    {entry.content}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-row items-center justify-between w-full">
                <div className="flex flex-row items-center space-x-4 text-black/70 dark:text-white/70">
                  <div className="flex items-center space-x-1">
                    <Clock size={15} />
                    <div className="flex items-center space-x-2">
                      <p className="text-xs">
                        {formatTimeDifference(new Date(), new Date(entry.createdAt))} ago
                      </p>
                      <span className="text-xs text-black/30 dark:text-white/30">•</span>
                      <p className="text-xs text-black/50 dark:text-white/50">
                        {formatDetailedTime(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                  {/* <div className="flex items-center space-x-1">
                    <Users size={15} />
                    <p className="text-xs">{entry.author}</p>
                  </div> */}
                </div>
                
                <div className="flex items-center space-x-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-md text-xs font-mono">
                  <span>{t('spaces.entryId')}: {entry.id.substring(0, 5).toUpperCase()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpacePage; 