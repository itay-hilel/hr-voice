import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, CheckCircle, Loader2 } from 'lucide-react';

export default function EmployeeJoin() {
  const urlParams = new URLSearchParams(window.location.search);
  const interviewId = urlParams.get('id');
  const sessionId = urlParams.get('session');

  const [conversationId, setConversationId] = useState(null);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewCompleted, setInterviewCompleted] = useState(false);

  // Fetch interview and session data via backend function
  const { data, isLoading, error } = useQuery({
    queryKey: ['interviewData', interviewId, sessionId],
    queryFn: async () => {
      const response = await base44.functions.invoke('getInterviewData', {
        interviewId,
        sessionId
      });
      return response.data;
    },
    enabled: !!interviewId && !!sessionId
  });

  const interview = data?.interview;
  const session = data?.session;

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async (updateData) => {
      const response = await base44.functions.invoke('updateSession', {
        sessionId,
        data: updateData
      });
      return response.data;
    }
  });

  // Analyze transcript mutation
  const analyzeTranscriptMutation = useMutation({
    mutationFn: async ({ conversationId }) => {
      const response = await base44.functions.invoke('getElevenLabsTranscript', {
        conversationId,
        sessionId
      });
      return response.data;
    },
    onSuccess: () => {
      setInterviewCompleted(true);
    }
  });

  // Load ElevenLabs SDK
  useEffect(() => {
    if (!interview?.agent_id) return;

    const script = document.createElement('script');
    script.src = 'https://elevenlabs.io/convai-widget/index.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [interview?.agent_id]);

  // Initialize ElevenLabs widget
  useEffect(() => {
    if (!interview?.agent_id || !window.ElevenLabs || !interviewStarted) return;

    const timer = setTimeout(() => {
      try {
        window.ElevenLabs.Convai.startSession({
          agentId: interview.agent_id,
          onConnect: () => {
            console.log('Connected to ElevenLabs');
          },
          onDisconnect: () => {
            console.log('Disconnected from ElevenLabs');
          },
          onMessage: (message) => {
            console.log('Message:', message);
          },
          onModeChange: (mode) => {
            console.log('Mode changed:', mode);
            if (mode.mode === 'speaking') {
              if (session?.session_status === 'Pending') {
                updateSessionMutation.mutate({
                  session_status: 'In Progress',
                  started_at: new Date().toISOString()
                });
              }
            }
          },
          onConversationIdChange: (id) => {
            console.log('Conversation ID:', id);
            setConversationId(id);
          }
        });
      } catch (error) {
        console.error('Failed to start ElevenLabs session:', error);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [interview?.agent_id, window.ElevenLabs, interviewStarted, session]);

  const handleStartInterview = () => {
    setInterviewStarted(true);
  };

  const handleEndInterview = async () => {
    if (conversationId) {
      await analyzeTranscriptMutation.mutateAsync({ conversationId });
    }
    
    if (window.ElevenLabs?.Convai) {
      window.ElevenLabs.Convai.endSession();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  if (error || !interview || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Invalid Link</h2>
          <p className="text-gray-600 mb-4">This interview link is not valid or has expired.</p>
          {error && (
            <div className="mt-4 p-3 bg-red-50 rounded text-left">
              <p className="text-xs text-red-600">Error: {error.message}</p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (interviewCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-6">
        <Card className="p-12 text-center max-w-2xl">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Thank You! 🎉</h1>
          <p className="text-xl text-gray-600 mb-2">Your interview has been completed.</p>
          <p className="text-gray-500">
            We appreciate you taking the time to share your thoughts with us.
            Your feedback is valuable and will help us improve.
          </p>
        </Card>
      </div>
    );
  }

  if (!interviewStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-6">
        <Card className="p-12 text-center max-w-2xl">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mic className="w-12 h-12 text-purple-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{interview.title}</h1>
          <p className="text-xl text-gray-600 mb-2">Voice Interview: {interview.topic}</p>
          <p className="text-gray-500 mb-8">
            Duration: ~{interview.duration_minutes} minute{interview.duration_minutes > 1 ? 's' : ''}
          </p>

          {interview.welcome_message && (
            <div className="bg-purple-50 rounded-xl p-6 mb-8 text-left">
              <p className="text-gray-700 leading-relaxed">{interview.welcome_message}</p>
            </div>
          )}

          <div className="bg-blue-50 rounded-xl p-6 mb-8 text-left">
            <h3 className="font-semibold text-gray-900 mb-3">What to expect:</h3>
            <ul className="space-y-2 text-gray-600">
              <li>✓ A friendly AI interviewer will ask you questions</li>
              <li>✓ Speak naturally and honestly - there are no wrong answers</li>
              <li>✓ The conversation will last about {interview.duration_minutes} minute{interview.duration_minutes > 1 ? 's' : ''}</li>
              <li>✓ Your responses {interview.is_anonymous ? 'are anonymous' : 'will be recorded'}</li>
            </ul>
          </div>

          <Button 
            size="lg" 
            onClick={handleStartInterview}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-6 text-lg"
          >
            <Mic className="w-5 h-5 mr-3" />
            Start Interview
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-6">
      <Card className="p-12 text-center max-w-2xl">
        <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <Mic className="w-12 h-12 text-purple-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Interview in Progress</h1>
        <p className="text-lg text-gray-600 mb-8">
          Speak naturally with the AI interviewer. Click "End Interview" when you're done.
        </p>

        {/* ElevenLabs widget will appear here */}
        <div id="elevenlabs-convai-widget" className="mb-8"></div>

        <Button 
          size="lg" 
          onClick={handleEndInterview}
          disabled={analyzeTranscriptMutation.isPending}
          className="bg-red-600 hover:bg-red-700 text-white px-8"
        >
          {analyzeTranscriptMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'End Interview'
          )}
        </Button>
      </Card>
    </div>
  );
}