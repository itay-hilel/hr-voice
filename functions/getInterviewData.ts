import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { interviewId, sessionId } = await req.json();

    if (!interviewId || !sessionId) {
      return Response.json({ 
        error: 'interviewId and sessionId are required' 
      }, { status: 400 });
    }

    // Use service role to fetch data (no auth required for public access)
    const interviews = await base44.asServiceRole.entities.VoiceInterview.list();
    const interview = interviews.find(i => i.id === interviewId);

    const sessions = await base44.asServiceRole.entities.InterviewSession.list();
    const session = sessions.find(s => s.id === sessionId);

    if (!interview || !session) {
      return Response.json({ 
        error: 'Interview or session not found',
        interview: !!interview,
        session: !!session
      }, { status: 404 });
    }

    return Response.json({
      interview,
      session
    });

  } catch (error) {
    console.error('Error fetching interview data:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});