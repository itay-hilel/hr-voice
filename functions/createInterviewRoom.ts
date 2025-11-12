import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { AccessToken } from 'npm:livekit-server-sdk@2.7.2';

// Configure LiveKit
const LIVEKIT_API_KEY = Deno.env.get("LIVEKIT_API_KEY");
const LIVEKIT_API_SECRET = Deno.env.get("LIVEKIT_API_SECRET");
const LIVEKIT_URL = Deno.env.get("LIVEKIT_URL") || "wss://your-project.livekit.cloud";

Deno.serve(async (req) => {
    // 1. Authenticate user and parse request
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
        return new Response(
            JSON.stringify({ error: 'LIVEKIT_API_KEY or LIVEKIT_API_SECRET is not configured.' }), 
            { status: 500 }
        );
    }

    const { 
        interviewId,
        sessionId,
        participantName,
        ttl 
    } = await req.json();
    
    if (!interviewId || !sessionId || !participantName) {
        return new Response(
            JSON.stringify({ error: 'interviewId, sessionId, and participantName are required.' }), 
            { status: 400 }
        );
    }

    try {
        // Generate unique room name based on session
        const roomName = `interview-${interviewId}-${sessionId}`;
        const tokenTTL = ttl || '2h';

        console.log("=== DEBUG: Creating interview room ===");
        console.log({
            roomName,
            interviewId,
            sessionId,
            participantName,
            userId: user.id,
            userEmail: user.email
        });

        // Create participant token (employee)
        const participantIdentity = `employee-${user.id}-${Date.now()}`;
        const participantToken = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
            identity: participantIdentity,
            name: participantName,
            ttl: tokenTTL,
        });

        participantToken.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });

        const participantJWT = await participantToken.toJwt();

        console.log("=== DEBUG: Participant token created ===");
        console.log({ identity: participantIdentity, name: participantName });

        // Create AI agent token (interviewer)
        const agentIdentity = `ai-agent-${Date.now()}`;
        const agentToken = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
            identity: agentIdentity,
            name: "AI Interviewer",
            ttl: tokenTTL,
        });

        agentToken.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });

        const agentJWT = await agentToken.toJwt();

        console.log("=== DEBUG: AI Agent token created ===");
        console.log({ identity: agentIdentity });

        // Update session with room info
        await base44.entities.InterviewSession.update(sessionId, {
            session_status: 'In Progress',
            started_at: new Date().toISOString()
        });

        console.log("=== DEBUG: Interview room created successfully ===");

        // Return tokens and connection info
        return new Response(JSON.stringify({
            roomName,
            serverUrl: LIVEKIT_URL,
            participant: {
                token: participantJWT,
                name: participantName,
                identity: participantIdentity
            },
            agent: {
                token: agentJWT,
                identity: agentIdentity
            },
            expiresIn: tokenTTL,
            interviewId,
            sessionId
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("=== DEBUG: Error in createInterviewRoom function ===");
        console.error(error);
        return new Response(
            JSON.stringify({ error: error.message }), 
            { status: 500 }
        );
    }
});