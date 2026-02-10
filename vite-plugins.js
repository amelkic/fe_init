import fs from "fs";
import path from "path";
import ttf2woff2 from "ttf2woff2";
import ttf2woff from "ttf2woff";
import ttf2eot from "ttf2eot";
import sharp from "sharp";
import ansi from 'ansi-colors'
import {htmlEntries} from "./vite-files.js";

const multiPageDevPlugin = () => ({
    name: 'vite-plugin-multi-page-dev-rewrite',
    configureServer(server) {
        server.middlewares.use((req, res, next) => {
            if (req.method !== 'GET') {
                return next()
            }

            if (req.url === '/') {
                req.url = '/index.html'
            }

            const match = req.url.match(/^\/([\w-]+)\.html$/)
            if (!match) {
                return next()
            }

            const name = match[1]
            const file = htmlEntries[name]
            if (file && fs.existsSync(file)) {
                req.url = '/' + path.relative(server.config.root, file).replace(/\\/g, '/')
            }
            return next()
        })
    }
})

const removeEmptyJsChunksPlugin = () => ({
    name: 'vite-plugin-remove-empty-js-chunks',
    generateBundle(_, bundle) {
        for (const [fileName, chunk] of Object.entries(bundle)) {
            if (
                chunk.type === 'chunk' &&
                fileName.endsWith('.js') &&
                chunk.code.trim() === ''
            ) {
                delete bundle[fileName];
            }
        }
    }
})

const logSuccess = (type, fileName, format) => {
    const msg = [
        ansi.cyan(type),
        ansi.blueBright(fileName),
        ansi.grey('converted to'),
        ansi.blueBright(format)
    ].join(' ');

    process.stdout.write('\x1b[2K\r' + msg);
};

/**
 * @typedef {import('sharp').WebpOptions} WebpOptions
 */

/**
 * @param {WebpOptions} webpOptions
 */
const publicImageWebpPlugin = (webpOptions) => {
    return {
        name: 'vite-plugin-public-image-webp-converter',
        apply: 'build',

        async writeBundle(outputOptions) {
            const outDirRoot = outputOptions.dir;
            if (!outDirRoot) {
                return;
            }

            const allFiles = walkDir(outDirRoot);

            const imagesToConvert = allFiles.filter((file) =>
                /\.(jpe?g|png)$/i.test(path.extname(file))
            );

            const successfullyConverted = [];

            for (const imgPath of imagesToConvert) {
                try {
                    const buffer = fs.readFileSync(imgPath);
                    const webpName = imgPath.replace(/\.(jpe?g|png)$/i, '.webp');

                    if (fs.existsSync(webpName)) {
                        const srcStat = fs.statSync(imgPath);
                        const webpStat = fs.statSync(webpName);
                        if (webpStat.mtimeMs >= srcStat.mtimeMs) {
                            continue;
                        }
                    }

                    await sharp(buffer)
                        .webp(webpOptions)
                        .toFile(webpName);
                    logSuccess('Image', imgPath.split('\\').pop(), '.webp');
                    successfullyConverted.push(webpName);
                } catch (err) {
                    this.error(`Failed to convert ${imgPath} → .webp:\n${err}`);
                }
            }

            process.stdout.write('\x1b[2K\r');

            console.log()
            console.log(ansi.cyan('[vite-plugin-public-image-webp-converter]'),
                '- converted',
                successfullyConverted.length,
                'images to WebP format successfully:'
            )
            successfullyConverted.forEach(img => {
                console.log(ansi.grey('public') +
                    '/' +
                    ansi.blueBright(path.relative(outDirRoot, img).replace(/\\/g, '/')));
            })
            console.log()
        }
    };
}

const publicFontConverterPlugin = () => ({
    name: 'vite-plugin-public-font-converter',
    apply: 'build',
    async writeBundle(outputOptions) {
        const outDir = outputOptions.dir;
        if (!outDir) return;

        const fontsDir = path.resolve(outDir, 'fonts');
        if (!fs.existsSync(fontsDir)) {
            return;
        }

        const allFiles = await fs.promises.readdir(fontsDir);
        const successfullyConverted = [];
        for (const filename of allFiles) {
            if (filename.toLowerCase().endsWith('.ttf')) {
                const ttfPath = path.join(fontsDir, filename);
                const ttfBuffer = await fs.promises.readFile(ttfPath);

                try {
                    const woffBuf = Buffer.from(ttf2woff(ttfBuffer).buffer);
                    const woffName = filename.replace(/\.ttf$/i, '.woff');
                    const woffPath = path.join(fontsDir, woffName);
                    await fs.promises.writeFile(woffPath, woffBuf);
                    logSuccess('Font ', filename, '.woff');
                    successfullyConverted.push(woffPath);
                } catch (e) {
                    this.error(`Failed to convert ${filename} → .woff:\n${e}`);
                }

                try {
                    const woff2Buf = Buffer.from(ttf2woff2(ttfBuffer));
                    const woff2Name = filename.replace(/\.ttf$/i, '.woff2');
                    const woff2Path = path.join(fontsDir, woff2Name);
                    await fs.promises.writeFile(woff2Path, woff2Buf);
                    logSuccess('Font ', filename, '.woff2');
                    successfullyConverted.push(woff2Path);
                } catch (e) {
                    this.error(`Failed to convert ${filename} → .woff2:\n${e}`);
                }

                try {
                    const eotBuf = Buffer.from(ttf2eot(ttfBuffer).buffer);
                    const eotName = filename.replace(/\.ttf$/i, '.eot');
                    const eotPath = path.join(fontsDir, eotName);
                    await fs.promises.writeFile(eotPath, eotBuf);
                    logSuccess('Font ', filename, '.eot');
                    successfullyConverted.push(eotPath);
                } catch (e) {
                    this.error(`Failed to convert ${filename} → .eot:\n${e}`);
                }
            }
        }

        process.stdout.write('\x1b[2K\r');

        console.log()
        console.log(ansi.cyan('[vite-plugin-public-font-converter]'),
            '- converted',
            successfullyConverted.length,
            'fonts successfully:'
        )
        successfullyConverted.forEach(font => {
            console.log(ansi.grey('public') +
                '/' +
                ansi.blueBright(path.relative(outDir, font).replace(/\\/g, '/')));
        })
        console.log()
    }
})

export {
    multiPageDevPlugin,
    removeEmptyJsChunksPlugin,
    publicFontConverterPlugin,
    publicImageWebpPlugin
};


function walkDir(dir, fileList = []) {
    const entries = fs.readdirSync(dir, {withFileTypes: true});
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkDir(fullPath, fileList);
        } else {
            fileList.push(fullPath);
        }
    }
    return fileList;
}