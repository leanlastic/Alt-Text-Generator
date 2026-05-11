'use strict';

const PLUGIN_ID = 'alt-text-generator';
const STORE_KEY = 'settings';

const store = (strapi) => strapi.store({ type: 'plugin', name: PLUGIN_ID });

function defaults(strapi) {
  return strapi.config.get(`plugin::${PLUGIN_ID}`) || { language: 'English', autoGenerate: true };
}

module.exports = ({ strapi }) => ({
  async seed() {
    const current = await store(strapi).get({ key: STORE_KEY });
    if (!current) {
      await store(strapi).set({ key: STORE_KEY, value: defaults(strapi) });
    }
  },

  async get() {
    const saved = (await store(strapi).get({ key: STORE_KEY })) || {};
    const base = { ...defaults(strapi), ...saved };
    // Env overrides
    if (process.env.ALT_TEXT_GENERATOR_LANG) {
      base.language = process.env.ALT_TEXT_GENERATOR_LANG;
    }
    return base;
  },

  async update(patch) {
    const current = (await store(strapi).get({ key: STORE_KEY })) || defaults(strapi);
    const next = {
      ...current,
      ...(typeof patch.language === 'string' ? { language: patch.language.trim() || current.language } : {}),
      ...(typeof patch.autoGenerate === 'boolean' ? { autoGenerate: patch.autoGenerate } : {}),
    };
    await store(strapi).set({ key: STORE_KEY, value: next });
    return this.get();
  },
});
