import {defineConfig} from 'vite';
import path from 'path';
import autoprefixer from 'autoprefixer';
import purgecssPkg from '@fullhuman/postcss-purgecss';
import sass from 'sass';
import nunjucks from 'vite-plugin-nunjucks'
import pagesData from './src/views/pages.json';
import data from './src/views/data.json';
import {ViteImageOptimizer} from 'vite-plugin-image-optimizer';
import {componentEntries, globalEntries, pageHtmlFiles} from "./vite-files.js";
import figmaConfig from './figma.config.js';
import {
    multiPageDevPlugin,
    publicFontConverterPlugin,
    publicImageWebpPlugin,
    removeEmptyJsChunksPlugin
} from "./vite-plugins.js";


const purgecss = purgecssPkg.default || purgecssPkg;

export default defineConfig(({mode}) => {
    const isProduction = mode === 'production';
    const isPublic = mode === 'public';

    if (isPublic) {
        return {
            publicDir: 'src/assets-raw',
            build: {
                outDir: 'public',
                emptyOutDir: true,
                rollupOptions: {
                    input: {empty: path.resolve(__dirname, 'src/js/empty.js')},
                    onwarn(warning, warn) {
                        if (warning.code === 'EMPTY_BUNDLE') {
                            return;
                        }
                        warn(warning);
                    }
                },
                minify: false,
                cssCodeSplit: false,
            },
            plugins: [
                removeEmptyJsChunksPlugin(),
                publicFontConverterPlugin(),
                publicImageWebpPlugin({quality: 80}),
                ViteImageOptimizer({
                    test: /\.(jpe?g|png)$/i,
                    jpeg: {quality: 75, progressive: true, mozjpeg: true},
                    jpg: {quality: 75, progressive: true, mozjpeg: true},
                    png: {quality: 80, progressive: true}
                })
            ]
        };
    }

    // Active brand — set in figma.config.js → activeBrand
    const brand = figmaConfig.activeBrand || 'powerNI';

    return {
        base: isProduction ? '/dist' : "/",
        resolve: {
            alias: {
                '@js': path.resolve(__dirname, 'src/js'),
                '@scss': path.resolve(__dirname, 'src/scss'),
                '@brand-tokens': path.resolve(__dirname, `src/scss/tokens/${brand}`)
            }
        },
        build: {
            outDir: '../Web/wwwroot/dist',
            rollupOptions: {
                input: {...componentEntries, ...globalEntries},
                output: {
                    entryFileNames: ({name}) =>
                        name === 'global'
                            ? 'global/[name].min.js'
                            : `components/[name]/[name].min.js`,
                    assetFileNames: ({names}) => {
                        const name = names[0];
                        if (name?.endsWith('.css')) {
                            return name === 'global.css'
                                ? 'global/global.min.css'
                                : `components/[name]/[name].min.css`;
                        }
                        return 'assets/[name][extname]';
                    },
                    chunkFileNames: () => 'chunks/[name].[hash].min.js',
                }
            },
        },
        css: {
            preprocessorOptions: {
                scss: {
                    implementation: sass,
                    quietDeps: true,
                    logger: {
                        warn() {
                        },
                        debug() {
                        },
                    },
                },
            },
            postcss: {
                plugins: [
                    autoprefixer(),
                    purgecss({
                        content: [
                            '../Web/Components/**/*.cshtml',
                            '../Web/Views/**/*.cshtml',
                            '../Web/Features/**/*.cshtml',
                            'src/views/**/*.{njk,js,html}',
                            'src/js/**/*.js',
                        ],
                        safelist: [/^swiper/, /^air-datepicker/, /^-/, /^faded-/, /^hidden/, /^show/],
                        defaultExtractor: (content) =>
                            content.match(/[\w\-\/:%]+(?<!:)/g) || [],
                    }),
                ],
            },
        },
        plugins: isProduction ?
            [
                removeEmptyJsChunksPlugin()
            ] :
            [
                nunjucks({
                    templatesDir: path.resolve(__dirname, 'src/views'),
                    variables: pageHtmlFiles.reduce((vars, file) => {
                        const key = path.basename(file)
                        vars[key] = {...data, pages: pagesData}
                        return vars
                    }, {})
                }),
                multiPageDevPlugin()
            ]
    }
});
