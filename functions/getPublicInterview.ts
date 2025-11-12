import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const { interviewId } = await req.json();

        if (!interviewId) {
            return Response.json({ 
                error: 'Missing interviewId parameter' 
            }, { status: 400 });
        }

        // Use service role to fetch interview details (public access)
        const interviews = await base44.asServiceRole.entities.VoiceInterview.filter({ 
            id: interviewId 
        });

        if (!interviews || interviews.length === 0) {
            return Response.json({ 
                error: 'Interview not found' 
            }, { status: 404 });
        }

        const interview = interviews[0];

        // Return only safe, public fields (no sensitive data)
        return Response.json({
            id: interview.id,
            title: interview.title,
            topic: interview.topic,
            ai_tone: interview.ai_tone,
            duration_minutes: interview.duration_minutes,
            is_anonymous: interview.is_anonymous,
            welcome_message: interview.welcome_message,
            status: interview.status
        });

    } catch (error) {
        console.error('Error fetching interview:', error);
        return Response.json({ 
            error: error.message || 'Failed to fetch interview' 
        }, { status: 500 });
    }
});