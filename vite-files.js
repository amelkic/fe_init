import {globSync} from "glob";
import path from "path";

const pageHtmlFiles = globSync('src/views/pages/**/*.html')

const htmlEntries = Object.fromEntries(
    pageHtmlFiles.map(file => {
        const relative = path
            .relative('src/views/pages', file)
            .replace(/\.html$/, '')
        const name = relative.split(path.sep).join('-') || 'index'
        return [name, path.resolve(__dirname, file)]
    })
)

const componentEntries = Object.fromEntries(globSync('src/views/components/**/*.js')
    .map(file => {
        const name = path.basename(path.dirname(file));
        return [name, path.resolve(__dirname, file)];
    }));

const globalEntries = {
    global: path.resolve(__dirname, 'src/js/general.js'),
};

export {pageHtmlFiles, htmlEntries, componentEntries, globalEntries};
