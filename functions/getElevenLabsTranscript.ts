import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, sessionId } = await req.json();

    if (!conversationId || !sessionId) {
      return Response.json({ 
        error: 'conversationId and sessionId are required' 
      }, { status: 400 });
    }

    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 500 });
    }

    // Fetch conversation transcript from ElevenLabs
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
      headers: {
        'xi-api-key': apiKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      return Response.json({ 
        error: 'Failed to fetch transcript', 
        details: errorText 
      }, { status: response.status });
    }

    const conversationData = await response.json();
    
    // Extract transcript
    const transcript = conversationData.transcript || '';
    const messages = conversationData.messages || [];

    // Perform basic sentiment analysis
    const transcriptLower = transcript.toLowerCase();
    const positiveWords = ['good', 'great', 'happy', 'satisfied', 'excellent', 'love', 'enjoy', 'positive', 'appreciate'];
    const negativeWords = ['bad', 'poor', 'unhappy', 'frustrated', 'terrible', 'hate', 'difficult', 'stressed', 'overwhelmed'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      const matches = transcriptLower.match(new RegExp(word, 'g'));
      if (matches) positiveCount += matches.length;
    });
    
    negativeWords.forEach(word => {
      const matches = transcriptLower.match(new RegExp(word, 'g'));
      if (matches) negativeCount += matches.length;
    });
    
    const totalSentimentWords = positiveCount + negativeCount;
    const sentimentScore = totalSentimentWords > 0 
      ? (positiveCount - negativeCount) / totalSentimentWords
      : 0;

    // Extract key themes (simple keyword matching)
    const themeKeywords = {
      'Work-Life Balance': ['balance', 'overtime', 'hours', 'personal time', 'flexible'],
      'Management': ['manager', 'leadership', 'supervisor', 'boss', 'support'],
      'Team': ['team', 'colleague', 'collaboration', 'together'],
      'Workload': ['workload', 'busy', 'overwhelmed', 'stressed', 'pressure'],
      'Growth': ['growth', 'development', 'learning', 'career', 'opportunity'],
      'Recognition': ['recognition', 'appreciated', 'valued', 'reward']
    };

    const keyThemes = [];
    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      const mentioned = keywords.some(keyword => transcriptLower.includes(keyword));
      if (mentioned) {
        keyThemes.push(theme);
      }
    }

    // Generate simple summary
    const summary = `Interview discussion covering ${keyThemes.length > 0 ? keyThemes.join(', ') : 'various topics'}. ` +
      `Sentiment: ${sentimentScore > 0.2 ? 'Positive' : sentimentScore < -0.2 ? 'Negative' : 'Neutral'}.`;

    // Flag urgency if very negative
    const urgencyFlag = sentimentScore < -0.3 || negativeCount > 5;

    // Generate recommended actions
    const recommendedActions = [];
    if (urgencyFlag) {
      recommendedActions.push('Schedule immediate 1-on-1 follow-up');
    }
    if (keyThemes.includes('Workload')) {
      recommendedActions.push('Review workload distribution');
    }
    if (keyThemes.includes('Management')) {
      recommendedActions.push('Provide feedback to management team');
    }
    if (sentimentScore > 0.3) {
      recommendedActions.push('Acknowledge positive feedback with team');
    }

    // Update session with analysis
    await base44.entities.InterviewSession.update(sessionId, {
      transcript: transcript,
      sentiment_score: sentimentScore,
      key_themes: keyThemes,
      summary: summary,
      urgency_flag: urgencyFlag,
      recommended_actions: recommendedActions,
      session_status: 'Completed',
      completed_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      sentiment_score: sentimentScore,
      key_themes: keyThemes,
      urgency_flag: urgencyFlag
    });

  } catch (error) {
    console.error('Error fetching transcript:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});