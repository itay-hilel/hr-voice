import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { AccessToken } from 'npm:livekit-server-sdk@2.6.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify user is authenticated
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { interviewId, sessionId, participantName, ttl } = await req.json();

        if (!interviewId || !sessionId) {
            return Response.json({ 
                error: 'Missing required parameters: interviewId, sessionId' 
            }, { status: 400 });
        }

        // Get LiveKit credentials from environment
        const livekitUrl = Deno.env.get('LIVEKIT_URL');
        const apiKey = Deno.env.get('LIVEKIT_API_KEY');
        const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');

        if (!livekitUrl || !apiKey || !apiSecret) {
            return Response.json({ 
                error: 'LiveKit credentials not configured. Please set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in your app secrets.' 
            }, { status: 500 });
        }

        // Create unique room name for this session
        const roomName = `interview_${interviewId}_${sessionId}`;

        // Create participant token (employee)
        const participantToken = new AccessToken(apiKey, apiSecret, {
            identity: `employee_${user.email}`,
            name: participantName || 'Employee',
            ttl: ttl || '5m'
        });
        
        participantToken.addGrant({
            room: roomName,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true
        });

        // Create AI interviewer token
        const aiToken = new AccessToken(apiKey, apiSecret, {
            identity: `ai_interviewer_${sessionId}`,
            name: 'AI Interviewer',
            ttl: ttl || '5m'
        });
        
        aiToken.addGrant({
            room: roomName,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true
        });

        // Update session to mark as started
        await base44.entities.InterviewSession.update(sessionId, {
            session_status: 'In Progress',
            started_at: new Date().toISOString()
        });

        return Response.json({
            serverUrl: livekitUrl,
            roomName: roomName,
            participant: {
                token: await participantToken.toJwt(),
                identity: `employee_${user.email}`,
                name: participantName || 'Employee'
            },
            aiInterviewer: {
                token: await aiToken.toJwt(),
                identity: `ai_interviewer_${sessionId}`,
                name: 'AI Interviewer'
            }
        });

    } catch (error) {
        console.error('Error creating interview room:', error);
        return Response.json({ 
            error: error.message || 'Failed to create interview room' 
        }, { status: 500 });
    }
});