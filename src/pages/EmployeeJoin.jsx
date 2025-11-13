import React, { useState, useEffect, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Clock, Shield, Sparkles, AlertCircle, Loader2, CheckCircle, Volume2, MessageCircle, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EmployeeJoin() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const interviewId = urlParams.get('id');
  const employeeEmail = urlParams.get('email');
  const sessionId = urlParams.get('session');

  const [currentStep, setCurrentStep] = useState('welcome'); // welcome, preparing, interview, completed
  const [conversationId, setConversationId] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [isRecording, setIsRecording] = useState(false);
  const [hasStartedTalking, setHasStartedTalking] = useState(false);

  // Fetch interview details
  const { data: interview, isLoading, error: loadError } = useQuery({
    queryKey: ['public-interview', interviewId],
    queryFn: async () => {
      if (!interviewId) throw new Error('No interview ID provided');
      const interviews = await base44.asServiceRole.entities.VoiceInterview.filter({ id: interviewId });
      if (!interviews || interviews.length === 0) throw new Error('Interview not found');
      return interviews[0];
    },
    enabled: !!interviewId,
    retry: 1,
    staleTime: 300000,
  });

  // Start interview mutation
  const startMutation = useMutation({
    mutationFn: async () => {
      let user;
      try {
        user = await base44.auth.me();
      } catch (error) {
        base44.auth.redirectToLogin(window.location.href);
        throw new Error('Authentication required');
      }
      
      if (employeeEmail && user.email !== employeeEmail) {
        throw new Error(`This link is for ${employeeEmail}. Please log in with that email.`);
      }
      
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
      return { session_id: session.id, agent_id: interview.agent_id };
    },
    onSuccess: () => {
      setCurrentStep('preparing');
      // Auto-transition to interview after 2 seconds
      setTimeout(() => setCurrentStep('interview'), 2000);
    }
  });

  // Initialize ElevenLabs widget
  useEffect(() => {
    if (currentStep !== 'interview' || !interview?.agent_id) return;

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.type = 'text/javascript';
    script.async = true;
    
    script.onload = () => {
      const widget = document.querySelector('elevenlabs-convai');
      if (widget) {
        widget.addEventListener('elevenlabs-convai:start', (event) => {
          setIsRecording(true);
          setHasStartedTalking(true);
          const convId = event.detail?.conversationId;
          if (convId) setConversationId(convId);
        });

        widget.addEventListener('elevenlabs-convai:end', handleInterviewEnd);
      }
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [currentStep, interview]);

  const handleInterviewEnd = async () => {
    setIsRecording(false);
    setCurrentStep('completed');

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

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/10 backdrop-blur-lg flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
          <p className="text-white text-xl font-medium">Loading your interview...</p>
        </motion.div>
      </div>
    );
  }

  // Error State
  if (loadError || !interview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-pink-900 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="max-w-lg w-full p-10 text-center bg-white/95 backdrop-blur border-0 shadow-2xl">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Unable to Load</h2>
            <p className="text-gray-600 mb-6">{loadError?.message || 'Interview not found'}</p>
            <Button onClick={() => window.location.reload()} size="lg" className="w-full">
              Try Again
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Start Error
  if (startMutation.isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-pink-900 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="max-w-lg w-full p-10 text-center bg-white/95 backdrop-blur border-0 shadow-2xl">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Cannot Start</h2>
            <p className="text-gray-600 mb-6">{startMutation.error?.message || 'Unable to start interview'}</p>
            <Button onClick={() => window.location.reload()} size="lg" className="w-full">
              Try Again
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Completed State
  if (currentStep === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="max-w-2xl w-full p-12 text-center bg-white/95 backdrop-blur border-0 shadow-2xl">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center"
            >
              <CheckCircle className="w-14 h-14 text-white" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl font-bold text-gray-900 mb-4"
            >
              All Done! 🎉
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-2xl text-gray-600 mb-8"
            >
              Thank you for sharing your thoughts
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-8 mb-6"
            >
              <p className="text-lg text-gray-700 leading-relaxed">
                Your feedback has been securely recorded and will help us create a better workplace. 
                The HR team will review your responses and use your insights to drive positive change.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-center gap-4 text-sm text-gray-500"
            >
              <Shield className="w-5 h-5" />
              <span>{interview.is_anonymous ? 'Your responses are completely anonymous' : 'Your feedback is confidential'}</span>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-gray-400 text-sm mt-8"
            >
              You can safely close this window now
            </motion.p>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Preparing State
  if (currentStep === 'preparing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 flex items-center justify-center"
          >
            <Sparkles className="w-12 h-12 text-white" />
          </motion.div>
          <h2 className="text-3xl font-bold text-white mb-4">Setting up your AI interviewer...</h2>
          <p className="text-purple-200 text-lg">This will just take a moment</p>
        </motion.div>
      </div>
    );
  }

  // Interview In Progress State
  if (currentStep === 'interview') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Header */}
        <div className="bg-black/20 backdrop-blur-lg border-b border-white/10">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-semibold">{interview.title}</h2>
                <p className="text-purple-300 text-sm">{interview.topic}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="border-purple-400 text-purple-300">
                <Clock className="w-3 h-3 mr-1" />
                {interview.duration_minutes} min
              </Badge>
              {isRecording && (
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/50"
                >
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-red-300 text-sm font-medium">Recording</span>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* AI Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <motion.div
                    animate={{ scale: isRecording ? [1, 1.1, 1] : 1 }}
                    transition={{ duration: 1.5, repeat: isRecording ? Infinity : 0 }}
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center relative"
                  >
                    {isRecording ? (
                      <Volume2 className="w-8 h-8 text-white" />
                    ) : (
                      <Mic className="w-8 h-8 text-white" />
                    )}
                    {isRecording && (
                      <motion.div
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 rounded-full bg-purple-500"
                      />
                    )}
                  </motion.div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                      {hasStartedTalking ? "I'm listening..." : "Ready to start"}
                    </h3>
                    <p className="text-purple-300">
                      {hasStartedTalking ? "Speak naturally - I'm here to listen" : "Click the button below to begin"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Widget Container */}
              <div className="flex justify-center py-6">
                <elevenlabs-convai agent-id={interview.agent_id} />
              </div>
            </Card>
          </motion.div>

          {/* Tips Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl border-blue-400/20 p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Tips for a great conversation</h4>
                  <ul className="space-y-2 text-blue-100">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>Speak naturally and honestly - there are no wrong answers</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>Take your time to think before responding</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>The AI will guide the conversation - just follow along</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>Your feedback helps create positive change</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Privacy Notice */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 flex items-center justify-center gap-2 text-purple-300 text-sm"
          >
            <Shield className="w-4 h-4" />
            <span>
              {interview.is_anonymous 
                ? 'Your responses are completely anonymous' 
                : 'Your feedback is treated confidentially'}
            </span>
          </motion.div>
        </div>
      </div>
    );
  }

  // Welcome State (Default)
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl w-full"
      >
        <Card className="bg-white/95 backdrop-blur-xl border-0 shadow-2xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-12 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/20 backdrop-blur-lg flex items-center justify-center"
            >
              <Mic className="w-12 h-12 text-white" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-5xl font-bold text-white mb-3"
            >
              Voice Interview
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-2xl text-purple-100"
            >
              {interview.title}
            </motion.p>
          </div>

          {/* Content Section */}
          <div className="p-10">
            {/* Welcome Message */}
            {interview.welcome_message && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 mb-8"
              >
                <p className="text-gray-700 text-lg leading-relaxed">{interview.welcome_message}</p>
              </motion.div>
            )}

            {/* Info Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="grid grid-cols-3 gap-4 mb-8"
            >
              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl">
                <Clock className="w-8 h-8 mx-auto text-purple-600 mb-3" />
                <p className="text-sm text-gray-600 mb-1">Duration</p>
                <p className="text-xl font-bold text-gray-900">
                  {interview.duration_minutes} min{interview.duration_minutes > 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl">
                <Shield className="w-8 h-8 mx-auto text-pink-600 mb-3" />
                <p className="text-sm text-gray-600 mb-1">Privacy</p>
                <p className="text-xl font-bold text-gray-900">
                  {interview.is_anonymous ? 'Anonymous' : 'Confidential'}
                </p>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl">
                <Sparkles className="w-8 h-8 mx-auto text-indigo-600 mb-3" />
                <p className="text-sm text-gray-600 mb-1">AI Tone</p>
                <p className="text-xl font-bold text-gray-900">{interview.ai_tone}</p>
              </div>
            </motion.div>

            {/* About Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mb-8"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-purple-600" />
                About this conversation
              </h3>
              <p className="text-gray-700 text-lg leading-relaxed">
                You'll have a brief, voice-based conversation with an AI about{' '}
                <span className="font-semibold text-purple-600">{interview.topic}</span>.
                Your honest feedback is valuable and helps drive meaningful improvements in our workplace.
              </p>
            </motion.div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <Button
                size="lg"
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
                className="w-full h-16 text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-xl"
              >
                {startMutation.isPending ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    Preparing your interview...
                  </>
                ) : (
                  <>
                    <Mic className="w-6 h-6 mr-3" />
                    Start Interview
                  </>
                )}
              </Button>
            </motion.div>

            {/* Footer Note */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-center text-gray-500 text-sm mt-6"
            >
              {interview.is_anonymous 
                ? '🔒 Your identity will remain completely private' 
                : '🔒 Your responses will be treated confidentially'}
            </motion.p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}