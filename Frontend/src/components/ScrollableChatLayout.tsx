import { useEffect, useRef } from 'react';
import CerebraHeader from './CerebraHeader';
import Chat from './Chat'; // Import the new Chat component
import ProcessingStatus from './ProcessingStatus';
import InputArea from './InputArea';
import { useTheme } from '@/hooks/use-theme';

interface ChatLayoutProps {
  messages: Array<{
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: Date;
    toolType?: string;
    metadata?: any;
    attachment?: any;
    showDateSeparator?: boolean;
    dateSeparatorText?: string;
  }>;
  isProcessing: boolean;
  currentTool?: string;
  onSendMessage: (message: string, files: any[]) => void;
}

const ScrollableChatLayout = ({ messages, isProcessing, currentTool, onSendMessage }: ChatLayoutProps) => {
  const { actualTheme } = useTheme();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isProcessing]);

  // Convert your Message format to the Chat component's expected format
  const convertMessagesToChatFormat = (messages: ChatLayoutProps['messages']) => {
    return messages.map(message => ({
      id: message.id,
      session_id: '', // Not needed for display
      role: message.type === 'ai' ? 'assistant' : 'user',
      content: message.content,
      timestamp: message.timestamp.toISOString(), // Convert to ISO string for proper timezone handling
      metadata: {
        tool_used: message.toolType,
        ...message.metadata
      },
      attachment: message.attachment,
      show_date_separator: message.showDateSeparator,
      date_separator_text: message.dateSeparatorText
    }));
  };

  // Get theme-specific colors for the chat area background
  const getChatAreaColors = () => {
    if (actualTheme === 'dark') {
      return {
        chatBg: 'hsl(var(--background))',
        inputBg: 'rgba(15, 23, 42, 0.8)',
        borderColor: 'hsl(var(--border))'
      };
    } else {
      return {
        chatBg: '#fff6c7', // Cream yellow for the entire chat area
        inputBg: 'rgba(255, 246, 199, 0.9)', // Slightly transparent cream for input area
        borderColor: 'rgba(95, 14, 216, 0.2)' // Purple border
      };
    }
  };

  const { chatBg, inputBg, borderColor } = getChatAreaColors();

  return (
    <div className="h-full flex flex-col" style={{ background: chatBg }}>
      {/* Fixed Header */}
      <div className="flex-shrink-0">
        <CerebraHeader />
      </div>

      {/* Scrollable Chat Messages Area with cream background */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth"
        style={{
          background: chatBg, // Apply cream background to chat area
          // Custom scrollbar styling
          scrollbarWidth: 'thin',
          scrollbarColor: actualTheme === 'light' 
            ? 'rgba(95, 14, 216, 0.4) transparent' 
            : 'hsl(var(--muted-foreground)) transparent'
        }}
      >
        {messages.length === 1 ? ( // Check if only the initial message exists
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <div className="text-6xl mb-4">🤖</div>
              <h2 className="text-2xl font-bold" style={{ 
                color: actualTheme === 'light' ? '#1e293b' : 'hsl(var(--foreground))' 
              }}>
                Welcome to Cerebra AI
              </h2>
              <p style={{ 
                color: actualTheme === 'light' ? '#475569' : 'hsl(var(--muted-foreground))' 
              }}>
                Your intelligent multi-modal assistant is ready. Try uploading a document, 
                generating an image, or asking a question.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Use the new Chat component with date separators and timezone fixes */}
            <Chat messages={convertMessagesToChatFormat(messages)} />
            
            {/* Processing Status */}
            {isProcessing && (
              <ProcessingStatus 
                isProcessing={isProcessing}
                currentTool={currentTool as any}
              />
            )}
            
            {/* Invisible div to scroll to */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Fixed Input Area with matching background - using flex-shrink-0 to prevent shrinking */}
      <div 
        className="flex-shrink-0 p-4"
        style={{
          background: inputBg,
          borderTop: `1px solid ${borderColor}`,
          backdropFilter: 'blur(8px)'
        }}
      >
        <InputArea 
          onSendMessage={onSendMessage}
          isProcessing={isProcessing}
        />
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        div::-webkit-scrollbar {
          width: 8px;
        }
        div::-webkit-scrollbar-track {
          background: transparent;
        }
        div::-webkit-scrollbar-thumb {
          background: ${actualTheme === 'light' ? 'rgba(95, 14, 216, 0.4)' : 'hsl(var(--muted-foreground))'};
          border-radius: 4px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: ${actualTheme === 'light' ? 'rgba(95, 14, 216, 0.6)' : 'hsl(var(--foreground))'};
        }
      `}</style>
    </div>
  );
};

export default ScrollableChatLayout;