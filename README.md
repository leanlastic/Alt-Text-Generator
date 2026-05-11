# Strapi Plugin: Alt Text Generator

Automatically generate accessible alt text for images in your Strapi v5 Media Library using OpenAI vision models.

- **Auto-generate on upload** — lifecycle hook fills `alternativeText` whenever an image is uploaded without one.
- **Manual per asset** — generate alt text on demand for any image from the plugin's admin page.
- **Bulk backfill** — generate alt text for all existing images that are still missing one.
- **Never overwrites** — existing alt text set by editors is left untouched.

Built for Strapi **v5**.

---

## Installation

```bash
npm install strapi-plugin-alt-text-generator
# or
yarn add strapi-plugin-alt-text-generator
```

Then enable the plugin in `config/plugins.js`:

```js
module.exports = ({ env }) => ({
  'alt-text-generator': {
    enabled: true,
  },
});
```

Rebuild the admin panel and restart Strapi:

```bash
npm run build
npm run develop
```

## Configuration

### Required environment variable

Add your OpenAI API key to `.env`:

```env
OPENAI_API_KEY=sk-...
```

### Optional environment variables

These override admin settings when present:

| Variable                     | Default        | Description                                          |
| ---------------------------- | -------------- | ---------------------------------------------------- |
| `ALT_TEXT_GENERATOR_MODEL`   | `gpt-4o-mini`  | OpenAI vision model to use.                          |
| `ALT_TEXT_GENERATOR_LANG`    | _(admin)_      | Language for generated alt text (e.g. `English`).    |
| `OPENAI_BASE_URL`            | _(unset)_      | Custom OpenAI-compatible endpoint, if needed.        |

### Admin settings

Go to **Settings → Alt Text Generator** in the Strapi admin to configure:

- **Language** — the language alt text should be written in. Defaults to `English`.
- **Auto-generate on upload** — whether to run automatically when new images are uploaded.

## Usage

### Automatic (default)

Once installed and configured, any image uploaded to the Media Library without alt text will trigger a background job that asks OpenAI to describe the image. The result is written to `alternativeText`. Existing alt text is never overwritten.

### Manual / bulk

Open **Plugins → Alt Text Generator** from the admin sidebar:

- The page lists all images currently missing alt text.
- Click **Generate** on any row to generate alt text for a single image.
- Click **Generate all missing** to run the backfill for every listed image.

## How it works

Uses the same prompt and model defaults as the standalone alt-text script: `gpt-4o-mini` chat completions with a vision input, requesting concise alt text under 125 characters in the configured language, with no leading "Image of..." and no trailing punctuation. The image is sent inline as a base64 data URL.

## Permissions

The plugin only exposes routes to authenticated admin users — generation and settings endpoints are gated by Strapi's built-in admin auth.

## Troubleshooting

- **Nothing happens on upload** — check that `OPENAI_API_KEY` is set and `Auto-generate on upload` is enabled in admin settings. Errors are logged with the `[alt-text-generator]` prefix.
- **`401 Unauthorized` from OpenAI** — verify your API key has access to the model (default `gpt-4o-mini`).
- **Local file not found** — the plugin reads from `strapi.dirs.static.public + file.url` for the local provider; remote providers fetch via `file.url`. Make sure the file is reachable.

## License

MIT — see [LICENSE](./LICENSE).

## Author

[Leanlastic](mailto:hello@leanlastic.com)
