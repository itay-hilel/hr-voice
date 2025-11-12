import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, Clock, Shield, Sparkles, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import VoiceInterviewRoom from '../components/hrvoice/VoiceInterviewRoom';

export default function EmployeeJoin() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const interviewId = urlParams.get('id');
  const employeeEmail = urlParams.get('email');
  const sessionId = urlParams.get('session');

  const [hasJoined, setHasJoined] = useState(false);
  const [roomData, setRoomData] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [debugInfo, setDebugInfo] = useState([]);

  const addDebug = (message) => {
    console.log(message);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    addDebug(`Page loaded with ID: ${interviewId}`);
  }, []);

  const { data: interview, isLoading, error: loadError } = useQuery({
    queryKey: ['interview', interviewId],
    queryFn: async () => {
      addDebug('Starting to fetch interview...');
      
      if (!interviewId) {
        throw new Error('No interview ID provided');
      }

      try {
        addDebug(`Calling getPublicInterview with ID: ${interviewId}`);
        
        const response = await Promise.race([
          base44.functions.invoke('getPublicInterview', { interviewId }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout after 10 seconds')), 10000)
          )
        ]);
        
        addDebug('Response received successfully');
        addDebug(`Interview data: ${JSON.stringify(response.data)}`);
        
        return response.data;
      } catch (error) {
        addDebug(`ERROR: ${error.message}`);
        addDebug(`Error details: ${JSON.stringify(error.response?.data || error)}`);
        throw error;
      }
    },
    enabled: !!interviewId,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 0
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      addDebug('Join button clicked - checking authentication...');
      
      // Check authentication
      let user;
      try {
        user = await base44.auth.me();
        addDebug(`User authenticated: ${user.email}`);
      } catch (error) {
        addDebug('User not authenticated - redirecting to login');
        // User not logged in - redirect to login with return URL
        const returnUrl = window.location.href;
        base44.auth.redirectToLogin(returnUrl);
        throw new Error('Authentication required');
      }
      
      // Verify email matches if provided
      if (employeeEmail && user.email !== employeeEmail) {
        throw new Error('This interview link is for a different email address. Please log in with: ' + employeeEmail);
      }
      
      // Find or create session
      let session;
      if (sessionId) {
        addDebug(`Looking for existing session: ${sessionId}`);
        const sessions = await base44.entities.InterviewSession.filter({ id: sessionId });
        session = sessions[0];
        addDebug(`Session found: ${session ? 'yes' : 'no'}`);
      } else {
        addDebug('Looking for session by interview and email');
        const sessions = await base44.entities.InterviewSession.filter({ 
          interview_id: interviewId,
          employee_email: user.email
        });
        session = sessions[0];
      }
      
      if (!session) {
        addDebug('Creating new session...');
        session = await base44.entities.InterviewSession.create({
          interview_id: interviewId,
          employee_email: user.email,
          employee_name: interview?.is_anonymous ? null : user.full_name,
          session_status: 'Pending'
        });
        addDebug(`Session created: ${session.id}`);
      }

      // Create LiveKit room and get tokens
      addDebug('Creating LiveKit room...');
      const response = await base44.functions.invoke('createInterviewRoom', {
        interviewId,
        sessionId: session.id,
        participantName: interview?.is_anonymous ? 'Anonymous' : user.full_name,
        ttl: `${interview?.duration_minutes || 5}m`
      });

      addDebug('LiveKit room created successfully');
      return { session, roomData: response.data };
    },
    onSuccess: ({ session, roomData }) => {
      setCurrentSession(session);
      setRoomData(roomData);
      setHasJoined(true);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    }
  });

  const handleSessionEnd = async (sessionData) => {
    if (!currentSession) return;

    await base44.entities.InterviewSession.update(currentSession.id, {
      session_status: 'Completed',
      completed_at: new Date().toISOString(),
      duration_seconds: sessionData.duration || 0,
      transcript: JSON.stringify(sessionData.transcript || []),
      sentiment_score: sessionData.sentiment_score || 0,
      key_themes: ['Work-Life Balance', 'Team Collaboration'],
      summary: 'Employee expressed positive sentiment about recent improvements in team collaboration.',
      recommended_actions: ['Continue current team practices', 'Monitor workload levels']
    });

    queryClient.invalidateQueries({ queryKey: ['sessions'] });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-purple-200 rounded-full animate-pulse flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            </div>
            <p className="text-gray-900 font-semibold text-lg mb-2">Loading interview...</p>
            <p className="text-gray-600 text-sm">Interview ID: {interviewId}</p>
          </div>
          
          {/* Debug Panel */}
          <div className="bg-gray-50 rounded-lg p-4 text-left border-2 border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2">🔍 Debug Log:</p>
            <div className="font-mono text-xs text-gray-600 space-y-1 max-h-48 overflow-auto">
              {debugInfo.length === 0 ? (
                <p className="text-gray-400">Waiting for logs...</p>
              ) : (
                debugInfo.map((log, idx) => (
                  <div key={idx} className="border-b border-gray-200 pb-1">{log}</div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 text-center">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                addDebug('Manual reload triggered');
                window.location.reload();
              }}
            >
              Taking too long? Reload
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (loadError || !interview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full p-8 border-0 shadow-xl">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Unable to Load Interview</h2>
          
          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-left">
              <p className="text-sm font-semibold text-gray-700 mb-2">📋 Request Details:</p>
              <div className="font-mono text-xs text-gray-600 space-y-1">
                <p>Interview ID: <span className="text-purple-600">{interviewId || 'MISSING'}</span></p>
                <p>Email: <span className="text-purple-600">{employeeEmail || 'Not provided'}</span></p>
                <p>Session: <span className="text-purple-600">{sessionId || 'Not provided'}</span></p>
              </div>
            </div>

            {loadError && (
              <div className="bg-red-50 p-4 rounded-lg text-left border-2 border-red-200">
                <p className="text-sm font-semibold text-red-700 mb-2">❌ Error:</p>
                <p className="font-mono text-xs text-red-800 whitespace-pre-wrap break-all">
                  {loadError.message || 'Unknown error occurred'}
                </p>
              </div>
            )}

            {/* Debug Log */}
            <div className="bg-blue-50 p-4 rounded-lg text-left border-2 border-blue-200">
              <p className="text-sm font-semibold text-blue-700 mb-2">🔍 Debug Log:</p>
              <div className="font-mono text-xs text-blue-800 space-y-1 max-h-48 overflow-auto">
                {debugInfo.map((log, idx) => (
                  <div key={idx} className="border-b border-blue-200 pb-1">{log}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Button 
              onClick={() => window.location.reload()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Reload Page
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Show error if mutation failed
  if (joinMutation.isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center border-0 shadow-xl">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">
            {joinMutation.error?.message || 'Unable to start interview. Please try logging in.'}
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

  if (hasJoined && roomData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{interview.title}</h1>
            <p className="text-gray-600">Voice Interview Session</p>
          </div>

          <VoiceInterviewRoom
            token={roomData.participant.token}
            serverUrl={roomData.serverUrl}
            roomName={roomData.roomName}
            participantName={roomData.participant.name}
            onSessionEnd={handleSessionEnd}
          />

          <Card className="mt-6 p-4 border-0 bg-white/80 backdrop-blur">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">Duration: {interview.duration_minutes} min</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">{interview.is_anonymous ? 'Anonymous' : 'Identified'}</span>
                </div>
              </div>
              <span className="text-gray-500">Topic: {interview.topic}</span>
            </div>
          </Card>
        </div>
      </div>
    );
  }

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
            <p className="text-sm font-semibold text-gray-900">Takes {interview.duration_minutes} min{interview.duration_minutes > 1 ? 's' : ''}</p>
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
            This helps leadership understand how you're doing and what matters most to you.
            Your honest feedback drives meaningful improvements.
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => {
            if (!joinMutation.isPending) {
              joinMutation.mutate();
            }
          }}
          disabled={joinMutation.isPending}
          className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {joinMutation.isPending ? (
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
            ? 'Your identity remains private. Only aggregate insights are shared.' 
            : 'Your responses will be associated with your name for follow-up purposes.'}
        </p>
      </Card>
    </div>
  );
}