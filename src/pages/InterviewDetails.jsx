import React from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Share2, Download, Users, TrendingUp, MessageSquare, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Skeleton } from "@/components/ui/skeleton";
import InsightCard from '../components/hrvoice/InsightCard';
import InviteLinksPanel from '../components/hrvoice/InviteLinksPanel';

export default function InterviewDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const interviewId = urlParams.get('id');

  const { data: interview, isLoading: loadingInterview } = useQuery({
    queryKey: ['interview', interviewId],
    queryFn: async () => {
      const interviews = await base44.entities.VoiceInterview.filter({ id: interviewId });
      return interviews[0];
    },
    enabled: !!interviewId
  });

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions', interviewId],
    queryFn: async () => {
      return base44.entities.InterviewSession.filter({ interview_id: interviewId }, '-created_date', 100);
    },
    enabled: !!interviewId
  });

  const isLoading = loadingInterview || loadingSessions;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-12 w-48 mb-8" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold">Interview not found</h2>
        </Card>
      </div>
    );
  }

  const completedSessions = sessions.filter(s => s.session_status === 'Completed');
  const avgSentiment = completedSessions.reduce((acc, s) => acc + (s.sentiment_score || 0), 0) / (completedSessions.length || 1);
  const urgentCount = sessions.filter(s => s.urgency_flag).length;

  // Aggregate themes
  const allThemes = sessions.flatMap(s => s.key_themes || []);
  const themeCounts = {};
  allThemes.forEach(theme => {
    themeCounts[theme] = (themeCounts[theme] || 0) + 1;
  });
  const topThemes = Object.entries(themeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Interview Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <Badge className="mb-3">{interview.status}</Badge>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{interview.title}</h1>
              <p className="text-lg text-gray-600">{interview.topic}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <Users className="w-6 h-6 mx-auto text-purple-600 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{completedSessions.length}/{sessions.length}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <TrendingUp className="w-6 h-6 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{(avgSentiment * 100).toFixed(0)}%</p>
              <p className="text-sm text-gray-600">Avg Sentiment</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <MessageSquare className="w-6 h-6 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{topThemes.length}</p>
              <p className="text-sm text-gray-600">Key Themes</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-xl">
              <AlertCircle className="w-6 h-6 mx-auto text-red-600 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{urgentCount}</p>
              <p className="text-sm text-gray-600">Urgent Issues</p>
            </div>
          </div>
        </div>

        {/* Employee Invitations */}
        <InviteLinksPanel interview={interview} sessions={sessions} />

        {/* Insights */}
        {completedSessions.length > 0 && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">AI-Generated Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {urgentCount > 0 && (
                <InsightCard
                  type="urgent"
                  title={`${urgentCount} Critical Issue${urgentCount > 1 ? 's' : ''}`}
                  description="Several responses flagged concerns requiring immediate follow-up."
                  action="Review urgent transcripts and schedule 1-on-1s"
                />
              )}
              {avgSentiment >= 0.5 && (
                <InsightCard
                  type="positive"
                  title="Overall Positive Sentiment"
                  description={`${completedSessions.filter(s => s.sentiment_score >= 0.5).length} employees expressed satisfaction.`}
                  action="Maintain current initiatives"
                />
              )}
              {topThemes[0] && (
                <InsightCard
                  type="info"
                  title={`Top Theme: "${topThemes[0][0]}"`}
                  description={`Mentioned in ${topThemes[0][1]} conversation${topThemes[0][1] > 1 ? 's' : ''}.`}
                  action="Consider team-wide discussion on this topic"
                />
              )}
            </div>

            {/* Theme Cloud */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Recurring Themes</h2>
            <Card className="p-6 mb-8 border-0 shadow-lg bg-white">
              <div className="flex flex-wrap gap-2">
                {topThemes.map(([theme, count]) => (
                  <Badge 
                    key={theme} 
                    variant="secondary"
                    className="text-sm px-4 py-2"
                    style={{ fontSize: `${Math.min(0.875 + count * 0.1, 1.5)}rem` }}
                  >
                    {theme} ({count})
                  </Badge>
                ))}
              </div>
            </Card>

            {/* Session List */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Individual Sessions</h2>
            <div className="space-y-4">
              {sessions.map(session => (
                <Card key={session.id} className="p-6 border-0 shadow-md hover:shadow-lg transition-shadow bg-white">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Badge className={
                        session.session_status === 'Completed' ? 'bg-green-100 text-green-700' :
                        session.session_status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }>
                        {session.session_status}
                      </Badge>
                      <p className="text-sm text-gray-600 mt-1">
                        {interview.is_anonymous ? 'Anonymous' : session.employee_name || session.employee_email}
                      </p>
                    </div>
                    {session.sentiment_score != null && (
                      <div className="text-right">
                        <p className="text-2xl">
                          {session.sentiment_score >= 0.5 ? '😊' : session.sentiment_score >= 0 ? '😐' : '😞'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {(session.sentiment_score * 100).toFixed(0)}% positive
                        </p>
                      </div>
                    )}
                  </div>

                  {session.summary && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                      <p className="text-sm text-gray-700">{session.summary}</p>
                    </div>
                  )}

                  {session.key_themes && session.key_themes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {session.key_themes.map((theme, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {session.recommended_actions && session.recommended_actions.length > 0 && (
                    <div className="border-t pt-3">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Recommended Actions:</p>
                      <ul className="space-y-1">
                        {session.recommended_actions.map((action, idx) => (
                          <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                            <span className="text-purple-600 mt-0.5">→</span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </>
        )}

        {completedSessions.length === 0 && (
          <Card className="p-12 text-center border-0 shadow-lg bg-white">
            <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No completed sessions yet</h3>
            <p className="text-gray-600">Results will appear here as employees complete their interviews.</p>
          </Card>
        )}
      </div>
    </div>
  );
}