import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Clock, MoreVertical, Play, Pause, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

const statusColors = {
  Draft: "bg-gray-100 text-gray-700 border-gray-200",
  Active: "bg-green-100 text-green-700 border-green-200",
  Completed: "bg-blue-100 text-blue-700 border-blue-200",
  Paused: "bg-orange-100 text-orange-700 border-orange-200"
};

const topicColors = {
  "Work-Life Balance": "from-purple-50 to-purple-100",
  "Team Collaboration": "from-blue-50 to-blue-100",
  "Management Feedback": "from-pink-50 to-pink-100",
  "Career Growth": "from-green-50 to-green-100",
  "Company Culture": "from-yellow-50 to-yellow-100",
  "Workload & Stress": "from-red-50 to-red-100",
  "Recognition & Rewards": "from-indigo-50 to-indigo-100",
  "General Check-In": "from-gray-50 to-gray-100"
};

export default function CampaignCard({ campaign, sessions = [] }) {
  const completedSessions = sessions.filter(s => s.session_status === 'Completed').length;
  const totalSessions = sessions.length;
  const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  return (
    <Card className={cn(
      "relative overflow-hidden border-0 p-6 transition-all hover:shadow-xl hover:-translate-y-1",
      "bg-gradient-to-br",
      topicColors[campaign.topic] || "from-gray-50 to-gray-100"
    )}>
      {/* Decorative corner element */}
      <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-10 -translate-y-10 
                      rounded-full bg-white/40" />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <Badge className={cn("mb-2 border", statusColors[campaign.status])}>
              {campaign.status}
            </Badge>
            <h3 className="text-xl font-bold text-gray-900 mb-1">{campaign.title}</h3>
            <p className="text-sm text-gray-600">{campaign.topic}</p>
          </div>
          <Button variant="ghost" size="icon" className="hover:bg-white/50">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Participants</p>
              <p className="text-sm font-semibold text-gray-900">{completedSessions}/{totalSessions}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Duration</p>
              <p className="text-sm font-semibold text-gray-900">{campaign.duration_minutes}m</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Complete</p>
              <p className="text-sm font-semibold text-gray-900">{completionRate}%</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-white/50 rounded-full overflow-hidden mb-4">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Calendar className="w-3 h-3" />
            {campaign.start_date && format(new Date(campaign.start_date), 'MMM d, yyyy')}
          </div>
          <Link to={createPageUrl('InterviewDetails') + `?id=${campaign.id}`}>
            <Button size="sm" className="bg-gray-900 hover:bg-gray-800 text-white">
              View Details
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}