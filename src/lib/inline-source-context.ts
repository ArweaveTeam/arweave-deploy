import * as path from 'path';
import { Options } from 'inline-source';

const { isFilepath } = require('inline-source/lib/utils');
const context = require('inline-source/lib/context');
const parse = require('inline-source/lib/parse');
const run = require('inline-source/lib/run');

export interface subResource{
  type: string
  path?: string
  size?: {
    bytes: number
  }
  context?: string
  isRemote?: boolean
}

export interface Source {
 attributes: {[key: string]: string}
 compress: boolean
 content: string
 errored: boolean
 extension: string
 fileContent: string | Buffer
 filepath: string
 filepathAnchor: string
 format: string
 isRemote: boolean
 match: string
 padding: string
 parentContext: string
 props: {[key: string]: string}
 replace: string
 sourcepath: string
 tag: string
 type: string
 errors?: ParseError[]
 stack?: any[]
 subResources?: subResource[]
 size?: {
   bytes: number
 }
}

export interface ParseError{
  message: string
  path?: string,
  asset?: {
    path: string
  },
  context?: {
      path?: string
      line?: string
  }
  request?: {
      [index: string]: any
  },
  response?: {
    [index: string]: any
  }
}
export interface Build {
  html: string
  sources: Source[]
  errors: boolean
}

export function inlineSource(htmlpath: string, options: Partial<Options>): Promise<Build>{
    return new Promise(async (resolve, reject) => {
        const ctx = context.create(options);
        // Load html content
        if (isFilepath(htmlpath)) {
          ctx.htmlpath = path.resolve(htmlpath);
          try {
            ctx.html = ctx.fs.readFileSync(ctx.htmlpath, 'utf8');
          } catch (err) {
            return reject(err);
          }
          // Passed file content instead of path
        } else {
          ctx.html = htmlpath;
        }
    
        try {
          await parse(ctx);
          if (ctx.sources.length > 0) {
            await run(ctx, ctx.sources, ctx.swallowErrors);
          }
        } catch (err) {
          return reject(err);
        }

        ctx.sources.forEach((source: Source) => {
          source.size = {bytes: source.content ? source.content.length : 0};
          delete source.parentContext;
          delete source.fileContent;
          delete source.content;
          delete source.replace;
          delete source.stack
          if (!source.errors) {
            source.errors = [];
          }
        });
        
        ctx.errors = ctx.sources.reduce((carry: boolean, current: Source) => carry || current.errored)
    
        resolve(ctx);
      });
}