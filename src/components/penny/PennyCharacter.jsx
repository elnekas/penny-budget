import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { cn } from "@/lib/utils";

// Fallback placeholder logic


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

  const [internalState, setInternalState] = useState('meditating');

  useEffect(() => {
    if (hasError) {
      setInternalState('failure');
      return;
    }
    if (isSuccess) {
      setInternalState('success');
      return;
    }
    if (isThinking) {
      setInternalState('working');
      return;
    }

    // Handle transitions based on animation prop
    if (animation === 'working' && internalState === 'meditating') {
      setInternalState('waking_up');
      const timer = setTimeout(() => setInternalState('working'), 2500); // 2.5s transition
      return () => clearTimeout(timer);
    } 
    
    if (animation === 'thinking') {
      setInternalState('working');
    } else if (animation === 'idle' || animation === 'meditating') {
      setInternalState('meditating');
    } else {
      setInternalState(animation);
    }
  }, [animation, hasError, isSuccess, isThinking]);

  const getSkinUrl = () => {
    if (!activeSkin) return null;
    const state = internalState;
    switch (state) {
      case 'meditating': return activeSkin.meditating_url;
      case 'waking_up': return activeSkin.waking_up_url || activeSkin.working_url;
      case 'working': return activeSkin.working_url || activeSkin.meditating_url;
      case 'success': return activeSkin.success_url || activeSkin.working_url;
      case 'failure': return activeSkin.failure_url || activeSkin.meditating_url;
      default: return activeSkin.meditating_url;
    }
  };

  const skinUrl = getSkinUrl();



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
        <div className="relative w-full h-full overflow-hidden rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-200 flex items-center justify-center">
             <div className="w-3 h-3 bg-white/30 rounded-full animate-bounce" />
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