/**
 * Figma Sync Script
 * Syncs design tokens and scaffolds components from Figma
 * 
 * Usage:
 *   npm run figma:sync              - Full sync (tokens + components)
 *   npm run figma:tokens            - Sync tokens only
 *   npm run figma:scaffold          - Scaffold new components
 *   npm run figma:scaffold:component -- --name="ComponentName"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
import 'dotenv/config';

// Import configuration
import config from '../figma.config.js';

// Import manual tokens (for Variables that can't be fetched via API)
let manualTokens = null;
try {
    const tokensModule = await import('../figma.tokens.js');
    manualTokens = tokensModule.default;
} catch (e) {
    // figma.tokens.js is optional
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Figma API base URL
const FIGMA_API_BASE = 'https://api.figma.com/v1';

// Parse command line arguments
const args = process.argv.slice(2);
const tokensOnly = args.includes('--tokens-only');
const scaffoldOnly = args.includes('--scaffold');
const componentFlag = args.includes('--component');
const nameArg = args.find(arg => arg.startsWith('--name='));
const specificComponent = nameArg ? nameArg.split('=')[1].replace(/"/g, '') : null;
const brandArg = args.find(arg => arg.startsWith('--brand='));
const targetBrand = brandArg ? brandArg.split('=')[1] : null;

/**
 * Make authenticated request to Figma API
 */
async function figmaRequest(endpoint) {
    const response = await fetch(`${FIGMA_API_BASE}${endpoint}`, {
        headers: {
            'X-Figma-Token': config.accessToken
        }
    });

    if (!response.ok) {
        throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/**
 * Convert color value to hex
 */
function rgbaToHex(r, g, b, a = 1) {
    const toHex = (n) => {
        const hex = Math.round(n * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    return a < 1 ? `${hex}${toHex(a)}` : hex;
}

/**
 * Convert string to kebab-case
 */
function toKebabCase(str) {
    return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
}

/**
 * Sanitize a string for use as an SCSS variable name
 * Removes invalid characters (emojis, slashes, etc.) and normalizes the result
 * @param {string} str - Input string (e.g., "greyscale/⚡️w---grey6")
 * @returns {string} - Valid SCSS name (e.g., "greyscale-w-grey6")
 */
function sanitizeScssName(str) {
    return str
        // Remove emoji characters (common Unicode emoji ranges)
        .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '')
        // Replace forward slashes with hyphens
        .replace(/\//g, '-')
        // Remove any other characters invalid in SCSS (keep letters, numbers, hyphens, underscores)
        .replace(/[^a-zA-Z0-9_-]/g, '-')
        // Collapse multiple consecutive hyphens to single hyphen
        .replace(/-+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-+|-+$/g, '')
        // Ensure it doesn't start with a number (prepend underscore if needed)
        .replace(/^(\d)/, '_$1')
        // Fallback for empty strings
        || 'unnamed';
}

/**
 * Convert string to SCSS variable name with sanitization
 */
function toScssVariable(name, prefix = config.tokenPrefix) {
    const sanitized = sanitizeScssName(name);
    const kebab = toKebabCase(sanitized);
    return `$${prefix}${kebab}`;
}

/**
 * Extract Variables from Figma Variables API
 * This fetches the newer Figma Variables (not legacy Styles)
 * Requires 'file_variables:read' scope on your access token
 */
async function extractVariables() {

    try {
        const response = await fetch(`${FIGMA_API_BASE}/files/${config.fileId}/variables/local`, {
            headers: {
                'X-Figma-Token': config.accessToken
            }
        });

        if (response.status === 403) {
            // Variables API requires Enterprise/Organization plan - silently fall back
            return { colors: [], collections: {} };
        }

        if (!response.ok) {
            console.log(`   ⚠️  Variables API error: ${response.status}`);
            return { colors: [], collections: {} };
        }

        const data = await response.json();

        if (!data.meta) {
            console.log('   ⚠️  No variables found in file');
            return { colors: [], collections: {} };
        }

        const { variableCollections, variables } = data.meta;
        const colors = [];
        const collections = {};

        // Map collection IDs to names
        for (const [collectionId, collection] of Object.entries(variableCollections || {})) {
            collections[collectionId] = {
                name: collection.name,
                modes: collection.modes,
                defaultModeId: collection.defaultModeId
            };
        }

        // Extract color variables
        for (const [variableId, variable] of Object.entries(variables || {})) {
            if (variable.resolvedType === 'COLOR') {
                const collection = collections[variable.variableCollectionId];
                const modeId = collection?.defaultModeId || Object.keys(variable.valuesByMode)[0];
                const colorValue = variable.valuesByMode[modeId];

                if (colorValue && typeof colorValue === 'object' && 'r' in colorValue) {
                    colors.push({
                        id: variableId,
                        name: variable.name,
                        collectionName: collection?.name || 'Unknown',
                        collectionId: variable.variableCollectionId,
                        value: rgbaToHex(colorValue.r, colorValue.g, colorValue.b, colorValue.a || 1),
                        description: variable.description || ''
                    });
                }
            }
        }

        console.log(`   Found ${colors.length} color variables in ${Object.keys(collections).length} collections`);
        return { colors, collections };

    } catch (error) {
        console.log(`   ⚠️  Error fetching variables: ${error.message}`);
        return { colors: [], collections: {} };
    }
}

/**
 * Generate SCSS file for color variables (from Variables API)
 */
function generateVariableColorScss(colors, collections) {
    const timestamp = new Date().toISOString();
    let scss = `/* Color Variables - Auto-generated from Figma Variables API
 * DO NOT EDIT MANUALLY - Run 'npm run figma:tokens' to update
 * Last synced: ${timestamp}
 ===========================================================================*/

`;

    // Group colors by collection
    const colorsByCollection = {};
    colors.forEach(color => {
        const collectionName = color.collectionName;
        if (!colorsByCollection[collectionName]) {
            colorsByCollection[collectionName] = [];
        }
        colorsByCollection[collectionName].push(color);
    });

    // Generate variables grouped by collection
    for (const [collectionName, collectionColors] of Object.entries(colorsByCollection)) {
        const sectionName = sanitizeScssName(collectionName);
        scss += `// ============================================\n`;
        scss += `// ${collectionName}\n`;
        scss += `// ============================================\n\n`;

        // Group by color category (e.g., primary1, primary2, secondary1)
        const colorGroups = {};
        collectionColors.forEach(color => {
            // Parse name like "colour/primary1/900" -> group: "primary1", shade: "900"
            const parts = color.name.split('/');
            const shade = parts.pop();
            const group = parts.join('-').replace(/^colour-?/, '') || 'base';

            if (!colorGroups[group]) {
                colorGroups[group] = [];
            }
            colorGroups[group].push({ ...color, shade });
        });

        // Sort and output each group
        for (const [group, groupColors] of Object.entries(colorGroups)) {
            scss += `// ${group}\n`;

            // Sort by shade (base first, then numeric)
            groupColors.sort((a, b) => {
                if (a.shade.includes('base')) return -1;
                if (b.shade.includes('base')) return 1;
                return parseInt(b.shade) - parseInt(a.shade); // 900 first, then 800, etc.
            });

            groupColors.forEach(color => {
                const cleanShade = sanitizeScssName(color.shade).replace(/^_/, '');
                const varName = `$figma-${sanitizeScssName(group)}-${cleanShade}`;
                scss += `${varName}: ${color.value};\n`;
            });
            scss += '\n';
        }
    }

    // Create comprehensive color map
    scss += `// ============================================\n`;
    scss += `// Figma Color Variables Map\n`;
    scss += `// ============================================\n`;
    scss += `$figma-color-variables: (\n`;

    colors.forEach((color, index) => {
        const key = sanitizeScssName(color.name).replace(/-_(\d)/g, '-$1');
        scss += `    "${key}": ${color.value}`;
        scss += index < colors.length - 1 ? ',\n' : '\n';
    });

    scss += `);\n`;

    return scss;
}

/**
 * Extract colors from node structure (works on all Figma plans)
 * Parses the color swatch instances from the Figma design system
 * Structure: Primitives Frame > Color Group > Cards > Swatch Instances > Card (with fill)
 */
async function extractColorsFromNodes(fileData) {
    const colors = [];
    const seenColors = new Set();

    /**
     * Find the "Card" child in a swatch instance and extract its fill color
     */
    function findCardFill(node) {
        if (node.name === 'Card' && node.fills && Array.isArray(node.fills)) {
            const solidFill = node.fills.find(f => f.type === 'SOLID' && f.visible !== false);
            if (solidFill && solidFill.color) {
                return solidFill.color;
            }
        }
        if (node.children) {
            for (const child of node.children) {
                const result = findCardFill(child);
                if (result) return result;
            }
        }
        return null;
    }

    /**
     * Traverse to find color swatch instances
     * Swatches are named like "colour/primary1/900" or "colour/bright-blue/500-base"
     */
    function traverseNode(node) {
        const nodeName = node.name || '';

        // Check if this is a color swatch instance (matches "colour/xxx/yyy" or "color/xxx/yyy")
        const swatchMatch = nodeName.match(/^colou?r\/([^/]+)\/(.+)$/);
        if (swatchMatch && (node.type === 'INSTANCE' || node.type === 'FRAME')) {
            const group = swatchMatch[1];  // e.g., "primary1" or "bright-blue"
            const shade = swatchMatch[2];  // e.g., "900" or "500-base"

            // Find the Card child with the actual color fill
            const fillColor = findCardFill(node);
            if (fillColor) {
                const colorValue = rgbaToHex(fillColor.r, fillColor.g, fillColor.b, fillColor.a || 1);
                const key = `${group}/${shade}`;

                if (!seenColors.has(key)) {
                    seenColors.add(key);
                    colors.push({
                        name: key,
                        value: colorValue,
                        group: group,
                        shade: shade
                    });
                }
            }
        }

        // Recurse into children
        if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) {
                traverseNode(child);
            }
        }
    }

    if (fileData.document) {
        traverseNode(fileData.document);
    }

    console.log(`   Found ${colors.length} colors from node structure`);
    return colors;
}

/**
 * Generate SCSS from node-extracted colors
 */
function generateNodeColorScss(colors) {
    const timestamp = new Date().toISOString();
    let scss = `/* Color Tokens - Auto-generated from Figma Node Structure
 * DO NOT EDIT MANUALLY - Run 'npm run figma:tokens' to update
 * Last synced: ${timestamp}
 ===========================================================================*/

`;

    // Group colors by their group (primary1, primary2, etc.)
    const colorGroups = {};
    colors.forEach(color => {
        if (!colorGroups[color.group]) {
            colorGroups[color.group] = [];
        }
        colorGroups[color.group].push(color);
    });

    // Sort and output each group
    for (const [group, groupColors] of Object.entries(colorGroups)) {
        scss += `// ${group}\n`;

        // Sort by shade (base first, then numeric descending)
        groupColors.sort((a, b) => {
            if (a.shade.includes('base')) return -1;
            if (b.shade.includes('base')) return 1;
            return parseInt(b.shade) - parseInt(a.shade);
        });

        groupColors.forEach(color => {
            // Remove leading underscores from shade (sanitizeScssName adds them for numbers)
            const cleanShade = sanitizeScssName(color.shade).replace(/^_/, '');
            const varName = `$figma-${sanitizeScssName(color.group)}-${cleanShade}`;
            scss += `${varName}: ${color.value};\n`;
        });
        scss += '\n';
    }

    // Create color map
    scss += `// Figma Color Map\n`;
    scss += `$figma-colors: (\n`;
    colors.forEach((color, index) => {
        // Clean up the key to remove leading underscores from numeric shades
        const key = sanitizeScssName(color.name).replace(/-_(\d)/g, '-$1');
        scss += `    "${key}": ${color.value}`;
        scss += index < colors.length - 1 ? ',\n' : '\n';
    });
    scss += `);\n`;

    return scss;
}

/**
 * Generate Core SCSS (spacing, radius) from manual tokens config
 */
function generateCoreScss(tokens) {
    if (!tokens?.core) return null;

    const timestamp = new Date().toISOString();
    let scss = `/* Core Design Tokens - Generated from figma.tokens.js
 * Update figma.tokens.js to match your Figma Variables, then run 'npm run figma:tokens'
 * Last synced: ${timestamp}
 ===========================================================================*/

`;

    const { spacing, spacingSemantic, radius, grid } = tokens.core;

    // Spacing scale
    if (spacing) {
        scss += `// Spacing Scale\n`;
        for (const [key, value] of Object.entries(spacing)) {
            scss += `$figma-spacing-${key}: ${value}px;\n`;
        }
        scss += '\n';

        // Spacing map
        scss += `$figma-spacing: (\n`;
        const spacingEntries = Object.entries(spacing);
        spacingEntries.forEach(([key, value], index) => {
            scss += `    '${key}': ${value}px`;
            scss += index < spacingEntries.length - 1 ? ',\n' : '\n';
        });
        scss += `);\n\n`;
    }

    // Semantic spacing
    if (spacingSemantic) {
        scss += `// Semantic Spacing\n`;
        for (const [key, value] of Object.entries(spacingSemantic)) {
            scss += `$figma-${key}: ${value}px;\n`;
        }
        scss += '\n';
    }

    // Border radius
    if (radius) {
        scss += `// Border Radius\n`;
        for (const [key, value] of Object.entries(radius)) {
            const unit = value === 9999 ? '' : 'px';
            scss += `$figma-radius-${key}: ${value}${unit};\n`;
        }
        scss += '\n';

        // Radius map
        scss += `$figma-radius: (\n`;
        const radiusEntries = Object.entries(radius);
        radiusEntries.forEach(([key, value], index) => {
            const unit = value === 9999 ? '' : 'px';
            scss += `    '${key}': ${value}${unit}`;
            scss += index < radiusEntries.length - 1 ? ',\n' : '\n';
        });
        scss += `);\n\n`;
    }

    // Grid
    if (grid) {
        scss += `// Grid Settings\n`;
        for (const [breakpoint, settings] of Object.entries(grid)) {
            scss += `$figma-grid-${breakpoint}-columns: ${settings.columns};\n`;
            scss += `$figma-grid-${breakpoint}-gutter: ${settings.gutter}px;\n`;
            scss += `$figma-grid-${breakpoint}-margin: ${settings.margin}px;\n`;
        }
        scss += '\n';
    }

    return scss;
}


/**
 * Generate Neutral SCSS (white, black, text, grey scale) from manual tokens config
 */
function generateNeutralScss(tokens) {
    if (!tokens?.neutral) return null;

    const timestamp = new Date().toISOString();
    let scss = `/* Neutral Design Tokens - Generated from figma.tokens.js
 * Update figma.tokens.js to adjust neutral colours, then run 'npm run figma:tokens'
 * Last synced: ${timestamp}
 ===========================================================================*/

`;

    const { white, black, text, grey } = tokens.neutral;

    scss += `// Base neutrals\n`;
    if (white) scss += `$figma-neutral-white: ${white};\n`;
    if (black) scss += `$figma-neutral-black: ${black};\n`;
    if (text)  scss += `$figma-neutral-text: ${text};\n`;
    scss += `\n`;

    if (grey) {
        scss += `// Grey scale\n`;
        for (const [key, value] of Object.entries(grey)) {
            scss += `$figma-neutral-grey-${key}: ${value};\n`;
        }
        scss += `\n`;
    }

    return scss;
}

/**
 * Generate Semantic SCSS for a brand
 * Maps brand-specific $figma-* color tokens to standard semantic names ($primary, etc.)
 * and creates typography mixin aliases (@mixin figma-brand-h1-desktop → brand-specific mixin)
 */
function generateSemanticScss(brandName, brandConfig, typographyStyles) {
    const timestamp = new Date().toISOString();
    const typoKey = brandConfig.typographyKey || brandName.toLowerCase();

    let scss = `/* Semantic Brand Tokens — ${brandName}
 * Auto-generated from figma.config.js semanticColors + figma.tokens.js typescale
 * Maps brand-specific Figma tokens to standard names used by settings and components.
 * Run 'npm run figma:tokens:${brandName}' to regenerate.
 * Last synced: ${timestamp}
 ===========================================================================*/

`;

    // --- Colour aliases ---
    const colors = brandConfig.semanticColors || {};
    if (Object.keys(colors).length > 0) {
        scss += `// Brand colour aliases\n`;
        const nameMap = {
            primary: 'primary', primaryDark: 'primary-dark', primaryLight: 'primary-light',
            brandNavy: 'brand-navy', brandNavyDark: 'brand-navy-dark',
            danger: 'danger', success: 'success', warning: 'warning', info: 'info',
            brandPink: 'brand-pink', brandYellow: 'brand-yellow',
        };
        for (const [key, figmaTokenSuffix] of Object.entries(colors)) {
            const varName = nameMap[key] || key;
            scss += `$${varName}: $figma-${figmaTokenSuffix};\n`;
        }
        scss += `\n`;
    }

    // --- Typography mixin aliases ---
    if (typographyStyles && Object.keys(typographyStyles).length > 0) {
        scss += `// Typography mixin aliases\n`;
        for (const styleName of Object.keys(typographyStyles)) {
            const scssName = styleName.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
            scss += `@mixin figma-brand-${scssName}-desktop { @include figma-${scssName}-${typoKey}-desktop; }\n`;
            scss += `@mixin figma-brand-${scssName}-mobile  { @include figma-${scssName}-${typoKey}-mobile; }\n`;
        }
        scss += `\n`;
    }

    // --- Brand font variable ---
    scss += `// Brand font family\n`;
    scss += `$figma-brand-font: $figma-font-${brandName};\n`;

    return scss;
}

/**
 * Generate Typography SCSS from manual tokens config
 */
function generateTypographyFromTokens(tokens) {
    if (!tokens?.typescale) return null;

    const timestamp = new Date().toISOString();
    let scss = `/* Typography Tokens (shared) - Generated from figma.tokens.js
 * Update figma.tokens.js to match your Figma Variables, then run 'npm run figma:tokens'
 * Last synced: ${timestamp}
 ===========================================================================*/

`;

    const { weights } = tokens.typescale;

    // Font weights (shared across all brands)
    if (weights) {
        scss += `// Font Weights\n`;
        for (const [name, value] of Object.entries(weights)) {
            scss += `$figma-weight-${name}: ${value};\n`;
        }
        scss += '\n';
    }

    return scss;
}

/**
 * Generate brand-specific Typography SCSS
 * Outputs font family + desktop/mobile mixins for one brand only
 */
function generateBrandTypographyScss(brandName, brandConfig, tokens) {
    if (!tokens?.typescale) return null;

    const timestamp = new Date().toISOString();
    const typoKey = brandConfig.typographyKey || brandName.toLowerCase();
    const { fonts, weights, styles } = tokens.typescale;
    const font = fonts?.[brandName] || 'sans-serif';

    let scss = `/* Typography Tokens — ${brandName}
 * Auto-generated from figma.tokens.js typescale
 * Run 'npm run figma:tokens' to regenerate.
 * Last synced: ${timestamp}
 ===========================================================================*/

`;

    // Font weights
    if (weights) {
        scss += `// Font Weights\n`;
        for (const [name, value] of Object.entries(weights)) {
            scss += `$figma-weight-${name}: ${value};\n`;
        }
        scss += '\n';
    }

    // Brand font family
    scss += `// Brand font\n`;
    scss += `$figma-font-${brandName}: "${font}", sans-serif;\n\n`;

    // Brand-specific mixins (desktop + mobile)
    if (styles) {
        const desktopMode = `${brandName}Desktop`;
        const mobileMode = `${brandName}Mobile`;

        scss += `// Typography Mixins\n`;
        for (const [style, modeValues] of Object.entries(styles)) {
            const desktop = modeValues[desktopMode];
            const mobile = modeValues[mobileMode];

            if (desktop) {
                scss += `@mixin figma-${style}-${typoKey}-desktop {\n`;
                scss += `    font-family: "${font}", sans-serif;\n`;
                scss += `    font-size: ${desktop.size}px;\n`;
                scss += `    line-height: ${desktop.lineHeight}px;\n`;
                if (desktop.tracking) {
                    scss += `    letter-spacing: ${desktop.tracking}px;\n`;
                }
                scss += `    font-weight: ${weights[desktop.weight] || 400};\n`;
                scss += `}\n\n`;
            }

            if (mobile) {
                scss += `@mixin figma-${style}-${typoKey}-mobile {\n`;
                scss += `    font-family: "${font}", sans-serif;\n`;
                scss += `    font-size: ${mobile.size}px;\n`;
                scss += `    line-height: ${mobile.lineHeight}px;\n`;
                if (mobile.tracking) {
                    scss += `    letter-spacing: ${mobile.tracking}px;\n`;
                }
                scss += `    font-weight: ${weights[mobile.weight] || 400};\n`;
                scss += `}\n\n`;
            }
        }
    }

    return scss;
}

/**
 * Extract color styles from Figma file (legacy Styles API)
 */
async function extractColorStyles(fileData) {
    const colors = [];
    const styles = fileData.styles || {};

    // Get style metadata
    for (const [styleId, style] of Object.entries(styles)) {
        if (style.styleType === 'FILL') {
            colors.push({
                id: styleId,
                name: style.name,
                description: style.description || ''
            });
        }
    }

    // Traverse document to find actual color values
    function findStyleColors(node, styleMap) {
        if (node.styles && node.styles.fill) {
            const styleId = node.styles.fill;
            if (styleMap[styleId] && node.fills && node.fills[0]) {
                const fill = node.fills[0];
                if (fill.type === 'SOLID' && fill.color) {
                    styleMap[styleId].value = rgbaToHex(
                        fill.color.r,
                        fill.color.g,
                        fill.color.b,
                        fill.opacity || 1
                    );
                }
            }
        }

        if (node.children) {
            node.children.forEach(child => findStyleColors(child, styleMap));
        }
    }

    const styleMap = {};
    colors.forEach(c => styleMap[c.id] = c);

    if (fileData.document) {
        findStyleColors(fileData.document, styleMap);
    }

    return colors.filter(c => c.value);
}

/**
 * Extract text styles from Figma file
 */
async function extractTextStyles(fileData) {
    const textStyles = [];
    const styles = fileData.styles || {};

    for (const [styleId, style] of Object.entries(styles)) {
        if (style.styleType === 'TEXT') {
            textStyles.push({
                id: styleId,
                name: style.name,
                description: style.description || ''
            });
        }
    }

    // Find text style values in document
    function findTextStyleValues(node, styleMap) {
        if (node.styles && node.styles.text) {
            const styleId = node.styles.text;
            if (styleMap[styleId] && node.style) {
                styleMap[styleId].fontFamily = node.style.fontFamily;
                styleMap[styleId].fontSize = node.style.fontSize;
                styleMap[styleId].fontWeight = node.style.fontWeight;
                styleMap[styleId].lineHeight = node.style.lineHeightPx;
                styleMap[styleId].letterSpacing = node.style.letterSpacing;
            }
        }

        if (node.children) {
            node.children.forEach(child => findTextStyleValues(child, styleMap));
        }
    }

    const styleMap = {};
    textStyles.forEach(t => styleMap[t.id] = t);

    if (fileData.document) {
        findTextStyleValues(fileData.document, styleMap);
    }

    return textStyles.filter(t => t.fontSize);
}

/**
 * Extract effect styles (shadows, blur) from Figma file
 */
async function extractEffectStyles(fileData) {
    const effects = [];
    const styles = fileData.styles || {};

    for (const [styleId, style] of Object.entries(styles)) {
        if (style.styleType === 'EFFECT') {
            effects.push({
                id: styleId,
                name: style.name,
                description: style.description || ''
            });
        }
    }

    return effects;
}

/**
 * Extract border/stroke styles from Figma file
 * Includes stroke colors, weights, and corner radii
 */
async function extractBorderStyles(fileData) {
    const borders = [];
    const styles = fileData.styles || {};

    // Get STROKE style metadata
    for (const [styleId, style] of Object.entries(styles)) {
        if (style.styleType === 'STROKE') {
            borders.push({
                id: styleId,
                name: style.name,
                description: style.description || '',
                type: 'stroke'
            });
        }
    }

    // Traverse document to find stroke values and corner radii
    function findBorderValues(node, borderMap) {
        // Capture stroke styles
        if (node.styles && node.styles.stroke) {
            const styleId = node.styles.stroke;
            if (borderMap[styleId] && node.strokes && node.strokes[0]) {
                const stroke = node.strokes[0];
                if (stroke.type === 'SOLID' && stroke.color) {
                    borderMap[styleId].color = rgbaToHex(
                        stroke.color.r,
                        stroke.color.g,
                        stroke.color.b,
                        stroke.opacity || 1
                    );
                }
                borderMap[styleId].weight = node.strokeWeight || 1;
            }
        }

        // Capture corner radius from frames/rectangles
        if (node.cornerRadius !== undefined && node.cornerRadius > 0) {
            const radiusName = `radius-${node.name || 'default'}`;
            if (!borders.find(b => b.name === radiusName && b.type === 'radius')) {
                borders.push({
                    name: radiusName,
                    value: node.cornerRadius,
                    type: 'radius'
                });
            }
        }

        // Capture individual corner radii if different
        if (node.rectangleCornerRadii) {
            const [tl, tr, br, bl] = node.rectangleCornerRadii;
            if (tl !== tr || tr !== br || br !== bl) {
                const radiusName = `radius-${node.name || 'default'}-individual`;
                if (!borders.find(b => b.name === radiusName)) {
                    borders.push({
                        name: radiusName,
                        topLeft: tl,
                        topRight: tr,
                        bottomRight: br,
                        bottomLeft: bl,
                        type: 'radius-individual'
                    });
                }
            }
        }

        if (node.children) {
            node.children.forEach(child => findBorderValues(child, borderMap));
        }
    }

    const borderMap = {};
    borders.filter(b => b.type === 'stroke').forEach(b => borderMap[b.id] = b);

    if (fileData.document) {
        findBorderValues(fileData.document, borderMap);
    }

    return borders.filter(b => b.color || b.value || b.topLeft !== undefined);
}

/**
 * Generate SCSS file for border tokens
 */
function generateBorderScss(borders) {
    const timestamp = new Date().toISOString();
    let scss = `/* Border Tokens - Auto-generated from Figma
 * DO NOT EDIT MANUALLY - Run 'npm run figma:tokens' to update
 * Last synced: ${timestamp}
 ===========================================================================*/

`;

    // Stroke colors and weights
    const strokes = borders.filter(b => b.type === 'stroke' && b.color);
    if (strokes.length > 0) {
        scss += `// Border Colors & Weights\n`;
        strokes.forEach(border => {
            const prefix = toKebabCase(sanitizeScssName(border.name));
            if (border.description) {
                scss += `// ${border.description}\n`;
            }
            scss += `$figma-border-${prefix}-color: ${border.color};\n`;
            scss += `$figma-border-${prefix}-width: ${border.weight}px;\n`;
        });
        scss += '\n';
    }

    // Border radii
    const radii = borders.filter(b => b.type === 'radius');
    if (radii.length > 0) {
        scss += `// Border Radii\n`;
        radii.forEach(border => {
            const name = toKebabCase(sanitizeScssName(border.name));
            scss += `$figma-${name}: ${border.value}px;\n`;
        });
        scss += '\n';
    }

    // Individual corner radii
    const individualRadii = borders.filter(b => b.type === 'radius-individual');
    if (individualRadii.length > 0) {
        scss += `// Individual Corner Radii\n`;
        individualRadii.forEach(border => {
            const name = toKebabCase(sanitizeScssName(border.name));
            scss += `$figma-${name}: ${border.topLeft}px ${border.topRight}px ${border.bottomRight}px ${border.bottomLeft}px;\n`;
        });
        scss += '\n';
    }

    // Border map
    if (strokes.length > 0) {
        scss += `// Figma border map\n$figma-borders: (\n`;
        strokes.forEach((border, index) => {
            const key = toKebabCase(sanitizeScssName(border.name));
            scss += `    "${key}": (color: $figma-border-${key}-color, width: $figma-border-${key}-width)`;
            scss += index < strokes.length - 1 ? ',\n' : '\n';
        });
        scss += `);\n`;
    }

    return scss;
}

/**
 * Generate SCSS file for typography tokens (comprehensive)
 */
function generateTypographyScss(textStyles) {
    const timestamp = new Date().toISOString();
    let scss = `/* Typography Tokens - Auto-generated from Figma
 * DO NOT EDIT MANUALLY - Run 'npm run figma:tokens' to update
 * Last synced: ${timestamp}
 ===========================================================================*/

`;

    // Generate mixins for each text style
    scss += `// Typography Mixins\n`;
    textStyles.forEach(style => {
        const name = toKebabCase(sanitizeScssName(style.name));
        scss += `@mixin figma-${name} {\n`;
        scss += `    font-family: "${style.fontFamily}", sans-serif;\n`;
        scss += `    font-size: ${style.fontSize}px;\n`;
        scss += `    font-weight: ${style.fontWeight};\n`;
        if (style.lineHeight) {
            scss += `    line-height: ${style.lineHeight}px;\n`;
        }
        if (style.letterSpacing) {
            scss += `    letter-spacing: ${style.letterSpacing}px;\n`;
        }
        scss += `}\n\n`;
    });

    // Typography map for programmatic access
    scss += `// Typography map\n$figma-typography: (\n`;
    textStyles.forEach((style, index) => {
        const key = toKebabCase(sanitizeScssName(style.name));
        scss += `    "${key}": (\n`;
        scss += `        font-family: "${style.fontFamily}",\n`;
        scss += `        font-size: ${style.fontSize}px,\n`;
        scss += `        font-weight: ${style.fontWeight}`;
        if (style.lineHeight) {
            scss += `,\n        line-height: ${style.lineHeight}px`;
        }
        if (style.letterSpacing) {
            scss += `,\n        letter-spacing: ${style.letterSpacing}px`;
        }
        scss += `\n    )`;
        scss += index < textStyles.length - 1 ? ',\n' : '\n';
    });
    scss += `);\n`;

    return scss;
}

/**
 * Check if a component is a variant (child of a component set)
 * Variants are filtered out so only parent/main components are scaffolded
 * @param {Object} component - Component data from Figma API
 * @returns {boolean} - True if component is a variant
 */
function isVariantComponent(component) {
    // Primary check: Figma API includes containingStateGroup for variants
    if (component.containingStateGroup) {
        return true;
    }

    // Secondary check: Variant naming convention pattern
    // Variants typically use "Property=Value" format (e.g., "Amount=3 Cards", "Size=Large")
    const variantPattern = /^[A-Za-z0-9\s]+=[A-Za-z0-9\s]+/;
    if (variantPattern.test(component.name)) {
        return true;
    }

    return false;
}

/**
 * Extract component names from Figma file
 * Only extracts parent/main components, filtering out variants
 */
async function extractComponents(fileData) {
    const components = [];
    const componentMap = fileData.components || {};

    for (const [componentId, component] of Object.entries(componentMap)) {
        // Check if component should be excluded by config patterns
        const shouldExclude = config.excludeComponents.some(pattern =>
            pattern.test(component.name)
        );

        // Check if component is a variant (should be filtered out)
        const isVariant = isVariantComponent(component);

        if (!shouldExclude && !isVariant) {
            components.push({
                id: componentId,
                name: component.name,
                description: component.description || '',
                key: component.key
            });
        }
    }

    return components;
}

/**
 * Generate SCSS file for color tokens
 */
function generateColorScss(colors) {
    const timestamp = new Date().toISOString();
    let scss = `/* Color Tokens - Auto-generated from Figma
 * DO NOT EDIT MANUALLY - Run 'npm run figma:tokens' to update
 * Last synced: ${timestamp}
 ===========================================================================*/

`;

    colors.forEach(color => {
        const varName = toScssVariable(color.name);
        if (color.description) {
            scss += `// ${color.description}\n`;
        }
        scss += `${varName}: ${color.value};\n`;
    });

    // Create a map for easy access
    scss += `\n// Figma color map\n$figma-colors: (\n`;
    colors.forEach((color, index) => {
        const sanitized = sanitizeScssName(color.name);
        const key = toKebabCase(sanitized);
        const varName = toScssVariable(color.name);
        scss += `    "${key}": ${varName}`;
        scss += index < colors.length - 1 ? ',\n' : '\n';
    });
    scss += `);\n`;

    return scss;
}

/**
 * Generate SCSS file for typography tokens
 */
function generateFontScss(textStyles) {
    const timestamp = new Date().toISOString();
    let scss = `/* Typography Tokens - Auto-generated from Figma
 * DO NOT EDIT MANUALLY - Run 'npm run figma:tokens' to update
 * Last synced: ${timestamp}
 ===========================================================================*/

`;

    textStyles.forEach(style => {
        const prefix = toKebabCase(style.name);
        if (style.description) {
            scss += `// ${style.description}\n`;
        }
        scss += `$figma-${prefix}-font-family: "${style.fontFamily}", sans-serif;\n`;
        scss += `$figma-${prefix}-font-size: ${style.fontSize}px;\n`;
        scss += `$figma-${prefix}-font-weight: ${style.fontWeight};\n`;
        if (style.lineHeight) {
            scss += `$figma-${prefix}-line-height: ${style.lineHeight}px;\n`;
        }
        if (style.letterSpacing) {
            scss += `$figma-${prefix}-letter-spacing: ${style.letterSpacing}px;\n`;
        }
        scss += '\n';
    });

    return scss;
}

/**
 * Scaffold a new component
 */
async function scaffoldComponent(componentName) {
    const folderName = componentName.replace(/\s+/g, '_');
    const fileName = toKebabCase(componentName);
    const componentDir = path.join(ROOT_DIR, config.componentsOutput, folderName);

    // Check if component already exists
    if (fs.existsSync(componentDir)) {
        console.log(`  ⏭️  Skipping ${componentName} - already exists`);
        return false;
    }

    // Create component directory
    fs.mkdirSync(componentDir, { recursive: true });

    // Read templates and generate files
    const templatesDir = path.join(__dirname, 'templates');

    if (config.componentTemplate.njk) {
        const njkContent = `{# ${componentName} Component - Auto-generated from Figma #}
<section class="${fileName}" aria-label="${componentName}">
    <div class="container">
        <div class="${fileName}__content">
            <!-- ${componentName} content here -->
        </div>
    </div>
</section>
`;
        fs.writeFileSync(path.join(componentDir, `${fileName}.njk`), njkContent);
    }

    if (config.componentTemplate.scss) {
        const scssContent = `@import "@scss/settings.scss";

.${fileName} {
    // ${componentName} component styles
    
    &__content {
        // Content styles
    }
}
`;
        fs.writeFileSync(path.join(componentDir, `${fileName}.scss`), scssContent);
    }

    if (config.componentTemplate.js) {
        const jsContent = `import './${fileName}.scss';
import init from '@js/shared/initialization';

/**
 * ${componentName} Component
 * Auto-generated from Figma
 */
init(document.querySelectorAll('.${fileName}'), wrapper => {
    // ${componentName} initialization logic
});
`;
        fs.writeFileSync(path.join(componentDir, `${fileName}.js`), jsContent);
    }

    console.log(`  ✅ Created ${componentName}`);
    return true;
}

/**
 * Main sync function
 */
async function sync() {
    console.log('\n🎨 Figma Sync\n');

    // Validate configuration
    if (!config.accessToken || config.accessToken === 'your_personal_access_token_here') {
        console.error('❌ Error: FIGMA_ACCESS_TOKEN not configured');
        console.error('   Please copy .env.example to .env and add your Figma token');
        process.exit(1);
    }

    if (!config.fileId || config.fileId === 'your_file_id_here') {
        console.error('❌ Error: FIGMA_FILE_ID not configured');
        console.error('   Please add your Figma file ID to .env');
        process.exit(1);
    }

    try {
        // Determine which brands to sync
        const brandsToSync = [];
        if (targetBrand) {
            if (!config.brands?.[targetBrand]) {
                console.error(`❌ Unknown brand: "${targetBrand}". Available: ${Object.keys(config.brands || {}).join(', ')}`);
                process.exit(1);
            }
            brandsToSync.push(targetBrand);
        } else if (config.activeBrand && config.brands?.[config.activeBrand]) {
            brandsToSync.push(config.activeBrand);
        } else {
            console.error(`❌ No activeBrand set in figma.config.js`);
            console.error(`   Set activeBrand to one of: ${Object.keys(config.brands || {}).join(', ')}`);
            process.exit(1);
        }

        // Ensure shared output directory exists
        const outputDir = path.join(ROOT_DIR, config.tokensOutput);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // ── Brand-specific colour tokens ─────────────────────────
        if (!scaffoldOnly && brandsToSync.length > 0) {
            console.log('📡 Fetching Figma file data...\n');

            // Fetch full file data once (needed for styles metadata)
            const fileData = await figmaRequest(`/files/${config.fileId}`);
            console.log(`   File: ${fileData.name}\n`);

            // Collect all brand node IDs for a single API call
            const nodeIds = brandsToSync
                .map(b => config.brands[b].nodeId)
                .filter(Boolean)
                .join(',');

            let nodesResponse = null;
            if (nodeIds) {
                nodesResponse = await figmaRequest(`/files/${config.fileId}/nodes?ids=${nodeIds}`);
            }

            for (const brandName of brandsToSync) {
                const brandConfig = config.brands[brandName];
                const brandDir = path.join(outputDir, brandName);
                if (!fs.existsSync(brandDir)) {
                    fs.mkdirSync(brandDir, { recursive: true });
                }

                console.log(`🎨 Syncing ${brandName} colours (node ${brandConfig.nodeId})...`);

                // Build a fileData view scoped to this brand's node
                const brandFileData = { ...fileData };
                if (brandConfig.nodeId && nodesResponse?.nodes?.[brandConfig.nodeId]) {
                    brandFileData.document = nodesResponse.nodes[brandConfig.nodeId].document;
                }

                // Extract colours from node structure
                const nodeColors = await extractColorsFromNodes(brandFileData);
                if (nodeColors.length > 0) {
                    const colorScss = generateNodeColorScss(nodeColors);
                    const colorPath = path.join(brandDir, config.brandTokenFiles.colors);
                    fs.writeFileSync(colorPath, colorScss);
                    console.log(`   ✅ ${nodeColors.length} colours → ${brandName}/${config.brandTokenFiles.colors}`);
                } else {
                    console.log(`   ⚠️  No colours found for ${brandName}`);
                }

                // Generate brand typography file
                if (manualTokens?.typescale) {
                    const brandTypoScss = generateBrandTypographyScss(brandName, brandConfig, manualTokens);
                    if (brandTypoScss) {
                        const brandTypoPath = path.join(brandDir, config.brandTokenFiles.typography);
                        fs.writeFileSync(brandTypoPath, brandTypoScss);
                        const styleCount = Object.keys(manualTokens.typescale.styles || {}).length;
                        console.log(`   ✅ ${styleCount * 2} typography mixins → ${brandName}/${config.brandTokenFiles.typography}`);
                    }
                }

                // Generate semantic token file
                const typographyStyles = manualTokens?.typescale?.styles || {};
                const semanticScss = generateSemanticScss(brandName, brandConfig, typographyStyles);
                const semanticPath = path.join(brandDir, config.brandTokenFiles.semantic);
                fs.writeFileSync(semanticPath, semanticScss);
                const colorCount = Object.keys(brandConfig.semanticColors || {}).length;
                const mixinCount = Object.keys(typographyStyles).length * 2;
                console.log(`   ✅ ${colorCount} colour + ${mixinCount} typography aliases → ${brandName}/${config.brandTokenFiles.semantic}`);
            }
        }

        // ── Shared tokens (core, neutral) ────────────
        if (!scaffoldOnly) {
            console.log('\n🔧 Shared tokens...');

            // Core tokens (spacing, radius, grid) from manual config
            if (manualTokens?.core) {
                const coreScss = generateCoreScss(manualTokens);
                if (coreScss) {
                    const corePath = path.join(ROOT_DIR, config.tokensOutput, config.tokenFiles.core);
                    fs.writeFileSync(corePath, coreScss);
                    const spacingCount = Object.keys(manualTokens.core.spacing || {}).length;
                    const radiusCount = Object.keys(manualTokens.core.radius || {}).length;
                    console.log(`   ✅ ${spacingCount} spacing + ${radiusCount} radius → ${config.tokenFiles.core}`);
                }
            }

            // Neutral tokens (white, black, text, grey scale) from manual config
            if (manualTokens?.neutral && config.tokenFiles.neutral) {
                const neutralScss = generateNeutralScss(manualTokens);
                if (neutralScss) {
                    const neutralPath = path.join(ROOT_DIR, config.tokensOutput, config.tokenFiles.neutral);
                    fs.writeFileSync(neutralPath, neutralScss);
                    const greyCount = Object.keys(manualTokens.neutral.grey || {}).length;
                    console.log(`   ✅ 3 base + ${greyCount} grey → ${config.tokenFiles.neutral}`);
                }
            }
        }

        // Component scaffolding
        if (!tokensOnly) {
            console.log('\n📦 Extracting components...');
            const components = await extractComponents(fileData);

            if (specificComponent) {
                // Scaffold specific component
                const component = components.find(c =>
                    c.name.toLowerCase() === specificComponent.toLowerCase()
                );
                if (component) {
                    await scaffoldComponent(component.name);
                } else {
                    console.log(`   ❌ Component "${specificComponent}" not found in Figma`);
                }
            } else if (components.length > 0) {
                console.log(`   Found ${components.length} components\n`);

                let created = 0;
                let skipped = 0;

                for (const component of components) {
                    const wasCreated = await scaffoldComponent(component.name);
                    if (wasCreated) created++;
                    else skipped++;
                }

                console.log(`\n   📊 Summary: ${created} created, ${skipped} skipped`);
            } else {
                console.log('   ⚠️  No components found');
            }
        }

        console.log('\n✨ Figma sync complete!\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

// Run sync
sync();
