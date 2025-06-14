'use client';

import { Users, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import Link from 'next/link';
import { SpacesConfig } from '@/lib/spaces';

const Page = () => {
  const { t } = useLanguage();
  const [spacesConfig, setSpacesConfig] = useState<SpacesConfig | null>(null);
  const [entryCounts, setEntryCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch spaces config
        const configResponse = await fetch('/api/spaces/config');
        if (configResponse.ok) {
          const configData = await configResponse.json();
          setSpacesConfig(configData);
          
          // Fetch entry counts for each space
          const counts: Record<string, number> = {};
          for (const category of Object.keys(configData.spaces)) {
            try {
              const entriesResponse = await fetch(`/api/spaces/${category}`);
              if (entriesResponse.ok) {
                const entriesData = await entriesResponse.json();
                counts[category] = entriesData.entries?.length || 0;
              } else {
                counts[category] = 0;
              }
            } catch (error) {
              console.error(`Error fetching entries for ${category}:`, error);
              counts[category] = 0;
            }
          }
          setEntryCounts(counts);
        } else {
          console.error('Failed to fetch spaces config');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Users />
            <h1 className="text-3xl font-medium p-2">{t('spaces.title')}</h1>
          </div>
        </div>
        
        <p className="text-black/70 dark:text-white/70 text-sm mx-2 mb-4">
          {t('spaces.description')}
        </p>
        
        <hr className="border-t border-[#2B2C2C] my-4 w-full" />
      </div>
      
      {/* Display spaces as cards */}
      {spacesConfig && Object.keys(spacesConfig.spaces).length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2 pb-20 lg:pb-2">
          {Object.entries(spacesConfig.spaces).map(([category, spaceInfo]) => (
            <Link
              key={category}
              href={`/spaces/${category}`}
              className="group"
            >
              <div className="bg-light-secondary dark:bg-dark-secondary rounded-lg p-6 border border-light-200 dark:border-dark-200 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 hover:shadow-lg dark:hover:shadow-xl cursor-pointer h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Users size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-black dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                        {category}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-black/60 dark:text-white/60">
                          {entryCounts[category] || 0} {t('spaces.entriesCount')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight 
                    size={20} 
                    className="text-black/40 dark:text-white/40 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200" 
                  />
                </div>
                
                <p className="text-sm text-black/70 dark:text-white/70 leading-relaxed line-clamp-3">
                  {spaceInfo.Description}
                </p>
                
                <div className="mt-4 pt-4 border-t border-light-200 dark:border-dark-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-200">
                      {t('spaces.viewEntries')}
                    </span>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
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
      )}
    </div>
  );
};

export default Page; 