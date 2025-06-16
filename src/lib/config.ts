import toml from '@iarna/toml';

// Use dynamic imports for Node.js modules to prevent client-side errors
let fs: any;
let path: any;
if (typeof window === 'undefined') {
  // We're on the server
  fs = require('fs');
  path = require('path');
}

const configFileName = 'config.toml';

interface Config {
  GENERAL: {
    SIMILARITY_MEASURE: string;
    KEEP_ALIVE: string;
    HIDE_SETTINGS: boolean;
    LIBRARY_STORAGE: string;
    FORCED_CHAT_MODEL_PROVIDER?: string;
    FORCED_EMBEDDING_MODEL_PROVIDER?: string;
  };
  SEARCH_MODES: {
    SPEED: string[];
    BALANCED: string[];
    QUALITY: string[];
  };
  MODELS: {
    OPENAI: {
      API_KEY: string;
    };
    GROQ: {
      API_KEY: string;
    };
    ANTHROPIC: {
      API_KEY: string;
    };
    GEMINI: {
      API_KEY: string;
    };
    OLLAMA: {
      API_URL: string;
      RERANK_MODEL: string;
    };
    DEEPSEEK: {
      API_KEY: string;
    };
    LM_STUDIO: {
      API_URL: string;
    };
    CUSTOM_OPENAI: {
      API_URL: string;
      API_KEY: string;
      MODEL_NAME: string;
    };
  };
  API_ENDPOINTS: {
    SEARXNG: {
      SEARXNG: string;
    };
    TAVILY: {
      API_KEY: string;
    };
    BOCHA: {
      API_KEY: string;
    };
  };
  DOCUMENT_EXTRACTION?: {
    METHOD: string;
    CRAWL4AI?: {
      API_URL: string;
      API_KEY: string;
      TIMEOUT: number;
      SMART_EXTRACTION: boolean;
    };
  };
  GUARDRAIL_MODEL?: {
    ENABLED: boolean;
    API_KEY: string;
    API_URL: string;
    MODEL_NAME: string;
  };
}

type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};

const loadConfig = () => {
  // Server-side only
  if (typeof window === 'undefined') {
    return toml.parse(
      fs.readFileSync(path.join(process.cwd(), `${configFileName}`), 'utf-8'),
    ) as any as Config;
  }

  // Client-side fallback - settings will be loaded via API
  return {} as Config;
};

export const getSimilarityMeasure = () =>
  loadConfig().GENERAL.SIMILARITY_MEASURE;

export const getKeepAlive = () => loadConfig().GENERAL.KEEP_ALIVE;

export const getHideSettings = () => loadConfig().GENERAL.HIDE_SETTINGS;

export const getLibraryStorage = () => loadConfig().GENERAL.LIBRARY_STORAGE;

export const getForcedChatModelProvider = () => {
  const provider = loadConfig().GENERAL.FORCED_CHAT_MODEL_PROVIDER;
  return provider && provider.trim() !== "" ? provider : null;
};

export const getForcedEmbeddingModelProvider = () => {
  const provider = loadConfig().GENERAL.FORCED_EMBEDDING_MODEL_PROVIDER;
  return provider && provider.trim() !== "" ? provider : null;
};

export const getOpenaiApiKey = () => loadConfig().MODELS.OPENAI.API_KEY;

export const getGroqApiKey = () => loadConfig().MODELS.GROQ.API_KEY;

export const getAnthropicApiKey = () => loadConfig().MODELS.ANTHROPIC.API_KEY;

export const getGeminiApiKey = () => loadConfig().MODELS.GEMINI.API_KEY;

export const getSearxngApiEndpoint = () =>
  process.env.SEARXNG_API_URL || loadConfig().API_ENDPOINTS.SEARXNG.SEARXNG;

export const getOllamaApiEndpoint = () => loadConfig().MODELS.OLLAMA.API_URL;

export const getOllamaRerankModelName = () => loadConfig().MODELS.OLLAMA.RERANK_MODEL;

export const getDeepseekApiKey = () => loadConfig().MODELS.DEEPSEEK.API_KEY;

export const getCustomOpenaiApiKey = () =>
  loadConfig().MODELS.CUSTOM_OPENAI.API_KEY;

export const getCustomOpenaiApiUrl = () =>
  loadConfig().MODELS.CUSTOM_OPENAI.API_URL;

export const getCustomOpenaiModelName = () =>
  loadConfig().MODELS.CUSTOM_OPENAI.MODEL_NAME;

export const getLMStudioApiEndpoint = () =>
  loadConfig().MODELS.LM_STUDIO.API_URL;

export const getTavilyApiKey = () => 
  process.env.TAVILY_API_KEY || loadConfig().API_ENDPOINTS.TAVILY.API_KEY;

export const getBochaAIApiKey = () => 
  process.env.BOCHAAI_API_KEY || loadConfig().API_ENDPOINTS.BOCHA.API_KEY;

export const getSearchModeConfig = (mode: 'speed' | 'balanced' | 'quality') => {
  const config = loadConfig();
  switch (mode) {
    case 'speed':
      return config.SEARCH_MODES?.SPEED || ['SEARXNG'];
    case 'balanced':
      return config.SEARCH_MODES?.BALANCED || ['SEARXNG', 'TAVILY', 'BOCHAAI'];
    case 'quality':
      return config.SEARCH_MODES?.QUALITY || ['SEARXNG', 'TAVILY', 'BOCHAAI'];
    default:
      return ['SEARXNG'];
  }
};

const mergeConfigs = (current: any, update: any): any => {
  if (update === null || update === undefined) {
    return current;
  }

  if (typeof current !== 'object' || current === null) {
    return update;
  }

  const result = { ...current };

  for (const key in update) {
    if (Object.prototype.hasOwnProperty.call(update, key)) {
      const updateValue = update[key];

      if (
        typeof updateValue === 'object' &&
        updateValue !== null &&
        typeof result[key] === 'object' &&
        result[key] !== null
      ) {
        result[key] = mergeConfigs(result[key], updateValue);
      } else if (updateValue !== undefined) {
        result[key] = updateValue;
      }
    }
  }

  return result;
};

export const updateConfig = (config: RecursivePartial<Config>) => {
  // Server-side only
  if (typeof window === 'undefined') {
    const currentConfig = loadConfig();
    const mergedConfig = mergeConfigs(currentConfig, config);
    fs.writeFileSync(
      path.join(path.join(process.cwd(), `${configFileName}`)),
      toml.stringify(mergedConfig),
    );
  }
};

export const getGuardrailConfig = () => {
  const config = loadConfig();
  return config.GUARDRAIL_MODEL || {
    ENABLED: false,
    API_KEY: '',
    API_URL: '',
    MODEL_NAME: ''
  };
};

export const getDocumentExtractionMethod = () => {
  // Config file takes precedence over environment variables
  const config = loadConfig();
  const configMethod = config.DOCUMENT_EXTRACTION?.METHOD;
  
  if (configMethod) return configMethod;
  
  // Fallback to environment variable only if config method is not set
  const envMethod = process.env.USE_CRAWL4AI === 'true' ? 'crawl4ai' : 
                   process.env.USE_CRAWL4AI === 'false' ? 'local' : null;
  
  return envMethod || 'local';
};

export const getCrawl4AIConfig = () => {
  const config = loadConfig();
  const crawl4aiConfig = config.DOCUMENT_EXTRACTION?.CRAWL4AI;
  
  // Use config file settings with environment variable fallbacks
  return {
    API_URL: crawl4aiConfig?.API_URL || process.env.CRAWL4AI_API_URL || '',
    API_KEY: crawl4aiConfig?.API_KEY || process.env.CRAWL4AI_API_KEY || '',
    TIMEOUT: crawl4aiConfig?.TIMEOUT || parseInt(process.env.CRAWL4AI_TIMEOUT || '30'),
    SMART_EXTRACTION: crawl4aiConfig?.SMART_EXTRACTION !== undefined ? 
      crawl4aiConfig.SMART_EXTRACTION : 
      process.env.CRAWL4AI_SMART_EXTRACTION !== 'false'
  };
};
