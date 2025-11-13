import React, { useState, useEffect, useRef } from 'react';
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
  const [widgetReady, setWidgetReady] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const widgetContainerRef = useRef(null);

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

  // Load ElevenLabs SDK script
  useEffect(() => {
    // Check if script already exists
    if (document.querySelector('script[src*="elevenlabs.io/convai-widget"]')) {
      setSdkLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://elevenlabs.io/convai-widget/index.js';
    script.async = true;
    script.onload = () => {
      console.log('ElevenLabs SDK loaded');
      setSdkLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load ElevenLabs SDK');
    };
    
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Initialize ElevenLabs widget when interview starts and SDK is loaded
  useEffect(() => {
    if (!interview?.agent_id || !interviewStarted || !widgetContainerRef.current || !sdkLoaded) {
      return;
    }

    console.log('Initializing ElevenLabs widget with agent:', interview.agent_id);

    // Clear any existing widgets
    widgetContainerRef.current.innerHTML = '';

    // Create widget element
    const widget = document.createElement('elevenlabs-convai');
    widget.setAttribute('agent-id', interview.agent_id);
    
    // Add event listeners
    widget.addEventListener('load', () => {
      console.log('ElevenLabs: Widget loaded');
      setWidgetReady(true);
    });

    widget.addEventListener('connected', () => {
      console.log('ElevenLabs: Connected');
      setWidgetReady(true);
    });

    widget.addEventListener('disconnected', () => {
      console.log('ElevenLabs: Disconnected');
    });

    widget.addEventListener('conversationstart', (e) => {
      console.log('ElevenLabs: Conversation started', e.detail);
      const convId = e.detail?.conversationId;
      if (convId) {
        setConversationId(convId);
      }
      
      // Update session to In Progress
      if (session?.session_status === 'Pending') {
        updateSessionMutation.mutate({
          session_status: 'In Progress',
          started_at: new Date().toISOString()
        });
      }
    });

    widget.addEventListener('conversationend', (e) => {
      console.log('ElevenLabs: Conversation ended', e.detail);
    });

    widget.addEventListener('error', (e) => {
      console.error('ElevenLabs: Error', e.detail);
    });

    // Append widget to container
    widgetContainerRef.current.appendChild(widget);

    // Auto-set ready after 2 seconds if no load event
    const readyTimeout = setTimeout(() => {
      setWidgetReady(true);
    }, 2000);

    // Cleanup
    return () => {
      clearTimeout(readyTimeout);
      if (widgetContainerRef.current && widgetContainerRef.current.contains(widget)) {
        widgetContainerRef.current.removeChild(widget);
      }
    };
  }, [interview?.agent_id, interviewStarted, sdkLoaded, session]);

  const handleStartInterview = () => {
    setInterviewStarted(true);
  };

  const handleEndInterview = async () => {
    if (conversationId) {
      await analyzeTranscriptMutation.mutateAsync({ conversationId });
    } else {
      // No conversation happened, just mark as completed
      setInterviewCompleted(true);
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
            disabled={!sdkLoaded}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-6 text-lg"
          >
            {!sdkLoaded ? (
              <>
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 mr-3" />
                Start Interview
              </>
            )}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-6">
      <Card className="p-12 text-center max-w-2xl">
        <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mic className={`w-12 h-12 text-purple-600 ${widgetReady ? 'animate-pulse' : ''}`} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Interview in Progress</h1>
        <p className="text-lg text-gray-600 mb-8">
          {widgetReady 
            ? 'Click the microphone button below to start speaking with the AI interviewer!' 
            : 'Setting up your AI interviewer...'}
        </p>

        {/* ElevenLabs widget container */}
        <div ref={widgetContainerRef} className="mb-8 flex justify-center min-h-[200px] items-center"></div>

        {!widgetReady && (
          <div className="mb-8">
            <Loader2 className="w-8 h-8 mx-auto text-purple-600 animate-spin" />
            <p className="text-sm text-gray-500 mt-2">Loading conversational AI...</p>
          </div>
        )}

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

        <div className="mt-6 text-xs text-gray-500 space-y-1">
          <p>SDK Loaded: {sdkLoaded ? '✓' : '...'}</p>
          <p>Widget Ready: {widgetReady ? '✓' : '...'}</p>
          <p>Agent: {interview.agent_id}</p>
        </div>
      </Card>
    </div>
  );
}