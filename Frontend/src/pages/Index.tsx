// src/pages/Index.tsx

import { useState, useEffect } from "react";
import { Card } from "pixel-retroui";
import { useTheme } from "@/hooks/use-theme";
import ScrollableChatLayout from "@/components/ScrollableChatLayout";
import ChatColorStyles from "@/components/ChatColorStyles";
import { ChatHistorySidebar } from "@/components/ChatHistorySidebar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

interface Message {
  id: string; 
  type: 'user' | 'ai'; 
  content: string; 
  toolType?: string;
  metadata?: any; 
  timestamp: Date; 
  attachment?: { 
    fileName: string; 
    previewUrl?: string;
    fileUrl?: string; 
    fileType: string;
  };
  showDateSeparator?: boolean;
  dateSeparatorText?: string;
}

interface UploadedFile { 
  file: File; 
  name: string; 
  type: string;
  fileType: 'image' | 'video' | 'pdf' | 'document';
}

const WELCOME_MESSAGE: Message = {
  id: '1', type: 'ai',
  content: "Hello! I'm Cerebra AI, your intelligent multi-modal assistant. How can I help you today?",
  toolType: 'general_chat', timestamp: new Date()
};

const Index = () => {
  const { actualTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTool, setCurrentTool] = useState<string | undefined>();
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleNewChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setSessionId(null);
  };

  const handleSelectSession = async (selectedSessionId: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/sessions/${selectedSessionId}`);
      if (response.ok) {
        const historyData = await response.json();
        const formattedMessages: Message[] = historyData.map((msg: any) => ({
            id: msg.id,
            type: msg.role === 'assistant' ? 'ai' : 'user', 
            content: msg.content,
            toolType: msg.metadata?.tool_used || 'general_chat',
            metadata: msg.metadata,
            timestamp: new Date(msg.timestamp),
            attachment: msg.attachment,
            showDateSeparator: msg.show_date_separator || false,
            dateSeparatorText: msg.date_separator_text || null
          }));
        setMessages(formattedMessages);
        setSessionId(selectedSessionId);
      }
    } catch (error) {
      console.error("Failed to fetch session history:", error);
    }
  };

  const handleDeleteSession = (deletedSessionId: string) => {
    if (sessionId === deletedSessionId) {
      handleNewChat();
    }
  };

  const handleSendMessage = async (message: string, files: UploadedFile[]) => {
    const userMessage: Message = {
      id: Date.now().toString(), type: 'user', content: message, timestamp: new Date()
    };
    
    if (files.length > 0) {
      const file = files[0];
      userMessage.attachment = {
        fileName: file.name,
        fileType: file.fileType,
        previewUrl: file.fileType === 'image' ? URL.createObjectURL(file.file) : undefined,
      };
    }
    
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    setCurrentTool('router');

    const formData = new FormData();
    formData.append('query', message);
    if (sessionId) formData.append('session_id', sessionId);
    if (files.length > 0) formData.append('file', files[0].file, files[0].name);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/process', {
        method: 'POST', body: formData,
      });

      if (!response.ok) throw new Error((await response.json()).message || 'Backend error');
      
      const result = await response.json();
      const aiData = result.data; 

      const aiResponse: Message = {
        id: result.session_id + Date.now(),
        type: 'ai',
        content: aiData.content,
        toolType: aiData.tool_info?.name || 'general_chat',
        metadata: { ...aiData.tool_info, processingTime: result.processing_time },
        timestamp: new Date(result.timestamp),
        attachment: aiData.attachment,
      };
      
      setMessages(prev => [...prev, aiResponse]);
      if (!sessionId) setSessionId(result.session_id);

    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(), type: 'ai',
        content: `I apologize, but I encountered an error: ${(error as Error).message}`,
        toolType: 'general_chat', timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
      setCurrentTool(undefined);
    }
  };
  
  const getCardColors = () => {
    if (actualTheme === 'dark') {
      return { cardBg: 'hsl(var(--background))', cardTextColor: 'hsl(var(--card-foreground))', cardBorderColor: '#FFFFFF', cardShadowColor: 'hsl(var(--primary))'};
    }
    return { cardBg: '#fff6c7', cardTextColor: '#1e2b3b', cardBorderColor: '#5f0ed8', cardShadowColor: '#7ae4ff'};
  };
  const { cardBg, cardTextColor, cardBorderColor, cardShadowColor } = getCardColors();

  return (
    <>
      <ChatColorStyles />
      <div className="h-screen w-screen p-4 flex items-center justify-center bg-background font-minecraft">
        <Card 
          className="h-full w-full max-w-7xl mx-auto flex flex-col overflow-hidden"
          bg={cardBg} textColor={cardTextColor} borderColor={cardBorderColor} shadowColor={cardShadowColor}
        >
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
              <ChatHistorySidebar 
                activeSessionId={sessionId}
                onSelectSession={handleSelectSession}
                onNewChat={handleNewChat}
                onDeleteSession={handleDeleteSession}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={80}>
              <ScrollableChatLayout
                messages={messages}
                isProcessing={isProcessing}
                currentTool={currentTool}
                onSendMessage={handleSendMessage}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </Card>
      </div>
    </>
  );
};

export default Index;