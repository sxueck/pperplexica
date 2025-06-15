import axios from 'axios';
import { htmlToText } from 'html-to-text';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from '@langchain/core/documents';
import pdfParse from 'pdf-parse';
import { getDocumentExtractionMethod, getCrawl4AIConfig } from '../config';

// Types for different extraction methods
interface ExtractionResult {
  content: string;
  title: string;
  url: string;
}

interface Crawl4AIResponse {
  success: boolean;
  results: Array<{
    url: string;
    markdown?: string;
    cleaned_html?: string;
    html?: string;
    text?: string;
    title?: string;
    metadata?: {
      title?: string;
      [key: string]: any;
    };
    [key: string]: any;
  }>;
  error?: string;
  message?: string;
}

/**
 * Extract content from URL using local method (axios + html-to-text)
 * This is the default method that uses built-in libraries
 */
const extractWithLocalMethod = async (url: string): Promise<ExtractionResult> => {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Perplexica/1.0)'
    }
  });

  const contentType = response.headers['content-type'] || '';
  
  // Handle PDF files
  if (contentType.includes('application/pdf')) {
    const pdfText = await pdfParse(response.data);
    const content = pdfText.text
      .replace(/(\r\n|\n|\r)/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return {
      content,
      title: 'PDF Document',
      url
    };
  }

  // Handle HTML content
  const html = response.data.toString('utf8');
  const content = htmlToText(html, {
    selectors: [
      {
        selector: 'a',
        options: {
          ignoreHref: true,
        },
      },
    ],
  })
    .replace(/(\r\n|\n|\r)/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const title = html.match(/<title.*?>(.*?)<\/title>/i)?.[1]?.trim() || url;

  return {
    content,
    title,
    url
  };
};

/**
 * Extract content from multiple URLs using Crawl4AI batch processing
 * Uses AsyncWebCrawler-compatible API for batch content extraction
 */
const extractBatchWithCrawl4AI = async (urls: string[]): Promise<ExtractionResult[]> => {
  const crawl4aiConfig = getCrawl4AIConfig();
  
  if (!crawl4aiConfig.API_URL) {
    throw new Error('Crawl4AI API URL is not configured');
  }

  // Request body format for batch processing
  const requestBody = {
    urls: urls,
    crawler_config: {
      type: "CrawlerRunConfig",
      params: {
        scraping_strategy: {
          type: "WebScrapingStrategy",
          params: {}
        },
        exclude_social_media_domains: [
          "facebook.com", "twitter.com", "x.com", "linkedin.com", 
          "instagram.com", "pinterest.com", "tiktok.com", "snapchat.com", "reddit.com"
        ],
        stream: false
      }
    }
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Add API key if configured
  if (crawl4aiConfig.API_KEY) {
    headers['Authorization'] = `Bearer ${crawl4aiConfig.API_KEY}`;
  }

  try {
    // Batch API call to crawl endpoint
    const response = await axios.post<Crawl4AIResponse>(
      `${crawl4aiConfig.API_URL}/crawl`,
      requestBody,
      {
        headers,
        timeout: (crawl4aiConfig.TIMEOUT + 20) * 1000, // Extra buffer for batch processing
      }
    );

    const result = response.data;
    
    // Handle response format
    if (!result.success) {
      throw new Error(`Crawl4AI batch extraction failed: ${result.error || result.message || 'Unknown error'}`);
    }

    // Extract content from response - use results array
    if (!result.results || result.results.length === 0) {
      throw new Error('No results returned from Crawl4AI batch processing');
    }
    
    return result.results.map(crawlResult => {
      // Prioritize cleaned content for LLM consumption
      const content = String(crawlResult.markdown || 
                             crawlResult.cleaned_html || 
                             crawlResult.html || 
                             crawlResult.text || 
                             '');
      
      const title = String(crawlResult.metadata?.title || 
                           crawlResult.title || 
                           crawlResult.url || 
                           'Untitled');

      return {
        content: content.trim(),
        title: title.trim(),
        url: crawlResult.url
      };
    });

  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const statusText = error.response?.statusText;
      const responseData = error.response?.data;
      
      // Provide more specific error messages for common issues
      if (status === 422) {
        throw new Error(`Crawl4AI batch validation error: Invalid request parameters - ${responseData?.detail || statusText}`);
      } else if (status === 404) {
        throw new Error(`Crawl4AI endpoint not found: ${error.config?.url}`);
      } else if (status === 500) {
        throw new Error(`Crawl4AI server error: ${responseData?.detail || statusText}`);
      } else {
        throw new Error(`Crawl4AI batch API error (${status}): ${error.message}`);
      }
    }
    throw error;
  }
};

/**
 * Extract content from URL using Crawl4AI service
 * Uses AsyncWebCrawler-compatible API for simple content extraction
 */
const extractWithCrawl4AI = async (url: string): Promise<ExtractionResult> => {
  const crawl4aiConfig = getCrawl4AIConfig();
  
  if (!crawl4aiConfig.API_URL) {
    throw new Error('Crawl4AI API URL is not configured');
  }

  // Request body format matching your Crawl4AI service
  const requestBody = {
    urls: [url],
    crawler_config: {
      type: "CrawlerRunConfig",
      params: {
        scraping_strategy: {
          type: "WebScrapingStrategy",
          params: {}
        },
        exclude_social_media_domains: [
          "facebook.com", "twitter.com", "x.com", "linkedin.com", 
          "instagram.com", "pinterest.com", "tiktok.com", "snapchat.com", "reddit.com"
        ],
        stream: false
      }
    }
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Add API key if configured
  if (crawl4aiConfig.API_KEY) {
    headers['Authorization'] = `Bearer ${crawl4aiConfig.API_KEY}`;
  }

  try {
    // Direct API call to crawl endpoint
    const response = await axios.post<Crawl4AIResponse>(
      `${crawl4aiConfig.API_URL}/crawl`,
      requestBody,
      {
        headers,
        timeout: (crawl4aiConfig.TIMEOUT + 10) * 1000, // Add buffer time
      }
    );

    const result = response.data;
    
    // Handle response format
    if (!result.success) {
      throw new Error(`Crawl4AI extraction failed: ${result.error || result.message || 'Unknown error'}`);
    }

    // Extract content from response - use results array
    if (!result.results || result.results.length === 0) {
      throw new Error('No results returned from Crawl4AI');
    }
    
    const firstResult = result.results[0];
    const content = String(firstResult.markdown || 
                           firstResult.cleaned_html || 
                           firstResult.html || 
                           firstResult.text || 
                           '');
    
    const title = String(firstResult.metadata?.title || 
                         firstResult.title || 
                         url);

    if (!content.trim()) {
      throw new Error('No content extracted from URL');
    }

    return {
      content: content.trim(),
      title: title.trim(),
      url
    };

  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const statusText = error.response?.statusText;
      const responseData = error.response?.data;
      
      // Provide more specific error messages for common issues
      if (status === 422) {
        throw new Error(`Crawl4AI validation error: Invalid request parameters - ${responseData?.detail || statusText}`);
      } else if (status === 404) {
        throw new Error(`Crawl4AI endpoint not found: ${error.config?.url}`);
      } else if (status === 500) {
        throw new Error(`Crawl4AI server error: ${responseData?.detail || statusText}`);
      } else {
        throw new Error(`Crawl4AI API error (${status}): ${error.message}`);
      }
    }
    throw error;
  }
};

/**
 * Extract content from a single URL using the configured method
 */
const extractContentFromUrl = async (url: string): Promise<ExtractionResult> => {
  const method = getDocumentExtractionMethod();
  
  try {
    switch (method) {
      case 'crawl4ai':
        return await extractWithCrawl4AI(url);
      case 'local':
      default:
        return await extractWithLocalMethod(url);
    }
  } catch (error) {
    // Fallback to local method if Crawl4AI fails
    if (method === 'crawl4ai') {
      console.warn(`Crawl4AI extraction failed for ${url}, falling back to local method:`, error);
      try {
        return await extractWithLocalMethod(url);
      } catch (fallbackError) {
        throw new Error(`Both Crawl4AI and local extraction failed: ${fallbackError}`);
      }
    }
    throw error;
  }
};

/**
 * Enhanced function to extract documents from search results URLs using Crawl4AI batch processing
 * Optimized for search result processing with better content extraction
 */
export const getDocumentsFromSearchResults = async ({ urls }: { urls: string[] }): Promise<Document[]> => {
  const splitter = new RecursiveCharacterTextSplitter();
  const docs: Document[] = [];

  if (urls.length === 0) {
    return docs;
  }

  // Normalize URLs
  const normalizedUrls = urls.map(url => 
    url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`
  );

  const method = getDocumentExtractionMethod();
  
  try {
    let extractionResults: ExtractionResult[] = [];
    
    if (method === 'crawl4ai') {
      // Use batch processing for better performance
             try {
         extractionResults = await extractBatchWithCrawl4AI(normalizedUrls);
       } catch (error) {
         // Silently fallback to local method for batch
         extractionResults = await Promise.all(
           normalizedUrls.map(async (url) => {
             try {
               return await extractWithLocalMethod(url);
             } catch (err) {
               return {
                 content: `Failed to retrieve content: ${err instanceof Error ? err.message : 'Unknown error'}`,
                 title: 'Extraction Failed',
                 url: url
               };
             }
           })
         );
       }
    } else {
      // Use local method for all URLs
             extractionResults = await Promise.all(
         normalizedUrls.map(async (url) => {
           try {
             return await extractWithLocalMethod(url);
           } catch (err) {
             return {
               content: `Failed to retrieve content: ${err instanceof Error ? err.message : 'Unknown error'}`,
               title: 'Extraction Failed',
               url: url
             };
           }
         })
       );
    }

    // Process each extraction result
    for (const extractionResult of extractionResults) {
      if (extractionResult.content.trim()) {
        // Split content into chunks
        const splittedText = await splitter.splitText(extractionResult.content);
        
        // Create documents from chunks
        const linkDocs = splittedText.map((text) => {
          return new Document({
            pageContent: text,
            metadata: {
              title: extractionResult.title,
              url: extractionResult.url,
              extractionMethod: method,
              source: 'search_results'
            },
          });
        });

        docs.push(...linkDocs);
      }
    }

  } catch (error) {
    // Create minimal error document
    docs.push(
      new Document({
        pageContent: 'Failed to retrieve content from search results',
        metadata: {
          title: 'Extraction Failed',
          url: 'batch_processing',
          extractionMethod: method,
          error: true,
          source: 'search_results'
        },
      }),
    );
  }

  return docs;
};

/**
 * Main function to extract documents from multiple URLs
 * Supports both local extraction and Crawl4AI based on configuration
 */
export const getDocumentsFromLinks = async ({ links }: { links: string[] }): Promise<Document[]> => {
  const splitter = new RecursiveCharacterTextSplitter();
  const docs: Document[] = [];

  await Promise.all(
    links.map(async (link) => {
      // Normalize URL
      const normalizedUrl = link.startsWith('http://') || link.startsWith('https://')
        ? link
        : `https://${link}`;

      try {
        const extractionResult = await extractContentFromUrl(normalizedUrl);
        
        // Split content into chunks
        const splittedText = await splitter.splitText(extractionResult.content);
        
        // Create documents from chunks
        const linkDocs = splittedText.map((text) => {
          return new Document({
            pageContent: text,
            metadata: {
              title: extractionResult.title,
              url: extractionResult.url,
              extractionMethod: getDocumentExtractionMethod(),
            },
          });
        });

        docs.push(...linkDocs);
      } catch (error) {
        console.error(`Failed to extract content from ${normalizedUrl}:`, error);
        
        // Create error document
        docs.push(
          new Document({
            pageContent: `Failed to retrieve content from the link: ${error}`,
            metadata: {
              title: 'Failed to retrieve content',
              url: normalizedUrl,
              extractionMethod: getDocumentExtractionMethod(),
              error: true,
            },
          }),
        );
      }
    }),
  );

  return docs;
};
