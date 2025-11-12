import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Mic, TrendingUp, Users, MessageSquare, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatsCard from '../components/hrvoice/StatsCard';
import CampaignCard from '../components/hrvoice/CampaignCard';
import InsightCard from '../components/hrvoice/InsightCard';
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: interviews = [], isLoading: loadingInterviews } = useQuery({
    queryKey: ['interviews'],
    queryFn: () => base44.entities.VoiceInterview.list('-created_date', 50)
  });

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.InterviewSession.list('-created_date', 200)
  });

  // Calculate stats
  const activeCampaigns = interviews.filter(i => i.status === 'Active').length;
  const completedSessions = sessions.filter(s => s.session_status === 'Completed').length;
  const avgSentiment = sessions.filter(s => s.sentiment_score != null)
    .reduce((acc, s) => acc + s.sentiment_score, 0) / (sessions.filter(s => s.sentiment_score != null).length || 1);
  const urgentIssues = sessions.filter(s => s.urgency_flag).length;

  // Get sentiment emoji
  const getSentimentEmoji = (score) => {
    if (score >= 0.5) return '😊';
    if (score >= 0) return '😐';
    return '😞';
  };

  // Generate insights
  const getInsights = () => {
    const insights = [];
    
    if (urgentIssues > 0) {
      insights.push({
        type: 'urgent',
        title: `${urgentIssues} Urgent Issue${urgentIssues > 1 ? 's' : ''} Detected`,
        description: 'Several employees flagged critical concerns requiring immediate attention.',
        action: 'Schedule 1-on-1 follow-ups with affected team members'
      });
    }

    if (avgSentiment >= 0.5) {
      insights.push({
        type: 'positive',
        title: 'Team Morale is Strong',
        description: 'Overall sentiment is positive across recent check-ins.',
        action: 'Continue current engagement practices'
      });
    }

    // Theme analysis
    const allThemes = sessions.flatMap(s => s.key_themes || []);
    const themeCounts = {};
    allThemes.forEach(theme => {
      themeCounts[theme] = (themeCounts[theme] || 0) + 1;
    });
    const topTheme = Object.keys(themeCounts).sort((a, b) => themeCounts[b] - themeCounts[a])[0];
    
    if (topTheme) {
      insights.push({
        type: 'info',
        title: `"${topTheme}" is Trending`,
        description: `This topic came up in ${themeCounts[topTheme]} conversations.`,
        action: 'Consider a team-wide discussion or workshop on this topic'
      });
    }

    return insights;
  };

  const isLoading = loadingInterviews || loadingSessions;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">HRVoice</h1>
              <p className="text-purple-100 text-lg">The AI that listens to your team.</p>
            </div>
            <Link to={createPageUrl('CreateInterview')}>
              <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50 shadow-lg">
                <Plus className="w-5 h-5 mr-2" />
                Create Campaign
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
          ) : (
            <>
              <StatsCard
                icon={Mic}
                label="Active Campaigns"
                value={activeCampaigns}
                trend={activeCampaigns > 0 ? `${interviews.length} total` : undefined}
                colorClass="bg-purple-100"
                bgClass="bg-gradient-to-br from-purple-50 to-purple-100"
              />
              <StatsCard
                icon={Users}
                label="Completed Sessions"
                value={completedSessions}
                trend={completedSessions > 0 ? `${sessions.length} total invites` : undefined}
                colorClass="bg-blue-100"
                bgClass="bg-gradient-to-br from-blue-50 to-blue-100"
              />
              <StatsCard
                icon={TrendingUp}
                label="Avg Sentiment"
                value={`${getSentimentEmoji(avgSentiment)} ${(avgSentiment * 100).toFixed(0)}%`}
                trend={avgSentiment >= 0.5 ? '+12% this month' : undefined}
                colorClass="bg-green-100"
                bgClass="bg-gradient-to-br from-green-50 to-green-100"
              />
              <StatsCard
                icon={AlertCircle}
                label="Urgent Issues"
                value={urgentIssues}
                trend={urgentIssues > 0 ? 'Needs attention' : 'All clear'}
                colorClass="bg-red-100"
                bgClass="bg-gradient-to-br from-red-50 to-red-100"
              />
            </>
          )}
        </div>

        {/* AI Insights Section */}
        {!isLoading && sessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-purple-600" />
              AI Insights & Recommendations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getInsights().map((insight, idx) => (
                <InsightCard key={idx} {...insight} />
              ))}
            </div>
          </div>
        )}

        {/* Active Campaigns */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Your Campaigns</h2>
            {interviews.length > 6 && (
              <Button variant="ghost">View All →</Button>
            )}
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(3).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-xl" />
              ))}
            </div>
          ) : interviews.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
              <Mic className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No campaigns yet</h3>
              <p className="text-gray-600 mb-6">Create your first voice interview campaign to get started.</p>
              <Link to={createPageUrl('CreateInterview')}>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Campaign
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {interviews.slice(0, 6).map(interview => {
                const interviewSessions = sessions.filter(s => s.interview_id === interview.id);
                return (
                  <CampaignCard
                    key={interview.id}
                    campaign={interview}
                    sessions={interviewSessions}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}