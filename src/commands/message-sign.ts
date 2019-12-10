import { Command } from "../command";
import Utils from "arweave/node/lib/utils";

export class MessageSignCommand extends Command {
  public signature = "message-sign";

  public description = "Sign a message with an Arweave private key";

  public options = [
    {
      signature: "--message <message>",
      description: "(required) The message string to sign"
    }
  ];

  async action() {
    if (!this.context.message) {
      throw new Error(`(--message) no message provided`);
    }

    const message = this.context.message;

    const key = await this.getKey();

    const address = await this.arweave.wallets.jwkToAddress(key);

    const signature = Utils.bufferTob64Url(
      await this.arweave.crypto.sign(key, Buffer.from(message, "utf8"))
    );

    this.print([
      `Arweave address: ${address}`,
      ``,
      `Message: ${message}`,
      ``,
      `Public key: ${key.n}`,
      ``,
      `Signature: ${signature}`,
      ``
    ]);
  }
}
