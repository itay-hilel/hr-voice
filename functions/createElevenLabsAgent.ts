import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, topic, ai_tone, duration_minutes, welcome_message } = await req.json();

    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 500 });
    }

    // Build the system prompt based on campaign settings
    const systemPrompt = `You are an ${ai_tone.toLowerCase()} HR interviewer conducting a voice interview about "${topic}".

Your goal is to:
1. Make the employee feel comfortable and heard
2. Ask open-ended questions about their experience with ${topic.toLowerCase()}
3. Listen actively and ask follow-up questions based on their responses
4. Keep the conversation natural and conversational
5. Cover key areas: satisfaction, challenges, suggestions for improvement
6. Keep the interview under ${duration_minutes} minute${duration_minutes > 1 ? 's' : ''}

${welcome_message ? `Start with: "${welcome_message}"` : `Start by warmly greeting them and explaining you'll be discussing ${topic.toLowerCase()}.`}

Be ${ai_tone.toLowerCase()}, professional, and genuinely interested in their feedback. End the interview gracefully after ${duration_minutes} minute${duration_minutes > 1 ? 's' : ''} or when they've shared their thoughts.`;

    // Create agent via ElevenLabs API
    const response = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `${title} - ${topic}`,
        prompt: {
          prompt: systemPrompt
        },
        conversation_config: {
          agent: {
            prompt: {
              prompt: systemPrompt
            }
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      return Response.json({ 
        error: 'Failed to create agent', 
        details: errorText 
      }, { status: response.status });
    }

    const agentData = await response.json();

    return Response.json({
      agent_id: agentData.agent_id
    });

  } catch (error) {
    console.error('Error creating ElevenLabs agent:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});