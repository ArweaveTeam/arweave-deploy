import { File } from '../lib/file';
import { inlineSource } from 'inline-source';
import { dirname } from 'path';
import { ContentParserInterface, PrepareTransactionOptions } from '../lib/TransactionBuilder';
import Axios, {AxiosRequestConfig} from 'axios';

export class HtmlParser implements ContentParserInterface {

    public description = 'HTML/JS/CSS bundling and packaging';

    async run(entry: File, options: PrepareTransactionOptions = {}) {

        let logger = options.logger;

        const html = await inlineSource(entry.getPath(), {
            attribute: false,
            compress: true,
            rootpath: entry.getDirectory(),
            saveRemote: false,
            svgAsImage: true,
            handlers: [
                (async (source: any, context: any): Promise<any> => {
                    if (source.type == 'image') {
                        return await importRemoteImages(source, context, logger);
                    }

                    if (source.fileContent && !source.content && source.type == 'css') {
                        return await importCssUrls(source, context, logger);
                    }
                })
            ]
        });

        return Buffer.from(html, 'utf-8');
    }
}

const importRemoteImages = async (source: any, context: any, logger: Function): Promise<void> => {
    if (source.isRemote && source.type == 'image') {

        const response = await Axios.get(source.sourcepath, {
            responseType: 'arraybuffer'
        });

        source.fileContent = response.data;
    }
}

const importCssUrls = async (source: any, context: any, logger: Function): Promise<void> =>  {

    let css = source.fileContent as string;
    let output = css;

    const urlRegexGlobal = /.*url\(([^\)]+)\).*/gi;

    let match: RegExpExecArray | null = null;

    while (match = urlRegexGlobal.exec(css)) {

        const cssUrl = match[1];

        // Remove any quotes or whitespace that might be encasing the path as it's perfectly valid in CSS
        // but we need clean path to work with. remove any query params or # locations as they won't be valid paths.
        let path = cssUrl.replace(/^'\//g, '').replace(/('|")/g, '').trim();

        // Only import local resources, so don't import https/s externals.
        if (path.startsWith('data') || path.startsWith('http')) {
            continue;
        }

        path = path.replace(/(\#|\?).*/, '');

        const resource = new File(path, dirname(source.filepath));

        if (!await resource.exists()) {
            throw new Error(`File not found while importing CSS: ${truncate(match[0], 100)}\n\nResource: ${truncate(resource.getPath(), 100)}`);
        }

        const base64Resource = (await resource.read()).toString('base64');

        output = output.replace(cssUrl, `data:${resource.getType()};base64,${base64Resource}`)
    }

    if (output !== css) {
        source.content = `<style>\n${output}\n</style>`
    }

}


function truncate(string: string, length: number){
    return string.length > length ? string.substring(0, 100) + '...' : string;
}
