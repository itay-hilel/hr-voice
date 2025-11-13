import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify user is authenticated
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { interviewId, sessionId } = await req.json();

        if (!interviewId || !sessionId) {
            return Response.json({ 
                error: 'Missing required parameters: interviewId, sessionId' 
            }, { status: 400 });
        }

        // Get ElevenLabs credentials from environment
        const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
        const agentId = Deno.env.get('ELEVENLABS_AGENT_ID');

        if (!apiKey || !agentId) {
            return Response.json({ 
                error: 'ElevenLabs credentials not configured. Please set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID in your app secrets.' 
            }, { status: 500 });
        }

        // Get interview and session details
        const interview = await base44.asServiceRole.entities.VoiceInterview.filter({ id: interviewId });
        if (!interview || interview.length === 0) {
            return Response.json({ error: 'Interview not found' }, { status: 404 });
        }

        const session = await base44.entities.InterviewSession.filter({ id: sessionId });
        if (!session || session.length === 0) {
            return Response.json({ error: 'Session not found' }, { status: 404 });
        }

        // Create conversation with ElevenLabs
        const elevenLabsResponse = await fetch('https://api.elevenlabs.io/v1/convai/conversations', {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                agent_id: agentId,
                // Optional: Pass custom data to the agent
                metadata: {
                    interview_id: interviewId,
                    session_id: sessionId,
                    topic: interview[0].topic,
                    duration_minutes: interview[0].duration_minutes,
                    employee_email: user.email
                }
            })
        });

        if (!elevenLabsResponse.ok) {
            const error = await elevenLabsResponse.text();
            console.error('ElevenLabs API error:', error);
            return Response.json({ 
                error: 'Failed to create conversation with ElevenLabs',
                details: error 
            }, { status: elevenLabsResponse.status });
        }

        const data = await elevenLabsResponse.json();

        // Update session with conversation ID
        await base44.entities.InterviewSession.update(sessionId, {
            session_status: 'In Progress',
            started_at: new Date().toISOString(),
            // Store ElevenLabs conversation ID for later transcript retrieval
            join_token: data.conversation_id
        });

        return Response.json({
            conversation_id: data.conversation_id,
            agent_id: agentId
        });

    } catch (error) {
        console.error('Error creating ElevenLabs conversation:', error);
        return Response.json({ 
            error: error.message || 'Failed to create conversation' 
        }, { status: 500 });
    }
});