'use strict';

const PLUGIN_ID = 'alt-text-generator';

module.exports = async ({ strapi }) => {
  await strapi.plugin(PLUGIN_ID).service('settings').seed();

  strapi.db.lifecycles.subscribe({
    models: ['plugin::upload.file'],
    afterCreate(event) {
      const file = event.result;
      if (!file || typeof file.mime !== 'string' || !file.mime.startsWith('image/')) {
        return;
      }
      if (file.alternativeText && file.alternativeText.trim()) {
        return;
      }

      Promise.resolve()
        .then(async () => {
          const settings = await strapi.plugin(PLUGIN_ID).service('settings').get();
          if (!settings.autoGenerate) return;
          await strapi.plugin(PLUGIN_ID).service('altText').generateForFile(file);
        })
        .catch((err) => {
          strapi.log.error(`[${PLUGIN_ID}] auto-generate failed for file id=${file.id}: ${err.message}`);
        });
    },
  });
};
