import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    console.log('=== getPublicInterview function called ===');
    
    try {
        const base44 = createClientFromRequest(req);
        
        // Parse request body
        let body;
        try {
            body = await req.json();
            console.log('Request body:', body);
        } catch (e) {
            console.error('Failed to parse request body:', e);
            return Response.json({ 
                error: 'Invalid request body - must be JSON' 
            }, { status: 400 });
        }

        const { interviewId } = body;

        if (!interviewId) {
            console.error('Missing interviewId parameter');
            return Response.json({ 
                error: 'Missing interviewId parameter' 
            }, { status: 400 });
        }

        console.log('Fetching interview with ID:', interviewId);

        // Use service role to fetch interview details (public access)
        const interviews = await base44.asServiceRole.entities.VoiceInterview.filter({ 
            id: interviewId 
        });

        console.log('Query result:', interviews);

        if (!interviews || interviews.length === 0) {
            console.error('Interview not found');
            return Response.json({ 
                error: 'Interview not found',
                interviewId: interviewId
            }, { status: 404 });
        }

        const interview = interviews[0];
        console.log('Interview found:', interview.id);

        // Return only safe, public fields (no sensitive data)
        const safeData = {
            id: interview.id,
            title: interview.title,
            topic: interview.topic,
            ai_tone: interview.ai_tone,
            duration_minutes: interview.duration_minutes,
            is_anonymous: interview.is_anonymous,
            welcome_message: interview.welcome_message,
            status: interview.status
        };

        console.log('Returning safe data:', safeData);
        return Response.json(safeData);

    } catch (error) {
        console.error('=== ERROR in getPublicInterview ===');
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        return Response.json({ 
            error: error.message || 'Failed to fetch interview',
            errorType: error.constructor.name,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
});