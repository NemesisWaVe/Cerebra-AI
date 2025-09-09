// Add this debugging code to your Chat.tsx component to see what's happening

import React from 'react';
import ChatMessage from './ChatMessage';

interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: any;
  attachment?: any;
  show_date_separator?: boolean;
  date_separator_text?: string;
}

interface ChatProps {
  messages: Message[];
}

const Chat: React.FC<ChatProps> = ({ messages }) => {
  
  const formatMessagesForDisplay = (dbMessages: Message[]) => {
    return dbMessages.map((message) => {

      let parsedTimestamp: Date;
      try {
        if (typeof message.timestamp === 'string') {
          parsedTimestamp = new Date(message.timestamp);
          if (isNaN(parsedTimestamp.getTime())) {
            console.warn(`Invalid timestamp for message ${message.id}: ${message.timestamp}`);
            parsedTimestamp = new Date();
          }
        } else {
          parsedTimestamp = message.timestamp;
        }
      } catch (error) {
        console.error(`Error parsing timestamp for message ${message.id}:`, error);
        parsedTimestamp = new Date();
      }

      const formattedMessage = {
        ...message,
        type: message.role === 'user' ? 'user' : 'ai' as 'user' | 'ai',
        toolType: message.metadata?.tool_used || 'general_chat',
        timestamp: parsedTimestamp,
        showDateSeparator: message.show_date_separator || false,
        dateSeparatorText: message.date_separator_text || null,
        attachment: message.attachment || undefined
      };
      return formattedMessage;
    });
  };

  const formattedMessages = formatMessagesForDisplay(messages);

  return (
    <div className="flex flex-col space-y-0">
      {formattedMessages.map((message, index) => {
        // Debug what we're passing to ChatMessage
        console.log(`Rendering ChatMessage ${index} with:`, {
          showDateSeparator: message.showDateSeparator,
          dateSeparatorText: message.dateSeparatorText
        });
        
        return (
          <ChatMessage
            key={message.id}
            type={message.type}
            content={message.content}
            toolType={message.toolType}
            metadata={message.metadata}
            timestamp={message.timestamp}
            showDateSeparator={message.showDateSeparator}
            dateSeparatorText={message.dateSeparatorText}
            attachment={message.attachment}
          />
        );
      })}
    </div>
  );
};

export default Chat;