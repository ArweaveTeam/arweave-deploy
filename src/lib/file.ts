import * as fs from 'fs';
import * as path from 'path';
import * as mime from 'mime';

export class File {

    protected path: string
    protected base: string

    constructor(path: string, base?: string) {
        this.path = path;
        this.base = base;
    }

    public getType(){
        return mime.getType(this.getPath())
    }

    public getBase(){
        return this.base;
    }

    /**
     * Get the fill absolute path for the file.
     *
     * @returns
     * @memberof File
     */
    public getPath() {
        return this.base ? path.resolve(this.base, this.path) : this.path;
    }

    /**
     * Get the directory that the file lives in.
     *
     * @returns
     * @memberof File
     */
    public getDirectory() {
        return path.dirname(this.getPath());
    }

    /**
     * Get the entire contents of the file as a buffer.
     *
     * @param {{ encoding?: string; flag?: string; }} [options]
     * @returns {Promise<Buffer>}
     * @memberof File
     */
    public read(options?: { encoding?: string; flag?: string; }): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            fs.readFile(this.getPath(), options, (error: Error, data: string | Buffer) => {
                if (error) {
                    reject(error)
                }
                if (typeof data == 'string') {
                    resolve(Buffer.from(data));
                }

                if (data instanceof Buffer) {
                    resolve(data);
                }

                new Error('Unexpected file type, failed to read.');
            })
        });
    }

    public write(data: Buffer, options?: {encoding?: string}): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.writeFile(this.getPath(), data, options, (error: Error) => {
                if (error) {
                    reject(error);
                }
                resolve();
            })
        });
    }

    public exists(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            fs.exists(this.getPath(), (exists: boolean) => {
                resolve(exists);
            })
        });
    }

    public info(): Promise<fs.Stats> {
        return new Promise((resolve, reject) => {
            fs.stat(this.getPath(), (error: Error, stats: fs.Stats) => {
                if (error) {
                    reject(error)
                }
                resolve(stats);
            })
        });
    }

    public delete(): Promise<fs.Stats> {
        return new Promise((resolve, reject) => {
            fs.unlink(this.getPath(), (error: Error) => {
                if (error) {
                    reject(error)
                }
                resolve();
            })
        });
    }

    public static bytesForHumans(bytes: number): string {
        const sizes = [
            'Bytes', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB'
        ];

        let output;

        sizes.forEach((unit, id) => {
            const s = Math.pow(1024, id);
            let fixed = '';
            if (bytes >= s) {
                fixed = String((bytes / s).toFixed(2));
                if (fixed.indexOf('.0') === fixed.length - 2) {
                    fixed = fixed.slice(0, -2);
                }
                output = `${fixed} ${unit}`;
            }
        });

        if (!output) {
            `0 Bytes`;
        }

        return output;
    }

}
