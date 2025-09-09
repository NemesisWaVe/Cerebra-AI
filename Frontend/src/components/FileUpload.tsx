import { useState, useRef, DragEvent } from "react";
import { Upload, File, Image as ImageIcon, Video, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadedFile {
  file: File;
  preview?: string;
  type: 'image' | 'video' | 'document' | 'audio' | 'other';
}

interface FileUploadProps {
  onFileSelect: (files: UploadedFile[]) => void;
  uploadedFiles: UploadedFile[];
  onRemoveFile: (index: number) => void;
}

const FileUpload = ({ onFileSelect, uploadedFiles, onRemoveFile }: FileUploadProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileType = (file: File): UploadedFile['type'] => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.includes('pdf') || file.type.includes('text') || file.type.includes('document')) {
      return 'document';
    }
    return 'other';
  };

  const getFileIcon = (type: UploadedFile['type']) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-5 h-5 text-green-400" />;
      case 'video':
        return <Video className="w-5 h-5 text-purple-400" />;
      case 'document':
        return <FileText className="w-5 h-5 text-blue-400" />;
      default:
        return <File className="w-5 h-5 text-gray-400" />;
    }
  };

  const processFiles = async (fileList: FileList) => {
    const files = Array.from(fileList);
    const processedFiles: UploadedFile[] = [];

    for (const file of files) {
      const fileType = getFileType(file);
      let preview: string | undefined;

      if (fileType === 'image') {
        preview = URL.createObjectURL(file);
      }

      processedFiles.push({
        file,
        preview,
        type: fileType
      });
    }

    onFileSelect(processedFiles);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  return (
    <div className="space-y-3">
      {/* File Upload Zone */}
      <div
        className={`upload-zone cursor-pointer transition-all duration-300 ${
          isDragOver ? 'dragover' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleFileSelect}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx"
          onChange={handleFileChange}
        />
        
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <Upload className="w-8 h-8 text-primary mb-3" />
          <div className="text-sm font-medium text-foreground mb-1">
            Drop files here or click to browse
          </div>
          <div className="text-xs text-muted-foreground">
            PDF, TXT, MP4, MP3, Images supported
          </div>
        </div>
      </div>

      {/* Uploaded Files Preview */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((uploadedFile, index) => (
            <div key={index} className="glass-subtle p-3 rounded-lg animate-slide-up">
              <div className="flex items-center gap-3">
                {uploadedFile.preview ? (
                  <img
                    src={uploadedFile.preview}
                    alt="Preview"
                    className="w-10 h-10 object-cover rounded-md"
                  />
                ) : (
                  <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                    {getFileIcon(uploadedFile.type)}
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {uploadedFile.file.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {uploadedFile.type.toUpperCase()} • {(uploadedFile.file.size / 1024 / 1024).toFixed(1)} MB
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(index);
                  }}
                  className="h-8 w-8 p-0 hover:bg-destructive/20"
                >
                  <X className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;