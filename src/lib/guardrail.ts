import { getGuardrailConfig } from './config';
import { generateGuardrailPrompt } from './prompts/guardrail';

interface GuardrailRequest {
  title: string;
  content: string;
  category?: string;
  subcategory?: string;
}

interface GuardrailResponse {
  allowed: boolean;
  reason?: string;
  suggestedCategory?: string;
}

/**
 * Check content safety and category accuracy using the configured guardrail model
 * @param request - The content to be checked
 * @returns Promise<GuardrailResponse> - The guardrail check result
 */
export const checkContentGuardrail = async (
  request: GuardrailRequest
): Promise<GuardrailResponse> => {
  const guardrailConfig = getGuardrailConfig();
  
  // If guardrail is disabled, allow all content
  if (!guardrailConfig.ENABLED) {
    return { allowed: true };
  }

  // Validate guardrail configuration
  if (!guardrailConfig.API_KEY || !guardrailConfig.API_URL || !guardrailConfig.MODEL_NAME) {
    console.warn('Guardrail model is enabled but not properly configured');
    return { allowed: true };
  }

  try {
    // Generate the prompt using the dedicated prompt function
    const prompt = generateGuardrailPrompt({
      title: request.title,
      content: request.content,
      category: request.category,
      subcategory: request.subcategory,
    });

    // Make API call to the guardrail model
    const response = await fetch(guardrailConfig.API_URL + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${guardrailConfig.API_KEY}`,
      },
      body: JSON.stringify({
        model: guardrailConfig.MODEL_NAME,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1, // Low temperature for consistent moderation decisions
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('Guardrail API request failed:', response.status, response.statusText);
      // If guardrail service fails, allow content to prevent blocking legitimate submissions
      return { allowed: true };
    }

    const data = await response.json();
    const modelResponse = data.choices?.[0]?.message?.content;

    if (!modelResponse) {
      console.error('Invalid response from guardrail model');
      return { allowed: true };
    }

    // Parse the JSON response from the model
    try {
      const result = JSON.parse(modelResponse) as GuardrailResponse;
      return {
        allowed: result.allowed,
        reason: result.reason,
        suggestedCategory: result.suggestedCategory,
      };
    } catch (parseError) {
      console.error('Failed to parse guardrail model response:', parseError);
      // If we can't parse the response, check for basic safety keywords
      const lowerContent = (request.title + ' ' + request.content).toLowerCase();
      const unsafeKeywords = ['hate', 'violence', 'harmful', 'illegal', 'explicit'];
      const containsUnsafeContent = unsafeKeywords.some(keyword => 
        lowerContent.includes(keyword)
      );
      
      return {
        allowed: !containsUnsafeContent,
        reason: containsUnsafeContent ? 'Content may contain unsafe material' : undefined,
      };
    }
  } catch (error) {
    console.error('Error during guardrail check:', error);
    // If there's an error, allow content to prevent blocking legitimate submissions
    return { allowed: true };
  }
}; 