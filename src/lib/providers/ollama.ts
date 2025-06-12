import axios from 'axios';
import { getKeepAlive, getOllamaApiEndpoint, getOllamaRerankModelName } from '../config';
import { ChatModel, EmbeddingModel } from '.';

export const PROVIDER_INFO = {
  key: 'ollama',
  displayName: 'Ollama',
};
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama';

// Rerank model interface
export interface RerankModel {
  displayName: string;
  model: any;
}

// Encapsulated Ollama model manager class
export class OllamaModelManager {
  private static instance: OllamaModelManager;
  private chatModels: Record<string, ChatModel> = {};
  private embeddingModels: Record<string, EmbeddingModel> = {};
  private rerankModels: Record<string, RerankModel> = {};
  private modelsLoaded = false;

  private constructor() {}

  public static getInstance(): OllamaModelManager {
    if (!OllamaModelManager.instance) {
      OllamaModelManager.instance = new OllamaModelManager();
    }
    return OllamaModelManager.instance;
  }

  // Get API endpoint
  private getApiEndpoint(): string | null {
    return getOllamaApiEndpoint();
  }

  // Check if model exists
  private async checkModelExists(modelName: string): Promise<boolean> {
    const endpoint = this.getApiEndpoint();
    if (!endpoint) return false;

    try {
      const res = await axios.get(`${endpoint}/api/tags`);
      const { models } = res.data;
      return models.some((model: any) => model.model === modelName);
    } catch (err) {
      console.error(`Error checking model existence: ${err}`);
      return false;
    }
  }

  // Pull model
  private async pullModel(modelName: string): Promise<boolean> {
    const endpoint = this.getApiEndpoint();
    if (!endpoint) return false;

    try {
      console.log(`Pulling model: ${modelName}`);
      await axios.post(`${endpoint}/api/pull`, { name: modelName });
      return true;
    } catch (err) {
      console.error(`Error pulling model ${modelName}: ${err}`);
      return false;
    }
  }

  // Ensure model is available
  private async ensureModelAvailable(modelName: string): Promise<boolean> {
    const exists = await this.checkModelExists(modelName);
    if (!exists) {
      console.log(`Model ${modelName} not found, attempting to pull...`);
      return await this.pullModel(modelName);
    }
    return true;
  }

  // Load all models
  async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;

    const endpoint = this.getApiEndpoint();
    if (!endpoint) {
      console.warn('Ollama API endpoint not configured');
      return;
    }

    try {
      const res = await axios.get(`${endpoint}/api/tags`);
      const { models } = res.data;

      // Load chat models
      models.forEach((model: any) => {
        this.chatModels[model.model] = {
          displayName: model.name,
          model: new ChatOllama({
            baseUrl: endpoint,
            model: model.model,
            temperature: 0.7,
            keepAlive: getKeepAlive(),
          }),
        };

        this.embeddingModels[model.model] = {
          displayName: model.name,
          model: new OllamaEmbeddings({
            baseUrl: endpoint,
            model: model.model,
          }),
        };
      });

      this.modelsLoaded = true;
    } catch (err) {
      console.error(`Error loading Ollama models: ${err}`);
    }
  }

  // Get rerank model
  async getRerankModel(modelName?: string): Promise<RerankModel | null> {
    // Use config model name if not provided
    const actualModelName = modelName || getOllamaRerankModelName();
    if (!actualModelName) {
      console.error('No rerank model name provided and no default configured');
      return null;
    }
    
    const endpoint = this.getApiEndpoint();
    if (!endpoint) return null;

    // Check cache
    if (this.rerankModels[actualModelName]) {
      return this.rerankModels[actualModelName];
    }

    // Ensure model is available
    const available = await this.ensureModelAvailable(actualModelName);
    if (!available) {
      console.error(`Failed to ensure rerank model ${actualModelName} is available`);
      return null;
    }

    // Create rerank model instance
    const self = this; // Capture 'this' context for use in async function
    const rerankModel: RerankModel = {
      displayName: actualModelName,
      model: {
        baseUrl: endpoint,
        modelName: actualModelName,
        async rerank(query: string, documents: string[]): Promise<Array<{ index: number; score: number }>> {
          console.log(`[OLLAMA RERANK] Starting rerank with query: "${query}", documents count: ${documents.length}`);
          try {
            // BGE reranker model should use embeddings API for similarity calculation
            // Get query embedding
            const queryResponse = await axios.post(`${endpoint}/api/embeddings`, {
              model: actualModelName,
              prompt: query
            });

            if (!queryResponse.data || !queryResponse.data.embedding) {
              throw new Error('Failed to get query embedding');
            }

            const queryEmbedding = queryResponse.data.embedding;
            const results: Array<{ index: number; score: number }> = [];

            // Get embeddings for each document and calculate similarity
            for (let i = 0; i < documents.length; i++) {
              try {
                const docResponse = await axios.post(`${endpoint}/api/embeddings`, {
                  model: actualModelName,
                  prompt: documents[i]
                });

                if (docResponse.data && docResponse.data.embedding) {
                  const docEmbedding = docResponse.data.embedding;
                  
                  // Calculate cosine similarity
                  const similarity = self.calculateCosineSimilarity(queryEmbedding, docEmbedding);
                  results.push({ index: i, score: Math.max(0, Math.min(1, similarity)) });
                } else {
                  // If embedding fails, assign a low score
                  results.push({ index: i, score: 0.1 });
                }
              } catch (docErr) {
                console.error(`Error getting embedding for document ${i}:`, docErr);
                results.push({ index: i, score: 0.1 });
              }
            }

            // Sort by score in descending order and return
            const sortedResults = results.sort((a, b) => b.score - a.score);
            console.log(`[OLLAMA RERANK] Rerank completed successfully, results:`, sortedResults);
            return sortedResults;
            
          } catch (err) {
            console.error(`[OLLAMA RERANK] Error during reranking: ${err}`);
            // Return default ordering instead of empty array
            const defaultResults = documents.map((_, index) => ({ 
              index, 
              score: Math.max(0.1, 1 - (index * 0.1))
            }));
            console.log(`[OLLAMA RERANK] Returning default results:`, defaultResults);
            return defaultResults;
          }
        }
      }
    };

    this.rerankModels[actualModelName] = rerankModel;
    return rerankModel;
  }

  // Helper method to calculate cosine similarity
  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  // Get chat models
  getChatModels(): Record<string, ChatModel> {
    return this.chatModels;
  }

  // Get embedding models
  getEmbeddingModels(): Record<string, EmbeddingModel> {
    return this.embeddingModels;
  }
}

// Keep original export functions for backward compatibility
export const loadOllamaChatModels = async () => {
  const manager = OllamaModelManager.getInstance();
  await manager.loadModels();
  return manager.getChatModels();
};

export const loadOllamaEmbeddingModels = async () => {
  const manager = OllamaModelManager.getInstance();
  await manager.loadModels();
  return manager.getEmbeddingModels();
};

// New rerank model loading function
export const getOllamaRerankModel = async (modelName?: string) => {
  const manager = OllamaModelManager.getInstance();
  return await manager.getRerankModel(modelName);
};
