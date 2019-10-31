import { Bar, Presets } from 'cli-progress';
import Transaction from 'arweave/node/lib/transaction';
import Arweave from 'arweave/node';

async function wait(milliseconds: number) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

export async function uploadTransactions(arweave: Arweave, transactions: Transaction[]) {

    const maxRetries = 5;
    const retryDelay = 2000;

    const progressBar = uploadProgressBar();

    const upload = async (transaction: Transaction, attempt: number = 1): Promise<void> => {
        const response = await arweave.transactions.post(Buffer.from(JSON.stringify(transaction), 'utf8'));

        if (!([200, 208].includes(response.status))) {
            if (attempt >= maxRetries) {
                throw new Error(`Failed to submit transaction, unexpected status: ${response.status} - ${response.data}`);
            }
            await wait(retryDelay);
            return await upload(transaction, ++attempt);
        }
    };

    progressBar.start(transactions.length, 0);

    for (let index = 0; index < transactions.length; index++) {
        const transaction = transactions[index];
        await upload(transaction);
        progressBar.increment(1);
    }

    progressBar.stop();
}
function uploadProgressBar(): Bar {
    // format a number of seconds into hours and minutes as appropriate
    const formatTime = (t: any, roundToMultipleOf: any) => {
        function round(input: any) {
            if (roundToMultipleOf) {
                return roundToMultipleOf * Math.round(input / roundToMultipleOf);
            } else {
                return input;
            }
        }
        if (t > 3600) {
            return Math.floor(t / 3600) + 'h' + round((t % 3600) / 60) + 'm';
        } else if (t > 60) {
            return Math.floor(t / 60) + 'm' + round(t % 60) + 's';
        } else if (t > 10) {
            return round(t) + 's';
        } else {
            return t + 's';
        }
    };
    return new Bar(
        {
            etaBuffer: 100,
            fps: 30,
            format: (options: any, params: any, payload: any) => {
                const percentage = Math.round(params.progress * 100) + '';
                // calculate elapsed time
                const elapsedTime = Math.round((Date.now() - params.startTime) / 1000);
                const elapsedTimef = formatTime(elapsedTime, 1);

                const bar =
                    options.barCompleteString.substr(0, Math.round(params.progress * options.barsize)) +
                    options.barIncompleteString.substr(0, Math.round((1.0 - params.progress) * options.barsize));

                return `${bar} ${params.value}/${params.total} ${percentage}% | ${elapsedTimef}`;
            },
        },
        Presets.shades_classic,
    );
}
