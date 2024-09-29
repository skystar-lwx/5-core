import axios, { AxiosError } from 'axios';  // 导入 AxiosError
import { Blockchain } from './2-blockchain';          // 引入 Blockchain 类
import { Block } from './block';                    // 引入 Block 类
import { Transaction } from './transaction';        // 引入 Transaction 类
import { TransactionManager } from './transaction'; // 引入 TransactionManager 类
import { logWithTimestamp } from './utils';         // 引入日志输出函数
import { BalanceManager } from './balanceManager';  // 引入余额管理模块
import { initP2PServer, connectToPeer, broadcast } from './6-p2p';  // 引入 P2P 功能

// 定义消息类型
// 定义消息类型
enum MessageType {
    QUERY_LATEST = "QUERY_LATEST",
    QUERY_ALL = "QUERY_ALL",
    RESPONSE_BLOCKCHAIN = "RESPONSE_BLOCKCHAIN",
    NEW_BLOCK = "NEW_BLOCK",  // 添加 NEW_BLOCK
    NEW_TRANSACTION = "NEW_TRANSACTION"  // 添加 NEW_TRANSACTION
}

const serverurl = "http://192.168.100.102:3001";  // 设置为要连接的服务器地址

export class Miner {
    minerAddress: string;                   // 矿工地址
    blockchain: Blockchain;                 // 区块链实例
    transactionManager: TransactionManager; // 交易管理器实例
    reward: number = 10;                    // 挖矿奖励
    isMining: boolean = false;              // 矿工是否正在挖矿
    miningInterval: number = 10000;          // 挖矿间隔时间，默认5秒
    newBlock: Block | null = null;                  // 存储新挖出的区块
    lastSubmittedBlockHash: string | null = null;  // 记录上次提交成功的区块哈希
    difficulty: number;

    constructor(minerAddress: string, difficulty: number, blockchain: Blockchain, balanceManager: BalanceManager) {
        this.minerAddress = minerAddress;
        this.difficulty = difficulty;
        this.blockchain = blockchain;
        this.transactionManager = new TransactionManager(blockchain, balanceManager); // 传入 blockchain 和 balanceManager
    }

    // 从服务器获取最新区块
    async getLatestBlock() {
        console.log('🔍 Fetching the latest block from the server...');
        try {
            const response = await axios.get(`${serverurl}/latest-block`);  // 使用服务器URL
            console.log('📦 Latest block received from server:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ 无法从服务器获取最新区块:', error);
            throw error;  // 确保如果获取最新区块失败，矿工不会继续挖矿
        }
    }

    // 提交挖到的新区块到主节点
    async submitBlock(newBlock: Block) {
        console.log('📤 正在向主节点提交新区块:', newBlock);
        try {
            // 确保区块字段完整
            if (!this.isValidBlock(newBlock)) {
                console.error('❌ 提交区块前发现结构无效:', newBlock);
                return;
            }

            // 检查是否重复提交
            if (newBlock.hash === this.lastSubmittedBlockHash) {
                console.log(`⚠️ 该区块 ${newBlock.hash} 已提交，跳过重复提交。`);
                return;
            }

            const response = await axios.post(`${serverurl}/submit-block`, { block: newBlock });

            if (response.status === 200) {
                console.log('✅ 区块已提交:', newBlock.hash);
                this.lastSubmittedBlockHash = newBlock.hash;  // 更新哈希

                // 广播区块到P2P网络
                broadcast({ type: MessageType.NEW_BLOCK, data: newBlock });  // 广播区块到P2P网络
            } else {
                console.error(`❌ 提交区块失败，状态码: ${response.status}`);
                await this.retrySubmit(newBlock);
            }
        } catch (error) {
            this.handleSubmitError(error, newBlock);
        }
    }

    // 验证区块结构
    isValidBlock(block: Block): boolean {
        // 确保返回 boolean 类型，而不是 string | boolean
        return (
            typeof block.index !== 'undefined' &&
            !!block.timestamp && 
            Array.isArray(block.transactions) && 
            !!block.previousHash && 
            block.nonce >= 0 && 
            !!block.hash
        );
    }

    // 重新尝试提交区块
    async retrySubmit(newBlock: Block) {
        console.log('⏸️  暂停 3 秒后重新提交区块...');
        await this.pause(3000);
        await this.submitBlock(newBlock);
    }

    // 错误处理
    handleSubmitError(error: unknown, newBlock: Block) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
            console.error('❌ 提交区块时出错，服务器返回的状态码:', axiosError.response.status);
        } else {
            console.error('❌ 提交区块时发生未知错误:', (error as Error).message);
        }
        this.retrySubmit(newBlock);
    }

    // 创建奖励交易
    createRewardTransaction(): Transaction {
        return this.transactionManager.createTransaction('coinbase', this.minerAddress, this.reward);
    }

    // 挖矿方法
    async startMining() {
        this.isMining = true;
        console.log(`🚀 Miner ${this.minerAddress} started mining with difficulty ${this.difficulty}...`);

        while (this.isMining) {
            try {
                const latestBlock = await this.getLatestBlock();  // 获取最新区块
                console.log(`📏 Current chain height: ${latestBlock.index}`);
                this.newBlock = new Block(
                    latestBlock.index + 1,
                    new Date().toISOString(),
                    [],  // 可根据需要添加交易数据
                    latestBlock.hash
                );
                console.log('⛏️ 开始挖新区块...');
                this.newBlock.mineBlock(this.difficulty);

                console.log(`💎 Block mined! Hash: ${this.newBlock.hash}`);
                await this.submitBlock(this.newBlock);
            } catch (error) {
                console.error('❌ 挖矿时发生错误:', error);
                this.stopMining();
            }
        }
    }

    // 停止挖矿方法
    stopMining(): void {
        this.isMining = false;
        logWithTimestamp(`矿工 ${this.minerAddress} 停止挖矿。`);
    }

    // 暂停一段时间的辅助函数
    pause(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 启动矿工程序
const blockchain = new Blockchain();
const balanceManager = new BalanceManager();
const miner = new Miner('miner1', 1, blockchain, balanceManager);

miner.startMining();  // 开始持续挖矿
initP2PServer(6001, blockchain);  // 启动P2P服务器

// 连接到其他矿工节点
connectToPeer('ws://192.168.100.102:6002', blockchain);
connectToPeer('ws://192.168.100.100:6003', blockchain);