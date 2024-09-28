import { Blockchain } from './blockchain';          // 引入 Blockchain 类
import { Block } from './block';                    // 引入 Block 类
import { Transaction } from './transaction';        // 引入 Transaction 类
import { TransactionManager } from './transaction'; // 引入 TransactionManager 类
import { logWithTimestamp } from './utils';    // 引入日志输出函数

export class Miner {
    minerAddress: string;                   // 矿工地址
    blockchain: Blockchain;                 // 区块链实例
    transactionManager: TransactionManager; // 交易管理器实例
    reward: number = 10;                    // 挖矿奖励

    constructor(minerAddress: string, blockchain: Blockchain) {
        this.minerAddress = minerAddress;                       // 设置矿工地址
        this.blockchain = blockchain;                           // 设置区块链实例
        this.transactionManager = new TransactionManager();     // 初始化交易管理器
    }

    // 挖矿方法
    mine(): void {
        logWithTimestamp(`矿工 ${this.minerAddress} 开始挖矿...`);     // 输出挖矿开始信息

        // 创建奖励交易
        const rewardTransaction = this.transactionManager.createTransaction('coinbase', this.minerAddress, this.reward);
        this.blockchain.pendingTransactions.push(rewardTransaction); // 将奖励交易添加到待处理交易

        // 创建新块
        const newBlock = new Block(
            this.blockchain.chain.length,                                       // 当前区块索引
            new Date().toISOString(),                                           // 当前时间戳
            [...this.blockchain.pendingTransactions],                           // 当前待处理交易
            this.blockchain.chain[this.blockchain.chain.length - 1].hash,       // 前一个区块的哈希
            this.minerAddress                                                   // 矿工地址
        );

        // 添加新块到区块链
        this.blockchain.addBlock(newBlock);
        logWithTimestamp(`区块 ${newBlock.index} 已成功挖掘并添加到区块链。`); // 输出成功挖掘信息

        // 清空待处理交易
        this.blockchain.pendingTransactions = [];
        logWithTimestamp('待处理交易已清空。');                              // 输出清空交易信息
    }
}