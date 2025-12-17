import React, { useState, useCallback } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { protectedAI } from '@/utils/ai-protection';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokensUsed?: number;
}

interface ProtectedAIChatProps {
  className?: string;
  placeholder?: string;
  agentType?: 'chat' | 'code' | 'architecture' | 'documentation';
}

export const ProtectedAIChat: React.FC<ProtectedAIChatProps> = ({
  className = '',
  placeholder = 'Ask me anything...',
  agentType = 'chat'
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Используем защищенный endpoint
      const response = await protectedAI.sendMessage(input.trim(), agentType);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content || 'Sorry, I encountered an error.',
        timestamp: new Date(),
        tokensUsed: response.tokensUsed
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError('Failed to send message. Please try again.');
      console.error('AI Chat Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, agentType]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Start a conversation with our AI assistant</p>
            <p className="text-sm mt-2">
              Protected by enterprise-grade security
            </p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start space-x-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-ai-purple to-ai-pink flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            
            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              {message.tokensUsed && (
                <p className="text-xs opacity-70 mt-1">
                  Tokens: {message.tokensUsed}
                </p>
              )}
            </div>
            
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-ai-purple to-ai-pink flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-l-4 border-red-400 text-red-700">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          🔒 All requests are encrypted and proxied for security
        </p>
      </div>
    </div>
  );
};