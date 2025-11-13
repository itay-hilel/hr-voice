import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function VoiceInterface({ 
  agentId, 
  onConversationStart, 
  onConversationEnd,
  onError 
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputVolume, setInputVolume] = useState(0);
  const conversationRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversationRef.current) {
        conversationRef.current.endSession().catch(console.error);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Update volume visualization
  const updateVolume = async () => {
    if (!conversationRef.current || !isConnected) return;

    try {
      const volume = await conversationRef.current.getInputVolume();
      setInputVolume(volume);
    } catch (error) {
      console.error('Error getting volume:', error);
    }

    animationFrameRef.current = requestAnimationFrame(updateVolume);
  };

  const startConversation = async () => {
    if (!window.Conversation) {
      onError?.('ElevenLabs SDK not loaded');
      return;
    }

    setIsLoading(true);

    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get conversation token from backend
      const tokenResponse = await fetch('/api/functions/getConversationToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get conversation token');
      }

      const { token } = await tokenResponse.json();

      // Start conversation with ElevenLabs
      const conversation = await window.Conversation.startSession({
        conversationToken: token,
        connectionType: 'webrtc',
        onConnect: () => {
          console.log('Connected to ElevenLabs');
          setIsConnected(true);
          setIsLoading(false);
          updateVolume();
        },
        onDisconnect: () => {
          console.log('Disconnected from ElevenLabs');
          setIsConnected(false);
          setIsSpeaking(false);
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
        },
        onModeChange: (mode) => {
          console.log('Mode changed:', mode);
          setIsSpeaking(mode.mode === 'speaking');
        },
        onError: (error) => {
          console.error('Conversation error:', error);
          onError?.(error.message || 'Conversation error');
          setIsLoading(false);
          setIsConnected(false);
        },
      });

      conversationRef.current = conversation;
      
      const conversationId = conversation.getId();
      onConversationStart?.(conversationId);

    } catch (error) {
      console.error('Failed to start conversation:', error);
      onError?.(error.message);
      setIsLoading(false);
      setIsConnected(false);
    }
  };

  const endConversation = async () => {
    if (!conversationRef.current) return;

    try {
      await conversationRef.current.endSession();
      conversationRef.current = null;
      setIsConnected(false);
      setIsSpeaking(false);
      onConversationEnd?.();
    } catch (error) {
      console.error('Error ending conversation:', error);
    }
  };

  const toggleMute = async () => {
    if (!conversationRef.current) return;

    try {
      await conversationRef.current.setMicMuted(!isMuted);
      setIsMuted(!isMuted);
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  // Calculate visual scale based on volume
  const volumeScale = 1 + inputVolume * 0.5;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Voice Visualizer */}
      <div className="relative">
        {/* Outer rings */}
        <div 
          className={cn(
            "absolute inset-0 rounded-full transition-all duration-300",
            isConnected && isSpeaking 
              ? "bg-gradient-to-br from-purple-400/30 to-pink-400/30 animate-pulse" 
              : "bg-gradient-to-br from-purple-200/20 to-pink-200/20"
          )}
          style={{
            transform: `scale(${isConnected ? volumeScale : 1})`,
            width: '240px',
            height: '240px',
            marginLeft: '-20px',
            marginTop: '-20px'
          }}
        />
        
        {/* Main microphone button */}
        <button
          onClick={isConnected ? endConversation : startConversation}
          disabled={isLoading}
          className={cn(
            "relative w-48 h-48 rounded-full transition-all duration-300 shadow-2xl",
            "flex items-center justify-center",
            isConnected 
              ? "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700" 
              : "bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-20 h-20 text-white animate-spin" />
          ) : isConnected ? (
            <div className="text-center">
              <Mic className={cn(
                "w-20 h-20 mx-auto text-white mb-2",
                isSpeaking && "animate-pulse"
              )} />
              <p className="text-white text-sm font-medium">Tap to End</p>
            </div>
          ) : (
            <div className="text-center">
              <Mic className="w-20 h-20 mx-auto text-white mb-2" />
              <p className="text-white text-sm font-medium">Tap to Start</p>
            </div>
          )}
        </button>

        {/* Status indicator */}
        {isConnected && (
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-white rounded-full shadow-lg">
            <p className="text-sm font-medium text-gray-700">
              {isSpeaking ? '🗣️ AI Speaking' : '👂 Listening'}
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      {isConnected && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={toggleMute}
            className="rounded-full w-14 h-14 p-0"
          >
            {isMuted ? (
              <MicOff className="w-6 h-6 text-red-500" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </Button>
        </div>
      )}

      {/* Instructions */}
      {!isConnected && !isLoading && (
        <p className="text-gray-600 text-center max-w-md">
          Tap the microphone to begin your voice interview with our AI.
          Make sure your microphone is enabled.
        </p>
      )}
    </div>
  );
}