export class ContentType {

    protected signature = '--content-type <mime_type>';

    protected description = 'Set the data content type manually';

    action(value: string): string {
        if (value.match(/.+\/.+/)) {
            return value;
        }
        throw new Error('--content-type: Invalid content-type, must be a valid mime type in the format of */*, e.g. text/html');
    }
}