import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/hooks/use-theme';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const { actualTheme } = useTheme();
  
  const letters = ['C', 'E', 'R', 'E', 'B', 'R', 'A'];
  const totalDuration = 4500; // Animation duration
  const fadeOutDuration = 1200; // Fade out duration
  
  // Generate consistent random start positions for each letter
  const [letterData] = useState(() => 
    letters.map((_, index) => ({
      startX: (Math.random() - 0.5) * 1200,
      startY: (Math.random() - 0.5) * 800,
      startRotation: (Math.random() - 0.5) * 720,
      startScale: 0.1 + Math.random() * 0.3,
      // Add some organic curves to the path
      midX: (Math.random() - 0.5) * 400,
      midY: (Math.random() - 0.5) * 300,
      // Final position is based on letter index for proper spacing
      finalX: index * -8,
      finalY: 0,
      // Pixelation effect data
      pixelIntensity: Math.random() * 0.8 + 0.2, // Random pixelation per letter
      glitchOffset: Math.random() * 20 - 10,
    }))
  );
  
  useEffect(() => {
    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }
      
      const elapsed = currentTime - startTimeRef.current;
      const newProgress = Math.min(elapsed / totalDuration, 1);
      
      setProgress(newProgress);
      
      if (newProgress >= 1 && !fadeOut) {
        // Start fade out after animation completes
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(onComplete, fadeOutDuration);
        }, 800); // Brief pause before fading
      }
      
      if (newProgress < 1 || fadeOut) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [onComplete, fadeOut]);

  // Smooth easing function for more organic movement
  const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);
  const easeInOutCubic = (t: number): number => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const getLetterStyle = (index: number) => {
    const baseClasses = "inline-block font-bold text-7xl md:text-8xl select-none";
    
    const colors = actualTheme === 'dark' 
      ? ['text-blue-400', 'text-purple-400', 'text-cyan-400', 'text-indigo-400', 'text-violet-400', 'text-blue-300', 'text-purple-300']
      : ['text-blue-600', 'text-purple-600', 'text-cyan-600', 'text-indigo-600', 'text-violet-600', 'text-blue-500', 'text-purple-500'];
    
    const data = letterData[index];
    
    // Create smooth curved path using bezier-like interpolation
    const getPosition = (t: number) => {
      // Use different easing for different aspects
      const positionEase = easeOutQuart(t);
      const rotationEase = easeInOutCubic(t);
      const scaleEase = easeInOutCubic(Math.min(t * 1.5, 1));
      
      // Smooth curve from start -> mid -> final
      let x, y;
      if (t < 0.6) {
        // First part of journey: start to mid with some curve
        const localT = t / 0.6;
        const easedT = easeOutQuart(localT);
        x = data.startX * (1 - easedT) + data.midX * easedT;
        y = data.startY * (1 - easedT) + data.midY * easedT;
        
        // Add some oscillation for more organic feel
        x += Math.sin(t * Math.PI * 3 + index) * (1 - easedT) * 50;
        y += Math.cos(t * Math.PI * 2.5 + index) * (1 - easedT) * 30;
      } else {
        // Second part: mid to final position
        const localT = (t - 0.6) / 0.4;
        const easedT = easeInOutCubic(localT);
        x = data.midX * (1 - easedT) + data.finalX * easedT;
        y = data.midY * (1 - easedT) + data.finalY * easedT;
      }
      
      const rotation = data.startRotation * (1 - rotationEase);
      const scale = data.startScale * (1 - scaleEase) + 1 * scaleEase;
      
      return { x, y, rotation, scale };
    };
    
    const pos = getPosition(progress);
    
    // Pixelation effect - starts high and decreases
    const pixelationProgress = Math.min(progress * 1.8, 1);
    const pixelSize = data.pixelIntensity * (1 - easeInOutCubic(pixelationProgress)) * 8;
    
    // Opacity fade in
    let opacity = Math.min(progress * 2.5, 1);
    
    // Fade out effect
    if (fadeOut) {
      opacity *= Math.max(0, 1 - (Date.now() - (startTimeRef.current! + totalDuration + 800)) / fadeOutDuration);
    }
    
    // Glow effect starts after 80% completion
    const glowProgress = Math.max(0, (progress - 0.8) / 0.2);
    const glowIntensity = glowProgress;
    
    // Add glitch effect during pixelation phase
    const glitchX = progress < 0.4 ? Math.sin(Date.now() * 0.01 + index) * data.glitchOffset * (1 - progress * 2.5) : 0;
    const glitchY = progress < 0.4 ? Math.cos(Date.now() * 0.015 + index) * data.glitchOffset * 0.5 * (1 - progress * 2.5) : 0;
    
    const transformStyle = `translate(${pos.x + glitchX}px, ${pos.y + glitchY}px) rotate(${pos.rotation}deg) scale(${pos.scale})`;
    
    // Enhanced text shadow for pixelated/enchanted look
    let textShadow = '';
    if (pixelSize > 0.5) {
      // Pixelated/blocky shadow during early phase
      textShadow = `
        ${pixelSize}px 0 currentColor, 
        -${pixelSize}px 0 currentColor, 
        0 ${pixelSize}px currentColor, 
        0 -${pixelSize}px currentColor,
        ${pixelSize}px ${pixelSize}px currentColor, 
        -${pixelSize}px -${pixelSize}px currentColor,
        0 0 ${pixelSize * 2}px currentColor
      `;
    } else if (glowIntensity > 0) {
      // Smooth glow effect
      textShadow = `0 0 ${10 + glowIntensity * 20}px currentColor, 0 0 ${20 + glowIntensity * 40}px currentColor`;
    } else if (progress > 0.7) {
      textShadow = `0 0 5px currentColor`;
    }

    // CSS filter for pixelation effect
    const pixelFilter = pixelSize > 0.1 
      ? `blur(${pixelSize * 0.3}px) contrast(${1 + pixelSize * 0.2}) saturate(${1 + pixelSize * 0.5})`
      : glowIntensity > 0 
        ? `brightness(${1 + glowIntensity * 0.3}) saturate(${1 + glowIntensity * 0.2})`
        : 'none';

    return {
      className: `${baseClasses} ${colors[index]} ${glowIntensity > 0.5 ? 'animate-pulse' : ''}`,
      style: {
        transform: transformStyle,
        opacity: opacity,
        textShadow: textShadow,
        filter: pixelFilter,
        transformOrigin: 'center center',
        transition: 'none',
        // Add image-rendering for more pixelated look during early phase
        imageRendering: pixelSize > 1 ? 'pixelated' as any : 'auto',
        WebkitFontSmoothing: pixelSize > 1 ? 'none' as any : 'antialiased',
      }
    };
  };

  // Get current animation phase for loading text
  const getAnimationPhase = () => {
    if (progress < 0.15) return 'Materializing quantum glyphs...';
    if (progress < 0.3) return 'Decoding enchanted runes...';
    if (progress < 0.5) return 'Crystallizing neural matrix...';
    if (progress < 0.7) return 'Assembling consciousness...';
    if (progress < 0.9) return 'Synchronizing intelligence...';
    return 'Cerebra AI activated!';
  };

  // Much darker background gradient for dark mode
  const containerBg = actualTheme === 'dark'
    ? 'bg-gradient-to-br from-[#000208] via-[#050011] to-[#000510]'
    : 'bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50';

  // Calculate overall opacity for fade out
  const overallOpacity = fadeOut 
    ? Math.max(0, 1 - (Date.now() - (startTimeRef.current! + totalDuration + 800)) / fadeOutDuration)
    : 1;

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${containerBg} transition-all duration-1000`}
      style={{ opacity: overallOpacity }}
    >
      {/* Enhanced background particles effect */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 80 }).map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full opacity-5 animate-pulse ${
              actualTheme === 'dark' ? 'bg-white' : 'bg-blue-400'
            }`}
            style={{
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${4 + Math.random() * 6}s`
            }}
          />
        ))}
      </div>

      {/* Enhanced fluid background shapes */}
      <div className="absolute inset-0">
        <div className={`absolute top-1/5 left-1/5 w-[500px] h-[500px] ${actualTheme === 'dark' ? 'bg-blue-500/3' : 'bg-blue-300/20'} rounded-full blur-3xl animate-pulse`} />
        <div className={`absolute bottom-1/5 right-1/5 w-[500px] h-[500px] ${actualTheme === 'dark' ? 'bg-purple-500/3' : 'bg-purple-300/20'} rounded-full blur-3xl animate-pulse`} style={{ animationDelay: '1s' }} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] ${actualTheme === 'dark' ? 'bg-cyan-500/2' : 'bg-cyan-300/15'} rounded-full blur-3xl animate-pulse`} style={{ animationDelay: '2s' }} />
      </div>

      {/* Main content container with proper spacing */}
      <div className="flex flex-col items-center justify-center space-y-16 z-10">
        {/* Letter container */}
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-1">
            {letters.map((letter, index) => {
              const letterStyle = getLetterStyle(index);
              return (
                <span
                  key={index}
                  className={letterStyle.className}
                  style={letterStyle.style}
                >
                  {letter}
                </span>
              );
            })}
          </div>
        </div>

        {/* Loading progress indicator - now properly spaced */}
        <div className="w-full max-w-sm px-4">
          <div className="flex flex-col items-center space-y-4">
            {/* Loading text */}
            <p className={`text-sm font-medium ${actualTheme === 'dark' ? 'text-white/60' : 'text-black/70'} animate-pulse text-center min-h-[20px]`}>
              {getAnimationPhase()}
            </p>
            {/* Enhanced progress bar */}
            <div className={`w-full h-2 ${actualTheme === 'dark' ? 'bg-white/5' : 'bg-black/10'} rounded-full overflow-hidden backdrop-blur-md border ${actualTheme === 'dark' ? 'border-white/10' : 'border-black/10'}`}>
              <div 
                className={`h-full bg-gradient-to-r rounded-full transition-all duration-100 ease-out ${
                  actualTheme === 'dark' 
                    ? 'from-blue-400 via-purple-400 to-cyan-400' 
                    : 'from-blue-500 via-purple-500 to-cyan-500'
                }`}
                style={{
                  width: `${progress * 100}%`,
                  boxShadow: progress > 0.8 ? `0 0 10px currentColor` : 'none'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;