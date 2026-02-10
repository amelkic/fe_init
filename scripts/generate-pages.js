import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.resolve(__dirname, '../src/views/pages');
const outputFile = path.resolve(__dirname, '../src/views/pages.json');

function generatePagesJson() {
    try {
        // Read all HTML files from the pages directory
        const files = fs.readdirSync(pagesDir)
            .filter(file => file.endsWith('.html'))
            .sort();

        // Generate page objects
        const pages = files.map(file => {
            const name = path.basename(file, '.html');
            const url = `/${file}`;
            
            return {
                name,
                url,
                children: []
            };
        });

        // Check if content has changed before writing
        let shouldWrite = true;
        if (fs.existsSync(outputFile)) {
            try {
                const existingContent = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
                if (JSON.stringify(existingContent) === JSON.stringify(pages)) {
                    shouldWrite = false;
                }
            } catch (e) {
                // If we can't read the existing file, write the new one
                shouldWrite = true;
            }
        }

        if (shouldWrite) {
            // Write the JSON file
            fs.writeFileSync(outputFile, JSON.stringify(pages, null, 2));
            console.log(`✓ Generated pages.json with ${pages.length} pages:`);
            pages.forEach(page => {
                console.log(`  - ${page.name} (${page.url})`);
            });
        } else {
            console.log('✓ pages.json is already up to date');
        }
        
    } catch (error) {
        console.error('Error generating pages.json:', error);
        process.exit(1);
    }
}

// Watch mode for development
function watchPages() {
    console.log('👀 Watching for changes in pages directory...');
    
    fs.watch(pagesDir, { recursive: false }, (eventType, filename) => {
        if (filename && filename.endsWith('.html')) {
            console.log(`📄 Page ${eventType}: ${filename}`);
            generatePagesJson();
        }
    });
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--watch') || args.includes('-w')) {
    generatePagesJson();
    watchPages();
} else {
    generatePagesJson();
}