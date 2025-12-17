import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import type { APIResponse, APIError, ChatMessage, AgentTask } from '@/types';

class APIClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private handleResponse<T>(response: any): APIResponse<T> {
    return {
      success: response.status >= 200 && response.status < 300,
      data: response.data?.data,
      error: response.data?.error,
      meta: response.data?.meta,
    };
  }

  private handleError(error: any): APIResponse {
    const apiError: APIError = {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
      details: error.response?.data,
      timestamp: new Date().toISOString(),
    };

    return {
      success: false,
      error: apiError,
    };
  }

  // Authentication methods
  async login(email: string, password: string) {
    try {
      const response = await this.client.post('/auth/login', { email, password });
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async register(userData: any) {
    try {
      const response = await this.client.post('/auth/register', userData);
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async logout() {
    try {
      const response = await this.client.post('/auth/logout');
      localStorage.removeItem('auth_token');
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getProfile() {
    try {
      const response = await this.client.get('/user/profile');
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Project methods
  async getProjects() {
    try {
      const response = await this.client.get('/projects');
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getProject(id: string) {
    try {
      const response = await this.client.get(`/projects/${id}`);
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async createProject(projectData: any) {
    try {
      const response = await this.client.post('/projects', projectData);
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateProject(id: string, projectData: any) {
    try {
      const response = await this.client.put(`/projects/${id}`, projectData);
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteProject(id: string) {
    try {
      const response = await this.client.delete(`/projects/${id}`);
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // AI Agent methods
  async getAgents() {
    try {
      const response = await this.client.get('/agents');
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getAgent(id: string) {
    try {
      const response = await this.client.get(`/agents/${id}`);
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async executeAgentTask(task: Partial<AgentTask>) {
    try {
      const response = await this.client.post('/agents/execute', task);
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Chat methods
  async getChatSessions(projectId?: string) {
    try {
      const params = projectId ? { projectId } : {};
      const response = await this.client.get('/chat/sessions', { params });
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getChatSession(id: string) {
    try {
      const response = await this.client.get(`/chat/sessions/${id}`);
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async sendMessage(sessionId: string, message: Partial<ChatMessage>) {
    try {
      const response = await this.client.post(`/chat/sessions/${sessionId}/messages`, message);
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // File methods
  async getProjectFiles(projectId: string) {
    try {
      const response = await this.client.get(`/projects/${projectId}/files`);
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async uploadFile(projectId: string, file: File) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await this.client.post(`/projects/${projectId}/files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // AI Usage and Analytics
  async getUsageStats() {
    try {
      const response = await this.client.get('/analytics/usage');
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // System Health
  async getSystemHealth() {
    try {
      const response = await this.client.get('/system/health');
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Utility methods
  setAuthToken(token: string) {
    localStorage.setItem('auth_token', token);
  }

  removeAuthToken() {
    localStorage.removeItem('auth_token');
  }

  getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }
}

// Create singleton instance
export const apiClient = new APIClient();
export default apiClient;