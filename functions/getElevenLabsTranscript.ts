import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify user is authenticated
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { conversationId, sessionId } = await req.json();

        if (!conversationId || !sessionId) {
            return Response.json({ 
                error: 'Missing required parameters: conversationId, sessionId' 
            }, { status: 400 });
        }

        // Get ElevenLabs API key
        const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
        if (!apiKey) {
            return Response.json({ 
                error: 'ELEVENLABS_API_KEY not configured' 
            }, { status: 500 });
        }

        // Fetch conversation details from ElevenLabs
        const elevenLabsResponse = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
            {
                headers: {
                    'xi-api-key': apiKey
                }
            }
        );

        if (!elevenLabsResponse.ok) {
            const error = await elevenLabsResponse.text();
            console.error('ElevenLabs API error:', error);
            return Response.json({ 
                error: 'Failed to fetch conversation from ElevenLabs',
                details: error 
            }, { status: elevenLabsResponse.status });
        }

        const conversation = await elevenLabsResponse.json();

        // Extract transcript and analysis
        const transcript = conversation.transcript || [];
        const duration = conversation.metadata?.duration_seconds || 0;
        
        // Simple sentiment analysis based on conversation
        // You can enhance this with your own AI analysis
        let sentiment_score = 0.5; // neutral default
        const textContent = transcript.map(t => t.message).join(' ').toLowerCase();
        
        // Basic keyword sentiment
        const positiveWords = ['good', 'great', 'excellent', 'happy', 'satisfied', 'love'];
        const negativeWords = ['bad', 'poor', 'terrible', 'unhappy', 'frustrated', 'hate'];
        
        let positiveCount = 0;
        let negativeCount = 0;
        
        positiveWords.forEach(word => {
            if (textContent.includes(word)) positiveCount++;
        });
        negativeWords.forEach(word => {
            if (textContent.includes(word)) negativeCount++;
        });
        
        if (positiveCount + negativeCount > 0) {
            sentiment_score = positiveCount / (positiveCount + negativeCount);
        }

        // Extract key themes (simple approach)
        const key_themes = [];
        if (textContent.includes('work') || textContent.includes('workload')) key_themes.push('Workload');
        if (textContent.includes('team') || textContent.includes('collaborate')) key_themes.push('Team Collaboration');
        if (textContent.includes('balance') || textContent.includes('life')) key_themes.push('Work-Life Balance');
        if (textContent.includes('manager') || textContent.includes('management')) key_themes.push('Management');
        if (textContent.includes('grow') || textContent.includes('career')) key_themes.push('Career Growth');

        // Generate simple summary
        const summary = `Employee completed a ${Math.floor(duration / 60)} minute interview. ` +
            `Overall sentiment: ${sentiment_score >= 0.6 ? 'Positive' : sentiment_score >= 0.4 ? 'Neutral' : 'Negative'}. ` +
            (key_themes.length > 0 ? `Main topics discussed: ${key_themes.join(', ')}.` : '');

        // Recommended actions based on sentiment
        const recommended_actions = [];
        if (sentiment_score < 0.4) {
            recommended_actions.push('Schedule 1-on-1 follow-up meeting');
            recommended_actions.push('Address concerns raised in interview');
        } else if (sentiment_score >= 0.6) {
            recommended_actions.push('Continue current practices');
            recommended_actions.push('Share positive feedback with team');
        }

        // Update session with transcript and analysis
        await base44.entities.InterviewSession.update(sessionId, {
            session_status: 'Completed',
            completed_at: new Date().toISOString(),
            duration_seconds: duration,
            transcript: JSON.stringify(transcript),
            sentiment_score: sentiment_score,
            key_themes: key_themes,
            summary: summary,
            urgency_flag: sentiment_score < 0.3, // Flag if very negative
            recommended_actions: recommended_actions
        });

        return Response.json({
            success: true,
            conversation: conversation,
            analysis: {
                sentiment_score,
                key_themes,
                summary,
                recommended_actions
            }
        });

    } catch (error) {
        console.error('Error fetching ElevenLabs transcript:', error);
        return Response.json({ 
            error: error.message || 'Failed to fetch transcript' 
        }, { status: 500 });
    }
});