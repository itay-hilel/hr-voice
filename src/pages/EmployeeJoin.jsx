import React, { useState, useEffect, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, CheckCircle, Loader2, AlertCircle, Phone, MessageSquare } from 'lucide-react';
import { cn } from "@/lib/utils";

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
  const [callStatus, setCallStatus] = useState('idle'); // idle, starting, active, ending
  const widgetRef = useRef(null);

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
    const existingScript = document.querySelector('script[src*="convai-widget-embed"]');
    if (existingScript) {
      setWidgetLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.async = true;
    script.type = 'text/javascript';
    script.onload = () => {
      console.log('ElevenLabs widget script loaded');
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
  }, []);

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

  // Initialize widget when ready
  useEffect(() => {
    if (!widgetLoaded || !signedUrl || !interviewStarted || widgetRef.current) return;

    // Create widget element
    const widget = document.createElement('elevenlabs-convai');
    widget.setAttribute('signed-url', signedUrl);
    widget.setAttribute('avatar-orb-color-1', '#9333ea'); // Purple
    widget.setAttribute('avatar-orb-color-2', '#ec4899'); // Pink
    widget.setAttribute('start-call-text', 'Start Interview');
    widget.setAttribute('end-call-text', 'End Interview');
    widget.setAttribute('listening-text', 'Listening to you...');
    widget.setAttribute('speaking-text', 'AI is speaking...');
    
    // Add event listeners
    widget.addEventListener('elevenlabs-convai:call:started', (e) => {
      console.log('Call started:', e.detail);
      setCallStatus('active');
      const convId = e.detail?.conversationId;
      if (convId) setConversationId(convId);
      
      // Update session to In Progress
      if (session?.session_status === 'Pending') {
        updateSessionMutation.mutate({
          session_status: 'In Progress',
          started_at: new Date().toISOString()
        });
      }
    });

    widget.addEventListener('elevenlabs-convai:call:ended', async (e) => {
      console.log('Call ended:', e.detail);
      setCallStatus('ending');
      const convId = e.detail?.conversationId || conversationId;
      
      if (convId) {
        await analyzeTranscriptMutation.mutateAsync({ conversationId: convId });
      } else {
        setInterviewCompleted(true);
      }
    });

    widget.addEventListener('elevenlabs-convai:loaded', () => {
      console.log('Widget loaded');
    });

    // Add widget to container
    const container = document.getElementById('widget-container');
    if (container) {
      container.appendChild(widget);
      widgetRef.current = widget;
    }

    return () => {
      if (widgetRef.current && widgetRef.current.parentNode) {
        widgetRef.current.parentNode.removeChild(widgetRef.current);
      }
      widgetRef.current = null;
    };
  }, [widgetLoaded, signedUrl, interviewStarted]);

  const handleStartInterview = () => {
    if (!widgetLoaded || !signedUrl) {
      setError('Voice system not ready. Please wait or refresh the page.');
      return;
    }
    setCallStatus('starting');
    setInterviewStarted(true);
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

          {error && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

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
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-6 relative">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-4xl">
        {/* Header Card */}
        <Card className="p-8 text-center mb-6 bg-white/95 backdrop-blur">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{interview.title}</h1>
          <p className="text-lg text-gray-600">
            {interview.topic} • ~{interview.duration_minutes} minute{interview.duration_minutes > 1 ? 's' : ''}
          </p>
        </Card>

        {/* Widget Container with UI */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left side - Instructions */}
          <Card className="p-8 bg-white/95 backdrop-blur flex flex-col justify-center">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Voice Interview</h3>
                  <p className="text-sm text-gray-600">
                    Speak naturally with our AI interviewer. It's like having a conversation with a colleague.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Be Honest</h3>
                  <p className="text-sm text-gray-600">
                    Share your genuine thoughts and feelings. There are no wrong answers.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {interview.is_anonymous ? 'Anonymous' : 'Confidential'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {interview.is_anonymous 
                      ? 'Your responses are completely anonymous.'
                      : 'Your responses are treated confidentially.'}
                  </p>
                </div>
              </div>

              {/* Status indicator */}
              <div className={cn(
                "p-4 rounded-lg border-2 transition-all",
                callStatus === 'active' 
                  ? "bg-green-50 border-green-300"
                  : callStatus === 'starting'
                  ? "bg-blue-50 border-blue-300"
                  : "bg-gray-50 border-gray-200"
              )}>
                <p className="text-sm font-medium text-gray-900">
                  {callStatus === 'idle' && '⏸️ Ready to begin'}
                  {callStatus === 'starting' && '🎙️ Initializing...'}
                  {callStatus === 'active' && '✅ Interview in progress'}
                  {callStatus === 'ending' && '⏳ Processing...'}
                </p>
              </div>
            </div>
          </Card>

          {/* Right side - Widget */}
          <Card className="p-8 bg-white/95 backdrop-blur flex items-center justify-center min-h-[500px] relative">
            <div 
              id="widget-container" 
              className="w-full h-full flex items-center justify-center"
            />
            
            {callStatus === 'starting' && !widgetRef.current && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-3" />
                  <p className="text-gray-600">Loading voice interface...</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Processing indicator */}
        {analyzeTranscriptMutation.isPending && (
          <Card className="mt-6 p-6 bg-white/95 backdrop-blur">
            <div className="flex items-center justify-center gap-3 text-purple-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-medium">Processing your responses...</span>
            </div>
          </Card>
        )}

        {error && (
          <Card className="mt-6 p-4 bg-red-50 border-red-200">
            <p className="text-red-700 text-sm text-center">{error}</p>
          </Card>
        )}
      </div>

      {/* Custom widget styling */}
      <style>{`
        elevenlabs-convai {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
      `}</style>
    </div>
  );
}