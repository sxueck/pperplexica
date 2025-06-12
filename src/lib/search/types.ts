 // Generic search result interface for all search sources
export interface SearchResult {
    title: string;
    url: string;
    content?: string;
    img_src?: string;
    thumbnail_src?: string;
    thumbnail?: string;
    author?: string;
    iframe_src?: string;
    siteName?: string;
    siteIcon?: string;
    snippet?: string;
    summary?: string;
    datePublished?: string;
    publishedDate?: string;
    score?: number;
    id?: string;
  }
  
  // Generic search response interface
  export interface SearchResponse {
    results: SearchResult[];
    suggestions: string[];
  }