# Guardrail Model Setup Guide

The Guardrail Model feature provides automated content moderation and categorization for Spaces submissions. When enabled, all content shared to Spaces will be checked for safety and proper categorization before being accepted.

## Configuration

### 1. Enable Guardrail in config.toml

Add or update the `[GUARDRAIL_MODEL]` section in your `config.toml` file:

```toml
[GUARDRAIL_MODEL]
# Enable the guardrail system
ENABLED = true

# API configuration for your chosen AI service
API_KEY = "your-api-key-here"
API_URL = "https://api.openai.com/v1"
MODEL_NAME = "gpt-3.5-turbo"
```

### 2. Supported API Providers

The guardrail system works with any OpenAI-compatible API:

#### OpenAI
```toml
API_KEY = "sk-your-openai-key"
API_URL = "https://api.openai.com/v1"
MODEL_NAME = "gpt-3.5-turbo"
```

#### Together AI
```toml
API_KEY = "your-together-key"
API_URL = "https://api.together.xyz/v1"
MODEL_NAME = "meta-llama/Llama-2-70b-chat-hf"
```

#### Local Ollama (with OpenAI compatibility)
```toml
API_KEY = "not-required"
API_URL = "http://localhost:11434/v1"
MODEL_NAME = "llama2:7b"
```

## How It Works

### Content Analysis Process

1. **User submits content** to Spaces
2. **Guardrail check** analyzes the content for:
   - **Safety**: Harmful, inappropriate, or unsafe material
   - **Category accuracy**: Whether content matches the specified category
3. **Decision made**:
   - ✅ **Allow**: Content is safe and properly categorized
   - ❌ **Reject**: Content violates safety guidelines
   - 🔄 **Adjust**: Content is safe but category is corrected

### Response Types

#### Successful Submission
```json
{
  "message": "Successfully shared to spaces",
  "entry": { ... }
}
```

#### Rejected Submission
```json
{
  "message": "Content rejected by safety and categorization check",
  "reason": "Content contains inappropriate material",
  "suggestedCategory": null
}
```

#### Category Adjusted
```json
{
  "message": "Successfully shared to spaces",
  "entry": { ... },
  "categoryAdjusted": true,
  "originalCategory": "News",
  "adjustedCategory": "LLM"
}
```

## Security Considerations

### API Key Security
- Store API keys securely
- Use environment variables in production
- Consider dedicated API keys for content moderation
- Monitor API usage to prevent unexpected costs

### Content Privacy
- The guardrail model has access to all submitted content
- Ensure your chosen provider meets your privacy requirements
- Consider using local models for sensitive content

## Performance Impact

### Latency
- Adds 1-3 seconds to each submission
- Depends on the chosen model and API provider
- Consider faster models for high-volume deployments

### Cost Considerations
- Each submission requires an API call
- Monitor usage to control costs
- Consider local models for cost optimization

## Troubleshooting

### Common Issues

#### Guardrail Not Working
1. Check that `ENABLED = true` in config.toml
2. Verify API_KEY, API_URL, and MODEL_NAME are correct
3. Test API connectivity manually
4. Check server logs for error messages

#### All Content Being Rejected
1. Review the model's safety thresholds
2. Check if the prompt needs adjustment
3. Verify the model supports the expected response format

#### Performance Issues
1. Consider using a faster model
2. Implement caching for repeated content
3. Use local models to reduce API latency

### Fallback Behavior

The system is designed to fail safely:
- If the guardrail API is unavailable, content is **allowed**
- If configuration is incomplete, content is **allowed**
- If there's a parsing error, basic keyword filtering is applied

This prevents legitimate content from being blocked due to technical issues.

## Customization

### Adjusting the Prompt

The guardrail prompt can be customized by modifying the `checkContentGuardrail` function in `src/lib/guardrail.ts`. The current prompt focuses on:

- Safety assessment
- Category accuracy verification
- JSON response format

### Adding Custom Rules

You can extend the guardrail logic by:
1. Adding custom safety keywords
2. Implementing category-specific rules
3. Adding additional validation steps

## Monitoring

### Recommended Monitoring

1. **API Usage**: Track guardrail API calls and costs
2. **Rejection Rates**: Monitor how often content is rejected
3. **Category Adjustments**: Track automatic category corrections
4. **Performance**: Monitor submission latency

### Logging

The system logs:
- Guardrail API errors
- Configuration warnings
- Content rejection reasons
- Category adjustments

Check your server logs for detailed information about guardrail operations. 