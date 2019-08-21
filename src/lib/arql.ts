import * as path from 'path';
import { appDirectoryPath, File } from './file';

type ArqlQuery = ArqlBooleanQuery | ArqlTagMatch;

interface ArqlTagMatch {
    op: 'equals',
    expr1: string
    expr2: string
}

interface ArqlBooleanQuery {
    op: 'and' | 'or',
    expr1: ArqlQuery
    expr2: ArqlQuery
}

type ArqlResultSet = string[];

interface ArqlStore {
    [key: string]: ArqlRecord
}

interface ArqlRecord {
    id: string
    block: {
        id: string,
        height: number
    },
    tags: {
        [key: string]: string[]
    }
}

const setOperations: {
    [key:string]: (a: string[], b: string[]) => string[]
} = {
    and: (a, b) => {
        // Return the intersection between sets A and B
        return a.filter(element => b.includes(element));
    },
    or: (a, b) => {
        // Return the union between sets A and B
        return [...new Set([...a, ...b])]
    }
};

let data: ArqlStore;

export async function loadStore(){
    const storePath = path.resolve(appDirectoryPath(), 'arql.store.json');

    const file = new File(storePath);

    if (!(await file.exists())) {
        file.write(Buffer.from(JSON.stringify({})))
    }

    data = JSON.parse((await file.read()).toString());
};

export async function arqlSearch(query: ArqlQuery | ArqlTagMatch): Promise<ArqlResultSet>{

    if (query.op == 'equals') {

        return Object.values(data).filter((record) => {
            return record.tags[query.expr1].includes(query.expr2);
        }).map( record => record.id);

    }

    if (query.op == 'and' || query.op == 'or' ) {

        const subquery1 = arqlSearch(query.expr1);
        const subquery2 = arqlSearch(query.expr2);

        const results = await Promise.all([subquery1, subquery2]);

        return setOperations[query.op](results[0],results[1]);
    }

}
