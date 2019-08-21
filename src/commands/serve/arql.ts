import { IncomingMessage } from 'http';
import { getAllMetadata, TxMetadataCollection } from './store';
import { Response } from './router';
import { readIncomingMessageData } from './helpers';
import Arweave from 'arweave/node';
import { Session } from '.';

type ArqlQuery = ArqlBooleanQuery | ArqlTagMatch;

interface ArqlTagMatch {
    op: 'equals';
    expr1: string;
    expr2: string;
}

interface ArqlBooleanQuery {
    op: 'and' | 'or';
    expr1: ArqlQuery;
    expr2: ArqlQuery;
}

type ArqlResultSet = string[];

export async function arqlRequestHandler(request: IncomingMessage, { arweave, config }: Session): Promise<Response> {
    const body = (await readIncomingMessageData(request)).toString();

    try {
        JSON.parse(body);
    } catch (error) {
        return {
            status: 400,
            body: JSON.stringify('Invalid json'),
            headers: {},
        };
    }

    const query = JSON.parse(body);

    if (!isArqlQuery(query)) {
        return {
            status: 400,
            body: JSON.stringify('Invalid arql query syntax'),
            headers: {},
        };
    }

    const metadata = await getAllMetadata();

    const localResults = await arqlSearch(query, metadata);

    if (config.arql && config.arql.mergeExternal) {
        const liveResults = await liveQuery(arweave, query);

        const merged = [...new Set(localResults.concat(liveResults))];

        return {
            status: 200,
            body: JSON.stringify(merged),
            headers: {},
        };
    }

    return {
        status: 200,
        body: JSON.stringify(localResults),
        headers: {},
    };
}

async function liveQuery(arweave: Arweave, query: ArqlQuery) {
    const results = await arweave.api.post('arql', query);
    if (results.data) {
        return results.data;
    }

    return [];
}

export async function arqlSearch(query: ArqlQuery | ArqlTagMatch, data: TxMetadataCollection): Promise<ArqlResultSet> {
    if (query.op == 'equals') {
        return Object.values(data)
            .filter(record => {
                return record.tags.hasOwnProperty(query.expr1) && record.tags[query.expr1].includes(query.expr2);
            })
            .map(record => record.id);
    }
    if (query.op == 'and' || query.op == 'or') {
        const subquery1 = arqlSearch(query.expr1, data);
        const subquery2 = arqlSearch(query.expr2, data);

        const results = await Promise.all([subquery1, subquery2]);

        return {
            and: arrayIntersect(results[0], results[1]),
            or: arrayUnion(results[0], results[1]),
        }[query.op];
    }
}

function isArqlQuery(query: any): query is ArqlQuery {
    if (typeof query == 'object') {
        if (query.op == 'equals') {
            return typeof query.expr1 == 'string' && typeof query.expr2 == 'string';
        }
        if (query.op == 'and' || query.op == 'or') {
            return isArqlQuery(query.expr1) && isArqlQuery(query.expr2);
        }
    }
    return false;
}

function arrayIntersect(a: string[], b: string[]): string[] {
    return a.filter(element => b.includes(element));
}

function arrayUnion(a: string[], b: string[]): string[] {
    return [...new Set([...a, ...b])];
}
