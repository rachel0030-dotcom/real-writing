export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const VOICE = '21m00Tcm4TlvDq8ikWAM'; // Rachel
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVEN_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: req.body.text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.8,
            style: 0.35,
            use_speaker_boost: true,
          },
        }),
      }
    );
    if (!response.ok) throw new Error('ElevenLabs error ' + response.status);
    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(buffer));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
