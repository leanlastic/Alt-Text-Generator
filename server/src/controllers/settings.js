'use strict';

const PLUGIN_ID = 'alt-text-generator';

module.exports = ({ strapi }) => ({
  async find(ctx) {
    const data = await strapi.plugin(PLUGIN_ID).service('settings').get();
    ctx.body = { data, openAIConfigured: strapi.plugin(PLUGIN_ID).service('openai').isConfigured() };
  },

  async update(ctx) {
    const body = ctx.request.body || {};
    const data = await strapi.plugin(PLUGIN_ID).service('settings').update(body);
    ctx.body = { data };
  },
});
