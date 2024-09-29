import WebSocket from 'ws';
import { Blockchain } from './2-blockchain';  // 假设区块链文件路径

const sockets: WebSocket[] = [];

// 初始化 P2P 服务器
export const initP2PServer = (port: number, blockchain: Blockchain) => {
    const server = new WebSocket.Server({ port });
    server.on('connection', ws => initConnection(ws, blockchain));
    console.log(`P2P 服务器正在监听端口 ${port}`);
};

// 初始化连接
const initConnection = (ws: WebSocket, blockchain: Blockchain) => {
    sockets.push(ws);
    ws.on('message', (message: string) => handleMessage(ws, message, blockchain));
    ws.on('close', () => closeConnection(ws));
    ws.on('error', () => closeConnection(ws));
};

// 处理消息
const handleMessage = (ws: WebSocket, message: string, blockchain: Blockchain) => {
    const receivedBlocks = JSON.parse(message);
    const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
    const latestBlockHeld = blockchain.getLatestBlock();

    if (latestBlockReceived.index > latestBlockHeld.index) {
        console.log(`区块高度差异，最新的区块高度是: ${latestBlockReceived.index}, 当前本地的区块高度是: ${latestBlockHeld.index}`);

        if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
            console.log('我们可以将接收到的最新区块添加到本地链中');
            blockchain.addBlock(latestBlockReceived);
            broadcast(responseLatestMsg(blockchain));  // 广播最新的区块链
        } else if (receivedBlocks.length === 1) {
            console.log('请求完整的区块链，因为链只包含一个区块');
            broadcast(queryAllMsg());
        } else {
            console.log('用接收到的链替换当前链');
            blockchain.replaceChain(receivedBlocks);  // 调用 replaceChain
        }
    } else {
        console.log('接收到的链不是最新的');
    }
};

const closeConnection = (ws: WebSocket) => {
    console.log('关闭 P2P 连接');
    sockets.splice(sockets.indexOf(ws), 1);
};

const queryAllMsg = () => JSON.stringify({ type: 'QUERY_ALL' });
const responseLatestMsg = (blockchain: Blockchain) => JSON.stringify(blockchain.chain);

export const broadcast = (message: any) => sockets.forEach(ws => ws.send(message));

// 导出 connectToPeer 函数
export const connectToPeer = (newPeer: string, blockchain: Blockchain) => {
  const ws = new WebSocket(newPeer);
  ws.on('open', () => initConnection(ws, blockchain));
  ws.on('error', (error) => {
      console.error('连接新节点时出错:', error);
  });
};
