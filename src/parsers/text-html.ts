import { File } from '../lib/file';
import { inlineSource, Build, Source } from '../lib/inline-source-context';
import { dirname } from 'path';
import { ContentParserInterface, PrepareTransactionOptions } from '../lib/TransactionBuilder';
import { inspect } from 'util';
import Axios, {AxiosRequestConfig} from 'axios';


export class HtmlParser implements ContentParserInterface {

    public description = 'HTML/JS/CSS bundling and packaging';

    async run(entry: File, options: PrepareTransactionOptions = {}): Promise<Buffer> {
        const build = await this.build(entry, options);
        return Buffer.from(build.html);
    }

    async build(entry: File, options: PrepareTransactionOptions = {}): Promise<Build> {

       let logger = options.logger;

       try {
        const build = await inlineSource(entry.getPath(), {
            attribute: false,
            compress: true,
            rootpath: entry.getDirectory(),
            saveRemote: false,
            svgAsImage: true,
            swallowErrors: true,
            ignore: [],
            handlers: [
                (async (source: Source, context: any): Promise<any> => {
                    if (!source.errors) {
                        source.errors = [];
                    }
                    if (!source.subResources) {
                        source.subResources = [];
                    }
                    if (source.type == 'image'){
                        return await importRemoteImages(entry, source, context, logger);
                    }
                    if (source.fileContent && !source.content && source.type == 'css') {
                        return await importCssUrls(entry, source, context, logger);
                    }
                })
            ]
        });

        if (!build.html) {
            build.html = '';
        }

        build.sources.forEach(source => {
            if (source.errored && !source.errors.length) {
                source.errors.push({
                    message: `Failed to import resource - Not found`,
                    path: source.sourcepath,
                    context: {
                        path: entry.getPath(),
                    }
                });
            }
        });

        return build;
       } catch (error) {
            throw new Error(`Error processing: ${entry.getPath()}\n` + error);
       }
    }


}

const importRemoteImages = async (entry: File, source: Source, context: any, logger: Function): Promise<void> => {

    if (source.isRemote && source.type == 'image') {
        try {
            const response = await downloadRemote(source.sourcepath);
            source.fileContent = response.data;
        } catch (error) {
            source.errored = true;
            source.errors.push({
                message: `${error.message}`,
                path: source.sourcepath,
                context: {
                    path: entry.getPath(),
                },
                response: {
                    status: error.response ? error.response.status : null,
                    statusText: error.response ? error.response.statusText : null,
                    headers: error.response ? error.response.headers : null,
                }
            });
        }
    }
}

const importCssUrls = async (entry: File, source: Source, context: any, logger: Function): Promise<void> =>  {

    let css = source.fileContent as string;
    let output = css;

    const urlRegexGlobal = /.*url\(([^\)]+)\).*/gi;

    let match: RegExpExecArray | null = null;

    while (match = urlRegexGlobal.exec(css)) {
        try {
            const cssLine = match[0];
            const cssUrl = match[1];

            // Remove any quotes or whitespace that might be encasing the path as it's perfectly valid in CSS
            // but we need clean path to work with. Remove any query params or # locations as they won't be valid paths.
            let path = cssUrl.replace(/^'\//g, '').replace(/('|")/g, '').trim();

            // Data urls don't need us to do anything as they're already inline
            if (path.startsWith('data:')) {
                continue;
            }
            
            if (path.startsWith('http://') || path.startsWith('https://')) {
                try {

                    const response = await downloadRemote(path);
                    const b64Encodded = response.data.toString('base64');

                    output = output.replace(cssUrl, `data:${response.type};base64,${b64Encodded}`)

                    source.subResources.push({
                        type: response.type,
                        path: path,
                        isRemote: true,
                        size: {
                            bytes: b64Encodded.length
                        },
                        context: truncate(cssLine, 200)
                    });

                } catch (error) {
                    source.errored = true;
                    source.errors.push({
                        message: `File not found: ${path}`,
                        path: path,
                        context: {
                            path: source.filepath,
                            line: cssLine.trim()
                        },
                        response: {
                            status: error.response ? error.response.status : null,
                            statusText: error.response ? error.response.statusText : null,
                            headers: error.response ? error.response.headers : null,
                        }
                    });
                    continue;
                }

            }else{
                // For local urls we should remove the # and query strings
                path = path.replace(/(\#|\?).*/, '');

                const resource = new File(path, dirname(source.filepath));
        
                if (!await resource.exists()) {
                    source.errored = true;
                    source.errors.push({
                        message: `File not found: ${resource.getPath()}`,
                        path: resource.getPath(),
                        context: {
                            line: cssLine.trim()
                        }
                    });
                }
        
                const b64Encodded = (await resource.read()).toString('base64');

                output = output.replace(cssUrl, `data:${resource.getType()};base64,${b64Encodded}`)

                source.subResources.push({
                    type: resource.getType(),
                    path: path,
                    isRemote: false,
                    size: {
                        bytes: b64Encodded.length
                    },
                    context: truncate(cssLine.trim(), 200)
                });
            }
        } catch (error) {
            source.errored = true;
            source.errors.push({
                message: `${error.message} ${error.stack}`,
                context: {
                    path: source.filepath,
                },
                response: {
                    status: error.response ? error.response.status : null,
                    statusText: error.response ? error.response.statusText : null,
                    headers: error.response ? error.response.headers : null,
                }
            });
        }
    }

    if (output !== css) {
        source.content = `<style>\n${output}\n</style>`
    }
}

async function downloadRemote(url: string): Promise<{data: Buffer, type: string}>{
    const response = await Axios.get(url, {
        responseType: 'arraybuffer'
    });

    return {
        data: response.data,
        type: response.headers['content-type']
    }
}

function truncate(string: string, length: number){
    let trimmed = string.trim();
    return trimmed.length > length ? trimmed.substring(0, 100) + '...' : trimmed;
}
