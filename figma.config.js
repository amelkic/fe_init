/**
 * Figma Integration Configuration
 * Configure your Figma API settings here
 */

export default {
    // Figma API settings (loaded from .env file)
    fileId: process.env.FIGMA_FILE_ID,
    accessToken: process.env.FIGMA_ACCESS_TOKEN,
    nodeId: process.env.FIGMA_NODE_ID,  // Target specific design system section
    
    // Output paths for generated files
    tokensOutput: 'src/scss/tokens',
    componentsOutput: 'src/views/components',

    // Token file naming
    tokenFiles: {
        colors: '_colors.tokens.scss',
        fonts: '_fonts.tokens.scss',
        typography: '_type.tokens.scss',
        spacing: '_spacing.tokens.scss',
        core: '_core.tokens.scss',
        neutral: '_neutral.tokens.scss'
    },
    
    // Component scaffolding settings
    componentTemplate: {
        njk: true,      // Generate Nunjucks template
        scss: true,     // Generate SCSS styles
        js: true        // Generate JavaScript module
    },
    
    // Token naming transformation
    // Converts Figma style names to SCSS variable names
    tokenPrefix: 'figma-',
    
    // Components to exclude from scaffolding (regex patterns)
    excludeComponents: [
        /^_/,           // Skip components starting with underscore
        /template$/i    // Skip template components
    ]
};
