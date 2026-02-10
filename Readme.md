# Frontend

A modern frontend build system for multi-page applications using [Vite](https://vitejs.dev/), with custom plugins for asset optimization, font/image conversion, and multi-page routing.

---

## Features

- **Multi-page support** with Nunjucks templating
- **Testing framework** with Vitest for JavaScript validation
- **Custom Vite plugins** for:
  - Multi-page dev server routing
  - Removing empty JS chunks from the build
  - Converting TTF fonts to WOFF, WOFF2, and EOT after build
  - Converting JPEG/PNG images to WebP after build
- **Asset optimization** with PurgeCSS, Autoprefixer, and image optimizer
- **SCSS support** with quiet dependency warnings
- **Figma Integration** for:
  - Automated design token sync (colors, typography)
  - Component scaffolding from Figma components

---

## Getting Started

### Prerequisites

- Node.js (v22.15.0 recommended)
- npm

### Install dependencies

```sh
npm install
```

### Development

Start the development server:

```sh
npm run dev
```

- Hot module replacement for JS/SCSS
- Multi-page routing via custom plugin
- Nunjucks templating for HTML views

### Production Build

Build for production:

```sh
npm run build
```

- Outputs to `../Web/wwwroot/dist`
- Copies public assets to dist folder
- PurgeCSS removes unused CSS

### Public Build

Build static assets for public directory:

```sh
npm run build:public
```

- Outputs to `public`
- Runs all asset optimization and conversion plugins on `src/assets-raw`

### Testing

Run tests using Vitest:

```sh
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI interface
npm run test:ui
```

- Tests all JavaScript files in `src/js/` and `src/views/components/`
- Validates file existence, basic syntax, and code quality
- Consolidated testing approach - no individual test files needed
- **Automatic discovery** - new components are tested without manual updates

### Figma Integration

Connect your design tokens and components:

```sh
# Sync all tokens and components
npm run figma:sync

# Sync tokens only
npm run figma:tokens

# Scaffold all new components
npm run figma:scaffold

# Scaffold specific component
npm run figma:scaffold:component -- --name="HeroBanner"
```

- Requires `.env` with `FIGMA_ACCESS_TOKEN` and `FIGMA_FILE_ID`
- Generates Figma-synced tokens in `src/scss/settings/`
- Auto-scaffolds component folders with NJK, SCSS, and JS templates

---

## Project Structure

```
Frontend/
├── figma.config.js       # Figma integration config
├── .env.example          # Environment variables template
├── src/
│   ├── assets-raw/
│   │   ├── fonts/
│   │   └── images/
│   ├── js/
│   ├── scss/
│   └── views/
├── scripts/
│   ├── figma-sync.js     # Figma sync script
│   └── ...
├── tests/
│   ├── components.test.js
│   ├── js-modules.test.js
│   └── sample.test.js
├── vite.config.js
├── vitest.config.js
├── vite-plugins.js
├── vite-files.js
├── package.json
└── README.md
```

---

## Custom Vite Plugins

### Multi-page Dev Plugin

Handles URL rewriting for multi-page development.  
Maps `/about.html` to the correct HTML file using `htmlEntries`.

### Remove Empty JS Chunks Plugin

Removes empty JS files from the build output (common with CSS-only entries).

### Public Font Converter Plugin

Converts `.ttf` fonts in the output to `.woff`, `.woff2`, and `.eot`.

### Public Image WebP Plugin

Converts `.jpg`, `.jpeg`, and `.png` images in the output to `.webp`.

---

## CSS & PostCSS

- **Autoprefixer:** Adds vendor prefixes.
- **PurgeCSS:** Removes unused CSS based on content in `.cshtml`, `.njk`, `.js`, and `.html` files.
- **SCSS:** Uses Dart Sass with quiet dependency warnings.

---

## Aliases

- `@js` → `src/js`
- `@scss` → `src/scss`

---

## Troubleshooting

- **Empty JS files in output:**  
  The `removeEmptyJsChunksPlugin` should clean these up automatically.

- **Font/Image conversion errors:**  
  Check terminal output for error messages from the plugins.

- **CSS not updating:**  
  Ensure your templates and JS files are referenced in the PurgeCSS `content` array.

---

## Testing with Vitest

The project includes comprehensive JavaScript testing using [Vitest](https://vitest.dev/):

### Test Structure
- **Consolidated testing**: Single test files validate multiple source files
- **No individual test files needed**: Tests are organized by module type
- **Automated validation**: File existence, syntax checking, and code quality
- **Dynamic discovery**: Automatically finds and tests new components without manual updates

### Test Files
- `tests/js-modules.test.js` - Tests all files in `src/js/` (static list)
- `tests/components.test.js` - **Dynamically discovers** all component files in `src/views/components/`

### What Gets Tested
- File existence and readability
- Import/export syntax validation
- Basic syntax error detection
- Console.log detection (production code quality)
- Balanced brackets and braces

---

## References

- [Vite Documentation](https://vitejs.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Nunjucks Templating](https://mozilla.github.io/nunjucks/)
- [PurgeCSS](https://purgecss.com/)
- [Sharp (image processing)](https://sharp.pixelplumbing.com/)

---

**For further details, see the comments in `vite.config.js`, `vitest.config.js`, and `vite-plugins.js`.**