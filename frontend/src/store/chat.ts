import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist } from 'zustand/middleware';
import type { ChatSession, ChatMessage, AIAgent } from '@/types';
import { apiClient } from '@/api/client';
import { miniMaxAI } from '@/api/ai';

interface ChatState {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  agents: AIAgent[];
  isLoading: boolean;
  isTyping: boolean;
  error: string | null;
  operationLoading: {
    chat: boolean;
    code: boolean;
    architecture: boolean;
    documentation: boolean;
  };
  history: {
    undoStack: ChatMessage[][];
    redoStack: ChatMessage[][];
  };
  
  // Actions
  fetchSessions: (projectId?: string) => Promise<void>;
  fetchSession: (id: string) => Promise<void>;
  createSession: (title: string, projectId?: string) => Promise<string | null>;
  sendMessage: (sessionId: string, message: string, agentId?: string) => Promise<void>;
  generateCode: (prompt: string, language?: string, context?: string) => Promise<void>;
  designArchitecture: (requirements: string, techStack?: string[]) => Promise<void>;
  generateDocumentation: (content: string, type: 'api' | 'readme' | 'code' | 'guide') => Promise<void>;
  fetchAgents: () => Promise<void>;
  setCurrentSession: (session: ChatSession | null) => void;
  clearError: () => void;
  
  // Enhanced actions
  deleteSession: (sessionId: string) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
  clearCurrentSession: () => void;
  retryLastOperation: () => Promise<void>;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  exportSession: (sessionId: string, format: 'json' | 'markdown') => string;
  importSession: (sessionData: string, format: 'json' | 'markdown') => Promise<string | null>;
  searchMessages: (query: string, sessionId?: string) => ChatMessage[];
  getSessionStats: (sessionId: string) => { messageCount: number; tokensUsed: number; cost: number };
}

export const useChatStore = create<ChatState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        sessions: [],
        currentSession: null,
        agents: [],
        isLoading: false,
        isTyping: false,
        error: null,
        operationLoading: {
          chat: false,
          code: false,
          architecture: false,
          documentation: false,
        },
        history: {
          undoStack: [],
          redoStack: [],
        },

        fetchSessions: async (projectId?: string) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await apiClient.getChatSessions(projectId);
            
            if (response.success && response.data) {
              set({
                sessions: response.data,
                isLoading: false,
              });
            } else {
              set({
                error: response.error?.message || 'Failed to fetch chat sessions',
                isLoading: false,
              });
            }
          } catch (error: any) {
            set({
              error: error.message || 'An unexpected error occurred',
              isLoading: false,
            });
          }
        },

        fetchSession: async (id: string) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await apiClient.getChatSession(id);
            
            if (response.success && response.data) {
              set({
                currentSession: response.data,
                isLoading: false,
              });
            } else {
              set({
                error: response.error?.message || 'Failed to fetch chat session',
                isLoading: false,
              });
            }
          } catch (error: any) {
            set({
              error: error.message || 'An unexpected error occurred',
              isLoading: false,
            });
          }
        },

        createSession: async (title: string, projectId?: string) => {
          set({ isLoading: true, error: null });
          
          try {
            const newSession: ChatSession = {
              id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              title: title.trim() || 'New Chat',
              projectId,
              messages: [],
              participants: [],
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            
            set({
              sessions: [...get().sessions, newSession],
              currentSession: newSession,
              isLoading: false,
            });
            
            // Persist to backend (non-blocking)
            try {
              await apiClient.createChatSession(newSession);
            } catch (backendError) {
              console.warn('Failed to persist session to backend:', backendError);
            }
            
            return newSession.id;
          } catch (error: any) {
            set({
              error: error.message || 'Failed to create chat session',
              isLoading: false,
            });
            return null;
          }
        },

        sendMessage: async (sessionId: string, message: string, agentId?: string) => {
          const state = get();
          const currentSession = state.currentSession;
          if (!currentSession || currentSession.id !== sessionId) {
            set({ error: 'Session not found' });
            return;
          }

          // Optimistic update - add user message immediately
          const userMessage: ChatMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'user',
            role: 'user',
            content: message.trim(),
            agentId,
            timestamp: new Date().toISOString(),
          };

          // Save to history for undo/redo
          set(state => ({
            history: {
              ...state.history,
              undoStack: [...state.history.undoStack, currentSession.messages],
              redoStack: [], // Clear redo stack on new action
            },
          }));

          set({
            currentSession: {
              ...currentSession,
              messages: [...currentSession.messages, userMessage],
              updatedAt: new Date().toISOString(),
            },
            isTyping: true,
            operationLoading: { ...state.operationLoading, chat: true },
            error: null,
          });

          try {
            // Get AI response using MiniMax M2
            const messages = currentSession.messages
              .concat(userMessage)
              .map(msg => ({
                role: msg.role,
                content: msg.content,
              }));

            const response = await miniMaxAI.chat(messages);
            
            if (response.success && response.data) {
              const aiMessage: ChatMessage = {
                id: `msg_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'agent',
                role: 'assistant',
                content: response.data.response,
                metadata: {
                  tokensUsed: response.data.usage.totalTokens,
                  model: 'mini-max/text-01',
                  cost: response.data.usage.cost,
                },
                timestamp: new Date().toISOString(),
              };

              set({
                currentSession: {
                  ...currentSession,
                  messages: [...currentSession.messages, userMessage, aiMessage],
                  updatedAt: new Date().toISOString(),
                },
                isTyping: false,
                operationLoading: { ...state.operationLoading, chat: false },
              });
            } else {
              set({
                error: response.error?.message || 'Failed to get AI response',
                isTyping: false,
                operationLoading: { ...state.operationLoading, chat: false },
              });
            }
          } catch (error: any) {
            set({
              error: error.message || 'An unexpected error occurred',
              isTyping: false,
              operationLoading: { ...state.operationLoading, chat: false },
            });
          }
        },

        generateCode: async (prompt: string, language = 'javascript', context?: string) => {
          const state = get();
          set({ 
            isLoading: true, 
            isTyping: true, 
            error: null,
            operationLoading: { ...state.operationLoading, code: true },
          });
          
          try {
            const response = await miniMaxAI.generateCode(prompt, language, context);
            
            if (response.success && response.data) {
              const codeMessage: ChatMessage = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'agent',
                role: 'assistant',
                content: `## Generated ${language} Code\n\n\`\`\`${language}\n${response.data.code}\n\`\`\`\n\n**Explanation:**\n${response.data.explanation}\n\n**Alternatives:**\n${response.data.alternatives.join('\n\n')}`,
                metadata: {
                  tokensUsed: response.data.usage.totalTokens,
                  model: 'mini-max/text-01',
                  type: 'code_generation',
                  cost: response.data.usage.cost,
                },
                timestamp: new Date().toISOString(),
              };

              const currentSession = get().currentSession;
              if (currentSession) {
                set({
                  currentSession: {
                    ...currentSession,
                    messages: [...currentSession.messages, codeMessage],
                    updatedAt: new Date().toISOString(),
                  },
                });
              }

              set({ 
                isLoading: false, 
                isTyping: false,
                operationLoading: { ...state.operationLoading, code: false },
              });
            } else {
              set({
                error: response.error?.message || 'Failed to generate code',
                isLoading: false,
                isTyping: false,
                operationLoading: { ...state.operationLoading, code: false },
              });
            }
          } catch (error: any) {
            set({
              error: error.message || 'An unexpected error occurred',
              isLoading: false,
              isTyping: false,
              operationLoading: { ...state.operationLoading, code: false },
            });
          }
        },

        designArchitecture: async (requirements: string, techStack?: string[]) => {
          const state = get();
          set({ 
            isLoading: true, 
            isTyping: true, 
            error: null,
            operationLoading: { ...state.operationLoading, architecture: true },
          });
          
          try {
            const response = await miniMaxAI.designArchitecture(requirements, techStack);
            
            if (response.success && response.data) {
              const archMessage: ChatMessage = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'agent',
                role: 'assistant',
                content: `## System Architecture\n\n${response.data.architecture}\n\n## Components\n${response.data.components.map(c => `- **${c.name}**: ${c.description}`).join('\n')}\n\n## Recommendations\n${response.data.recommendations.map(r => `- ${r}`).join('\n')}`,
                metadata: {
                  tokensUsed: response.data.usage.totalTokens,
                  model: 'mini-max/text-01',
                  type: 'architecture_design',
                  cost: response.data.usage.cost,
                },
                timestamp: new Date().toISOString(),
              };

              const currentSession = get().currentSession;
              if (currentSession) {
                set({
                  currentSession: {
                    ...currentSession,
                    messages: [...currentSession.messages, archMessage],
                    updatedAt: new Date().toISOString(),
                  },
                });
              }

              set({ 
                isLoading: false, 
                isTyping: false,
                operationLoading: { ...state.operationLoading, architecture: false },
              });
            } else {
              set({
                error: response.error?.message || 'Failed to design architecture',
                isLoading: false,
                isTyping: false,
                operationLoading: { ...state.operationLoading, architecture: false },
              });
            }
          } catch (error: any) {
            set({
              error: error.message || 'An unexpected error occurred',
              isLoading: false,
              isTyping: false,
              operationLoading: { ...state.operationLoading, architecture: false },
            });
          }
        },

        generateDocumentation: async (content: string, type: 'api' | 'readme' | 'code' | 'guide') => {
          const state = get();
          set({ 
            isLoading: true, 
            isTyping: true, 
            error: null,
            operationLoading: { ...state.operationLoading, documentation: true },
          });
          
          try {
            const response = await miniMaxAI.generateDocumentation(content, type);
            
            if (response.success && response.data) {
              const docMessage: ChatMessage = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'agent',
                role: 'assistant',
                content: `## Generated Documentation (${type})\n\n${response.data.documentation}\n\n## Sections\n${response.data.sections.map(s => `- ${s}`).join('\n')}\n\n## Suggestions\n${response.data.suggestions.map(s => `- ${s}`).join('\n')}`,
                metadata: {
                  tokensUsed: response.data.usage.totalTokens,
                  model: 'mini-max/text-01',
                  type: 'documentation_generation',
                  cost: response.data.usage.cost,
                },
                timestamp: new Date().toISOString(),
              };

              const currentSession = get().currentSession;
              if (currentSession) {
                set({
                  currentSession: {
                    ...currentSession,
                    messages: [...currentSession.messages, docMessage],
                    updatedAt: new Date().toISOString(),
                  },
                });
              }

              set({ 
                isLoading: false, 
                isTyping: false,
                operationLoading: { ...state.operationLoading, documentation: false },
              });
            } else {
              set({
                error: response.error?.message || 'Failed to generate documentation',
                isLoading: false,
                isTyping: false,
                operationLoading: { ...state.operationLoading, documentation: false },
              });
            }
          } catch (error: any) {
            set({
              error: error.message || 'An unexpected error occurred',
              isLoading: false,
              isTyping: false,
              operationLoading: { ...state.operationLoading, documentation: false },
            });
          }
        },

        fetchAgents: async () => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await apiClient.getAgents();
            
            if (response.success && response.data) {
              set({
                agents: response.data,
                isLoading: false,
              });
            } else {
              set({
                error: response.error?.message || 'Failed to fetch AI agents',
                isLoading: false,
              });
            }
          } catch (error: any) {
            set({
              error: error.message || 'An unexpected error occurred',
              isLoading: false,
            });
          }
        },

        setCurrentSession: (session: ChatSession | null) => {
          set({ currentSession: session });
        },

        clearError: () => {
          set({ error: null });
        },

        // Enhanced functionality
        deleteSession: (sessionId: string) => {
          set(state => ({
            sessions: state.sessions.filter(s => s.id !== sessionId),
            currentSession: state.currentSession?.id === sessionId ? null : state.currentSession,
          }));
        },

        updateSessionTitle: (sessionId: string, title: string) => {
          set(state => ({
            sessions: state.sessions.map(s => 
              s.id === sessionId ? { ...s, title: title.trim(), updatedAt: new Date().toISOString() } : s
            ),
            currentSession: state.currentSession?.id === sessionId 
              ? { ...state.currentSession, title: title.trim(), updatedAt: new Date().toISOString() }
              : state.currentSession,
          }));
        },

        clearCurrentSession: () => {
          set({ 
            currentSession: null,
            history: { undoStack: [], redoStack: [] },
          });
        },

        retryLastOperation: async () => {
          const state = get();
          if (!state.currentSession || state.currentSession.messages.length === 0) return;
          
          const lastMessage = state.currentSession.messages[state.currentSession.messages.length - 1];
          if (lastMessage.type === 'user') {
            // Retry sending the last user message
            await get().sendMessage(
              state.currentSession.id,
              lastMessage.content,
              lastMessage.agentId
            );
          }
        },

        undo: () => {
          const state = get();
          if (state.history.undoStack.length === 0) return;
          
          const previousState = state.history.undoStack[state.history.undoStack.length - 1];
          const newUndoStack = state.history.undoStack.slice(0, -1);
          
          if (state.currentSession) {
            set(state => ({
              currentSession: {
                ...state.currentSession,
                messages: previousState,
              },
              history: {
                undoStack: newUndoStack,
                redoStack: [state.currentSession.messages, ...state.history.redoStack],
              },
            }));
          }
        },

        redo: () => {
          const state = get();
          if (state.history.redoStack.length === 0) return;
          
          const nextState = state.history.redoStack[0];
          const newRedoStack = state.history.redoStack.slice(1);
          
          if (state.currentSession) {
            set(state => ({
              currentSession: {
                ...state.currentSession,
                messages: nextState,
              },
              history: {
                undoStack: [...state.history.undoStack, state.currentSession.messages],
                redoStack: newRedoStack,
              },
            }));
          }
        },

        canUndo: () => {
          return get().history.undoStack.length > 0;
        },

        canRedo: () => {
          return get().history.redoStack.length > 0;
        },

        exportSession: (sessionId: string, format: 'json' | 'markdown'): string => {
          const session = get().sessions.find(s => s.id === sessionId) || get().currentSession;
          if (!session) return '';
          
          if (format === 'json') {
            return JSON.stringify(session, null, 2);
          } else {
            let markdown = `# ${session.title}\n\n`;
            markdown += `**Created:** ${new Date(session.createdAt).toLocaleString()}\n\n`;
            markdown += `---\n\n`;
            
            session.messages.forEach(msg => {
              const role = msg.role === 'user' ? '👤 **User**' : '🤖 **AI Assistant**';
              markdown += `## ${role}\n\n${msg.content}\n\n`;
              if (msg.metadata?.tokensUsed) {
                markdown += `*Tokens used: ${msg.metadata.tokensUsed}*\n\n`;
              }
              markdown += `---\n\n`;
            });
            
            return markdown;
          }
        },

        importSession: async (sessionData: string, format: 'json' | 'markdown'): Promise<string | null> => {
          try {
            let session: ChatSession;
            
            if (format === 'json') {
              session = JSON.parse(sessionData);
            } else {
              // Basic markdown parsing - in production, use a proper markdown parser
              const lines = sessionData.split('\n');
              const titleLine = lines.find(line => line.startsWith('# '));
              const title = titleLine ? titleLine.substring(2) : 'Imported Chat';
              
              session = {
                id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                title,
                messages: [], // Would need more sophisticated parsing for markdown
                participants: [],
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
            }
            
            set(state => ({
              sessions: [...state.sessions, session],
              currentSession: session,
            }));
            
            return session.id;
          } catch (error) {
            set({ error: 'Failed to import session' });
            return null;
          }
        },

        searchMessages: (query: string, sessionId?: string): ChatMessage[] => {
          const searchTerm = query.toLowerCase();
          let sessionsToSearch = get().sessions;
          
          if (sessionId) {
            sessionsToSearch = sessionsToSearch.filter(s => s.id === sessionId);
          }
          
          const results: ChatMessage[] = [];
          sessionsToSearch.forEach(session => {
            session.messages.forEach(message => {
              if (message.content.toLowerCase().includes(searchTerm)) {
                results.push(message);
              }
            });
          });
          
          return results;
        },

        getSessionStats: (sessionId: string) => {
          const session = get().sessions.find(s => s.id === sessionId) || get().currentSession;
          if (!session) {
            return { messageCount: 0, tokensUsed: 0, cost: 0 };
          }
          
          const messageCount = session.messages.length;
          const tokensUsed = session.messages.reduce((total, msg) => {
            return total + (msg.metadata?.tokensUsed || 0);
          }, 0);
          const cost = session.messages.reduce((total, msg) => {
            return total + (msg.metadata?.cost || 0);
          }, 0);
          
          return { messageCount, tokensUsed, cost };
        },
      }),
      {
        name: 'chat-store',
        partialize: (state) => ({
          sessions: state.sessions.slice(-20), // Only persist last 20 sessions
          currentSession: state.currentSession,
        }),
      }
    )
  )
);

// Subscribe to critical changes for persistence
useChatStore.subscribe(
  (state) => state.sessions,
  (sessions) => {
    // Auto-save to backend when sessions change
    sessions.forEach(async (session) => {
      try {
        await apiClient.updateChatSession(session.id, session);
      } catch (error) {
        console.warn('Failed to auto-save session:', error);
      }
    });
  }
);

export default useChatStore;