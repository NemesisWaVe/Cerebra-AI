import { Bot, FileText, Video, Image as ImageIcon, Code, Brain } from "lucide-react";

interface ProcessingStatusProps {
  isProcessing: boolean;
  currentTool?: 'general_chat' | 'doc_analyzer' | 'video_analyzer' | 'img_gen' | 'code_runner' | 'router';
  message?: string;
  estimatedTime?: number;
}

const ProcessingStatus = ({ isProcessing, currentTool, message, estimatedTime }: ProcessingStatusProps) => {
  if (!isProcessing) return null;

  const getToolInfo = () => {
    switch (currentTool) {
      case 'router':
        return {
          icon: <Brain className="w-4 h-4" />,
          label: '🤖 AI Router analyzing your request...',
          color: 'text-primary'
        };
      case 'doc_analyzer':
        return {
          icon: <FileText className="w-4 h-4" />,
          label: '📄 Analyzing document content...',
          color: 'text-blue-400'
        };
      case 'video_analyzer':
        return {
          icon: <Video className="w-4 h-4" />,
          label: '🎥 Transcribing video/audio...',
          color: 'text-purple-400'
        };
      case 'img_gen':
        return {
          icon: <ImageIcon className="w-4 h-4" />,
          label: '🎨 Generating your image...',
          color: 'text-green-400'
        };
      case 'code_runner':
        return {
          icon: <Code className="w-4 h-4" />,
          label: '💻 Executing code safely...',
          color: 'text-orange-400'
        };
      default:
        return {
          icon: <Bot className="w-4 h-4" />,
          label: '💭 Thinking about your question...',
          color: 'text-accent'
        };
    }
  };

  const toolInfo = getToolInfo();

  return (
    <div className="glass-subtle p-4 rounded-xl mb-4 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className={`${toolInfo.color} animate-pulse`}>
          {toolInfo.icon}
        </div>
        
        <div className="flex-1">
          <div className="text-sm font-medium text-foreground">
            {message || toolInfo.label}
          </div>
          
          {estimatedTime && (
            <div className="text-xs text-muted-foreground mt-1">
              Estimated time: ~{estimatedTime}s
            </div>
          )}
        </div>
        
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-primary-glow rounded-full animate-bounce"></div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-gradient-primary animate-pulse rounded-full w-2/3"></div>
      </div>
    </div>
  );
};

export default ProcessingStatus;