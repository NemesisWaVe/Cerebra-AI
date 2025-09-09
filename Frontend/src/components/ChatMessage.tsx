import { Bot, User, FileText, Video, Image, Code, ClipboardCopy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { Bubble } from "pixel-retroui";
import { useTheme } from "@/hooks/use-theme";

interface ChatMessageProps {
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

const ChatMessage = ({ 
  type, 
  content, 
  toolType, 
  metadata, 
  timestamp, 
  attachment,
  showDateSeparator,
  dateSeparatorText
}: ChatMessageProps) => {
  const { actualTheme } = useTheme();
  const [isCopied, setIsCopied] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setIsCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2000);
    }, (err) => {
      toast.error("Failed to copy.");
      console.error('Failed to copy: ', err);
    });
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('Image failed to load:', {
      src: e.currentTarget.src,
      attachment,
      error: e
    });
    setImageLoading(false);
    setImageError(true);
  };

  const getLocalTime = (utcDate: Date) => {
    let date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
    if (typeof utcDate === 'string' && !utcDate.includes('Z') && !utcDate.includes('+') && !utcDate.includes('-')) {
      date = new Date(utcDate + 'Z');
    }
    return date;
  };

  const formatTime = (date: Date) => {
    const localTime = getLocalTime(date);
    return localTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getToolIcon = () => {
    switch (toolType) {
      case 'doc_analyzer': return <FileText className="w-4 h-4 text-blue-400" />;
      case 'video_analyzer': return <Video className="w-4 h-4 text-purple-400" />;
      case 'img_gen': return <Image className="w-4 h-4 text-green-400" />;
      case 'code_runner': return <Code className="w-4 h-4 text-orange-400" />;
      default: return <Bot className="w-4 h-4 text-primary" />;
    }
  };

  // Helper function to get the appropriate file icon based on file type/extension
  const getFileIcon = (fileName: string, fileType: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (fileType === 'video' || ['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(extension || '')) {
      return <Video className="w-6 h-6 text-purple-500" />;
    }
    if (fileType === 'pdf' || extension === 'pdf') {
      return <FileText className="w-6 h-6 text-red-500" />;
    }
    if (['py', 'js', 'ts', 'tsx', 'jsx', 'html', 'css', 'json'].includes(extension || '')) {
      return <Code className="w-6 h-6 text-blue-500" />;
    }
    return <FileText className="w-6 h-6 text-gray-500" />;
  };

  const renderAttachmentPreview = () => {
    if (!attachment) return null;

    const { fileType, previewUrl, fileUrl, fileName } = attachment;
    const clickableUrl = fileUrl || previewUrl;

    // Debug logging for generated images
    if (fileType === 'image') {
      console.log('Rendering image attachment:', {
        fileName,
        fileType,
        previewUrl,
        fileUrl,
        clickableUrl
      });
    }

    const userBorder = { borderColor: actualTheme === 'dark' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.3)' };
    const aiBorder = { borderColor: 'hsl(var(--primary))' };
    const borderStyle = type === 'user' ? userBorder : aiBorder;

    // Enhanced file preview component that shows previews and allows opening files
    const FilePreviewCard = ({ children, showOpenButton = true }: { children: React.ReactNode, showOpenButton?: boolean }) => (
      <div className="max-w-[300px] w-fit">
        {children}
        {showOpenButton && clickableUrl && (
          <div className="mt-2 flex items-center justify-center">
            <a 
              href={clickableUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open {fileType === 'video' ? 'Video' : fileType === 'pdf' ? 'PDF' : 'File'}
            </a>
          </div>
        )}
      </div>
    );

    // Handle images (including generated images)
    if (fileType === 'image' && previewUrl) {
      return (
        <FilePreviewCard showOpenButton={false}>
          <a 
            href={clickableUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          >
            <div className="relative">
              {imageLoading && (
                <div className="absolute inset-0 bg-secondary rounded-lg flex items-center justify-center min-h-[100px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
              {imageError ? (
                <div className="p-4 bg-secondary rounded-lg border-2 flex flex-col items-center gap-2 min-h-[100px]" style={borderStyle}>
                  <Image className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground text-center">
                    Failed to load image
                    <br />
                    <span className="text-xs">{fileName}</span>
                  </span>
                </div>
              ) : (
                <img 
                  src={previewUrl} 
                  alt={fileName}
                  className="max-w-full h-auto rounded-lg border-2 hover:opacity-90 transition-opacity"
                  style={borderStyle}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              )}
            </div>
          </a>
        </FilePreviewCard>
      );
    }

    // Handle PDFs with preview thumbnails
    if (fileType === 'pdf' && previewUrl) {
      return (
        <FilePreviewCard>
          <div className="p-3 bg-secondary rounded-lg border-2 flex items-center gap-3" style={borderStyle}>
            <div className="relative">
              <img 
                src={previewUrl} 
                alt={`${fileName} preview`}
                className="w-16 h-20 object-cover rounded border"
                onError={(e) => {
                  // Hide the image if it fails to load and show icon instead
                  e.currentTarget.style.display = 'none';
                  const icon = e.currentTarget.nextElementSibling as HTMLElement;
                  if (icon) icon.style.display = 'block';
                }}
              />
              <FileText className="w-16 h-16 text-red-500 hidden" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{fileName}</p>
              <p className="text-xs text-muted-foreground">PDF Document</p>
            </div>
          </div>
        </FilePreviewCard>
      );
    }

    // Handle videos with preview thumbnails
    if (fileType === 'video') {
      return (
        <FilePreviewCard>
          <div className="relative group rounded-lg border-2 overflow-hidden bg-secondary" style={borderStyle}>
            {previewUrl ? (
              <>
                <img 
                  src={previewUrl} 
                  alt={`${fileName} preview`}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                  <Video className="w-10 h-10 text-white/90" />
                </div>
              </>
            ) : (
              <div className="p-4 flex items-center gap-3">
                <Video className="w-8 h-8 text-purple-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{fileName}</p>
                  <p className="text-xs text-muted-foreground">Video File</p>
                </div>
              </div>
            )}
          </div>
        </FilePreviewCard>
      );
    }

    // Handle all other document types (txt, py, md, etc.)
    return (
      <FilePreviewCard>
        <div className="p-3 bg-secondary rounded-lg border-2 flex items-center gap-3" style={borderStyle}>
          {getFileIcon(fileName, fileType)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{fileName}</p>
            <p className="text-xs text-muted-foreground">
              {fileName.split('.').pop()?.toUpperCase() || 'Document'}
            </p>
          </div>
        </div>
      </FilePreviewCard>
    );
  };

  const renderAIContent = () => {
    return (
      <div className="prose prose-sm ai-message-content max-w-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2">
        <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
          {content}
        </ReactMarkdown>
      </div>
    );
  };
  
  const renderUserContent = () => {
    const textColor = 'hsl(var(--primary-foreground))';
    return (
      <div className="flex flex-col gap-2">
        {renderAttachmentPreview()}
        {content && (
          <div className="whitespace-pre-wrap break-words pt-2" style={{ color: textColor }}>{content}</div>
        )}
      </div>
    );
  };
  
  const colors = {
    bubbleBg: type === 'ai' ? 'hsl(var(--secondary))' : 'hsl(var(--primary))',
    textColor: type === 'ai' ? 'hsl(var(--secondary-foreground))' : 'hsl(var(--primary-foreground))',
    borderColor: '#000000',
    timestampColor: type === 'ai' 
      ? (actualTheme === 'dark' ? '#e2e8f0' : '#7c3aed') 
      : (actualTheme === 'dark' ? '#64748b' : '#e2e8f0')
  };

  return (
    <>
      {showDateSeparator && dateSeparatorText && (
        <div className="flex justify-center my-6">
          <div 
            className="px-4 py-2 rounded-full text-xs font-medium"
            style={{
              backgroundColor: actualTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              color: actualTheme === 'dark' ? '#e2e8f0' : '#64748b'
            }}
          >
            {dateSeparatorText}
          </div>
        </div>
      )}

      <div className={`flex ${type === 'user' ? 'justify-end' : 'justify-start'} mb-6 animate-fade-in`}>
        <Bubble 
          direction={type === 'user' ? 'right' : 'left'}
          className={`max-w-[${type === 'user' ? '80' : '85'}%]`}
          bg={colors.bubbleBg}
          textColor={colors.textColor}
          borderColor={colors.borderColor}
        >
          <div className="flex items-start gap-3">
            {type === 'ai' && <div className="flex-shrink-0 mt-1">{getToolIcon()}</div>}
            <div className="flex-1">
              {type === 'user' ? renderUserContent() : (
                <div className="space-y-3">
                  {content && renderAIContent()}
                  {attachment && <div className="pt-1">{renderAttachmentPreview()}</div>}
                  
                  {toolType === 'code_runner' && metadata?.codeOutput && (
                    <div className="mt-3">
                      <div className="text-xs text-muted-foreground mb-1 font-medium">Output:</div>
                      <pre className="font-mono text-xs bg-slate-900 text-green-400 p-3 rounded-lg overflow-x-auto border">
                        <code>{metadata.codeOutput}</code>
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
            {type === 'user' && <User className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: colors.textColor }} />}
          </div>
          
          <div 
            className="flex items-center justify-between text-xs mt-3 pt-2 border-t"
            style={{ 
              borderColor: actualTheme === 'light' ? 'rgba(124, 58, 237, 0.2)' : 'rgba(255, 255, 255, 0.2)',
            }}
          >
            <div className="flex items-center gap-2" style={{ color: colors.timestampColor }}>
              {formatTime(timestamp)}
              {toolType && toolType !== 'general_chat' && type === 'ai' && (
                <span className="font-medium">
                  via {toolType.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {metadata?.processingTime && type === 'ai' && (
                <span style={{ color: colors.timestampColor }} className="opacity-70">
                  {metadata.processingTime.toFixed(2)}s
                </span>
              )}
              <button onClick={handleCopy} className="p-1 rounded-md hover:bg-primary/10 transition-colors">
                {isCopied ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <ClipboardCopy className="w-3 h-3" style={{ color: colors.timestampColor }} />
                )}
              </button>
            </div>
          </div>
        </Bubble>
      </div>
    </>
  );
};

export default ChatMessage;