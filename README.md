# AI Image Caption Generation API

Production-ready Vercel serverless API for generating AI-powered image captions with support for multiple AI providers, comprehensive security validation, and extensive customization options.

## 🏗️ Architecture Overview

This API serves as a proxy between your iOS app and AI providers (OpenAI, Google Gemini, Anthropic Claude), providing:

- **Security Layer**: App token validation, request sanitization, image format validation
- **AI Provider Abstraction**: Unified interface for multiple AI services
- **Error Handling**: Comprehensive error management with detailed logging
- **Scalability**: Serverless architecture on Vercel with automatic scaling

### Data Flow
```
iOS App → Vercel API → Security Validation → AI Provider → Response → iOS App
```

## 🚀 Quick Start

### 1. Environment Setup

Create `.env.local` file in your project root:

```bash
# OpenAI Configuration (Primary Provider)
OPENAI_API_KEY=sk-your-actual-openai-api-key-here

# App Authentication Token (Generate a UUID)
APP_TOKEN=12345678-1234-1234-1234-123456789abc

# Optional: Additional Provider Keys
GEMINI_API_KEY=your-gemini-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
vercel env add OPENAI_API_KEY
vercel env add APP_TOKEN
```

## 🔧 Configuration Guide

### Switching AI Providers

The API supports multiple AI providers. To switch providers:

#### 1. OpenAI (Default)
```javascript
// In api/generateCaption.js
const AI_CONFIG = {
  CURRENT_PROVIDER: 'openai', // Current setting
  // ... other config
};
```

#### 2. Google Gemini (Future Support)
```javascript
const AI_CONFIG = {
  CURRENT_PROVIDER: 'gemini', // Change to this
  // ... other config
};

// Add to AI_PROVIDERS object:
gemini: {
  name: 'Google Gemini',
  endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-pro-vision:generateContent',
  model: 'gemini-pro-vision',
  // ... rest of config
}
```

#### 3. Anthropic Claude (Future Support)
```javascript
const AI_CONFIG = {
  CURRENT_PROVIDER: 'claude', // Change to this
  // ... other config
};

// Add to AI_PROVIDERS object:
claude: {
  name: 'Anthropic Claude',
  endpoint: 'https://api.anthropic.com/v1/messages',
  model: 'claude-3-vision-20240229',
  // ... rest of config
}
```

### Modifying Prompts

Edit the `PROMPT_CONFIG` object in `api/generateCaption.js`:

```javascript
const PROMPT_CONFIG = {
  // Default general captioning
  default: `Your custom default prompt here...`,
  
  // Social media optimized
  social: `Your social media prompt here...`,
  
  // Accessibility descriptions
  accessibility: `Your accessibility prompt here...`,
  
  // Add custom prompt types
  marketing: `Create a marketing-focused caption that highlights product benefits...`,
  technical: `Provide technical details about objects and processes shown...`,
};
```

### Security Configuration

Adjust security settings in `SECURITY_CONFIG`:

```javascript
const SECURITY_CONFIG = {
  REQUIRED_APP_TOKEN: process.env.APP_TOKEN,
  
  // Add/remove supported image types
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/heic',  // Add iPhone HEIC support
    'image/heif'   // Add HEIF support
  ],
  
  // Adjust max file size (6MB for base64 encoding overhead)
  MAX_REQUEST_SIZE: 6 * 1024 * 1024,
};
```

## 📡 API Usage

### Endpoint
```
POST /api/generateCaption
```

### Request Headers
```javascript
{
  "Content-Type": "application/json",
  "X-App-Token": "your-app-token-here"
}
```

### Request Body
```javascript
{
  "imageData": "base64-encoded-image-string",
  "mimeType": "image/jpeg",
  "promptType": "default" // optional: default, social, accessibility
}
```

### Response Format

#### Success Response
```javascript
{
  "success": true,
  "data": {
    "caption": "A beautiful sunset over the ocean with waves gently lapping at the shore...",
    "provider": "OpenAI",
    "model": "gpt-4-vision-preview",
    "promptType": "default",
    "confidence": "high",
    "usage": {
      "prompt_tokens": 1234,
      "completion_tokens": 56,
      "total_tokens": 1290
    },
    "processingTime": "2847ms",
    "requestId": "req_1641234567890_abc123"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:45.123Z",
    "provider": "openai",
    "requestId": "req_1641234567890_abc123",
    "processingTime": 2847,
    "imageSize": 245760,
    "mimeType": "image/jpeg"
  }
}
```

#### Error Response
```javascript
{
  "success": false,
  "error": {
    "code": "AUTH_001",
    "message": "Authentication failed",
    "timestamp": "2024-01-15T10:30:45.123Z"
  }
}
```

## 🛡️ Security Features

### 1. App Token Authentication
- UUID-format validation
- Environment variable protection
- Request header verification

### 2. Image Validation
- MIME type verification
- File size limits (5MB max)
- Base64 encoding validation
- Magic byte checking (planned)

### 3. Request Sanitization
- JSON structure validation
- Required field verification
- Type checking and constraints

### 4. Rate Limiting (Planned)
- Per-IP request limits
- Configurable time windows
- Graceful degradation

## 🚀 Deployment Guide

### Vercel Deployment (Recommended)

1. **Connect Repository**
   ```bash
   # Link your GitHub repo to Vercel
   vercel --prod
   ```

2. **Set Environment Variables**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add all required variables from `.env.local`

3. **Custom Domain (Optional)**
   - Add custom domain in Vercel dashboard
   - Update CORS settings in API if needed

### Alternative Deployment Options

#### Netlify Functions
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

#### AWS Lambda (via Serverless Framework)
```yaml
# serverless.yml
service: caption-api

provider:
  name: aws
  runtime: nodejs18.x

functions:
  generateCaption:
    handler: api/generateCaption.handler
    events:
      - http:
          path: api/generateCaption
          method: post
          cors: true
```

## 🧪 Testing

### Manual Testing
```bash
# Test the endpoint locally
curl -X POST http://localhost:3000/api/generateCaption \
  -H "Content-Type: application/json" \
  -H "X-App-Token: your-token-here" \
  -d '{
    "imageData": "base64-encoded-image",
    "mimeType": "image/jpeg",
    "promptType": "default"
  }'
```

### Automated Testing
```bash
# Install testing dependencies
npm install --save-dev jest supertest

# Run tests
npm test
```

### Load Testing
```bash
# Install artillery for load testing
npm install -g artillery

# Run load test
artillery run load-test.yml
```

## 📊 Monitoring & Logging

### Error Monitoring
- Errors are logged with detailed context
- Request IDs for tracing
- Performance metrics included

### Health Monitoring
```javascript
// Add health check endpoint
GET /api/health

// Response
{
  "status": "healthy",
  "provider": "openai",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

### Performance Monitoring
- Processing time tracking
- Token usage monitoring
- Image size analysis

## 🔧 Troubleshooting

### Common Issues

#### 1. Authentication Errors
```
Error: AUTH_001 - Authentication failed
```
**Solution**: Check your APP_TOKEN in environment variables and request headers.

#### 2. Image Size Errors
```
Error: VAL_001 - Image size exceeds maximum allowed size
```
**Solution**: Resize images before encoding to base64. Max size is 5MB.

#### 3. OpenAI API Errors
```
Error: AI_001 - OpenAI API error: 429 - Rate limit exceeded
```
**Solution**: Implement request queuing or upgrade OpenAI plan.

#### 4. Timeout Errors
```
Error: Request timeout: OpenAI API took too long to respond
```
**Solution**: Increase REQUEST_TIMEOUT in configuration or optimize image size.

### Debug Mode
Set `NODE_ENV=development` for detailed error information:

```javascript
// In development, errors include stack traces and additional details
{
  "error": {
    "code": "AI_001",
    "message": "OpenAI processing failed",
    "details": {
      "stack": "Error: ...",
      "context": "..."
    }
  }
}
```

## 🚀 Advanced Usage

### Adding New AI Providers

1. **Add Provider Configuration**
```javascript
const AI_PROVIDERS = {
  // ... existing providers
  newProvider: {
    name: 'New Provider',
    endpoint: 'https://api.newprovider.com/v1/vision',
    model: 'vision-model-v1',
    maxTokens: 300,
    temperature: 0.7,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.NEW_PROVIDER_API_KEY}`,
    }
  }
};
```

2. **Implement Provider Function**
```javascript
async function processWithNewProvider(imageData, mimeType, promptType) {
  const provider = AI_PROVIDERS.newProvider;
  const prompt = PROMPT_CONFIG[promptType] || PROMPT_CONFIG.default;
  
  // Implement API call logic here
  const requestPayload = {
    // Format according to provider's API
  };
  
  const response = await fetch(provider.endpoint, {
    method: 'POST',
    headers: provider.headers,
    body: JSON.stringify(requestPayload)
  });
  
  const data = await response.json();
  
  return {
    caption: data.result,
    provider: provider.name,
    model: provider.model,
    promptType,
    confidence: 'high'
  };
}
```

3. **Update Provider Switch**
```javascript
async function processWithAIProvider(imageData, mimeType, promptType = 'default') {
  const provider = AI_PROVIDERS[AI_CONFIG.CURRENT_PROVIDER];
  
  switch (AI_CONFIG.CURRENT_PROVIDER) {
    case 'openai':
      return await processWithOpenAI(imageData, mimeType, promptType);
    case 'newProvider':
      return await processWithNewProvider(imageData, mimeType, promptType);
    default:
      throw new Error(`Unsupported AI provider: ${AI_CONFIG.CURRENT_PROVIDER}`);
  }
}
```

### Custom Middleware
```javascript
// Add custom middleware for additional processing
function customMiddleware(req, res, next) {
  // Custom logic here
  console.log('Processing request:', req.method, req.url);
  next();
}

export default async function handler(req, res) {
  // Apply middleware
  await customMiddleware(req, res, () => {});
  
  // ... rest of handler logic
}
```

## 📈 Performance Optimization

### Image Optimization
- Compress images before base64 encoding
- Use appropriate image formats (WebP for web, HEIC for iOS)
- Implement client-side resizing

### Caching Strategy
```javascript
// Add caching headers
res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache

// Implement response caching for repeated requests
const cacheKey = crypto.createHash('md5').update(imageData).digest('hex');
```

### Connection Pooling
```javascript
// For high-volume usage, implement connection pooling
const https = require('https');
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 50
});
```

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For support, please:
1. Check the troubleshooting section
2. Review the error codes and solutions
3. Open an issue on GitHub with detailed error information

---

**Note**: This API is production-ready but should be customized for your specific use case. Always review security settings and rate limits before deploying to production. 