'use strict';

const PLUGIN_ID = 'alt-text-generator';

module.exports = ({ strapi }) => ({
  async listMissing(ctx) {
    const limit = Math.min(Number(ctx.query.limit) || 100, 500);
    const offset = Math.max(Number(ctx.query.offset) || 0, 0);
    const { results, total } = await strapi.plugin(PLUGIN_ID).service('altText').listMissing({ limit, offset });
    ctx.body = {
      data: results.map((f) => ({
        id: f.id,
        documentId: f.documentId,
        name: f.name,
        url: f.url,
        mime: f.mime,
        alternativeText: f.alternativeText || null,
        width: f.width,
        height: f.height,
      })),
      meta: { total, limit, offset },
    };
  },

  async generate(ctx) {
    const id = Number(ctx.params.id);
    if (!id) return ctx.badRequest('invalid file id');
    try {
      const result = await strapi.plugin(PLUGIN_ID).service('altText').generateForFile(id);
      ctx.body = { data: result };
    } catch (err) {
      strapi.log.error(`[${PLUGIN_ID}] generate failed for id=${id}: ${err.message}`);
      ctx.throw(500, err.message);
    }
  },

  async backfill(ctx) {
    const limit = Math.min(Number(ctx.request.body?.limit) || 100, 500);
    const delayMs = Math.max(Number(ctx.request.body?.delayMs) || 500, 0);
    try {
      const summary = await strapi.plugin(PLUGIN_ID).service('altText').backfill({ limit, delayMs });
      ctx.body = { data: summary };
    } catch (err) {
      strapi.log.error(`[${PLUGIN_ID}] backfill failed: ${err.message}`);
      ctx.throw(500, err.message);
    }
  },
});
