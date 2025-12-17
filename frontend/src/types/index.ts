// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin' | 'developer';
  createdAt: string;
  updatedAt: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'ru';
  notifications: boolean;
  autoSave: boolean;
}

// AI Agent Types
export interface AIAgent {
  id: string;
  name: string;
  description: string;
  type: 'code' | 'architecture' | 'documentation' | 'security' | 'testing' | 'devops';
  systemPrompt: string;
  capabilities: string[];
  model: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentTask {
  id: string;
  agentId: string;
  projectId?: string;
  type: 'generate_code' | 'analyze' | 'document' | 'review' | 'optimize';
  prompt: string;
  context?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: AgentResult;
  tokensUsed: number;
  executionTime: number;
  createdAt: string;
  completedAt?: string;
}

export interface AgentResult {
  id: string;
  taskId: string;
  content: string;
  type: 'text' | 'code' | 'markdown' | 'json';
  metadata?: Record<string, any>;
  confidence: number;
  suggestions?: string[];
}

// Project Types
export interface Project {
  id: string;
  name: string;
  description: string;
  type: 'web_app' | 'mobile_app' | 'api' | 'library' | 'script';
  techStack: TechStack[];
  status: 'draft' | 'active' | 'completed' | 'archived';
  ownerId: string;
  collaborators: string[];
  files: ProjectFile[];
  agents: ProjectAgent[];
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}

export interface TechStack {
  category: 'frontend' | 'backend' | 'database' | 'ai' | 'deployment';
  technology: string;
  version?: string;
  isRequired: boolean;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  content?: string;
  language?: string;
  size: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAgent {
  agentId: string;
  projectId: string;
  isEnabled: boolean;
  permissions: AgentPermission[];
  lastUsed?: string;
}

export interface AgentPermission {
  action: 'read' | 'write' | 'delete' | 'execute';
  resource: 'files' | 'database' | 'api' | 'system';
}

export interface ProjectSettings {
  aiModel: string;
  maxTokens: number;
  temperature: number;
  autoSave: boolean;
  backupEnabled: boolean;
  privacyLevel: 'public' | 'private' | 'internal';
}

// Chat and Communication Types
export interface ChatMessage {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  role: 'user' | 'assistant' | 'system';
  agentId?: string;
  projectId?: string;
  metadata?: {
    tokensUsed?: number;
    model?: string;
    confidence?: number;
    suggestions?: string[];
  };
  timestamp: string;
}

export interface ChatSession {
  id: string;
  projectId?: string;
  title: string;
  messages: ChatMessage[];
  participants: string[]; // user IDs and agent IDs
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

// API Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    tokensUsed?: number;
  };
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// AI Configuration Types
export interface AIConfig {
  provider: 'openrouter' | 'minimax' | 'openai' | 'anthropic';
  model: string;
  apiKey: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  retryAttempts: number;
}

export interface AIUsage {
  userId: string;
  projectId?: string;
  tokensUsed: number;
  cost: number;
  date: string;
  agentId?: string;
}

// System Types
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  services: ServiceStatus[];
  uptime: number;
  timestamp: string;
}

export interface ServiceStatus {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  lastCheck: string;
}

// WebSocket Types
export interface WebSocketMessage {
  type: 'task_update' | 'chat_message' | 'project_update' | 'agent_status';
  data: any;
  timestamp: string;
  userId?: string;
  projectId?: string;
}

// Form Types
export interface CreateProjectForm {
  name: string;
  description: string;
  type: Project['type'];
  techStack: string[];
  isPrivate: boolean;
}

export interface ChatForm {
  message: string;
  agentId?: string;
  projectId?: string;
}

export interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
}