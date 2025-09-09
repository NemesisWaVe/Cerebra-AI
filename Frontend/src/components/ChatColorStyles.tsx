// src/components/ChatColorStyles.tsx

import { useTheme } from "@/hooks/use-theme";

const ChatColorStyles = () => {
  const { actualTheme } = useTheme();

  return (
    <style jsx global>{`
      /* Enhanced AI Message Prose Styling */
      .ai-message-content.prose {
        color: ${actualTheme === 'light' ? '#1e293b' : '#e2e8f0'} !important;
        line-height: 1.6;
        font-size: 14px;
      }
      
      .ai-message-content.prose p {
        color: ${actualTheme === 'light' ? '#1e293b' : '#e2e8f0'} !important;
        margin: 8px 0;
      }
      
      .ai-message-content.prose h1,
      .ai-message-content.prose h2,
      .ai-message-content.prose h3,
      .ai-message-content.prose h4,
      .ai-message-content.prose h5,
      .ai-message-content.prose h6 {
        color: ${actualTheme === 'light' ? '#0f172a' : '#f1f5f9'} !important;
        font-weight: 600;
        margin: 12px 0 8px 0;
      }
      
      .ai-message-content.prose strong,
      .ai-message-content.prose b {
        color: ${actualTheme === 'light' ? '#0f172a' : '#f8fafc'} !important;
        font-weight: 600;
      }
      
      .ai-message-content.prose a {
        color: ${actualTheme === 'light' ? '#5f0ed8' : '#60a5fa'} !important;
        text-decoration: underline;
        text-decoration-color: currentColor;
        text-underline-offset: 2px;
      }
      
      .ai-message-content.prose a:hover {
        color: ${actualTheme === 'light' ? '#4c0db4' : '#93c5fd'} !important;
      }
      
      .ai-message-content.prose code {
        color: ${actualTheme === 'light' ? '#5f0ed8' : '#fed7aa'} !important;
        background: ${actualTheme === 'light' ? 'rgba(255, 246, 199, 0.8)' : '#292524'};
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 13px;
        border: 1px solid ${actualTheme === 'light' ? 'rgba(95, 14, 216, 0.3)' : '#44403c'};
      }
      
      .ai-message-content.prose pre {
        background: ${actualTheme === 'light' ? 'rgba(255, 255, 255, 0.9)' : '#1e293b'};
        border: 1px solid ${actualTheme === 'light' ? 'rgba(95, 14, 216, 0.2)' : '#334155'};
        border-radius: 8px;
        padding: 16px;
        overflow-x: auto;
        margin: 12px 0;
      }
      
      .ai-message-content.prose pre code {
        color: ${actualTheme === 'light' ? '#334155' : '#e2e8f0'} !important;
        background: transparent;
        border: none;
        padding: 0;
      }
      
      .ai-message-content.prose ul,
      .ai-message-content.prose ol {
        margin: 8px 0;
        padding-left: 20px;
      }
      
      .ai-message-content.prose ul li,
      .ai-message-content.prose ol li {
        color: ${actualTheme === 'light' ? '#1e293b' : '#e2e8f0'} !important;
        margin: 4px 0;
        line-height: 1.5;
      }
      
      .ai-message-content.prose ul li::marker {
        color: ${actualTheme === 'light' ? '#5f0ed8' : '#8b5cf6'} !important;
      }
      
      .ai-message-content.prose ol li::marker {
        color: ${actualTheme === 'light' ? '#5f0ed8' : '#8b5cf6'} !important;
        font-weight: 500;
      }
      
      .ai-message-content.prose blockquote {
        color: ${actualTheme === 'light' ? '#475569' : '#cbd5e1'} !important;
        border-left: 4px solid ${actualTheme === 'light' ? '#5f0ed8' : '#7c3aed'};
        padding-left: 16px;
        margin: 12px 0;
        font-style: italic;
      }
      
      /* --- UPDATED TABLE STYLES --- */
      .ai-message-content.prose table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        margin: 16px 0;
        border: 2px solid ${actualTheme === 'light' ? 'hsl(var(--primary))' : 'hsl(var(--border))'};
        border-radius: 8px;
        box-shadow: ${actualTheme === 'light' ? '3px 3px 0px hsl(var(--accent))' : 'none'};
        overflow: hidden;
      }
      
      .ai-message-content.prose th,
      .ai-message-content.prose td {
        padding: 10px 14px;
        text-align: left;
        border-bottom: 1px solid ${actualTheme === 'light' ? 'rgba(95, 14, 216, 0.2)' : 'hsl(var(--border))'};
      }
      
      .ai-message-content.prose th {
        background: ${actualTheme === 'light' ? 'rgba(255, 246, 199, 0.7)' : 'hsl(var(--secondary))'};
        font-weight: 600;
        color: ${actualTheme === 'light' ? '#1f2937' : '#f9fafb'} !important;
        border-bottom-width: 2px;
        border-bottom-color: ${actualTheme === 'light' ? 'hsl(var(--primary))' : 'hsl(var(--border))'};
      }

      .ai-message-content.prose tr:last-child td {
        border-bottom: 0;
      }

      .ai-message-content.prose tbody tr:nth-child(even) {
         background: ${actualTheme === 'light' ? 'rgba(255, 246, 199, 0.4)' : 'rgba(255, 255, 255, 0.03)'};
      }
      
      .ai-message-content.prose td {
        color: ${actualTheme === 'light' ? '#374151' : '#d1d5db'} !important;
      }
      /* --- END UPDATED TABLE STYLES --- */

      /* Animation for fade-in effect */
      @keyframes fade-in {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .animate-fade-in {
        animation: fade-in 0.3s ease-out;
      }

      /* Custom Scrollbar for Chat */
      .chat-scroll::-webkit-scrollbar {
        width: 8px;
      }
      
      .chat-scroll::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .chat-scroll::-webkit-scrollbar-thumb {
        background: ${actualTheme === 'light' ? 'rgba(95, 14, 216, 0.4)' : '#4b5563'};
        border-radius: 4px;
      }
      
      .chat-scroll::-webkit-scrollbar-thumb:hover {
        background: ${actualTheme === 'light' ? 'rgba(95, 14, 216, 0.6)' : '#6b7280'};
      }
      
      /* Smooth scroll behavior */
      .chat-scroll {
        scroll-behavior: smooth;
      }

      /* Enhanced bubble styling with cream background */
      .pixel-bubble {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(8px);
      }

      /* Force cream yellow chat area background */
      ${actualTheme === 'light' ? `
      .glass-card {
        background: #fff6c7 !important;
        border-color: #5f0ed8 !important;
      }
      
      /* AI message bubbles - light gray on cream */
      .pixel-bubble[style*="secondary"] {
        background: rgba(245, 245, 245, 0.95) !important;
        border-color: rgba(95, 14, 216, 0.2) !important;
      }
      
      /* User message bubbles - purple on cream */
      .pixel-bubble[style*="primary"] {
        background: #5f0ed8 !important;
        border-color: #5f0ed8 !important;
      }
      ` : ''}

      /* Header feature tags styling */
      .light .feature-tag {
        background: rgba(255, 246, 199, 0.9) !important;
        color: rgba(95, 14, 216, 0.9) !important;
        border: 1px solid rgba(95, 14, 216, 0.3) !important;
      }

      /* Status indicators */
      .light .status-indicator {
        background: rgba(255, 246, 199, 0.95) !important;
        border: 1px solid rgba(95, 14, 216, 0.2) !important;
      }

      /* Input area styling */
      .light .input-area {
        background: rgba(255, 255, 255, 0.95) !important;
        border: 1px solid rgba(95, 14, 216, 0.2) !important;
      }

      /* Button styling consistency */
      .light button[style*="secondary"] {
        background: rgba(255, 246, 199, 0.9) !important;
        border-color: rgba(95, 14, 216, 0.3) !important;
        color: rgba(95, 14, 216, 0.9) !important;
      }

      .light button[style*="primary"] {
        background: #5f0ed8 !important;
        border-color: #5f0ed8 !important;
        color: #ffffff !important;
      }
    `}</style>
  );
};

export default ChatColorStyles;