'use strict';

const PLUGIN_ID = 'alt-text-generator';

module.exports = async ({ strapi }) => {
  await strapi.plugin(PLUGIN_ID).service('settings').seed();

  // How long we'll block the upload response waiting for OpenAI.
  // If exceeded, generation continues in the background and the alt text
  // shows up on the next Media Library refresh.
  const SYNC_TIMEOUT_MS = 15_000;

  strapi.db.lifecycles.subscribe({
    models: ['plugin::upload.file'],
    async afterCreate(event) {
      const file = event.result;
      if (!file || typeof file.mime !== 'string' || !file.mime.startsWith('image/')) {
        return;
      }
      if (file.alternativeText && file.alternativeText.trim()) {
        return;
      }

      let settings;
      try {
        settings = await strapi.plugin(PLUGIN_ID).service('settings').get();
      } catch (err) {
        strapi.log.error(`[${PLUGIN_ID}] failed to load settings: ${err.message}`);
        return;
      }
      if (!settings.autoGenerate) return;

      const generation = strapi.plugin(PLUGIN_ID).service('altText').generateForFile(file);
      // Make sure the background tail never bubbles up as an unhandled rejection.
      generation.catch((err) => {
        strapi.log.error(`[${PLUGIN_ID}] auto-generate failed for file id=${file.id}: ${err.message}`);
      });

      const TIMEOUT = Symbol('timeout');
      const timer = new Promise((resolve) => setTimeout(() => resolve(TIMEOUT), SYNC_TIMEOUT_MS));

      const winner = await Promise.race([generation.then((r) => r).catch(() => null), timer]);
      if (winner === TIMEOUT) {
        strapi.log.warn(
          `[${PLUGIN_ID}] generation for id=${file.id} exceeded ${SYNC_TIMEOUT_MS}ms — ` +
            'continuing in background; alt text will appear on next refresh'
        );
        return;
      }
      if (winner && winner.alternativeText) {
        // Mutating event.result propagates to the upload service's return value,
        // so the POST /upload response carries the alt text and the admin Media
        // Library shows it without needing a manual refresh.
        event.result.alternativeText = winner.alternativeText;
      }
    },
  });
};
