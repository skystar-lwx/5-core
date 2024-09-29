import WebSocket from 'ws';
import { Blockchain } from './2-blockchain';  // 假设区块链文件路径

const sockets: WebSocket[] = [];

// 定义消息类型
enum MessageType {
    QUERY_LATEST = "QUERY_LATEST",
    QUERY_ALL = "QUERY_ALL",
    RESPONSE_BLOCKCHAIN = "RESPONSE_BLOCKCHAIN"
}

// 定义消息接口
interface Message {
    type: MessageType;
    data?: any;
}

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

    // 每当有新的连接，查询最新的区块链
    sendMessage(ws, { type: MessageType.QUERY_LATEST });
};

// 处理消息
const handleMessage = (ws: WebSocket, message: string, blockchain: Blockchain) => {
    const receivedMessage: Message = JSON.parse(message);

    switch (receivedMessage.type) {
        case MessageType.QUERY_LATEST:
            sendMessage(ws, {
                type: MessageType.RESPONSE_BLOCKCHAIN,
                data: [blockchain.getLatestBlock()]
            });
            break;
        case MessageType.QUERY_ALL:
            sendMessage(ws, {
                type: MessageType.RESPONSE_BLOCKCHAIN,
                data: blockchain.chain
            });
            break;
        case MessageType.RESPONSE_BLOCKCHAIN:
            handleBlockchainResponse(receivedMessage.data, blockchain);
            break;
        default:
            console.error("无法处理的消息类型:", receivedMessage.type);
    }
};

// 处理区块链消息响应
const handleBlockchainResponse = (receivedBlocks: any[], blockchain: Blockchain) => {
    if (receivedBlocks.length === 0) {
        console.log('接收到的区块链为空');
        return;
    }

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

// 关闭连接
const closeConnection = (ws: WebSocket) => {
    console.log('关闭 P2P 连接');
    sockets.splice(sockets.indexOf(ws), 1);
};

// 构建查询所有区块的消息
const queryAllMsg = () => JSON.stringify({ type: MessageType.QUERY_ALL });

// 构建响应最新区块的消息
const responseLatestMsg = (blockchain: Blockchain) => JSON.stringify({
    type: MessageType.RESPONSE_BLOCKCHAIN,
    data: [blockchain.getLatestBlock()]
});

// 发送消息
const sendMessage = (ws: WebSocket, message: Message) => ws.send(JSON.stringify(message));

// 广播消息到所有节点
export const broadcast = (message: Message) => sockets.forEach(ws => sendMessage(ws, message));

// 连接到新的节点
export const connectToPeer = (newPeer: string, blockchain: Blockchain) => {
    const ws = new WebSocket(newPeer);
    ws.on('open', () => initConnection(ws, blockchain));
    ws.on('error', (error) => {
        console.error('连接新节点时出错:', error);
    });
};