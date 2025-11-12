import React, { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Mic, MicOff } from 'lucide-react';

/**
 * IMPORTANT: Before using this component, you need to set up LiveKit Agents
 * 
 * This is a PLACEHOLDER - to enable real voice interviews you need:
 * 
 * 1. Install LiveKit React components:
 *    npm install @livekit/components-react livekit-client @livekit/components-styles
 * 
 * 2. Set up a LiveKit Agent backend to handle the AI conversation
 *    See: https://docs.livekit.io/agents/start/voice-ai/
 * 
 * 3. The agent handles:
 *    - Speech-to-Text (STT)
 *    - AI conversation with your interview questions
 *    - Text-to-Speech (TTS) 
 *    - Sentiment analysis
 * 
 * For now, this is a simple placeholder UI.
 */

export default function VoiceInterviewRoom({ 
  token, 
  serverUrl, 
  roomName,
  participantName,
  onSessionEnd 
}) {
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [agentState, setAgentState] = useState('initializing'); // initializing, listening, thinking, speaking
  const [transcript, setTranscript] = useState([]);

  useEffect(() => {
    // Simulate connection
    const timer = setTimeout(() => {
      setIsConnecting(false);
      setAgentState('listening');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleEndSession = () => {
    onSessionEnd({
      transcript: transcript,
      duration: 120,
      sentiment_score: 0.75
    });
  };

  if (error) {
    return (
      <Card className="p-12 text-center border-0 shadow-xl bg-gradient-to-br from-red-50 to-red-100">
        <AlertCircle className="w-16 h-16 mx-auto text-red-600 mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Connection Error</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Reload Page
        </Button>
      </Card>
    );
  }

  if (isConnecting) {
    return (
      <Card className="p-12 text-center border-0 shadow-xl bg-gradient-to-br from-purple-50 to-pink-50">
        <Loader2 className="w-16 h-16 mx-auto text-purple-600 mb-6 animate-spin" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Connecting...</h2>
        <p className="text-gray-600">Setting up your interview session</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="p-4 border-0 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <span className="font-semibold text-gray-900">Connected to {roomName}</span>
        </div>
      </Card>

      {/* Main Visualizer */}
      <Card className="p-12 text-center border-0 shadow-xl bg-gradient-to-br from-purple-500 to-pink-500 relative overflow-hidden">
        {/* Agent State Background */}
        <div className={`absolute inset-0 transition-opacity duration-500 ${
          agentState === 'speaking' ? 'opacity-30' : 'opacity-0'
        }`}>
          <div className="w-full h-full bg-white/20 animate-pulse" />
        </div>

        <div className="relative">
          {/* Microphone Circle */}
          <div className={`w-32 h-32 mx-auto rounded-full bg-white/30 flex items-center justify-center transition-all duration-300 ${
            agentState === 'listening' ? 'scale-110 shadow-2xl' : 'scale-100'
          }`}>
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
              {micEnabled ? (
                <Mic className="w-8 h-8 text-purple-600" />
              ) : (
                <MicOff className="w-8 h-8 text-gray-400" />
              )}
            </div>
          </div>

          {/* Agent State Display */}
          <div className="mt-6 space-y-2">
            <p className="text-white text-lg font-semibold">
              {agentState === 'initializing' && 'Initializing AI...'}
              {agentState === 'listening' && 'I\'m listening...'}
              {agentState === 'thinking' && 'Thinking...'}
              {agentState === 'speaking' && 'AI is speaking...'}
            </p>
            {agentState === 'listening' && (
              <p className="text-white/80 text-sm">Speak freely - I'm here to listen</p>
            )}
          </div>

          {/* Visual Bars (simplified) */}
          {agentState === 'listening' && micEnabled && (
            <div className="flex items-end justify-center gap-1 mt-6 h-16">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 bg-white/60 rounded-full animate-pulse"
                  style={{
                    height: `${20 + Math.random() * 40}px`,
                    animationDelay: `${i * 100}ms`,
                    animationDuration: '1s'
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Controls */}
      <Card className="p-6 border-0 shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-3">
            <Button
              variant={micEnabled ? "default" : "outline"}
              size="lg"
              onClick={() => setMicEnabled(!micEnabled)}
              className={micEnabled ? "bg-purple-600 hover:bg-purple-700" : ""}
            >
              {micEnabled ? (
                <>
                  <Mic className="w-5 h-5 mr-2" />
                  Mute
                </>
              ) : (
                <>
                  <MicOff className="w-5 h-5 mr-2" />
                  Unmute
                </>
              )}
            </Button>
          </div>

          <Button
            variant="destructive"
            size="lg"
            onClick={handleEndSession}
          >
            End Interview
          </Button>
        </div>
      </Card>

      {/* Transcript Preview (if available) */}
      {transcript.length > 0 && (
        <Card className="p-6 border-0 shadow-lg">
          <h3 className="font-semibold text-gray-900 mb-3">Conversation</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {transcript.map((item, idx) => (
              <div key={idx} className="text-sm">
                <span className="font-semibold text-gray-700">{item.speaker}:</span>
                <span className="text-gray-600 ml-2">{item.text}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Setup Notice */}
      <Card className="p-6 border-0 bg-blue-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900 mb-1">Demo Mode Active</p>
            <p className="text-sm text-blue-700 mb-3">
              This is a placeholder UI. To enable real AI voice interviews, you need to:
            </p>
            <ol className="text-sm text-blue-700 space-y-1 ml-4 list-decimal">
              <li>Install LiveKit React components</li>
              <li>Set up a LiveKit Agent backend (Python or Node.js)</li>
              <li>Configure the agent with your interview questions</li>
            </ol>
            <a 
              href="https://docs.livekit.io/agents/start/voice-ai/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
            >
              View LiveKit Agents Documentation →
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}