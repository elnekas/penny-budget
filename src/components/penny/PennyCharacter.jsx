import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { cn } from "@/lib/utils";

// The fallback sprite strip (6 frames horizontal) provided by user
const MEDITATING_SPRITE_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6931f1f27b4b0555404e75de/8d4a23feb_MeditatingGolem.png";

export default function PennyCharacter({ 
  onClick, 
  animation = 'meditating', 
  size = 40,
  className,
  isThinking = false,
  hasError = false,
  isSuccess = false
}) {
  const { data: skins } = useQuery({
    queryKey: ['pennySkins'],
    queryFn: () => base44.entities.PennySkin.list(),
    staleTime: 60000
  });
  const activeSkin = skins?.find(s => s.is_active);

  let currentState = 'meditating';
  if (hasError) currentState = 'failure';
  else if (isSuccess) currentState = 'success';
  else if (isThinking) currentState = 'working';
  else if (animation === 'thinking') currentState = 'working';
  else if (animation === 'idle' || animation === 'meditating') currentState = 'meditating';
  else currentState = animation;

  const getSkinUrl = () => {
    if (!activeSkin) return null;
    switch (currentState) {
      case 'meditating': return activeSkin.meditating_url;
      case 'waking_up': return activeSkin.waking_up_url || activeSkin.working_url;
      case 'working': return activeSkin.working_url || activeSkin.meditating_url;
      case 'success': return activeSkin.success_url || activeSkin.working_url;
      case 'failure': return activeSkin.failure_url || activeSkin.meditating_url;
      default: return activeSkin.meditating_url;
    }
  };

  const skinUrl = getSkinUrl();

  // Sprite fallback logic
  const [frame, setFrame] = useState(0);
  const FRAMES = 6;
  const FRAME_WIDTH = 127;
  const FRAME_DURATION = 200;

  useEffect(() => {
    if (skinUrl) return; // Don't run sprite animation if using skin
    const interval = setInterval(() => {
      setFrame(prev => (prev + 1) % FRAMES);
    }, isThinking ? 100 : FRAME_DURATION);
    return () => clearInterval(interval);
  }, [isThinking, skinUrl]);

  const scale = size / FRAME_WIDTH;

  return (
    <div 
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-transform hover:scale-105 active:scale-95 relative",
        className
      )}
      style={{
        width: size,
        height: size,
      }}
    >
      {skinUrl ? (
        <img 
          src={skinUrl} 
          alt="Penny" 
          className="w-full h-full object-contain pointer-events-none select-none drop-shadow-xl"
        />
      ) : (
        <div className="relative w-full h-full overflow-hidden rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-200">
             {/* Using a simple fallback emoji/icon if the sprite URL is broken or for cleaner default look in small sizes, 
                 but implementing the sprite logic as requested for the character feel */}
             <div
               className="absolute top-1/2 left-1/2"
               style={{
                 width: FRAME_WIDTH,
                 height: FRAME_WIDTH,
                 backgroundImage: `url(${MEDITATING_SPRITE_URL})`,
                 backgroundRepeat: 'no-repeat',
                 backgroundSize: `${FRAMES * FRAME_WIDTH}px auto`,
                 backgroundPosition: `-${frame * FRAME_WIDTH}px 0`,
                 transform: `translate(-50%, -50%) scale(${scale})`, // Center and scale
                 imageRendering: 'pixelated'
               }}
             />
        </div>
      )}
      
      {!skinUrl && isThinking && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-400 rounded-full animate-ping" />
      )}
      {!skinUrl && hasError && (
        <div className="absolute inset-0 bg-red-500/20 animate-pulse rounded-full" />
      )}
    </div>
  );
}