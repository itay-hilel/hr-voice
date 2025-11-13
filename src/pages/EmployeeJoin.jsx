import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, Clock, Shield, Sparkles, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

export default function EmployeeJoin() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const interviewId = urlParams.get('id');
  const employeeEmail = urlParams.get('email');
  const sessionId = urlParams.get('session');

  const [conversationId, setConversationId] = useState(null);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);

  // Fetch interview details
  const { data: interview, isLoading, error: loadError } = useQuery({
    queryKey: ['public-interview', interviewId],
    queryFn: async () => {
      if (!interviewId) {
        throw new Error('No interview ID provided');
      }

      const interviews = await base44.asServiceRole.entities.VoiceInterview.filter({ 
        id: interviewId 
      });
      
      if (!interviews || interviews.length === 0) {
        throw new Error('Interview not found');
      }

      return interviews[0];
    },
    enabled: !!interviewId,
    retry: 1,
    staleTime: 300000,
  });

  // Start interview - create session
  const startMutation = useMutation({
    mutationFn: async () => {
      // Check authentication
      let user;
      try {
        user = await base44.auth.me();
      } catch (error) {
        const returnUrl = window.location.href;
        base44.auth.redirectToLogin(returnUrl);
        throw new Error('Authentication required');
      }
      
      // Verify email matches if provided
      if (employeeEmail && user.email !== employeeEmail) {
        throw new Error(`This link is for ${employeeEmail}. Please log in with that email.`);
      }
      
      // Find or create session
      let session;
      if (sessionId) {
        const sessions = await base44.entities.InterviewSession.filter({ id: sessionId });
        session = sessions[0];
      }
      
      if (!session) {
        session = await base44.entities.InterviewSession.create({
          interview_id: interviewId,
          employee_email: user.email,
          employee_name: interview?.is_anonymous ? null : user.full_name,
          session_status: 'In Progress',
          started_at: new Date().toISOString()
        });
      }

      setCurrentSessionId(session.id);
      
      return { 
        session_id: session.id,
        agent_id: interview.agent_id
      };
    },
    onSuccess: (data) => {
      setInterviewStarted(true);
    }
  });

  // Initialize ElevenLabs widget
  useEffect(() => {
    if (!interviewStarted || !interview?.agent_id) return;

    // Load widget script
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.type = 'text/javascript';
    script.async = true;
    
    script.onload = () => {
      console.log('ElevenLabs widget loaded');
      
      // Listen for conversation start
      const widget = document.querySelector('elevenlabs-convai');
      if (widget) {
        widget.addEventListener('elevenlabs-convai:start', (event) => {
          console.log('Conversation started');
          const convId = event.detail?.conversationId;
          if (convId) {
            setConversationId(convId);
          }
        });

        // Listen for conversation end
        widget.addEventListener('elevenlabs-convai:end', handleInterviewEnd);
      }
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [interviewStarted, interview]);

  // Handle interview completion
  const handleInterviewEnd = async () => {
    console.log('Interview ended');
    setInterviewCompleted(true);

    // Fetch and analyze transcript
    try {
      if (conversationId && currentSessionId) {
        await base44.functions.invoke('getElevenLabsTranscript', {
          conversationId: conversationId,
          sessionId: currentSessionId
        });
        
        queryClient.invalidateQueries({ queryKey: ['sessions'] });
      }
    } catch (error) {
      console.error('Error fetching transcript:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full p-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-purple-200 rounded-full animate-pulse flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            </div>
            <p className="text-gray-900 font-semibold text-lg">Loading interview...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (loadError || !interview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full p-8 text-center border-0 shadow-xl">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Unable to Load Interview</h2>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-600">
              {loadError?.message || 'Interview not found'}
            </p>
            <p className="text-xs text-gray-500 mt-2">Interview ID: {interviewId}</p>
          </div>

          <Button 
            onClick={() => window.location.reload()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Reload Page
          </Button>
        </Card>
      </div>
    );
  }

  if (startMutation.isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center border-0 shadow-xl">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Cannot Start Interview</h2>
          <p className="text-gray-600 mb-4">
            {startMutation.error?.message || 'Unable to start interview session'}
          </p>
          <Button 
            onClick={() => window.location.reload()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  if (interviewCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full p-12 text-center border-0 shadow-xl bg-white/90 backdrop-blur">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full 
                          bg-gradient-to-br from-green-500 to-emerald-500 mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-3">Interview Complete!</h1>
          <p className="text-xl text-gray-600 mb-8">Thank you for your honest feedback</p>

          <div className="bg-green-50 rounded-xl p-6 mb-6">
            <p className="text-gray-700">
              Your responses have been recorded and will be reviewed by the HR team. 
              Your insights help us create a better workplace for everyone.
            </p>
          </div>

          <p className="text-sm text-gray-500">
            You can close this window now.
          </p>
        </Card>
      </div>
    );
  }

  if (interviewStarted && interview?.agent_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{interview.title}</h1>
            <p className="text-gray-600">Voice Interview Session</p>
          </div>

          {/* ElevenLabs Widget */}
          <Card className="p-8 border-0 shadow-xl bg-white/90 backdrop-blur">
            <div className="text-center mb-4">
              <p className="text-gray-600 mb-4">Click the button below to start your interview</p>
            </div>
            
            {/* Widget embed */}
            <div className="flex justify-center">
              <elevenlabs-convai 
                agent-id={interview.agent_id}
              />
            </div>
          </Card>

          <Card className="mt-6 p-4 border-0 bg-white/80 backdrop-blur">
            <div className="flex items-center justify-between text-sm flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">{interview.duration_minutes} min</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">{interview.is_anonymous ? 'Anonymous' : 'Identified'}</span>
                </div>
              </div>
              <span className="text-gray-500">Topic: {interview.topic}</span>
            </div>
          </Card>

          <Card className="mt-4 p-4 border-0 bg-blue-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-semibold mb-1">Tips for the interview:</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Speak naturally and honestly</li>
                  <li>Take your time to think before responding</li>
                  <li>The AI will guide you through the conversation</li>
                  <li>Click the microphone button when ready to start</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Initial landing page
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full p-12 text-center border-0 shadow-xl bg-white/90 backdrop-blur">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full 
                        bg-gradient-to-br from-purple-500 to-pink-500 mb-6 animate-pulse">
          <Mic className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-3">Voice Check-In</h1>
        <p className="text-xl text-gray-600 mb-8">{interview.title}</p>

        {interview.welcome_message && (
          <div className="bg-purple-50 rounded-xl p-6 mb-8 text-left">
            <p className="text-gray-700">{interview.welcome_message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
            <Clock className="w-6 h-6 mx-auto text-purple-600 mb-2" />
            <p className="text-sm font-semibold text-gray-900">{interview.duration_minutes} min{interview.duration_minutes > 1 ? 's' : ''}</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl">
            <Shield className="w-6 h-6 mx-auto text-pink-600 mb-2" />
            <p className="text-sm font-semibold text-gray-900">{interview.is_anonymous ? 'Anonymous' : 'Identified'}</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
            <Sparkles className="w-6 h-6 mx-auto text-blue-600 mb-2" />
            <p className="text-sm font-semibold text-gray-900">{interview.ai_tone} AI</p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">About this conversation:</h3>
          <p className="text-gray-700 leading-relaxed">
            You'll have a brief conversation with an AI about <span className="font-semibold">{interview.topic}</span>.
            Your honest feedback drives meaningful improvements.
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => startMutation.mutate()}
          disabled={startMutation.isPending}
          className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {startMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Starting Session...
            </>
          ) : (
            <>
              <Mic className="w-5 h-5 mr-2" />
              Start Voice Interview
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 mt-6">
          {interview.is_anonymous 
            ? 'Your identity remains private.' 
            : 'Responses will be associated with your name.'}
        </p>
      </Card>
    </div>
  );
}