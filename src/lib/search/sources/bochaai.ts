import axios from 'axios';
import { getBochaAIApiKey } from '../../config';
import { SearchResult, SearchResponse } from '../types';

// BochaAI search options interface
interface BochaAISearchOptions {
  freshness?: 'oneDay' | 'oneWeek' | 'oneMonth' | 'oneYear' | 'noLimit';
  summary?: boolean;
  count?: number;
  page?: number;
}

/**
 * Search using BochaAI API
 * @param {string} query - Search query string
 * @param {BochaAISearchOptions} opts - Optional search parameters
 * @returns {Promise<SearchResponse>} Standardized search results
 */
export const searchBochaAI = async (
  query: string,
  opts?: BochaAISearchOptions,
): Promise<SearchResponse> => {
  try {
    const apiKey = getBochaAIApiKey();
    if (!apiKey) {
      throw new Error('BOCHAAI_API_KEY is not configured');
    }

    const url = 'https://api.bochaai.com/v1/web-search';
    
    // Prepare request parameters
    const payload = {
      query,
      freshness: opts?.freshness || 'noLimit',
      summary: opts?.summary !== false, // Enable summary by default
      count: opts?.count || 10,
      page: opts?.page || 1,
    };

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    // Execute search request
    const response = await axios.post(url, payload, { headers });

    if (response.status !== 200) {
      throw new Error(`BochaAI API returned status ${response.status}: ${response.statusText}`);
    }

    const data = response.data;

    // Check response data structure
    if (!data || !data.data || !data.data.webPages || !data.data.webPages.value) {
      console.warn('Unexpected BochaAI API response structure:', data);
      return { results: [], suggestions: [] };
    }

    // Normalize results to standardized format
    const normalizedResults: SearchResult[] = data.data.webPages.value.map((result: any) => ({
      title: result.name || result.title || '',
      url: result.url || '',
      content: result.summary || result.snippet || '',
      img_src: result.siteIcon,
      siteName: result.siteName,
      siteIcon: result.siteIcon,
      snippet: result.snippet,
      summary: result.summary,
      datePublished: result.datePublished,
      id: result.id,
    }));

    return {
      results: normalizedResults,
      suggestions: [], // BochaAI does not provide search suggestions
    };
  } catch (error) {
    console.error('Error searching with BochaAI:', error);
    
    // Provide detailed error information
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      
      if (status === 401) {
        throw new Error('BochaAI API authentication failed. Please check your API key.');
      } else if (status === 429) {
        throw new Error('BochaAI API rate limit exceeded. Please try again later.');
      } else if (status === 403) {
        throw new Error('BochaAI API access forbidden. Please check your API key permissions.');
      } else {
        throw new Error(`BochaAI search failed (${status}): ${message}`);
      }
    }
    
    throw new Error(`BochaAI search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};