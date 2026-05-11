'use strict';

const fs = require('fs');
const path = require('path');

const PLUGIN_ID = 'alt-text-generator';
const FILE_MODEL = 'plugin::upload.file';

async function loadBuffer(strapi, file) {
  // Remote providers expose absolute URLs.
  if (file.url && /^https?:\/\//i.test(file.url)) {
    const res = await fetch(file.url);
    if (!res.ok) {
      throw new Error(`fetch ${file.url} → ${res.status}`);
    }
    const ct = res.headers.get('content-type') || file.mime || 'image/jpeg';
    return { mime: ct.split(';')[0].trim(), buffer: Buffer.from(await res.arrayBuffer()) };
  }
  // Local provider: read from disk to avoid depending on a configured public URL.
  const publicDir = strapi.dirs?.static?.public || path.join(strapi.dirs?.app?.root || process.cwd(), 'public');
  const localPath = path.join(publicDir, file.url || '');
  const buffer = await fs.promises.readFile(localPath);
  return { mime: file.mime || 'image/jpeg', buffer };
}

function isImage(file) {
  return Boolean(file && typeof file.mime === 'string' && file.mime.startsWith('image/'));
}

function hasAlt(file) {
  return Boolean(file && file.alternativeText && file.alternativeText.trim());
}

module.exports = ({ strapi }) => ({
  async listMissing({ limit = 100, offset = 0 } = {}) {
    const where = {
      mime: { $startsWith: 'image/' },
      $or: [{ alternativeText: { $null: true } }, { alternativeText: '' }],
    };
    const [results, total] = await Promise.all([
      strapi.db.query(FILE_MODEL).findMany({
        where,
        limit,
        offset,
        orderBy: { createdAt: 'desc' },
      }),
      strapi.db.query(FILE_MODEL).count({ where }),
    ]);
    return { results, total };
  },

  async generateForFile(fileOrId) {
    const file =
      typeof fileOrId === 'object'
        ? fileOrId
        : await strapi.db.query(FILE_MODEL).findOne({ where: { id: fileOrId } });

    if (!file) {
      throw new Error(`file ${fileOrId} not found`);
    }
    if (!isImage(file)) {
      strapi.log.debug(`[${PLUGIN_ID}] skipping non-image file id=${file.id} mime=${file.mime}`);
      return { skipped: 'not-an-image', file };
    }
    if (hasAlt(file)) {
      strapi.log.debug(`[${PLUGIN_ID}] skipping file id=${file.id} (already has alt text)`);
      return { skipped: 'has-alt', file };
    }
    const openai = strapi.plugin(PLUGIN_ID).service('openai');
    if (!openai.isConfigured()) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    const { language } = await strapi.plugin(PLUGIN_ID).service('settings').get();
    const { mime, buffer } = await loadBuffer(strapi, file);
    const alt = await openai.generate({ mime, buffer, language });

    if (!alt) {
      throw new Error('OpenAI returned empty alt text');
    }

    // Use the official upload service so we don't bypass any internal sync logic.
    // Falls back to a direct db query if the upload plugin's API is unavailable.
    const uploadSvc = strapi.plugin('upload')?.service('upload');
    if (uploadSvc && typeof uploadSvc.updateFileInfo === 'function') {
      await uploadSvc.updateFileInfo(file.id, { alternativeText: alt });
    } else {
      await strapi.db.query(FILE_MODEL).update({
        where: { id: file.id },
        data: { alternativeText: alt },
      });
    }

    // Verify the write actually landed — guards against silent overwrites and
    // gives us a clear error in the logs instead of "looks generated but UI is empty".
    const after = await strapi.db.query(FILE_MODEL).findOne({
      where: { id: file.id },
      select: ['id', 'alternativeText'],
    });
    if (!after || (after.alternativeText || '').trim() !== alt.trim()) {
      strapi.log.error(
        `[${PLUGIN_ID}] write did not persist for file id=${file.id}. ` +
          `expected="${alt}" actual="${after?.alternativeText || ''}"`
      );
      throw new Error('Alt text update did not persist');
    }
    strapi.log.info(`[${PLUGIN_ID}] saved alt for file id=${file.id}: "${alt}"`);
    return { file: { ...file, alternativeText: alt }, alternativeText: alt };
  },

  async backfill({ limit = 100, delayMs = 500 } = {}) {
    const { results } = await this.listMissing({ limit });
    const summary = { processed: 0, saved: 0, skipped: 0, failed: 0, errors: [] };
    for (const file of results) {
      summary.processed += 1;
      try {
        const r = await this.generateForFile(file);
        if (r.skipped) summary.skipped += 1;
        else summary.saved += 1;
      } catch (err) {
        summary.failed += 1;
        summary.errors.push({ id: file.id, name: file.name, message: err.message });
        strapi.log.error(`[${PLUGIN_ID}] backfill failed for id=${file.id}: ${err.message}`);
      }
      if (delayMs > 0 && summary.processed < results.length) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    return summary;
  },
});
