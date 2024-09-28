import axios, { AxiosError } from 'axios';  // 导入 AxiosError
import { Blockchain } from './blockchain';          // 引入 Blockchain 类
import { Block } from './block';                    // 引入 Block 类
import { Transaction } from './transaction';        // 引入 Transaction 类
import { TransactionManager } from './transaction'; // 引入 TransactionManager 类
import { logWithTimestamp } from './utils';         // 引入日志输出函数
import { BalanceManager } from './balanceManager';  // 引入余额管理模块

const serverurl = "http://localhost:8000"

export class Miner {
    minerAddress: string;                   // 矿工地址
    blockchain: Blockchain;                 // 区块链实例
    transactionManager: TransactionManager; // 交易管理器实例
    reward: number = 10;                    // 挖矿奖励
    isMining: boolean = false;              // 矿工是否正在挖矿
    miningInterval: number = 5000;         // 挖矿间隔时间，默认10秒

    constructor(minerAddress: string, blockchain: Blockchain, balanceManager: BalanceManager) {
        this.minerAddress = minerAddress;
        this.blockchain = blockchain;
        this.transactionManager = new TransactionManager(blockchain, balanceManager); // 传入 blockchain 和 balanceManager
    }

    // 从主节点获取最新区块
    async getLatestBlock() {
        console.log('🔍 Fetching the latest block from the main node...');
        try {
            const response = await axios.get('http://localhost:3001/latest-block');
            console.log('📦 Latest block received:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ 无法获取最新区块:', error);
            throw error;  // 确保如果获取最新区块失败，矿工不会继续挖矿
        }
    }

    // 创建奖励交易
    createRewardTransaction(): Transaction {
        return this.transactionManager.createTransaction('coinbase', this.minerAddress, this.reward);
    }

    // 获取最新区块并创建新区块
    createNewBlock(): Block {
        const latestBlock = this.blockchain.getLatestBlock(); // 获取最新区块
        return new Block(
            this.blockchain.chain.length,
            new Date().toISOString(),
            [...this.blockchain.pendingTransactions],
            latestBlock.hash,             // 基于最新区块的哈希
            this.minerAddress
        );
    }

    // 挖矿方法
    mine(): boolean {
        try {
            logWithTimestamp(`矿工 ${this.minerAddress} 开始挖矿...`);

            // 即使没有待处理交易，依然为矿工提供奖励
            if (this.blockchain.pendingTransactions.length === 0) {
                logWithTimestamp('没有待处理交易，但依然为矿工生成奖励交易。');
            }

            // 创建奖励交易，并暂时添加到待处理交易中
            const rewardTransaction = this.createRewardTransaction();


            this.blockchain.pendingTransactions.push(rewardTransaction);
            // 使用 JSON.stringify() 打印详细的对象信息
            logWithTimestamp('------------', JSON.stringify(this.blockchain.pendingTransactions, null, 2));
            logWithTimestamp(`奖励交易已创建: ${JSON.stringify(rewardTransaction)}`);

            // 创建新区块
            const newBlock = this.createNewBlock();
            logWithTimestamp(`新块创建成功，正在挖掘区块 ${newBlock.transactions}...`);

            // 添加新块到区块链
            this.blockchain.addBlock(newBlock);
            
            logWithTimestamp('newBlock.transactions------------', JSON.stringify(newBlock.transactions, null, 2));

            logWithTimestamp(`区块 ${newBlock.index} 已成功挖掘并添加到区块链。`);

            // 清理已处理的交易，将其状态标记为已确认
            this.blockchain.pendingTransactions.forEach(tx => {
                tx.status = 'confirmed'; // 标记为已确认
            });
            this.blockchain.pendingTransactions = []; // 清空交易队列
            logWithTimestamp('所有待处理交易已被确认并清空。');

            return true;
        } catch (error: unknown) {
            // 将 error 转换为 Error 类型并处理
            const err = error as Error;
            logWithTimestamp(`挖矿过程中发生错误: ${err.message}`);
            return false;
        }
    }

    // 挖矿方法结束

    // 持续挖矿方法
    async startMining(): Promise<void> {
        this.isMining = true;
        while (this.isMining) {
            const mined = this.mine();
            if (!mined) {
                logWithTimestamp('本轮未成功挖矿，等待下一轮。');
            }
            await this.pause(this.miningInterval);  // 每次挖矿后暂停一段时间再开始下一轮
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
const miner = new Miner('miner1', blockchain, balanceManager);

miner.startMining();  // 开始持续挖矿