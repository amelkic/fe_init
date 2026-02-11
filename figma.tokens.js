/**
 * Figma Design Tokens Configuration
 *
 * Since the Figma Variables API requires Enterprise plan,
 * manually define your typography, spacing, and radius tokens here.
 * These values should match your Figma Variables.
 *
 * Run 'npm run figma:tokens' to regenerate SCSS files.
 */

export default {
    // ===========================================
    // CORE COLLECTION
    // ===========================================
    core: {
        // Spacing scale (in pixels)
        spacing: {
            '8': 8,
            '16': 16,
            '24': 24,
            '32': 32,
            '48': 48,
            '80': 80,
            '104': 104,
        },

        // Semantic spacing (references to spacing scale)
        spacingSemantic: {
            'button-padding-x': 24,
            'button-padding-y': 16,
            'input-padding-x': 16,
            'input-padding-y': 8,
            'section-padding-x': 24,
            'section-padding-y': 32,
            'hero-cards-x': 16,
            'hero-cards-y': 80,
        },

        // Border radius (in pixels)
        radius: {
            'none': 0,
            'sm': 4,
            'md': 8,
            'lg': 16,
            'xl': 24,
            'full': 9999,
        },

        // Grid
        grid: {
            desktop: {
                columns: 12,
                gutter: 24,
                margin: 80,
            },
            mobile: {
                columns: 4,
                gutter: 16,
                margin: 16,
            },
        },
    },


    // ===========================================
    // NEUTRAL COLLECTION
    // Universal non-brand colours (white, black, text, grey scale).
    // Not pulled from the Figma API — maintained here as design tokens.
    // ===========================================
    neutral: {
        white:  '#FFFFFF',
        black:  '#000000',
        text:   '#272727',
        grey: {
            '50':  '#F9F9F9',
            '100': '#F0EBEB',
            '200': '#E2E2E2',
            '300': '#CCCCCC',
            '400': '#B1B1B1',
            '500': '#666666',
            '600': '#6E6767',
            '900': '#212529',
        },
    },

    // ===========================================
    // TYPESCALE COLLECTION
    // ===========================================
    typescale: {
        // Brand fonts per theme
        fonts: {
            energia: 'Archivo',
            powerNI: 'Roboto',
        },

        // Font weights
        weights: {
            light: 300,
            regular: 400,
            semibold: 600,
            bold: 700,
            black: 900,
        },

        // Typography styles per mode
        // Modes: energiaDesktop, energiaMobile, powerNIDesktop, powerNIMobile
        styles: {
            h1: {
                energiaDesktop: { size: 36, lineHeight: 39, tracking: 0, weight: 'black' },
                energiaMobile: { size: 30, lineHeight: 33, tracking: 0, weight: 'black' },
                powerNIDesktop: { size: 76, lineHeight: 69, tracking: -2, weight: 'bold' },
                powerNIMobile: { size: 68, lineHeight: 65, tracking: -2, weight: 'bold' },
            },
            h2: {
                energiaDesktop: { size: 36, lineHeight: 39, tracking: 0, weight: 'black' },
                energiaMobile: { size: 36, lineHeight: 33, tracking: 0, weight: 'black' },
                powerNIDesktop: { size: 20, lineHeight: 24, tracking: 0, weight: 'regular' },
                powerNIMobile: { size: 20, lineHeight: 24, tracking: 0, weight: 'regular' },
            },
            h3: {
                energiaDesktop: { size: 28, lineHeight: 32, tracking: 0, weight: 'bold' },
                energiaMobile: { size: 24, lineHeight: 28, tracking: 0, weight: 'bold' },
                powerNIDesktop: { size: 48, lineHeight: 52, tracking: -1, weight: 'bold' },
                powerNIMobile: { size: 40, lineHeight: 44, tracking: -1, weight: 'bold' },
            },
            h4: {
                energiaDesktop: { size: 24, lineHeight: 28, tracking: 0, weight: 'bold' },
                energiaMobile: { size: 20, lineHeight: 24, tracking: 0, weight: 'bold' },
                powerNIDesktop: { size: 32, lineHeight: 36, tracking: 0, weight: 'bold' },
                powerNIMobile: { size: 28, lineHeight: 32, tracking: 0, weight: 'bold' },
            },
            h5: {
                energiaDesktop: { size: 20, lineHeight: 24, tracking: 0, weight: 'semibold' },
                energiaMobile: { size: 18, lineHeight: 22, tracking: 0, weight: 'semibold' },
                powerNIDesktop: { size: 24, lineHeight: 28, tracking: 0, weight: 'bold' },
                powerNIMobile: { size: 22, lineHeight: 26, tracking: 0, weight: 'bold' },
            },
            h6: {
                energiaDesktop: { size: 18, lineHeight: 22, tracking: 0, weight: 'semibold' },
                energiaMobile: { size: 16, lineHeight: 20, tracking: 0, weight: 'semibold' },
                powerNIDesktop: { size: 20, lineHeight: 24, tracking: 0, weight: 'bold' },
                powerNIMobile: { size: 18, lineHeight: 22, tracking: 0, weight: 'bold' },
            },
            // Paragraph styles
            'body': {
                energiaDesktop: { size: 16, lineHeight: 24, tracking: 0, weight: 'regular' },
                energiaMobile: { size: 16, lineHeight: 24, tracking: 0, weight: 'regular' },
                powerNIDesktop: { size: 16, lineHeight: 24, tracking: 0, weight: 'regular' },
                powerNIMobile: { size: 16, lineHeight: 24, tracking: 0, weight: 'regular' },
            },
            'body-large': {
                energiaDesktop: { size: 18, lineHeight: 28, tracking: 0, weight: 'regular' },
                energiaMobile: { size: 18, lineHeight: 28, tracking: 0, weight: 'regular' },
                powerNIDesktop: { size: 18, lineHeight: 28, tracking: 0, weight: 'regular' },
                powerNIMobile: { size: 18, lineHeight: 28, tracking: 0, weight: 'regular' },
            },
            'body-small': {
                energiaDesktop: { size: 14, lineHeight: 20, tracking: 0, weight: 'regular' },
                energiaMobile: { size: 14, lineHeight: 20, tracking: 0, weight: 'regular' },
                powerNIDesktop: { size: 14, lineHeight: 20, tracking: 0, weight: 'regular' },
                powerNIMobile: { size: 14, lineHeight: 20, tracking: 0, weight: 'regular' },
            },
            'body-xs': {
                energiaDesktop: { size: 12, lineHeight: 16, tracking: 0, weight: 'regular' },
                energiaMobile: { size: 12, lineHeight: 16, tracking: 0, weight: 'regular' },
                powerNIDesktop: { size: 12, lineHeight: 16, tracking: 0, weight: 'regular' },
                powerNIMobile: { size: 12, lineHeight: 16, tracking: 0, weight: 'regular' },
            },
            'label': {
                energiaDesktop: { size: 14, lineHeight: 16, tracking: 0.5, weight: 'semibold' },
                energiaMobile: { size: 14, lineHeight: 16, tracking: 0.5, weight: 'semibold' },
                powerNIDesktop: { size: 14, lineHeight: 16, tracking: 0.5, weight: 'bold' },
                powerNIMobile: { size: 14, lineHeight: 16, tracking: 0.5, weight: 'bold' },
            },
            'button': {
                energiaDesktop: { size: 16, lineHeight: 20, tracking: 0, weight: 'semibold' },
                energiaMobile: { size: 16, lineHeight: 20, tracking: 0, weight: 'semibold' },
                powerNIDesktop: { size: 16, lineHeight: 20, tracking: 0, weight: 'bold' },
                powerNIMobile: { size: 16, lineHeight: 20, tracking: 0, weight: 'bold' },
            },
        },
    },
};
