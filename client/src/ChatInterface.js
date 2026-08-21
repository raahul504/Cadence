// Chat Interface Component
// client/src/components/ChatInterface.js

import React, { useState, useEffect, useRef } from 'react';
import { conversationHelpers } from './lib/supabase';
import { chatWithGemini } from './lib/gemini';
import ChatMessage from './ChatMessage';
import QuickActions from './QuickActions';

function ChatInterface({ userId, userEvents, onEventCommand, onClearChatRef }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom — explicitly scroll the messages container
  const scrollToBottom = (smooth = true) => {
    const container = messagesContainerRef.current;
    if (container) {
      // Prefer smooth scrolling inside the container; fall back to instant if needed
      try {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto'
        });
      } catch (err) {
        // older browsers: fallback to direct assignment
        container.scrollTop = container.scrollHeight;
      }
    } else {
      // Last-resort: if container isn't available, try scrolling the marker but request minimal page movement
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    }
  };


  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    initializeConversation();
  }, [userId]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const initializeConversation = async () => {
    try {
      // Get or create conversation
      const { data: conversations } = await conversationHelpers.getConversations(userId);
      
      if (conversations && conversations.length > 0) {
        // Use most recent conversation
        const conversation = conversations[0];
        setCurrentConversationId(conversation.id);
        
        // Load messages
        const { data: msgs } = await conversationHelpers.getMessages(conversation.id);
        if (msgs) {
          setMessages(msgs);
        }
      } else {
        // Create new conversation
        const { data: newConv } = await conversationHelpers.createConversation(
          userId,
          'Chat with Cadence'
        );
        setCurrentConversationId(newConv.id);
        
        // Add welcome message
        await addAIMessage(
          "👋 Hi! I'm Cadence, your calendar assistant. I can help you manage your schedule, create events, and answer questions about your calendar. How can I help you today?",
          newConv.id
        );
      }
    } catch (err) {
      console.error('Error initializing conversation:', err);
      setError('Failed to load conversation');
    }
  };

  const addAIMessage = async (content, convId = currentConversationId) => {
    try {
      const { data } = await conversationHelpers.addMessage(convId, 'assistant', content);
      if (data) {
        setMessages(prev => [...prev, data]);
      }
    } catch (err) {
      console.error('Error adding AI message:', err);
    }
  };

  const addUserMessage = async (content) => {
    try {
      const { data } = await conversationHelpers.addMessage(
        currentConversationId,
        'user',
        content
      );
      if (data) {
        setMessages(prev => [...prev, data]);
      }
      return data;
    } catch (err) {
      console.error('Error adding user message:', err);
      throw err;
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMsg = inputMessage.trim();
    setInputMessage('');
    setError(null);
    setIsLoading(true);

    try {
      // Add user message to UI and DB
      await addUserMessage(userMsg);

      // Get AI response
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const aiResponse = await chatWithGemini(userMsg, conversationHistory, userEvents);

      // Check if AI returned a command
      if (aiResponse.hasCommand) {
        // Execute command through parent component
        if (onEventCommand) {
          await onEventCommand(aiResponse.commands);
        }
        await new Promise(resolve => setTimeout(resolve, 500))
        // Show AI's explanation message
        if (aiResponse.message) {
          await addAIMessage(aiResponse.message);
        }
      } else {
        // Regular response
        await addAIMessage(aiResponse.message);
      }

    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
      await addAIMessage("I'm sorry, I encountered an error. Please try again.");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickAction = (template) => {
    setInputMessage(template);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (!onClearChatRef) return;

    const confirmFn = async () => {
      try {
        if (currentConversationId) {
          await conversationHelpers.deleteConversation(currentConversationId);
        }
        setMessages([]);
        setCurrentConversationId(null);
        await initializeConversation();
      } catch (err) {
        console.error('Error clearing chat:', err);
        setError('Failed to clear conversation');
      }
    };

    onClearChatRef(confirmFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClearChatRef, currentConversationId]);



  return (
    <div className="chat-interface">
      {/* Chat Header 
      <div className="chat-header">
        <div className="chat-header-info">
          <span className="chat-header-title">🤖 Cadence AI</span>
          <span className="chat-header-status">
            {isLoading ? 'Thinking...' : 'Online'}
          </span>
        </div>
        {/*<button
          className="btn-clear-chat"
          onClick={handleClearChat}
          title="Clear conversation"
          >
            <span className="material-icons icon-small">delete_outline</span>
          </button>
      </div>*/}

      {/* Messages Container */}
      <div className="chat-messages" ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <div className="chat-empty-icon">💬</div>
            <p>Start a conversation with Cadence</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <ChatMessage
              key={msg.id || index}
              message={msg}
              isUser={msg.role === 'user'}
            />
          ))
        )}
        {isLoading && (
          <div className="chat-message chat-message-ai">
            <div className="chat-message-header">
              <span className="chat-message-sender">🤖 Cadence</span>
            </div>
            <div className="chat-message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="chat-error">
          ⚠️ {error}
        </div>
      )}

      {/* Quick Actions */}
      <QuickActions onActionClick={handleQuickAction} />

      {/* Input Area */}
      <div className="chat-input-container">
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          placeholder="Ask Cadence anything..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
        />
        <button
          className="btn-send-message"
          onClick={handleSendMessage}
          disabled={!inputMessage.trim() || isLoading}
        >
          <span className="material-icons icon-small">send</span>
        </button>
      </div>
    </div>
  );
}

export default ChatInterface;