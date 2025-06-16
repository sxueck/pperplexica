'use client';

import { useLanguage } from '@/lib/contexts/LanguageContext';
import { Loader2, CheckCircle } from 'lucide-react';

interface SearchProgressProps {
  currentStep: string;
  visible: boolean;
  isCompleted?: boolean;
  focusMode?: string;
}

const SearchProgress: React.FC<SearchProgressProps> = ({ 
  currentStep, 
  visible,
  isCompleted = false,
  focusMode = 'webSearch'
}) => {
  const { t } = useLanguage();

  const getFocusModeLabel = (mode: string) => {
    const modeMap: { [key: string]: string } = {
      'webSearch': t('focus.all'),
      'academicSearch': t('focus.academic'),
      'writingAssistant': t('focus.writing'),
      'wolframAlphaSearch': t('focus.wolfram'),
      'youtubeSearch': t('focus.youtube'),
      'redditSearch': t('focus.reddit')
    };
    return modeMap[mode] || t('focus.all');
  };

  const getStepInfo = (step: string) => {
    if (isCompleted) {
      return {
        icon: <CheckCircle size={14} className="text-green-600 dark:text-green-400" />,
        label: `${t('progress.completed') || 'Content retrieval completed'} • ${getFocusModeLabel(focusMode)}`,
        color: 'text-green-600 dark:text-green-400'
      };
    }
    
    // Show spinning loader for active steps with safe fallback
    const progressKey = `progress.${step}`;
    const fallbackMessages: { [key: string]: string } = {
      'progress.searching': 'Searching web sources...',
      'progress.extracting': 'Extracting content from sources...',
      'progress.reranking': 'Reranking and filtering results...',
      'progress.processing': 'Processing and analyzing information...',
      'progress.generating': 'Generating comprehensive response...'
    };
    
    return {
      icon: <Loader2 size={14} className="animate-spin" />,
      label: t(progressKey) || fallbackMessages[progressKey] || t('progress.searching') || 'Searching...',
      color: 'text-gray-600 dark:text-gray-400'
    };
  };

  if (!visible) return null;

  const stepInfo = getStepInfo(currentStep);

  return (
    <div className="flex items-center space-x-2">
      <div className={stepInfo.color}>
        {stepInfo.icon}
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-400">
        {stepInfo.label}
      </span>
    </div>
  );
};

export default SearchProgress; 