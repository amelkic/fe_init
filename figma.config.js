/**
 * Figma Integration Configuration
 * Configure your Figma API settings here
 */

export default {
    // Figma API settings (loaded from .env file)
    fileId: process.env.FIGMA_FILE_ID,
    accessToken: process.env.FIGMA_ACCESS_TOKEN,

    // =========================================================
    // Multi-brand configuration
    // Each brand has its own Figma node and semantic colour map.
    // Run:  npm run figma:tokens              → sync activeBrand (set below)
    //       npm run figma:tokens:energia      → sync Energia only
    //       npm run figma:tokens:powerNI      → sync Power NI only
    // =========================================================
    brands: {
        energia: {
            nodeId: '39:343',
            typographyKey: 'energia',   // matches figma.tokens.js mode prefix
            // Maps Figma token names → semantic roles
            // Right-hand side = group-shade from the Figma node structure
            semanticColors: {
                primary:       'primary1-500-base',
                primaryDark:   'primary1-700',
                primaryLight:  'primary1-100',
                brandNavy:     'primary2-500-base',
                brandNavyDark: 'primary2-700',
                // TODO: fill in after running  npm run figma:tokens:energia
                // and checking tokens/energia/_colors.tokens.scss
                danger:        'secondary1-500-base',   // verify
                success:       'secondary2-500-base',   // verify
                warning:       'neutral1-500-base',     // verify
                info:          'secondary5-500-base',   // verify
                brandPink:     'primary4-500-base',     // verify
                brandYellow:   'neutral1-500-base',     // verify
            },
        },
        powerNI: {
            nodeId: '43:1488',
            typographyKey: 'powerni',   // matches figma.tokens.js mode prefix
            semanticColors: {
                primary:       'bright-blue-500-base',
                primaryDark:   'bright-blue-700',
                primaryLight:  'bright-blue-100',
                brandNavy:     'dark-blue-500-base',
                brandNavyDark: 'dark-blue-700',
                danger:        'salered-alert-500-base',
                success:       'fun-green-500-base',
                warning:       'tussock-500-base',
                info:          'allports-500-base',
                brandPink:     'pink1-500-base',
                brandYellow:   'tussock-500-base',
            },
        },
    },

    // Active brand for this project ('powerNI' or 'energia')
    activeBrand: 'powerNI',

    // Output paths for generated files
    tokensOutput: 'src/scss/tokens',
    componentsOutput: 'src/views/components',

    // Token file naming (shared tokens — not brand-specific)
    tokenFiles: {
        fonts: '_fonts.tokens.scss',
        spacing: '_spacing.tokens.scss',
        core: '_core.tokens.scss',
        neutral: '_neutral.tokens.scss',
    },

    // Brand-specific token file naming (inside tokens/{brand}/ folder)
    brandTokenFiles: {
        colors: '_colors.tokens.scss',
        typography: '_type.tokens.scss',
        semantic: '_semantic.tokens.scss',
    },

    // Component scaffolding settings
    componentTemplate: {
        njk: true,      // Generate Nunjucks template
        scss: true,     // Generate SCSS styles
        js: true        // Generate JavaScript module
    },

    // Token naming transformation
    tokenPrefix: 'figma-',

    // Components to exclude from scaffolding (regex patterns)
    excludeComponents: [
        /^_/,           // Skip components starting with underscore
        /template$/i    // Skip template components
    ]
};
