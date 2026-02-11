const fs = require('fs');
let content = fs.readFileSync('scripts/figma-sync.js', 'utf8');

// ── 1. Add generateNeutralScss function ──────────────────────────────────────
const funcCode = `
/**
 * Generate Neutral SCSS (white, black, text, grey scale) from manual tokens config
 */
function generateNeutralScss(tokens) {
    if (!tokens?.neutral) return null;

    const timestamp = new Date().toISOString();
    let scss = \`/* Neutral Design Tokens - Generated from figma.tokens.js
 * Update figma.tokens.js to adjust neutral colours, then run 'npm run figma:tokens'
 * Last synced: \${timestamp}
 ===========================================================================*/

\`;

    const { white, black, text, grey } = tokens.neutral;

    scss += \`// Base neutrals\\n\`;
    if (white) scss += \`\\$figma-neutral-white: \${white};\\n\`;
    if (black) scss += \`\\$figma-neutral-black: \${black};\\n\`;
    if (text)  scss += \`\\$figma-neutral-text: \${text};\\n\`;
    scss += \`\\n\`;

    if (grey) {
        scss += \`// Grey scale\\n\`;
        for (const [key, value] of Object.entries(grey)) {
            scss += \`\\$figma-neutral-grey-\${key}: \${value};\\n\`;
        }
        scss += \`\\n\`;
    }

    return scss;
}

`;

// Insert immediately before the next function after generateCoreScss
const marker = '/**\n * Generate Typography';
if (!content.includes(marker)) { console.error('Marker 1 not found'); process.exit(1); }
content = content.replace(marker, funcCode + marker);

// ── 2. Wire up neutral generation ────────────────────────────────────────────
const wireCode = `
            // Neutral tokens (white, black, text, grey scale) from manual config
            if (manualTokens?.neutral && config.tokenFiles.neutral) {
                const neutralScss = generateNeutralScss(manualTokens);
                if (neutralScss) {
                    const neutralPath = require('path').join(require('path').resolve(__dirname, '..'), config.tokensOutput, config.tokenFiles.neutral);
                    require('fs').writeFileSync(neutralPath, neutralScss);
                    const greyCount = Object.keys(manualTokens.neutral.grey || {}).length;
                    console.log(\`   ✅ 3 base + \${greyCount} grey → \${config.tokenFiles.neutral}\`);
                }
            }

`;

const wireMarker = '            // Borders (stroke styles and corner radii)';
if (!content.includes(wireMarker)) { console.error('Marker 2 not found'); process.exit(1); }
content = content.replace(wireMarker, wireCode + wireMarker);

fs.writeFileSync('scripts/figma-sync.js', content);
console.log('Patched figma-sync.js successfully');
