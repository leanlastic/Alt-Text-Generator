'use strict';

module.exports = {
  admin: {
    type: 'admin',
    routes: [
      {
        method: 'GET',
        path: '/settings',
        handler: 'settings.find',
        config: { policies: [] },
      },
      {
        method: 'PUT',
        path: '/settings',
        handler: 'settings.update',
        config: { policies: [] },
      },
      {
        method: 'GET',
        path: '/missing',
        handler: 'alt-text.listMissing',
        config: { policies: [] },
      },
      {
        method: 'POST',
        path: '/generate/:id',
        handler: 'alt-text.generate',
        config: { policies: [] },
      },
      {
        method: 'POST',
        path: '/backfill',
        handler: 'alt-text.backfill',
        config: { policies: [] },
      },
    ],
  },
};
