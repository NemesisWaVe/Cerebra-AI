import { Brain, Sparkles, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Card } from 'pixel-retroui';
import { useTheme } from "@/hooks/use-theme";
import { useHealthCheck } from "@/hooks/useHealthCheck";

const CerebraHeader = () => {
  const { actualTheme } = useTheme();
  const isBackendOnline = useHealthCheck('http://127.0.0.1:8000/api/v1/health');

  const headerBorderColor = actualTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'hsl(var(--border))';
  const brainCardShadowColor = actualTheme === 'dark' ? 'hsl(var(--primary))' : 'hsl(var(--primary))';
  const brainCardBorderColor = actualTheme === 'dark' ? 'hsl(var(--border))' : 'hsl(var(--border))';
  const brainCardBgColor = actualTheme === 'dark' ? 'hsl(var(--card))' : 'hsl(var(--card))';
  const brainCardTextColor = actualTheme === 'dark' ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))';

  return (
    <header className="p-6" style={{ borderBottom: `1px solid ${headerBorderColor}` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Card
              className="p-3"
              bg={brainCardBgColor}
              textColor={brainCardTextColor}
              borderColor={brainCardBorderColor}
              shadowColor={brainCardShadowColor}
              shadowOffset={actualTheme === 'dark' ? 8 : 4}
            >
              <div className="relative">
                <Brain className="w-8 h-8 text-primary animate-pulse" />
              </div>
            </Card>
            <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-accent animate-bounce" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">
              CEREBRA AI
            </h1>
            <p className="text-sm text-muted-foreground">
              Intelligent Multi-Modal Assistant
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 glass-subtle px-4 py-2 rounded-full">
            <div className="relative">
              <div className={`w-2 h-2 rounded-full ${isBackendOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500 animate-pulse'}`}></div>
              {isBackendOnline && <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>}
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {isBackendOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-3 glass-subtle px-4 py-2 rounded-full">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-500" />
              <span className="text-xs text-muted-foreground">5 AI Tools</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {[
          { label: "Document Analysis", icon: "📄", color: "bg-blue-500/10 text-blue-400" },
          { label: "Image Generation", icon: "🎨", color: "bg-purple-500/10 text-purple-400" },
          { label: "Code Execution", icon: "💻", color: "bg-green-500/10 text-green-400" },
          { label: "Video Analysis", icon: "🎥", color: "bg-red-500/10 text-red-400" },
          { label: "AI Chat", icon: "🤖", color: "bg-cyan-500/10 text-cyan-400" }
        ].map((feature, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium glass-subtle transition-all duration-300 hover:scale-105`}
            style={{ 
              backgroundColor: actualTheme === 'light' ? `hsl(var(--secondary))` : feature.color.split(' ')[0], 
              color: actualTheme === 'light' ? `hsl(var(--secondary-foreground))` : feature.color.split(' ')[1],
            }}
          >
            <span>{feature.icon}</span>
            <span className="hidden sm:inline">{feature.label}</span>
          </div>
        ))}
      </div>
    </header>
  );
};

export default CerebraHeader;