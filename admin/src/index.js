import { PLUGIN_ID } from './pluginId';
import { getTranslation } from './utils/getTranslation';
import PluginIcon from './components/PluginIcon';
import Initializer from './components/Initializer';

const name = 'Alt Text Generator';

export default {
  register(app) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: getTranslation('plugin.name'),
        defaultMessage: name,
      },
      Component: async () => {
        const { App } = await import('./pages/App');
        return App;
      },
      permissions: [],
    });

    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: getTranslation('plugin.name'),
          defaultMessage: name,
        },
      },
      [
        {
          intlLabel: {
            id: getTranslation('settings.title'),
            defaultMessage: 'Settings',
          },
          id: 'settings',
          to: `/settings/${PLUGIN_ID}`,
          Component: async () => {
            const mod = await import('./pages/Settings');
            return mod.default;
          },
          permissions: [],
        },
      ]
    );

    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name,
    });
  },

  bootstrap() {},

  async registerTrads({ locales }) {
    return Promise.all(
      (locales || []).map(async (locale) => {
        try {
          const { default: data } = await import(`./translations/${locale}.json`);
          return { data, locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  },
};
