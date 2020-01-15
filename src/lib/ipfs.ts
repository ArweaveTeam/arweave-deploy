//@ts-ignore
import * as dagPB from 'ipld-dag-pb';

//@ts-ignore
import UnixFS from 'ipfs-unixfs';

export async function getIpfsCid(data: Buffer, unixFsType = 'file', dagPbOptions = {cidVersion: 0}): Promise<string>{
    const file = new UnixFS(unixFsType, data);

    const node = dagPB.DAGNode.create(file.marshal());

    const Cid = await dagPB.util.cid(dagPB.util.serialize(node), dagPbOptions);

    return Cid.toBaseEncodedString();
}

