interface GuardrailPromptParams {
  title: string;
  content: string;
  category?: string;
  subcategory?: string;
}

/**
 * Generate a prompt for content moderation and categorization
 * This prompt is used to check content safety and category accuracy
 * @param params - The content and category information to analyze
 * @returns The formatted prompt string
 */
export const generateGuardrailPrompt = (params: GuardrailPromptParams): string => {
  return `You are a content moderation and categorization assistant. Please analyze the following content for:
1. Safety: Check if the content contains harmful, inappropriate, or unsafe material
2. Category accuracy: Verify if the content matches the specified category

Content to analyze:
Title: ${params.title}
Content: ${params.content}
Specified Category: ${params.category || 'Not specified'}
Subcategory: ${params.subcategory || 'Not specified'}

Please respond with a JSON object containing:
- "allowed": boolean (true if content is safe and properly categorized, false otherwise)
- "reason": string (explanation if content is rejected)
- "suggestedCategory": string (if category is incorrect, suggest a better one)

Response format: {"allowed": true/false, "reason": "explanation", "suggestedCategory": "category"}`;
};

/**
 * Static prompt template for guardrail content checking
 * This is the base template that gets populated with actual content
 */
export const guardrailPromptTemplate = `You are a content moderation and categorization assistant. Please analyze the following content for:
1. Safety: Check if the content contains harmful, inappropriate, or unsafe material
2. Category accuracy: Verify if the content matches the specified category

Content to analyze:
Title: {title}
Content: {content}
Specified Category: {category}
Subcategory: {subcategory}

Please respond with a JSON object containing:
- "allowed": boolean (true if content is safe and properly categorized, false otherwise)
- "reason": string (explanation if content is rejected)
- "suggestedCategory": string (if category is incorrect, suggest a better one)

Response format: {"allowed": true/false, "reason": "explanation", "suggestedCategory": "category"}`;

/**
 * Safety guidelines for content moderation
 * These are the criteria used to evaluate content safety
 */
export const guardrailSafetyGuidelines = {
  prohibited: [
    'Hate speech or discriminatory content',
    'Violence or threats of violence',
    'Harassment or bullying',
    'Illegal activities or content',
    'Explicit sexual content',
    'Spam or misleading information',
    'Personal information or doxxing',
    'Copyright infringement'
  ],
  
  categories: {
    'LLM': 'Content related to Large Language Models, AI, machine learning, and artificial intelligence',
    'News': 'Current events, news articles, journalism, and recent developments',
    'Technology': 'Technical content, software development, hardware, and technology trends',
    'Science': 'Scientific research, discoveries, academic papers, and scientific discussions',
    'Education': 'Educational content, tutorials, learning materials, and academic resources'
  }
}; 