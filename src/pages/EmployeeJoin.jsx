import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

export default function EmployeeJoin() {
  const urlParams = new URLSearchParams(window.location.search);
  const interviewId = urlParams.get('id');
  const sessionId = urlParams.get('session');

  const [conversationId, setConversationId] = useState(null);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [signedUrl, setSignedUrl] = useState(null);
  const [error, setError] = useState(null);

  // Fetch interview and session data via backend function
  const { data, isLoading: loadingData, error: dataError } = useQuery({
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

  // Get signed URL for the widget
  useEffect(() => {
    const getSignedUrl = async () => {
      if (!interview?.agent_id) return;

      try {
        const response = await base44.functions.invoke('getSignedUrl', {
          agentId: interview.agent_id
        });
        
        if (response.data.signed_url) {
          setSignedUrl(response.data.signed_url);
        }
      } catch (err) {
        console.error('Error getting signed URL:', err);
        setError('Failed to initialize voice system');
      }
    };

    getSignedUrl();
  }, [interview?.agent_id]);

  // Load ElevenLabs widget script
  useEffect(() => {
    if (!signedUrl) return;

    const existingScript = document.querySelector('script[src*="elevenlabs.io/convai-widget"]');
    if (existingScript) {
      setWidgetLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://elevenlabs.io/convai-widget/index.js';
    script.async = true;
    script.onload = () => {
      console.log('ElevenLabs widget loaded');
      setWidgetLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load ElevenLabs widget');
      setError('Failed to load voice system');
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [signedUrl]);

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

  const handleStartInterview = () => {
    if (!widgetLoaded || !signedUrl) {
      setError('Voice system not ready. Please wait or refresh the page.');
      return;
    }

    setInterviewStarted(true);

    // Update session to In Progress
    if (session?.session_status === 'Pending') {
      updateSessionMutation.mutate({
        session_status: 'In Progress',
        started_at: new Date().toISOString()
      });
    }

    // Initialize widget after a short delay
    setTimeout(() => {
      const widget = document.createElement('elevenlabs-convai');
      widget.setAttribute('agent-id', interview.agent_id);
      widget.setAttribute('signed-url', signedUrl);

      // Listen for widget events
      widget.addEventListener('loaded', () => {
        console.log('Widget initialized');
      });

      widget.addEventListener('call:started', (e) => {
        console.log('Call started:', e.detail);
        const convId = e.detail?.conversationId;
        if (convId) setConversationId(convId);
      });

      widget.addEventListener('call:ended', async (e) => {
        console.log('Call ended:', e.detail);
        const convId = e.detail?.conversationId || conversationId;
        
        if (convId) {
          await analyzeTranscriptMutation.mutateAsync({ conversationId: convId });
        } else {
          setInterviewCompleted(true);
        }
      });

      // Style the widget to center it
      const style = document.createElement('style');
      style.textContent = `
        elevenlabs-convai {
          position: fixed !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          z-index: 9999 !important;
        }
      `;
      document.head.appendChild(style);

      document.body.appendChild(widget);
    }, 500);
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  if (dataError || !interview || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-red-600 mb-2">Invalid Link</h2>
          <p className="text-gray-600 mb-4">This interview link is not valid or has expired.</p>
          {dataError && (
            <div className="mt-4 p-3 bg-red-50 rounded text-left">
              <p className="text-xs text-red-600">Error: {dataError.message}</p>
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

        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {!interviewStarted && (
          <Button 
            size="lg" 
            onClick={handleStartInterview}
            disabled={!widgetLoaded || !signedUrl}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-6 text-lg"
          >
            {!widgetLoaded || !signedUrl ? (
              <>
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                Loading Voice System...
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 mr-3" />
                Start Interview
              </>
            )}
          </Button>
        )}

        {analyzeTranscriptMutation.isPending && (
          <div className="mt-6 flex items-center justify-center gap-2 text-purple-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Processing your responses...</span>
          </div>
        )}
      </Card>
    </div>
  );
}