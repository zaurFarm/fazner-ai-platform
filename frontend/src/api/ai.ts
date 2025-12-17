import axios, { AxiosInstance } from 'axios';
import type { APIResponse, APIError } from '@/types';

interface MiniMaxMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface MiniMaxRequest {
  model: string;
  messages: MiniMaxMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

interface MiniMaxResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: MiniMaxMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Rate Limiting Manager
class RateLimitManager {
  private requests: Map<string, number[]> = new Map();
  private limits: Map<string, { maxRequests: number; windowMs: number }> = new Map();

  setLimit(key: string, maxRequests: number, windowMs: number) {
    this.limits.set(key, { maxRequests, windowMs });
  }

  canMakeRequest(key: string): boolean {
    const limit = this.limits.get(key);
    if (!limit) return true;

    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside window
    const validRequests = requests.filter(time => now - time < limit.windowMs);
    
    if (validRequests.length >= limit.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }

  getTimeUntilReset(key: string): number {
    const limit = this.limits.get(key);
    const requests = this.requests.get(key) || [];
    
    if (requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...requests);
    return Math.max(0, limit.windowMs - (Date.now() - oldestRequest));
  }
}

// Circuit Breaker Pattern
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly failureThreshold = 5;
  private readonly timeout = 60000; // 1 minute

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState() {
    return this.state;
  }
}

class MiniMaxAI {
  private client: AxiosInstance;
  private baseURL: string;
  private apiKey: string;
  private circuitBreaker: CircuitBreaker;
  private rateLimitManager: RateLimitManager;
  private modelEndpoint: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_OPENROUTER_API_URL || 'https://openrouter.ai/api/v1';
    this.apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || '';
    this.modelEndpoint = import.meta.env.VITE_MINIMAX_MODEL || 'mini-max/text-01';
    
    if (!this.apiKey) {
      console.warn('OpenRouter API key not found. Set VITE_OPENROUTER_API_KEY in environment variables.');
    }

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker();
    
    // Initialize rate limiting
    this.rateLimitManager = new RateLimitManager();
    this.rateLimitManager.setLimit('default', 60, 60000); // 60 requests per minute
    this.rateLimitManager.setLimit('chat', 30, 60000); // 30 chat requests per minute
    this.rateLimitManager.setLimit('code', 10, 60000); // 10 code generations per minute

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 60000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Fazner AI Platform',
        'X-Client-Version': '1.0.0',
      },
    });

    // Add request interceptor for rate limiting
    this.client.interceptors.request.use((config) => {
      const endpoint = this.getEndpointFromUrl(config.url || '');
      const limitKey = this.getLimitKey(endpoint, config.data);
      
      if (!this.rateLimitManager.canMakeRequest(limitKey)) {
        const waitTime = this.rateLimitManager.getTimeUntilReset(limitKey);
        throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
      }
      
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 429) {
          console.warn('Rate limit hit from server');
        }
        return Promise.reject(error);
      }
    );
  }

  private getEndpointFromUrl(url: string): string {
    if (url.includes('chat/completions')) return 'chat';
    if (url.includes('code/generate')) return 'code';
    if (url.includes('architecture/design')) return 'architecture';
    return 'default';
  }

  private getLimitKey(endpoint: string, data: any): string {
    if (endpoint === 'chat' && data?.messages) {
      return 'chat';
    }
    return endpoint;
  }

  private async makeRequest(request: MiniMaxRequest) {
    return await this.circuitBreaker.execute(() => 
      this.client.post('/chat/completions', request)
    );
  }

  private validateInput(prompt: string, maxLength: number = 10000): void {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt must be a non-empty string');
    }
    if (prompt.length > maxLength) {
      throw new Error(`Prompt too long. Maximum ${maxLength} characters allowed.`);
    }
  }

  private parseCodeResponse(content: string) {
    const sections = content.split('\n\n');
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const matches = [...content.matchAll(codeBlockRegex)];
    
    let code = '';
    let language = 'text';
    
    if (matches.length > 0) {
      const match = matches[0];
      language = match[1] || 'text';
      code = match[2].trim();
    } else {
      // Fallback: find lines that look like code
      const lines = content.split('\n');
      const codeLines = lines.filter(line => 
        line.trim().length > 0 && 
        (line.includes('function') || line.includes('const ') || 
         line.includes('let ') || line.includes('class ') ||
         line.includes('def ') || line.includes('import '))
      );
      if (codeLines.length > 0) {
        code = codeLines.join('\n');
      }
    }

    return {
      code: code || content,
      explanation: sections[0] || '',
      alternatives: sections.slice(1, 3),
      language,
    };
  }

  private parseArchitectureResponse(content: string) {
    // More sophisticated parsing for architecture responses
    const sections = content.split(/\n#{1,3}\s+/);
    const components: any[] = [];
    const recommendations: string[] = [];
    
    sections.forEach(section => {
      if (section.toLowerCase().includes('component')) {
        components.push({
          name: section.split('\n')[0] || 'Component',
          description: section.substring(0, 200) + '...',
          technologies: [],
          responsibilities: []
        });
      }
      if (section.toLowerCase().includes('recommend')) {
        recommendations.push(section.split('\n')[0] || section.substring(0, 100));
      }
    });

    return {
      architecture: content,
      components,
      dataFlow: '',
      recommendations,
    };
  }

  private parseDocumentationResponse(content: string) {
    const sections = content.split(/\n#{1,3}\s+/).map(s => s.trim()).filter(Boolean);
    
    return {
      documentation: content,
      sections,
      suggestions: sections.filter(s => s.toLowerCase().includes('suggest')).map(s => s.substring(0, 150)),
    };
  }

  private calculateCost(usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) {
    // Updated pricing for MiniMax M2
    const inputCost = (usage.prompt_tokens / 1000000) * 0.15;
    const outputCost = (usage.completion_tokens / 1000000) * 0.60;
    return inputCost + outputCost;
  }

  // Enhanced code generation with better validation
  async generateCode(prompt: string, language: string = 'javascript', context?: string): Promise<APIResponse<{
    code: string;
    explanation: string;
    alternatives: string[];
    usage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      cost: number;
    };
  }>> {
    try {
      this.validateInput(prompt, 5000);
      
      const systemPrompt = `You are CodeMaster, an expert full-stack developer powered by MiniMax M2. 
Your specialty is generating clean, efficient, and well-documented code.

Guidelines:
- Generate production-ready code with proper error handling
- Include comprehensive comments and documentation
- Follow best practices for the specified language/framework
- Provide multiple solution approaches when applicable
- Consider security, performance, and scalability
- Use modern language features and patterns

Current task: Generate ${language} code.`;

      const messages: MiniMaxMessage[] = [
        { role: 'system', content: systemPrompt },
      ];

      if (context) {
        this.validateInput(context, 2000);
        messages.push({
          role: 'user',
          content: `Context: ${context}`
        });
      }

      messages.push({
        role: 'user',
        content: `Generate ${language} code for: ${prompt}

Please provide:
1. The main code solution wrapped in code blocks with proper syntax highlighting
2. A clear explanation of how it works
3. Alternative approaches or optimizations
4. Usage examples if applicable

IMPORTANT: Always wrap code in proper markdown code blocks with language specification.`
      });

      const response = await this.makeRequest({
        model: this.modelEndpoint,
        messages,
        max_tokens: 3000,
        temperature: 0.7,
      });

      const aiResponse = response.data as MiniMaxResponse;
      const content = aiResponse.choices[0].message.content;

      const parsed = this.parseCodeResponse(content);

      return {
        success: true,
        data: {
          ...parsed,
          usage: {
            inputTokens: aiResponse.usage.prompt_tokens,
            outputTokens: aiResponse.usage.completion_tokens,
            totalTokens: aiResponse.usage.total_tokens,
            cost: this.calculateCost(aiResponse.usage),
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'AI_GENERATION_ERROR',
          message: error.message || 'Failed to generate code with MiniMax M2',
          details: error.response?.data,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // Enhanced architecture design
  async designArchitecture(requirements: string, techStack?: string[]): Promise<APIResponse<{
    architecture: string;
    components: Array<{
      name: string;
      description: string;
      technologies: string[];
      responsibilities: string[];
    }>;
    dataFlow: string;
    recommendations: string[];
    usage: any;
  }>> {
    try {
      this.validateInput(requirements, 8000);
      
      const systemPrompt = `You are ArchBuilder, a senior software architect specializing in scalable systems design.
Your expertise includes microservices, cloud architecture, database design, and modern development practices.

Architecture principles:
- Scalability and performance
- Security by design
- Cost optimization
- Maintainability and extensibility
- Cloud-native and container-ready
- Real-world deployment considerations

Format your response with clear sections using markdown headers.`;

      const stackInfo = techStack ? `\nPreferred tech stack: ${techStack.join(', ')}` : '';
      const messages: MiniMaxMessage[] = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Design a comprehensive software architecture for:

Requirements: ${requirements}${stackInfo}

Please structure your response with:
1. ## System Overview
2. ## Component Architecture
3. ## Data Flow
4. ## Technology Stack
5. ## Security Considerations
6. ## Scalability Plan
7. ## Deployment Strategy

Be specific and actionable in your recommendations.`
        },
      ];

      const response = await this.makeRequest({
        model: this.modelEndpoint,
        messages,
        max_tokens: 4000,
        temperature: 0.6,
      });

      const aiResponse = response.data as MiniMaxResponse;
      const content = aiResponse.choices[0].message.content;

      const parsed = this.parseArchitectureResponse(content);

      return {
        success: true,
        data: {
          ...parsed,
          usage: {
            inputTokens: aiResponse.usage.prompt_tokens,
            outputTokens: aiResponse.usage.completion_tokens,
            totalTokens: aiResponse.usage.total_tokens,
            cost: this.calculateCost(aiResponse.usage),
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'ARCHITECTURE_ERROR',
          message: error.message || 'Failed to design architecture with MiniMax M2',
          details: error.response?.data,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // Enhanced documentation generation
  async generateDocumentation(content: string, type: 'api' | 'readme' | 'code' | 'guide'): Promise<APIResponse<{
    documentation: string;
    sections: string[];
    suggestions: string[];
    usage: any;
  }>> {
    try {
      this.validateInput(content, 8000);
      
      const prompts = {
        api: 'API documentation with endpoint details, parameters, and examples',
        readme: 'README documentation with project overview and setup instructions',
        code: 'Inline code documentation with comments and JSDoc',
        guide: 'User/Developer guide with step-by-step instructions',
      };

      const systemPrompt = `You are DocWriter, an expert technical writer specializing in clear, comprehensive documentation.
Your documentation is known for being:
- Clear and accessible to both technical and non-technical audiences
- Well-structured with proper formatting
- Complete with examples and use cases
- Following industry standards and best practices

Always use markdown formatting with proper headers, code blocks, and bullet points.`;

      const messages: MiniMaxMessage[] = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Create comprehensive ${prompts[type]} for the following content:

${content}

Please structure the documentation with:
1. Clear markdown headers and sections
2. Code examples where applicable
3. Step-by-step instructions
4. Troubleshooting tips
5. Related links and references

Use proper markdown formatting throughout.`
        },
      ];

      const response = await this.makeRequest({
        model: this.modelEndpoint,
        messages,
        max_tokens: 2500,
        temperature: 0.5,
      });

      const aiResponse = response.data as MiniMaxResponse;
      const content_ = aiResponse.choices[0].message.content;

      const parsed = this.parseDocumentationResponse(content_);

      return {
        success: true,
        data: {
          ...parsed,
          usage: {
            inputTokens: aiResponse.usage.prompt_tokens,
            outputTokens: aiResponse.usage.completion_tokens,
            totalTokens: aiResponse.usage.total_tokens,
            cost: this.calculateCost(aiResponse.usage),
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'DOCUMENTATION_ERROR',
          message: error.message || 'Failed to generate documentation with MiniMax M2',
          details: error.response?.data,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // Enhanced general chat with better error handling
  async chat(messages: MiniMaxMessage[], options: Partial<MiniMaxRequest> = {}): Promise<APIResponse<{
    response: string;
    usage: any;
  }>> {
    try {
      // Validate messages
      if (!Array.isArray(messages) || messages.length === 0) {
        throw new Error('Messages must be a non-empty array');
      }

      for (const message of messages) {
        if (!message.role || !message.content) {
          throw new Error('Each message must have role and content');
        }
      }

      const response = await this.makeRequest({
        model: this.modelEndpoint,
        messages,
        max_tokens: options.max_tokens || 2000,
        temperature: options.temperature || 0.7,
        ...options,
      });

      const aiResponse = response.data as MiniMaxResponse;

      return {
        success: true,
        data: {
          response: aiResponse.choices[0].message.content,
          usage: {
            inputTokens: aiResponse.usage.prompt_tokens,
            outputTokens: aiResponse.usage.completion_tokens,
            totalTokens: aiResponse.usage.total_tokens,
            cost: this.calculateCost(aiResponse.usage),
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'CHAT_ERROR',
          message: error.message || 'Failed to chat with MiniMax M2',
          details: error.response?.data,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // Utility method to check circuit breaker state
  getCircuitBreakerState(): string {
    return this.circuitBreaker.getState();
  }

  // Utility method to get rate limit status
  getRateLimitStatus(endpoint: string = 'default'): { canMakeRequest: boolean; timeUntilReset: number } {
    return {
      canMakeRequest: this.rateLimitManager.canMakeRequest(endpoint),
      timeUntilReset: this.rateLimitManager.getTimeUntilReset(endpoint),
    };
  }
}

// Create singleton instance
export const miniMaxAI = new MiniMaxAI();
export default miniMaxAI;