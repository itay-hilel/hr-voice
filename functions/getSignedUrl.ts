import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { agentId } = await req.json();

    if (!agentId) {
      return Response.json({ error: 'agentId is required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 500 });
    }

    // Get signed URL from ElevenLabs for the widget
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      return Response.json({ 
        error: 'Failed to get signed URL', 
        details: errorText 
      }, { status: response.status });
    }

    const body = await response.json();
    
    return Response.json({
      signed_url: body.signed_url
    });

  } catch (error) {
    console.error('Error getting signed URL:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});