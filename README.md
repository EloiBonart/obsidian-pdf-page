# obsidian-pdf-page

Obsidian plugin — render individual PDF pages inline in Markdown notes.

## Usage

Create a fenced code block with the language `pdf-page`:

````markdown
```pdf-page
path: attachments/my-document.pdf
page: 3
scale: 1.5
```
````

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `path`    | yes      | —       | Vault-relative path to the PDF file |
| `page`    | yes      | —       | Page number (1-indexed) |
| `scale`   | no       | `1.5`   | Render scale factor |

## Installation

1. `npm install`
2. `npm run build`
3. Copy `main.js`, `manifest.json`, and `styles.css` into your vault's `.obsidian/plugins/obsidian-pdf-page/` folder.
4. Enable the plugin in Obsidian → Settings → Community plugins.

## Development

```bash
npm install
npm run dev   # watch mode with source maps
npm run build # production build
```
