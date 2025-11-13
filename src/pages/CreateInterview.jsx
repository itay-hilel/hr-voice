import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Send, Calendar } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Switch } from "@/components/ui/switch";

const topics = [
  { value: "Work-Life Balance", emoji: "⚖️", color: "from-purple-400 to-purple-600" },
  { value: "Team Collaboration", emoji: "🤝", color: "from-blue-400 to-blue-600" },
  { value: "Management Feedback", emoji: "💼", color: "from-pink-400 to-pink-600" },
  { value: "Career Growth", emoji: "📈", color: "from-green-400 to-green-600" },
  { value: "Company Culture", emoji: "🏢", color: "from-yellow-400 to-yellow-600" },
  { value: "Workload & Stress", emoji: "😓", color: "from-red-400 to-red-600" },
  { value: "Recognition & Rewards", emoji: "🏆", color: "from-indigo-400 to-indigo-600" },
  { value: "General Check-In", emoji: "💬", color: "from-gray-400 to-gray-600" }
];

const tones = ["Friendly", "Formal", "Empathetic", "Casual"];
const durations = [1, 2, 3, 5];

export default function CreateInterview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: '',
    topic: '',
    ai_tone: 'Friendly',
    duration_minutes: 2,
    target_employees: '',
    is_anonymous: true,
    start_date: new Date().toISOString().split('T')[0],
    welcome_message: '',
    status: 'Draft'
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const emailArray = data.target_employees
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0);
      
      // Step 1: Create ElevenLabs agent for this campaign
      const agentResponse = await base44.functions.invoke('createElevenLabsAgent', {
        title: data.title,
        topic: data.topic,
        ai_tone: data.ai_tone,
        duration_minutes: data.duration_minutes,
        welcome_message: data.welcome_message
      });

      if (!agentResponse.data.agent_id) {
        throw new Error('Failed to create AI agent');
      }

      // Step 2: Create interview with agent_id
      const interview = await base44.entities.VoiceInterview.create({
        ...data,
        target_employees: emailArray,
        agent_id: agentResponse.data.agent_id
      });

      // Step 3: Create pending sessions for each employee
      for (const email of emailArray) {
        await base44.entities.InterviewSession.create({
          interview_id: interview.id,
          employee_email: email,
          session_status: 'Pending'
        });
      }

      return interview;
    },
    onSuccess: (newInterview) => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      navigate(createPageUrl('InterviewDetails') + `?id=${newInterview.id}`);
    }
  });

  const handleSubmit = (e, status) => {
    e.preventDefault();
    createMutation.mutate({ ...formData, status });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Page Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full 
                          bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Create Voice Campaign</h1>
          <p className="text-lg text-gray-600">Set up an AI-powered conversation with your team</p>
        </div>

        <form onSubmit={(e) => handleSubmit(e, 'Active')}>
          {/* Campaign Basics */}
          <Card className="p-8 mb-6 border-0 shadow-lg bg-white/80 backdrop-blur">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Campaign Details</h2>
            
            <div className="space-y-6">
              <div>
                <Label htmlFor="title" className="text-base font-semibold">Campaign Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Q4 Team Check-In"
                  required
                  className="mt-2 h-12 text-base"
                />
              </div>

              <div>
                <Label className="text-base font-semibold mb-3 block">Interview Topic *</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {topics.map(topic => (
                    <button
                      key={topic.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, topic: topic.value })}
                      className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                        formData.topic === topic.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="text-3xl mb-2">{topic.emoji}</div>
                      <p className="text-xs font-medium text-gray-900">{topic.value}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="ai_tone" className="text-base font-semibold">AI Tone</Label>
                  <Select value={formData.ai_tone} onValueChange={(v) => setFormData({ ...formData, ai_tone: v })}>
                    <SelectTrigger className="mt-2 h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tones.map(tone => (
                        <SelectItem key={tone} value={tone}>{tone}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="duration" className="text-base font-semibold">Duration</Label>
                  <Select 
                    value={String(formData.duration_minutes)} 
                    onValueChange={(v) => setFormData({ ...formData, duration_minutes: Number(v) })}
                  >
                    <SelectTrigger className="mt-2 h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {durations.map(d => (
                        <SelectItem key={d} value={String(d)}>{d} minute{d > 1 ? 's' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="start_date" className="text-base font-semibold">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="mt-2 h-12"
                />
              </div>
            </div>
          </Card>

          {/* Participants */}
          <Card className="p-8 mb-6 border-0 shadow-lg bg-white/80 backdrop-blur">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Participants</h2>
            
            <div className="space-y-6">
              <div>
                <Label htmlFor="emails" className="text-base font-semibold">Employee Emails *</Label>
                <Textarea
                  id="emails"
                  value={formData.target_employees}
                  onChange={(e) => setFormData({ ...formData, target_employees: e.target.value })}
                  placeholder="Enter email addresses, separated by commas&#10;e.g., john@company.com, jane@company.com"
                  required
                  className="mt-2 min-h-[100px]"
                />
                <p className="text-sm text-gray-500 mt-2">Separate multiple emails with commas</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
                <div>
                  <Label htmlFor="anonymous" className="text-base font-semibold">Anonymous Responses</Label>
                  <p className="text-sm text-gray-600 mt-1">Employee identities won't be visible in results</p>
                </div>
                <Switch
                  id="anonymous"
                  checked={formData.is_anonymous}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_anonymous: checked })}
                />
              </div>
            </div>
          </Card>

          {/* Optional Welcome Message */}
          <Card className="p-8 mb-8 border-0 shadow-lg bg-white/80 backdrop-blur">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Customization (Optional)</h2>
            
            <div>
              <Label htmlFor="welcome" className="text-base font-semibold">Welcome Message</Label>
              <Textarea
                id="welcome"
                value={formData.welcome_message}
                onChange={(e) => setFormData({ ...formData, welcome_message: e.target.value })}
                placeholder="Add a personal welcome message for participants..."
                className="mt-2 min-h-[80px]"
              />
              <p className="text-sm text-gray-500 mt-2">
                This will be used by the AI to greet employees at the start of the interview
              </p>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={(e) => handleSubmit(e, 'Draft')}
              disabled={createMutation.isPending}
            >
              Save as Draft
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {createMutation.isPending ? (
                <>Creating AI Agent...</>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Launch Campaign
                </>
              )}
            </Button>
          </div>

          {createMutation.isError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">
                {createMutation.error?.message || 'Failed to create campaign'}
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}