import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { sessionId, data } = await req.json();

    if (!sessionId || !data) {
      return Response.json({ 
        error: 'sessionId and data are required' 
      }, { status: 400 });
    }

    // Use service role to update session (no auth required for public access)
    await base44.asServiceRole.entities.InterviewSession.update(sessionId, data);

    return Response.json({ success: true });

  } catch (error) {
    console.error('Error updating session:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});