import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, Clock, Shield, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';

export default function EmployeeJoin() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const interviewId = urlParams.get('id');
  const sessionToken = urlParams.get('token');

  const [hasJoined, setHasJoined] = useState(false);

  const { data: interview, isLoading } = useQuery({
    queryKey: ['interview', interviewId],
    queryFn: async () => {
      const interviews = await base44.entities.VoiceInterview.filter({ id: interviewId });
      return interviews[0];
    },
    enabled: !!interviewId
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      // Create a new session
      const user = await base44.auth.me();
      const session = await base44.entities.InterviewSession.create({
        interview_id: interviewId,
        employee_email: user.email,
        employee_name: interview?.is_anonymous ? null : user.full_name,
        session_status: 'In Progress',
        started_at: new Date().toISOString(),
        join_token: sessionToken || Math.random().toString(36).substring(7)
      });
      return session;
    },
    onSuccess: () => {
      setHasJoined(true);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-purple-200 rounded-full" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center border-0 shadow-xl">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Not Found</h2>
          <p className="text-gray-600">This interview link may be invalid or expired.</p>
        </Card>
      </div>
    );
  }

  if (hasJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full p-12 text-center border-0 shadow-xl bg-white/90 backdrop-blur">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full 
                          bg-gradient-to-br from-green-400 to-emerald-500 mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Session Started!</h2>
          <p className="text-lg text-gray-600 mb-8">
            In a real implementation, you would now be connected to a LiveKit voice session.
            The AI would conduct the interview based on the configured topic and tone.
          </p>
          <div className="bg-purple-50 rounded-xl p-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-3">What happens next:</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>You'll have a natural conversation with the AI for {interview.duration_minutes} minute{interview.duration_minutes > 1 ? 's' : ''}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>The conversation is transcribed and analyzed in real-time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>Your responses are {interview.is_anonymous ? 'anonymous' : 'attributed to you'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>Insights are shared with HR to improve your work experience</span>
              </li>
            </ul>
          </div>
          <p className="text-sm text-gray-500 mt-6">
            This is a demo. To connect real voice sessions, integrate LiveKit API.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full p-12 text-center border-0 shadow-xl bg-white/90 backdrop-blur">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full 
                        bg-gradient-to-br from-purple-500 to-pink-500 mb-6 animate-pulse">
          <Mic className="w-10 h-10 text-white" />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Voice Check-In</h1>
        <p className="text-xl text-gray-600 mb-8">{interview.title}</p>

        {/* Welcome Message */}
        {interview.welcome_message && (
          <div className="bg-purple-50 rounded-xl p-6 mb-8 text-left">
            <p className="text-gray-700">{interview.welcome_message}</p>
          </div>
        )}

        {/* Info Cards */}
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

        {/* Description */}
        <div className="mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">About this conversation:</h3>
          <p className="text-gray-700 leading-relaxed">
            You'll have a brief conversation with an AI about <span className="font-semibold">{interview.topic}</span>.
            This helps leadership understand how you're doing and what matters most to you.
            Your honest feedback drives meaningful improvements.
          </p>
        </div>

        {/* CTA */}
        <Button
          size="lg"
          onClick={() => joinMutation.mutate()}
          disabled={joinMutation.isPending}
          className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {joinMutation.isPending ? 'Starting Session...' : (
            <>
              <Mic className="w-5 h-5 mr-2" />
              Start Voice Interview
            </>
          )}
        </Button>

        {/* Privacy Notice */}
        <p className="text-xs text-gray-500 mt-6">
          {interview.is_anonymous 
            ? 'Your identity remains private. Only aggregate insights are shared.' 
            : 'Your responses will be associated with your name for follow-up purposes.'}
        </p>
      </Card>
    </div>
  );
}