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
    tokensOutput: 'src/scss/figma',
    componentsOutput: 'src/views/components',

    // Token file naming
    tokenFiles: {
        colors: '_colors.figma.scss',
        fonts: '_fonts.figma.scss',
        borders: '_borders.figma.scss',
        typography: '_typography.figma.scss',
        spacing: '_spacing.figma.scss',
        core: '_core.figma.scss'
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
