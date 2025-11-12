import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, VolumeX, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { cn } from "@/lib/utils";

/**
 * VoiceInterviewRoom Component
 * 
 * This is a placeholder component for the LiveKit integration.
 * To make it fully functional, you need to:
 * 
 * 1. Install LiveKit React components:
 *    npm install @livekit/components-react livekit-client
 * 
 * 2. Import the necessary components:
 *    import { LiveKitRoom, useVoiceAssistant, BarVisualizer } from '@livekit/components-react';
 *    import '@livekit/components-styles';
 * 
 * 3. Replace this implementation with LiveKit's VoiceAssistant component
 */

export default function VoiceInterviewRoom({ 
  token, 
  serverUrl, 
  roomName,
  onSessionEnd,
  participantName 
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate connection
    const timer = setTimeout(() => {
      setIsConnected(true);
      simulateConversation();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const simulateConversation = () => {
    // This is a simulation - replace with real LiveKit integration
    const conversation = [
      { role: 'assistant', text: "Hello! I'm here to check in with you today. How are you feeling about work this week?" },
      { role: 'user', text: "I've been doing well overall, though things have been quite busy." },
      { role: 'assistant', text: "That's good to hear. Can you tell me more about what's been keeping you busy?" },
      { role: 'user', text: "We've been working on a major project deadline, so there's been a lot of collaboration." },
      { role: 'assistant', text: "How has the team collaboration been going?" },
      { role: 'user', text: "Pretty well actually. Communication has improved a lot recently." },
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (index < conversation.length) {
        setTranscript(prev => [...prev, conversation[index]]);
        setIsSpeaking(conversation[index].role === 'assistant');
        index++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          onSessionEnd({
            transcript: conversation,
            duration: 120,
            sentiment_score: 0.75
          });
        }, 2000);
      }
    }, 3000);
  };

  if (error) {
    return (
      <Card className="p-8 text-center border-red-200 bg-red-50">
        <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Connection Error</h3>
        <p className="text-gray-700 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card className="p-12 text-center border-0 shadow-xl bg-gradient-to-br from-purple-50 to-pink-50">
        <Loader2 className="w-16 h-16 mx-auto text-purple-600 mb-4 animate-spin" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Connecting to interview room...</h3>
        <p className="text-gray-600">Please wait while we set up your session</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className="p-4 border-0 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="font-semibold text-gray-900">Connected to {roomName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              className="hover:bg-white/50"
            >
              {isMuted ? <MicOff className="w-5 h-5 text-red-500" /> : <Mic className="w-5 h-5 text-gray-700" />}
            </Button>
          </div>
        </div>
      </Card>

      {/* Voice Visualizer */}
      <Card className="p-12 text-center border-0 shadow-xl bg-gradient-to-br from-purple-500 to-pink-500">
        <div className="relative">
          {/* Animated circles representing voice activity */}
          <div className={cn(
            "w-32 h-32 mx-auto rounded-full bg-white/20 flex items-center justify-center",
            "transition-all duration-300",
            isSpeaking && "scale-110"
          )}>
            <div className={cn(
              "w-24 h-24 rounded-full bg-white/30 flex items-center justify-center",
              "transition-all duration-300",
              isSpeaking && "scale-110"
            )}>
              <div className={cn(
                "w-16 h-16 rounded-full bg-white flex items-center justify-center",
                "transition-all duration-300",
                isSpeaking && "scale-110"
              )}>
                {isSpeaking ? (
                  <Volume2 className="w-8 h-8 text-purple-600" />
                ) : (
                  <Mic className="w-8 h-8 text-purple-600" />
                )}
              </div>
            </div>
          </div>
        </div>
        <p className="text-white text-lg font-semibold mt-6">
          {isSpeaking ? 'AI is speaking...' : 'Listening...'}
        </p>
      </Card>

      {/* Live Transcript */}
      <Card className="p-6 border-0 shadow-xl bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Live Transcript</h3>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {transcript.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                "p-3 rounded-xl",
                msg.role === 'assistant' 
                  ? "bg-purple-50 text-purple-900" 
                  : "bg-gray-50 text-gray-900"
              )}
            >
              <p className="text-xs font-semibold mb-1">
                {msg.role === 'assistant' ? 'AI Interviewer' : participantName}
              </p>
              <p className="text-sm">{msg.text}</p>
            </div>
          ))}
          {transcript.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              Conversation will appear here...
            </p>
          )}
        </div>
      </Card>

      {/* Instructions */}
      <Card className="p-4 border-0 bg-blue-50">
        <p className="text-sm text-blue-900">
          💡 <strong>Note:</strong> This is a demo interface. To enable real voice conversations, 
          LiveKit React components need to be installed (@livekit/components-react).
        </p>
      </Card>
    </div>
  );
}

/**
 * REAL IMPLEMENTATION WITH LIVEKIT (when package is installed):
 * 
 * import { LiveKitRoom, useVoiceAssistant, BarVisualizer } from '@livekit/components-react';
 * import '@livekit/components-styles';
 * 
 * export default function VoiceInterviewRoom({ token, serverUrl, roomName, onSessionEnd }) {
 *   return (
 *     <LiveKitRoom
 *       token={token}
 *       serverUrl={serverUrl}
 *       connect={true}
 *       audio={true}
 *       onDisconnected={onSessionEnd}
 *     >
 *       <VoiceAssistantUI />
 *     </LiveKitRoom>
 *   );
 * }
 * 
 * function VoiceAssistantUI() {
 *   const { state, audioTrack } = useVoiceAssistant();
 *   
 *   return (
 *     <div>
 *       <BarVisualizer state={state} barCount={5} trackRef={audioTrack} />
 *       // Your custom UI here
 *     </div>
 *   );
 * }
 */