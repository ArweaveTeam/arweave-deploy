import * as fs from 'fs';
import { resolve } from 'path';

export class File {

    protected path: string

	constructor(path: string, base?: string) {
        this.path = path;
        if (base) {
            resolve(base, this.path);
        }else{
            resolve(this.path);
        }
    }

    public getPath(){
        return this.path;
    }

    public read(options?: { encoding?: string; flag?: string; }): Promise<string | Buffer> {
        return new Promise((resolve, reject) => {

            fs.readFile(this.path, options, (error: Error, data: string | Buffer ) => {
                if (error) {
                    reject(error)
                }
                resolve(data);
            })
        });
    }

    public exists(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            fs.exists(this.path, (exists: boolean) => {
                resolve(exists);
            })
        });
    }

    public info(): Promise<fs.Stats> {
        return new Promise((resolve, reject) => {
            fs.stat(this.path, (error: Error, stats: fs.Stats) => {
                if (error) {
                    reject(error)
                }
                resolve(stats);
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
                fixed = String((bytes / s).toFixed());
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
