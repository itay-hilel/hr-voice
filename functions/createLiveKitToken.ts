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

    const { roomName, participantName, ttl, canPublish, canSubscribe } = await req.json();
    
    if (!roomName || !participantName) {
        return new Response(
            JSON.stringify({ error: 'roomName and participantName are required.' }), 
            { status: 400 }
        );
    }

    try {
        console.log("=== DEBUG: Creating LiveKit token ===");
        console.log({
            roomName,
            participantName,
            userId: user.id,
            userEmail: user.email
        });

        // 2. Generate unique identity using user info
        const identity = `user-${user.id}-${Date.now()}`;
        const tokenTTL = ttl || '2h';

        // 3. Create access token
        const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
            identity,
            name: participantName,
            ttl: tokenTTL,
        });

        token.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: canPublish !== false,
            canSubscribe: canSubscribe !== false,
            canPublishData: true,
        });

        const jwt = await token.toJwt();

        console.log("=== DEBUG: Token created successfully ===");
        console.log({
            roomName,
            identity,
            expiresIn: tokenTTL
        });

        // 4. Return token and connection info
        return new Response(JSON.stringify({
            token: jwt,
            serverUrl: LIVEKIT_URL,
            roomName,
            participantName,
            participantIdentity: identity,
            expiresIn: tokenTTL,
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("=== DEBUG: Error in createLiveKitToken function ===");
        console.error(error);
        return new Response(
            JSON.stringify({ error: error.message }), 
            { status: 500 }
        );
    }
});