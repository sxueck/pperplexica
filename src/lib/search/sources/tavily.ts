import { tavily } from '@tavily/core';
import { getTavilyApiKey } from '../../config';
import { SearchResult, SearchResponse } from '../types';

// Tavily search options interface
interface TavilySearchOptions {
  searchDepth?: 'basic' | 'advanced';
  includeAnswer?: boolean;
  includeImages?: boolean;
  includeDomains?: string[];
  excludeDomains?: string[];
  maxResults?: number;
}

/**
 * Search using Tavily API
 * @param {string} query - Search query string
 * @param {TavilySearchOptions} opts - Optional search parameters
 * @returns {Promise<SearchResponse>} Normalized search results
 */
export const searchTavily = async (
  query: string,
  opts?: TavilySearchOptions,
): Promise<SearchResponse> => {
  try {
    const apiKey = getTavilyApiKey();
    if (!apiKey) {
      throw new Error('TAVILY_API_KEY is not configured');
    }
    
    const tvly = tavily({ apiKey });

    // Prepare search options - use proper Tavily API parameter names
    const searchOptions = {
      searchDepth: opts?.searchDepth || 'basic',
      includeAnswer: opts?.includeAnswer || false,
      includeImages: opts?.includeImages || false,
      includeDomains: opts?.includeDomains || [],
      excludeDomains: opts?.excludeDomains || [],
      maxResults: opts?.maxResults || 10,
    };

    // Execute search with proper parameter structure
    const response = await tvly.search(query, searchOptions);

    // Normalize results to match searxng format
    const normalizedResults: SearchResult[] = response.results.map((result: any) => ({
      title: result.title || '',
      url: result.url || '',
      content: result.content || '',
      img_src: result.img_src,
      publishedDate: result.published_date,
      score: result.score,
    }));

    return {
      results: normalizedResults,
      suggestions: [], // Tavily doesn't provide suggestions like searxng
    };
  } catch (error) {
    console.error('Error searching with Tavily:', error);
    throw new Error(`Tavily search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Extract content from URLs using Tavily
 * @param {string[]} urls - Array of URLs to extract content from
 * @returns {Promise<any>} Extracted content
 */
export const extractWithTavily = async (urls: string[]): Promise<any> => {
  try {
    const apiKey = getTavilyApiKey();
    if (!apiKey) {
      throw new Error('TAVILY_API_KEY is not configured');
    }
    
    const tvly = tavily({ apiKey });

    // Extract content from URLs with required options parameter
    const response = await tvly.extract(urls, {});
    return response;
  } catch (error) {
    console.error('Error extracting with Tavily:', error);
    throw new Error(`Tavily extract failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}; 