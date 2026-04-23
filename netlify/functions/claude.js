exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const apiKey = event.headers['x-api-key'] || event.headers['X-Api-Key'];

    if (!apiKey) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: { message: 'API key no proporcionada' } })
      };
    }

    const body = JSON.parse(event.body);

    // Convertir formato Claude a formato Gemini
    const systemPrompt = body.system || '';
    const messages = body.messages || [];

    const geminiContents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const geminiBody = {
      system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      contents: geminiContents,
      generationConfig: {
        maxOutputTokens: 600,
        temperature: 0.7
      }
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody)
      }
    );

    const data = await response.json();

    if (data.error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: { message: data.error.message } })
      };
    }

    // Convertir respuesta Gemini a formato Claude para que el frontend no cambie
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta';
    const claudeFormat = {
      content: [{ type: 'text', text }]
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(claudeFormat)
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: { message: err.message } })
    };
  }
};
