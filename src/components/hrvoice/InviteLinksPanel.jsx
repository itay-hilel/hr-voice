import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Mail, CheckCircle, ExternalLink } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";

export default function InviteLinksPanel({ interview, sessions }) {
  const [copiedEmail, setCopiedEmail] = useState(null);
  
  const sendEmailMutation = useMutation({
    mutationFn: async ({ email, link, employeeName }) => {
      return base44.integrations.Core.SendEmail({
        to: email,
        subject: `Voice Interview Invitation: ${interview.title}`,
        body: `
Hello ${employeeName || ''},

You've been invited to participate in a voice interview: "${interview.title}"

Topic: ${interview.topic}
Duration: ${interview.duration_minutes} minute${interview.duration_minutes > 1 ? 's' : ''}
Privacy: ${interview.is_anonymous ? 'Your responses will be anonymous' : 'Your responses will be identified'}

${interview.welcome_message ? `\nMessage from HR:\n${interview.welcome_message}\n` : ''}

Click here to join your interview:
${link}

This conversation helps us understand how you're doing and what matters most to you. Your honest feedback drives meaningful improvements.

Best regards,
HR Team
        `.trim()
      });
    }
  });

  const generateLink = (email) => {
    const baseUrl = window.location.origin;
    const session = sessions.find(s => s.employee_email === email);
    return `${baseUrl}/EmployeeJoin?id=${interview.id}&email=${encodeURIComponent(email)}${session ? `&session=${session.id}` : ''}`;
  };

  const copyToClipboard = (email) => {
    const link = generateLink(email);
    navigator.clipboard.writeText(link);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const sendEmail = async (email) => {
    const link = generateLink(email);
    const employeeName = email.split('@')[0];
    
    await sendEmailMutation.mutateAsync({ email, link, employeeName });
  };

  const getSessionStatus = (email) => {
    const session = sessions.find(s => s.employee_email === email);
    return session?.session_status || 'Not Started';
  };

  const statusColors = {
    'Completed': 'bg-green-100 text-green-700 border-green-200',
    'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
    'Pending': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Not Started': 'bg-gray-100 text-gray-700 border-gray-200'
  };

  return (
    <Card className="p-6 border-0 shadow-lg bg-white">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Employee Invitations</h3>
        <Button
          onClick={async () => {
            for (const email of interview.target_employees) {
              await sendEmail(email);
            }
          }}
          disabled={sendEmailMutation.isPending}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Mail className="w-4 h-4 mr-2" />
          {sendEmailMutation.isPending ? 'Sending...' : 'Send All Invites'}
        </Button>
      </div>

      <div className="space-y-3">
        {interview.target_employees?.map((email) => {
          const status = getSessionStatus(email);
          const link = generateLink(email);
          
          return (
            <div
              key={email}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl hover:shadow-md transition-shadow"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900">{email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`text-xs border ${statusColors[status]}`}>
                    {status}
                  </Badge>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Preview link
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(email)}
                  className="flex items-center gap-2"
                >
                  {copiedEmail === email ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={() => sendEmail(email)}
                  disabled={sendEmailMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {sendEmailMutation.isSuccess && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm font-medium text-green-900">
              Invitation emails sent successfully!
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}