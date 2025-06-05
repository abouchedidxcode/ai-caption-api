/**
 * IMAGE CAPTION GENERATION API ENDPOINT
 * Production-ready serverless function for AI-powered image captioning
 */

// ========================================================================
// CONFIGURATION SECTION - Modify these values for different behavior
// ========================================================================

const AI_CONFIG = {
  CURRENT_PROVIDER: 'openai',
  MAX_IMAGE_SIZE: 20 * 1024 * 1024, // 20MB (GPT-4o can handle larger images)
  REQUEST_TIMEOUT: 30000, // 30 seconds
  RATE_LIMIT: 60, // requests per minute
};

const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o',
    maxTokens: 300,
    temperature: 0.7,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    }
  }
};

const PROMPT_CONFIG = {
  default: `if this is a picture of a dog respond with the words bark bark, if it is not respond with this is not a dog`,
};

// ========================================================================
// SECURITY VALIDATION SECTION
// ========================================================================

const SECURITY_CONFIG = {
  REQUIRED_APP_TOKEN: process.env.APP_TOKEN,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  MAX_REQUEST_SIZE: 6 * 1024 * 1024,
};

function validateAppToken(token) {
  if (!token || typeof token !== 'string') return false;
  const tokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return tokenPattern.test(token) && token === SECURITY_CONFIG.REQUIRED_APP_TOKEN;
}

function validateRequestBody(body) {
  const errors = [];
  
  if (!body || typeof body !== 'object') {
    errors.push('Request body must be a valid JSON object');
    return { isValid: false, errors };
  }
  
  if (!body.imageData) errors.push('imageData field is required');
  if (!body.mimeType) errors.push('mimeType field is required');
  
  // Debug mode - skip validation if debug flag is set
  if (body.debugMode === true) {
    console.log('🐛 DEBUG MODE: Skipping validation checks');
    return { isValid: true, errors: [], debug: true };
  }
  
  if (body.imageData && typeof body.imageData === 'string') {
    // More flexible base64 validation - allow whitespace and check basic format
    const originalLength = body.imageData.length;
    const cleanedBase64 = body.imageData.replace(/\s/g, '');
    const cleanedLength = cleanedBase64.length;
    const base64Pattern = /^[A-Za-z0-9+\/]*={0,2}$/;
    
    // Detailed debugging info for base64 validation
    const debugInfo = {
      originalLength,
      cleanedLength,
      whitespaceRemoved: originalLength - cleanedLength,
      firstChars: cleanedBase64.substring(0, 20),
      lastChars: cleanedBase64.substring(cleanedBase64.length - 20),
      hasInvalidChars: !base64Pattern.test(cleanedBase64)
    };
    
    if (!base64Pattern.test(cleanedBase64)) {
      // Find invalid characters for better debugging
      const invalidChars = [...new Set(cleanedBase64.match(/[^A-Za-z0-9+\/=]/g) || [])];
      errors.push(`imageData contains invalid base64 characters: ${invalidChars.join(', ')} | Debug: ${JSON.stringify(debugInfo)}`);
    }
    
    // Use cleaned base64 for size calculation
    const estimatedSize = (cleanedBase64.length * 3) / 4;
    if (estimatedSize > AI_CONFIG.MAX_IMAGE_SIZE) {
      errors.push(`Image size exceeds maximum allowed size of ${AI_CONFIG.MAX_IMAGE_SIZE / (1024 * 1024)}MB (current: ${(estimatedSize / (1024 * 1024)).toFixed(2)}MB)`);
    }
    
    // Check for minimum size (too small probably means invalid data)
    if (estimatedSize < 100) {
      errors.push(`Image data appears to be too small or invalid (${estimatedSize} bytes) | Debug: ${JSON.stringify(debugInfo)}`);
    }
    
    // Additional validation checks
    if (cleanedBase64.length === 0) {
      errors.push('imageData is empty after cleaning');
    }
    
    if (cleanedBase64.length % 4 !== 0) {
      errors.push(`imageData length (${cleanedBase64.length}) is not valid base64 (must be multiple of 4) | Debug: ${JSON.stringify(debugInfo)}`);
    }
  }
  
  if (body.mimeType && !SECURITY_CONFIG.ALLOWED_IMAGE_TYPES.includes(body.mimeType)) {
    errors.push(`Unsupported image type: ${body.mimeType}`);
  }
  
  return { isValid: errors.length === 0, errors };
}

// ========================================================================
// AI PROVIDER ABSTRACTION LAYER
// ========================================================================

async function processWithAIProvider(imageData, mimeType) {
  const provider = AI_PROVIDERS[AI_CONFIG.CURRENT_PROVIDER];
  
  if (!provider) {
    throw new Error(`AI provider '${AI_CONFIG.CURRENT_PROVIDER}' not found`);
  }
  
  return await processWithOpenAI(imageData, mimeType);
}

async function processWithOpenAI(imageData, mimeType) {
  const provider = AI_PROVIDERS.openai;
  const prompt = PROMPT_CONFIG.default;
  
  // Clean the base64 data (remove any whitespace)
  const cleanedImageData = imageData.replace(/\s/g, '');
  
  const requestPayload = {
    model: provider.model,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        {
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${cleanedImageData}`,
            detail: 'high'
          }
        }
      ]
    }],
    max_tokens: provider.maxTokens,
    temperature: provider.temperature,
  };
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: provider.headers,
      body: JSON.stringify(requestPayload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    const caption = data.choices?.[0]?.message?.content?.trim();
    
    if (!caption) {
      throw new Error('No caption generated by OpenAI');
    }
    
    return {
      caption,
      provider: provider.name,
      model: provider.model,
      confidence: data.choices?.[0]?.finish_reason === 'stop' ? 'high' : 'medium',
      usage: data.usage || null,
    };
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout: OpenAI API took too long to respond');
    }
    throw new Error(`OpenAI processing failed: ${error.message}`);
  }
}

// ========================================================================
// ERROR HANDLING
// ========================================================================

const ERROR_TYPES = {
  AUTHENTICATION_ERROR: { code: 'AUTH_001', message: 'Authentication failed' },
  VALIDATION_ERROR: { code: 'VAL_001', message: 'Request validation failed' },
  AI_PROVIDER_ERROR: { code: 'AI_001', message: 'AI provider error' },
  METHOD_NOT_ALLOWED: { code: 'METHOD_001', message: 'Method not allowed' }
};

class APIError extends Error {
  constructor(type, details = null, statusCode = 500) {
    super(type.message);
    this.name = 'APIError';
    this.type = type;
    this.code = type.code;
    this.details = details;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }
}

function createErrorResponse(error) {
  const response = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      timestamp: error.timestamp
    }
  };
  
  // Include details for validation errors to help with debugging
  if (error.details) {
    response.error.details = error.details;
  }
  
  return response;
}

function createSuccessResponse(data, metadata = {}) {
  return {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      provider: AI_CONFIG.CURRENT_PROVIDER,
      ...metadata
    }
  };
}

// ========================================================================
// MAIN API HANDLER
// ========================================================================

export default async function handler(req, res) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-App-Token');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    const error = new APIError(ERROR_TYPES.METHOD_NOT_ALLOWED, 
      `Method ${req.method} not allowed`, 405);
    return res.status(405).json(createErrorResponse(error));
  }
  
  try {
    // Authentication
    const appToken = req.headers['x-app-token'] || req.headers['authorization']?.replace('Bearer ', '');
    if (!validateAppToken(appToken)) {
      throw new APIError(ERROR_TYPES.AUTHENTICATION_ERROR, 
        'Invalid or missing app token', 401);
    }
    
    // Request validation
    const validation = validateRequestBody(req.body);
    if (!validation.isValid) {
      throw new APIError(ERROR_TYPES.VALIDATION_ERROR, 
        validation.errors, 400);
    }
    
    // AI Processing
    const startTime = Date.now();
    const aiResult = await processWithAIProvider(
      req.body.imageData,
      req.body.mimeType
    );
    const processingTime = Date.now() - startTime;
    
    const responseData = {
      ...aiResult,
      processingTime: `${processingTime}ms`,
      requestId
    };
    
    const response = createSuccessResponse(responseData, {
      requestId,
      processingTime,
      imageSize: req.body.imageData.length,
      mimeType: req.body.mimeType
    });
    
    return res.status(200).json(response);
    
  } catch (error) {
    if (!(error instanceof APIError)) {
      console.error('Unexpected error:', error);
      error = new APIError(ERROR_TYPES.AI_PROVIDER_ERROR, 
        error.message, 500);
    }
    
    console.error(`[${requestId}] Error:`, {
      code: error.code,
      message: error.message,
      details: error.details,
      stack: error.stack
    });
    return res.status(error.statusCode).json(createErrorResponse(error));
  }
} 