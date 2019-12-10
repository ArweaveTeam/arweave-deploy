import { Command } from "../command";
import Utils from "arweave/node/lib/utils";
import commander = require("commander");

export class MessageVerifyCommand extends Command {
  public signature = "message-verify";

  public description = "Verify a message signature";

  public options = [
    {
      signature: "--message <message>",
      description: "(required) The original message"
    },
    {
      signature: "--signature <signature>",
      description: "(required) The message signature"
    },
    {
      signature: "--address <address>",
      description: "(required) The address used to sign the message"
    },
    {
      signature: "--public-key <public_key>",
      description: "(required) The public key used to sign the message"
    }
  ];

  async action() {
    const message = this.context.message;
    const signature = this.context.signature;
    const address = this.context.address;
    const publicKey = this.context.publicKey;

    this.validateParamIsSet("message");
    this.validateParamIsSet("signature");
    this.validateParamIsSet("address");
    this.validateParamIsSet("publicKey", "--public-key");

    const derrivedAddress = Utils.bufferTob64Url(
      await this.arweave.crypto.hash(Utils.b64UrlToBuffer(publicKey))
    );

    if (address !== derrivedAddress) {
      throw new Error(
        "Signature verification failed: public key does not match the given Arweave address"
      );
    }

    try {
      if (
        await this.arweave.crypto.verify(
          publicKey,
          Buffer.from(message, "utf8"),
          Utils.b64UrlToBuffer(signature)
        )
      ) {
        this.print([`Signature verification passed`]);
      }else{
        throw new Error(
          "Signature verification failed: the signature is not valid for the given inputs"
        );
      }
    } catch (error) {
      throw new Error(
        "Signature verification failed: the signature is not valid for the given inputs"
      );
    }
  }

  private validateParamIsSet(paramName: string, parsedFieldName?: string) {
    if (!this.context[paramName]) {
      throw new Error(
        `${parsedFieldName || "--" + paramName}: missing required parameter`
      );
    }
  }
}
