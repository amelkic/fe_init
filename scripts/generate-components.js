import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
import nunjucks from 'nunjucks';

const COMPONENTS_DIR = 'src/views/components';
const OUTPUT_DIR = 'public/components';
const DATA_FILE = 'src/views/data.json';

// Configure Nunjucks environment
const env = nunjucks.configure('src/views', {
    autoescape: false,
    trimBlocks: true,
    lstripBlocks: true
});

// Load data for template rendering
let templateData = {};
try {
    const dataContent = fs.readFileSync(DATA_FILE, 'utf8');
    templateData = JSON.parse(dataContent);
} catch (error) {
    console.warn(`Warning: Could not load ${DATA_FILE}. Using empty data object.`);
}

/**
 * Extracts component name from file path
 */
function getComponentName(filePath) {
    return path.basename(path.dirname(filePath));
}

/**
 * Renders Nunjucks template to HTML
 */
function renderTemplate(templatePath, data = {}) {
    try {
        const template = fs.readFileSync(templatePath, 'utf8');
        return env.renderString(template, { ...templateData, ...data });
    } catch (error) {
        console.error(`Error rendering template ${templatePath}:`, error.message);
        return null;
    }
}

/**
 * Formats HTML with proper indentation and structure
 */
function formatHtml(html) {
    // Clean and prepare HTML
    let formatted = html
        // Remove ASP.NET server attributes
        .replace(/\s+(runat="server"|visible="true"|visible="false")/gi, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();
    
    // Simple but effective HTML formatter
    const indent = '  '; // 2 spaces
    let result = '';
    let level = 0;
    
    // Block-level elements that should start new lines
    const blockElements = [
        'div', 'section', 'article', 'aside', 'header', 'footer', 'main', 'nav',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote', 'pre',
        'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
        'form', 'fieldset', 'legend', 'label', 'select', 'textarea',
        'canvas', 'video', 'audio', 'figure', 'figcaption'
    ];
    
    // Self-closing elements
    const selfClosing = ['img', 'input', 'br', 'hr', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'];
    
    // Split into tags and text
    const tokens = formatted.match(/<\/?[^>]+>|[^<]+/g) || [];
    
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i].trim();
        if (!token) continue;
        
        if (token.startsWith('<')) {
            const isClosingTag = token.startsWith('</');
            const tagName = (token.match(/<\/?([a-zA-Z0-9-]+)/) || [])[1]?.toLowerCase();
            const isBlockElement = blockElements.includes(tagName);
            const isSelfClosing = selfClosing.includes(tagName) || token.endsWith('/>');
            
            if (isClosingTag) {
                level = Math.max(0, level - 1);
                if (isBlockElement) {
                    result += '\n' + indent.repeat(level) + token;
                } else {
                    result += token;
                }
            } else {
                if (isBlockElement) {
                    result += '\n' + indent.repeat(level) + token;
                    if (!isSelfClosing) {
                        level++;
                    }
                } else {
                    result += token;
                }
            }
        } else {
            // Text content
            const trimmed = token.trim();
            if (trimmed) {
                // Check if we need to add indentation for text
                const needsIndent = result.endsWith('\n') || result.endsWith('>');
                if (needsIndent && result.slice(-1) !== ' ') {
                    result += trimmed;
                } else {
                    result += trimmed;
                }
            }
        }
    }
    
    return result
        .replace(/^\n+/, '') // Remove leading newlines
        .replace(/\n+/g, '\n') // Collapse multiple newlines
        .trim();
}

/**
 * Legacy function for backward compatibility
 */
function cleanHtml(html) {
    return formatHtml(html);
}

/**
 * Creates output directory if it doesn't exist
 */
function ensureOutputDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * Processes a single component
 */
function processComponent(njkFile) {
    const componentName = getComponentName(njkFile);
    const outputDir = path.join(OUTPUT_DIR, componentName);
    const outputFile = path.join(outputDir, `${componentName}.html`);
    
    console.log(`Processing component: ${componentName}`);
    
    // Render the template
    const renderedHtml = renderTemplate(njkFile);
    if (!renderedHtml) {
        console.error(`Failed to render component: ${componentName}`);
        return false;
    }
    
    // Clean the HTML
    const cleanedHtml = cleanHtml(renderedHtml);
    
    // Ensure output directory exists
    ensureOutputDir(outputDir);
    
    // Write the HTML file
    try {
        fs.writeFileSync(outputFile, cleanedHtml, 'utf8');
        console.log(`Generated: ${outputFile}`);
        return true;
    } catch (error) {
        console.error(`Error writing file ${outputFile}:`, error.message);
        return false;
    }
}

/**
 * Generates component manifest file
 */
function generateManifest(processedComponents) {
    const manifest = {
        generated: new Date().toISOString(),
        components: processedComponents.map(componentPath => {
            const componentName = getComponentName(componentPath);
            return {
                name: componentName,
                source: componentPath,
                output: path.join(OUTPUT_DIR, componentName, `${componentName}.html`),
                hasJs: fs.existsSync(path.join(path.dirname(componentPath), `${componentName}.js`)),
                hasScss: fs.existsSync(path.join(path.dirname(componentPath), `_${componentName}.scss`))
            };
        })
    };
    
    const manifestFile = path.join(OUTPUT_DIR, 'manifest.json');
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`Generated manifest: ${manifestFile}`);
}

/**
 * Main function to generate all components
 */
function generateComponents() {
    console.log('Starting component generation...\n');
    
    // Find all Nunjucks component files
    const njkFiles = globSync(`${COMPONENTS_DIR}/**/*.njk`);
    
    if (njkFiles.length === 0) {
        console.log('No component template files found.');
        return;
    }
    
    console.log(`Found ${njkFiles.length} component template(s):\n`);
    
    // Ensure main output directory exists
    ensureOutputDir(OUTPUT_DIR);
    
    // Process each component
    const processedComponents = [];
    let successCount = 0;
    
    njkFiles.forEach(njkFile => {
        if (processComponent(njkFile)) {
            processedComponents.push(njkFile);
            successCount++;
        }
    });
    
    // Generate manifest
    if (processedComponents.length > 0) {
        generateManifest(processedComponents);
    }
    
    console.log(`\nComponent generation complete!`);
    console.log(`Successfully processed: ${successCount}/${njkFiles.length} components`);
    console.log(`Output directory: ${OUTPUT_DIR}`);
}

// Run if this script is executed directly
generateComponents();

export { generateComponents };