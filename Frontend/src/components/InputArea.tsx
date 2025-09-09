import { useState, useRef, useEffect } from "react";
import { Send, Upload, Mic, Lightbulb, FileText, ImageIcon, Code, Video, X } from "lucide-react";
import { Button, Card, Input } from "pixel-retroui";
import { useTheme } from "@/hooks/use-theme";

// Add this interface for browser speech recognition
interface IWindow extends Window {
  SpeechRecognition: any;
  webkitSpeechRecognition: any;
}

// --- NEW: Defines the structure for an uploaded file ---
interface UploadedFile {
  file: File;
  name: string;
  type: string; // Original MIME type from the File object
  fileType: 'image' | 'video' | 'pdf' | 'document'; // Our app-specific type
}

interface InputAreaProps {
  onSendMessage: (message: string, files: UploadedFile[]) => void; // Uses the new interface
  isProcessing: boolean;
}

// --- NEW: Helper function to determine our app-specific file type ---
const getAppFileType = (file: File): UploadedFile['fileType'] => {
  const mimeType = file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf' || extension === 'pdf') return 'pdf';
  
  return 'document'; // Fallback for all other types
};


const InputArea = ({ onSendMessage, isProcessing }: InputAreaProps) => {
  const { actualTheme } = useTheme();
  const [message, setMessage] = useState("");
  // --- MODIFIED: Use the specific UploadedFile type for state ---
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Setup Speech Recognition on component mount (no changes needed here)
  useEffect(() => {
    const { SpeechRecognition, webkitSpeechRecognition }: IWindow = window as any;
    if (!SpeechRecognition && !webkitSpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }
    const Recognition = SpeechRecognition || webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setMessage(prev => prev.trim() ? `${prev.trim()} ${finalTranscript}` : finalTranscript);
      }
    };
    recognition.onerror = (event: any) => console.error("Speech recognition error:", event.error);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    return () => recognitionRef.current?.abort();
  }, []);

  // --- MODIFIED: Update to use the UploadedFile interface ---
  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const items = event.clipboardData.items;
    const filesToUpload: UploadedFile[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          filesToUpload.push({
            file,
            name: `pasted-image-${Date.now()}.${file.type.split('/')[1]}`,
            type: file.type,
            fileType: 'image'
          });
        }
      }
    }
    if (filesToUpload.length > 0) {
      setUploadedFiles(prevFiles => [...prevFiles, ...filesToUpload]);
    }
  };

  const handleToggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
    setIsListening(!isListening);
  };

  const handleSendMessage = () => {
    if (message.trim() || uploadedFiles.length > 0) {
      onSendMessage(message, uploadedFiles);
      setMessage("");
      setUploadedFiles([]);
    }
  };

  // --- MODIFIED: This is the core logical fix ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files).map(file => ({
        file,
        name: file.name,
        type: file.type, // Keep original MIME type
        fileType: getAppFileType(file), // Add our specific file type
      }));
       setUploadedFiles(prevFiles => [...prevFiles, ...filesArray]);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !isProcessing) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (prompt: string, requiresFile: boolean) => {
    setMessage(prompt);
    if (requiresFile && uploadedFiles.length === 0) {
      fileInputRef.current?.click();
    }
  };
  
  const primaryButtonBg = 'hsl(var(--primary))';
  const primaryButtonText = 'hsl(var(--primary-foreground))';
  const primaryButtonBorder = actualTheme === 'dark' ? 'hsl(var(--foreground))' : 'hsl(var(--primary))';
  const primaryButtonShadow = actualTheme === 'dark' ? 'hsl(var(--muted))' : 'hsl(var(--accent))';
  const secondaryButtonBg = 'hsl(var(--secondary))';
  const secondaryButtonText = 'hsl(var(--secondary-foreground))';
  const secondaryButtonBorder = actualTheme === 'dark' ? 'hsl(var(--foreground))' : 'hsl(var(--primary))';
  const secondaryButtonShadow = actualTheme === 'dark' ? 'hsl(var(--muted))' : 'hsl(var(--accent))';
  const inputBg = 'hsl(var(--input))';
  const inputText = 'hsl(var(--foreground))';
  const inputBorder = 'hsl(var(--border))';
  const inputShadow = 'hsl(var(--accent))';

  return (
    <Card 
      className="p-4 space-y-4"
      bg={actualTheme === 'dark' ? 'hsl(var(--background))' : 'transparent'}
      textColor={'hsl(var(--foreground))'}
      borderColor={actualTheme === 'dark' ? 'hsl(var(--border))' : 'hsl(var(--border))'}
      shadowColor={'transparent'}
    >
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          onPaste={handlePaste}
          placeholder="Ask me anything, paste an image, or upload a file..."
          className="flex-1"
          disabled={isProcessing}
          bg={inputBg}
          textColor={inputText}
          borderColor={inputBorder}
          shadowColor={inputShadow}
        />
        <Button 
          onClick={handleSendMessage} 
          disabled={isProcessing || (!message.trim() && uploadedFiles.length === 0)}
          bg={primaryButtonBg}
          textColor={primaryButtonText}
          borderColor={primaryButtonBorder}
          shadowColor={primaryButtonShadow}
        >
          <Send className="w-5 h-5" />
          <span className="ml-2 hidden sm:inline">Send</span>
        </Button>
      </div>

      {/* --- MODIFIED: Adjusted UI for better file management --- */}
      {uploadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {uploadedFiles.map((file, index) => (
            <div key={index} className="flex items-center gap-2 px-2 py-1 bg-secondary rounded-md border text-secondary-foreground">
              <span className="truncate max-w-[200px]">{file.name}</span>
              <button 
                onClick={() => setUploadedFiles(files => files.filter((_, i) => i !== index))}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            multiple
          />
          <Button onClick={() => fileInputRef.current?.click()} variant="secondary" disabled={isProcessing} bg={secondaryButtonBg} textColor={secondaryButtonText} borderColor={secondaryButtonBorder} shadowColor={secondaryButtonShadow}>
            <Upload className="w-4 h-4" />
            <span className="ml-2 hidden sm:inline">Upload</span>
          </Button>
          <Button variant="secondary" disabled={isProcessing} onClick={handleToggleListening} bg={secondaryButtonBg} textColor={secondaryButtonText} borderColor={isListening ? primaryButtonBorder : secondaryButtonBorder} shadowColor={secondaryButtonShadow}>
            <Mic className={`w-4 h-4 ${isListening ? 'text-red-500 animate-pulse' : ''}`} />
            <span className="ml-2 hidden sm:inline">{isListening ? 'Listening...' : 'Voice'}</span>
          </Button>
          <Button variant="secondary" disabled={isProcessing} onClick={() => onSendMessage("Suggest three creative project ideas for me to build.", [])} bg={secondaryButtonBg} textColor={secondaryButtonText} borderColor={secondaryButtonBorder} shadowColor={secondaryButtonShadow}>
            <Lightbulb className="w-4 h-4" />
            <span className="ml-2 hidden sm:inline">Suggest</span>
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" disabled={isProcessing} onClick={() => handleSuggestionClick("Please summarize the key points from this document.", true)} bg={secondaryButtonBg} textColor={secondaryButtonText} borderColor={secondaryButtonBorder} shadowColor={secondaryButtonShadow}>
            <FileText className="w-4 h-4" />
            <span className="ml-2 hidden sm:inline">Analyze Document</span>
          </Button>
          <Button variant="outline" disabled={isProcessing} onClick={() => handleSuggestionClick("Generate an image of: ", false)} bg={secondaryButtonBg} textColor={secondaryButtonText} borderColor={secondaryButtonBorder} shadowColor={secondaryButtonShadow}>
            <ImageIcon className="w-4 h-4" />
            <span className="ml-2 hidden sm:inline">Generate Image</span>
          </Button>
          <Button variant="outline" disabled={isProcessing} onClick={() => handleSuggestionClick("Explain this code and suggest improvements:\n```python\n\n```", false)} bg={secondaryButtonBg} textColor={secondaryButtonText} borderColor={secondaryButtonBorder} shadowColor={secondaryButtonShadow}>
            <Code className="w-4 h-4" />
            <span className="ml-2 hidden sm:inline">Code Help</span>
          </Button>
          <Button variant="outline" disabled={isProcessing} onClick={() => handleSuggestionClick("Please provide a summary and a full transcription of this video.", true)} bg={secondaryButtonBg} textColor={secondaryButtonText} borderColor={secondaryButtonBorder} shadowColor={secondaryButtonShadow}>
            <Video className="w-4 h-4" />
            <span className="ml-2 hidden sm:inline">Transcribe Video</span>
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default InputArea;