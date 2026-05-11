'use strict';

const ALT_PROMPT = (lang) =>
  `Write concise, descriptive alt text for this image in ${lang}. ` +
  'Max 125 characters. Describe the visually important elements — ' +
  'subjects, action, setting, notable details. ' +
  'Do not start with "Image of", "Picture of", or "Photo of". ' +
  'No surrounding quotes, no trailing period.';

const DEFAULT_MODEL = 'gpt-4o-mini';

let cachedClient = null;
let cachedKey = null;

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  if (cachedClient && cachedKey === apiKey) {
    return cachedClient;
  }
  // Lazy require so the module is only loaded when actually used.
  const OpenAI = require('openai');
  const opts = { apiKey, maxRetries: 5, timeout: 120_000 };
  if (process.env.OPENAI_BASE_URL) {
    opts.baseURL = process.env.OPENAI_BASE_URL;
  }
  cachedClient = new OpenAI(opts);
  cachedKey = apiKey;
  return cachedClient;
}

module.exports = () => ({
  isConfigured() {
    return Boolean(process.env.OPENAI_API_KEY);
  },

  async generate({ mime, buffer, language }) {
    const client = getClient();
    const model = process.env.ALT_TEXT_GENERATOR_MODEL || DEFAULT_MODEL;
    const dataUrl = `data:${mime || 'image/jpeg'};base64,${buffer.toString('base64')}`;

    const resp = await client.chat.completions.create({
      model,
      max_tokens: 120,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: ALT_PROMPT(language || 'English') },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    });

    const text = (resp.choices?.[0]?.message?.content || '').trim();
    return text.replace(/^["']|["']$/g, '').replace(/\.$/, '').trim();
  },
});
