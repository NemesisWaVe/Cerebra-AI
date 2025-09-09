import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquarePlus, Trash2, MessageCircle } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

// --- INTERFACE UPDATED ---
interface Session {
  session_id: string;
  title: string;
  message_count: number;
  relative_time: string; // We now get this directly from the backend
}

interface ChatHistorySidebarProps {
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
}

export const ChatHistorySidebar = ({ 
  activeSessionId, 
  onSelectSession, 
  onNewChat,
  onDeleteSession
}: ChatHistorySidebarProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const { actualTheme } = useTheme();

  const fetchSessions = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, []);
  
  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); 
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        onDeleteSession(sessionId);
        fetchSessions();
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  // --- THIS FUNCTION IS NO LONGER NEEDED AND HAS BEEN REMOVED ---
  // const getRelativeTime = (dateString: string) => { ... };

  return (
    <div className={`h-full flex flex-col p-3 ${actualTheme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-100/50'}`}>
      <Button
        onClick={onNewChat}
        className="w-full mb-4"
        variant={actualTheme === 'dark' ? 'secondary' : 'default'}
      >
        <MessageSquarePlus className="w-4 h-4 mr-2" />
        New Chat
      </Button>
      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.session_id}
              onClick={() => onSelectSession(session.session_id)}
              className={`group p-3 rounded-lg cursor-pointer transition-colors flex items-start gap-3
                ${activeSessionId === session.session_id 
                  ? 'bg-primary/20' 
                  : 'hover:bg-primary/10'
                }`
              }
            >
              <MessageCircle className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {session.title}
                </p>
                {/* --- THIS LINE IS FIXED --- */}
                <p className="text-xs text-muted-foreground">
                  {session.message_count} messages • {session.relative_time}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleDelete(e, session.session_id)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};