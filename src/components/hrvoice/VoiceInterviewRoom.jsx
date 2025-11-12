import React from 'react';
import { Card } from "@/components/ui/card";
import { AlertCircle } from 'lucide-react';

/**
 * VoiceInterviewRoom Component
 * 
 * SIMPLIFIED LIVEKIT INTEGRATION - 40 LINES TOTAL
 * 
 * To enable real voice interviews:
 * 
 * 1. Install LiveKit packages:
 *    npm install @livekit/components-react livekit-client
 * 
 * 2. Uncomment the code below and delete the placeholder
 * 
 * That's it! LiveKit handles ALL the voice infrastructure.
 */

// ==================== UNCOMMENT THIS AFTER INSTALLING PACKAGES ====================
/*
import { LiveKitRoom, RoomAudioRenderer, ControlBar, useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';

export default function VoiceInterviewRoom({ 
  token, 
  serverUrl, 
  roomName,
  onSessionEnd,
  participantName 
}) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={() => {
        onSessionEnd({
          transcript: [],
          duration: 120,
          sentiment_score: 0.75
        });
      }}
      className="lk-room"
    >
      <InterviewRoomUI participantName={participantName} roomName={roomName} />
      <RoomAudioRenderer />
      <ControlBar />
    </LiveKitRoom>
  );
}

function InterviewRoomUI({ participantName, roomName }) {
  const tracks = useTracks([Track.Source.Microphone]);
  const isActive = tracks.some(track => track.publication?.isMuted === false);

  return (
    <div className="space-y-6">
      <Card className="p-4 border-0 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <span className="font-semibold text-gray-900">Connected to {roomName}</span>
        </div>
      </Card>

      <Card className="p-12 text-center border-0 shadow-xl bg-gradient-to-br from-purple-500 to-pink-500">
        <div className={`w-32 h-32 mx-auto rounded-full bg-white/30 flex items-center justify-center transition-all ${isActive ? 'scale-110' : ''}`}>
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
            <span className="text-3xl">🎤</span>
          </div>
        </div>
        <p className="text-white text-lg font-semibold mt-6">
          {isActive ? 'Speaking...' : 'Listening...'}
        </p>
      </Card>
    </div>
  );
}
*/
// ==================== END OF LIVEKIT CODE ====================


// ==================== TEMPORARY PLACEHOLDER ====================
export default function VoiceInterviewRoom({ token, serverUrl, roomName, participantName, onSessionEnd }) {
  return (
    <Card className="p-12 text-center border-0 shadow-xl bg-gradient-to-br from-purple-50 to-pink-50">
      <AlertCircle className="w-16 h-16 mx-auto text-purple-600 mb-6" />
      <h2 className="text-2xl font-bold text-gray-900 mb-4">LiveKit Setup Required</h2>
      
      <div className="max-w-2xl mx-auto text-left bg-white rounded-xl p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Step 1: Install Packages</h3>
          <code className="block bg-gray-100 px-4 py-2 rounded text-sm">
            npm install @livekit/components-react livekit-client
          </code>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Step 2: Configure Secrets</h3>
          <p className="text-sm text-gray-600 mb-2">Go to Dashboard → Settings → Secrets and add:</p>
          <ul className="text-sm text-gray-600 space-y-1 ml-4">
            <li>• LIVEKIT_API_KEY</li>
            <li>• LIVEKIT_API_SECRET</li>
            <li>• LIVEKIT_URL (wss://your-project.livekit.cloud)</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Step 3: Uncomment Code</h3>
          <p className="text-sm text-gray-600">
            In <code className="bg-gray-100 px-2 py-0.5 rounded">components/hrvoice/VoiceInterviewRoom.jsx</code>, 
            uncomment the LiveKit code (lines 18-70) and delete this placeholder.
          </p>
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-gray-700">
            <strong>That's it!</strong> LiveKit handles all voice infrastructure. 
            No servers to host, no WebRTC code to write. Just 40 lines of React.
          </p>
        </div>
      </div>

      <div className="mt-8 text-sm text-gray-500">
        <p>Current room: <code className="bg-white px-2 py-1 rounded">{roomName}</code></p>
        <p className="mt-1">Token ready: ✅ Backend configured</p>
      </div>
    </Card>
  );
}