import EmptyChatMessageInput from './EmptyChatMessageInput';
import { File } from './ChatWindow';
import WeatherWidget from './WeatherWidget';
import LLMStatisticsWidget from './LLMStatisticsWidget';
import SettingsButton from './SettingsButton';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { Menu } from 'lucide-react';

const EmptyChat = ({
  sendMessage,
  focusMode,
  setFocusMode,
  optimizationMode,
  setOptimizationMode,
  fileIds,
  setFileIds,
  files,
  setFiles,
}: {
  sendMessage: (message: string) => void;
  focusMode: string;
  setFocusMode: (mode: string) => void;
  optimizationMode: string;
  setOptimizationMode: (mode: string) => void;
  fileIds: string[];
  setFileIds: (fileIds: string[]) => void;
  files: File[];
  setFiles: (files: File[]) => void;
}) => {
  const { t } = useLanguage();
  
  const handleMobileMenuClick = () => {
    window.dispatchEvent(new CustomEvent('toggleMobileMenu'));
  };

  return (
    <div className="relative">
      <div className="absolute w-full flex flex-row items-center justify-between px-5 pt-5 lg:justify-end">
        <button
          onClick={handleMobileMenuClick}
          className="lg:hidden p-2 rounded-lg bg-light-secondary dark:bg-dark-secondary hover:bg-light-100 dark:hover:bg-dark-100 transition-colors"
          aria-label="打开菜单"
        >
          <Menu size={20} className="text-black dark:text-white" />
        </button>
        <SettingsButton variant="mobile" />
      </div>
      <div className="flex flex-col items-center justify-center min-h-screen max-w-screen-sm mx-auto p-2 space-y-4">
        <div className="flex flex-col items-center justify-center w-full space-y-8">
          <h2 className="text-black/70 dark:text-white/70 text-3xl font-medium -mt-8">
            {t('chat.empty.title')}
          </h2>
          <EmptyChatMessageInput
            sendMessage={sendMessage}
            focusMode={focusMode}
            setFocusMode={setFocusMode}
            optimizationMode={optimizationMode}
            setOptimizationMode={setOptimizationMode}
            fileIds={fileIds}
            setFileIds={setFileIds}
            files={files}
            setFiles={setFiles}
          />
        </div>
        <div className="flex flex-col w-full gap-4 mt-2 sm:flex-row sm:justify-center">
          <div className="flex-1 max-w-xs">
            <WeatherWidget />
          </div>
          <div className="flex-1 max-w-xs">
            <LLMStatisticsWidget />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyChat;
