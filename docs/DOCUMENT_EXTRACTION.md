# Document Extraction Configuration

Perplexica provides flexible document extraction capabilities with support for both local extraction and advanced AI-powered extraction via Crawl4AI integration.

## Overview

When users provide URLs for context in their queries, Perplexica needs to extract and process the content from those web pages. This system supports two extraction methods:

1. **Local Extraction** - Built-in extraction using standard libraries
2. **Crawl4AI Integration** - Advanced extraction using AI-powered web crawling

## Extraction Methods

### Local Extraction (Default)

The local extraction method uses built-in Node.js libraries for content extraction:

- **Libraries Used**: `axios`, `html-to-text`, `pdf-parse`
- **Supported Content**: HTML pages, PDF documents
- **Features**:
  - No external dependencies
  - Basic text cleaning and formatting
  - Link removal and whitespace normalization
  - PDF text extraction
  - Fast and reliable for simple content

### Crawl4AI Integration

Crawl4AI provides advanced web content extraction with AI capabilities:

- **Features**:
  - AI-enhanced content parsing
  - JavaScript-rendered content support
  - Intelligent noise removal
  - Structured data extraction
  - Markdown output format
  - Better handling of complex web pages

## Configuration

### Method 1: Configuration File (config.toml)

Add the following section to your `config.toml`:

```toml
[DOCUMENT_EXTRACTION]
# Extraction method: "local" or "crawl4ai"
METHOD = "local"

# Crawl4AI configuration (only used when METHOD = "crawl4ai")
[DOCUMENT_EXTRACTION.CRAWL4AI]
# API endpoint for Crawl4AI service
API_URL = "http://localhost:11235"

# API key (leave empty for local installations)
API_KEY = ""

# Request timeout in seconds
TIMEOUT = 30

# Enable AI-enhanced extraction
SMART_EXTRACTION = true
```

### Method 2: Environment Variables

Environment variables take precedence over configuration file settings:

```bash
# Primary toggle - overrides config file METHOD setting
USE_CRAWL4AI=true

# Crawl4AI service configuration
CRAWL4AI_API_URL=http://localhost:11235
CRAWL4AI_API_KEY=your-api-key-here
CRAWL4AI_TIMEOUT=30
CRAWL4AI_SMART_EXTRACTION=true
```

## Setting Up Crawl4AI

### Local Installation

```bash
# Install Crawl4AI
pip install crawl4ai

# Start the service
crawl4ai-server --port 11235
```

### Docker Installation

```bash
# Pull and run Crawl4AI container
docker run -d \
  --name crawl4ai \
  -p 11235:11235 \
  unclecode/crawl4ai:latest
```

### Docker Compose Integration

Add to your `docker-compose.yaml`:

```yaml
services:
  crawl4ai:
    image: unclecode/crawl4ai:latest
    ports:
      - "11235:11235"
    restart: unless-stopped
    
  perplexica:
    # ... your existing perplexica configuration
    environment:
      - USE_CRAWL4AI=true
      - CRAWL4AI_API_URL=http://crawl4ai:11235
    depends_on:
      - crawl4ai
```

## Implementation Details

### Extraction Process Flow

1. **URL Normalization**: Ensures all URLs have proper HTTP/HTTPS protocol
2. **Method Selection**: Chooses extraction method based on configuration
3. **Content Extraction**: Extracts content using selected method
4. **Fallback Handling**: Falls back to local method if Crawl4AI fails
5. **Text Processing**: Cleans and normalizes extracted text
6. **Document Creation**: Creates LangChain documents with metadata

### Error Handling

The system implements robust error handling:

- **Graceful Degradation**: If Crawl4AI fails, automatically falls back to local extraction
- **Comprehensive Logging**: All extraction attempts and failures are logged
- **Error Documents**: Failed extractions create error documents with diagnostic information
- **Timeout Protection**: Configurable timeouts prevent hanging requests

### Metadata Enhancement

Each extracted document includes metadata:

```javascript
{
  title: "Page Title",
  url: "https://example.com",
  extractionMethod: "crawl4ai", // or "local"
  error: false // true if extraction failed
}
```

## Performance Considerations

### Local Extraction
- **Pros**: Fast, no external dependencies, low latency
- **Cons**: Limited JavaScript support, basic content cleaning
- **Best For**: Simple HTML pages, PDF documents, quick processing

### Crawl4AI Extraction
- **Pros**: Advanced parsing, JavaScript support, AI-enhanced cleaning
- **Cons**: External dependency, network latency, potential costs
- **Best For**: Complex web pages, JavaScript-heavy sites, high-quality extraction

## Troubleshooting

### Common Issues

1. **Crawl4AI Connection Failed**
   ```
   Error: Crawl4AI API URL is not configured
   ```
   - Ensure `CRAWL4AI_API_URL` is set correctly
   - Verify Crawl4AI service is running
   - Check network connectivity

2. **Extraction Timeouts**
   ```
   Error: Request timeout of 30000ms exceeded
   ```
   - Increase `CRAWL4AI_TIMEOUT` value
   - Check target website responsiveness
   - Consider using local extraction for slow sites

3. **Authentication Errors**
   ```
   Error: 401 Unauthorized
   ```
   - Verify `CRAWL4AI_API_KEY` is correct
   - Check if your Crawl4AI deployment requires authentication

### Debugging

Enable debug logging to troubleshoot extraction issues:

```bash
DEBUG=perplexica:document-extraction npm start
```

### Health Check

Test your extraction configuration:

```bash
curl -X POST http://localhost:3000/api/test-extraction \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://example.com"]}'
```

## Security Considerations

- **API Keys**: Store Crawl4AI API keys securely
- **Network Access**: Ensure Crawl4AI service is properly secured
- **Content Validation**: Be aware that extracted content is processed by AI models
- **Rate Limiting**: Consider implementing rate limits for extraction requests

## Migration Guide

### From Local to Crawl4AI

1. Install and configure Crawl4AI service
2. Update configuration:
   ```bash
   USE_CRAWL4AI=true
   CRAWL4AI_API_URL=http://localhost:11235
   ```
3. Test with a sample URL
4. Monitor logs for any issues

### From Crawl4AI to Local

1. Update configuration:
   ```bash
   USE_CRAWL4AI=false
   ```
2. Remove Crawl4AI service if no longer needed
3. Verify local extraction works for your use cases

## API Reference

For detailed Crawl4AI API documentation, visit:
- [Crawl4AI GitHub Repository](https://github.com/unclecode/crawl4ai)
- [Crawl4AI Documentation](https://crawl4ai.com/docs)

## Support

For issues related to:
- **Perplexica Integration**: Open an issue in the Perplexica repository
- **Crawl4AI Service**: Check the Crawl4AI repository and documentation
- **Configuration Help**: Review this documentation and check logs 