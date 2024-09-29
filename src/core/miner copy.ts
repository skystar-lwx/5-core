import axios, { AxiosError } from 'axios';  // 导入 AxiosError
import { Blockchain } from './2-blockchain';          // 引入 Blockchain 类
import { Block } from './block';                    // 引入 Block 类
import { Transaction } from './transaction';        // 引入 Transaction 类
import { TransactionManager } from './transaction'; // 引入 TransactionManager 类
import { logWithTimestamp } from './utils';         // 引入日志输出函数
import { BalanceManager } from './balanceManager';  // 引入余额管理模块

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

    // 提交挖到的新区块到服务器
    // 提交挖到的新区块到主节点
    async submitBlock(newBlock: Block) {
        console.log('📤 正在向主节点提交新区块:', newBlock);
        try {
            // 在提交之前，确保区块的字段完整
            if (typeof newBlock.index === 'undefined' || !newBlock.timestamp || typeof newBlock.transactions === 'undefined' || !newBlock.previousHash || typeof newBlock.nonce === 'undefined' || !newBlock.hash) {
                console.error('❌ 提交区块前发现结构无效:', newBlock);
                return;
            }

            // 检查当前区块是否已经提交过
            if (newBlock.hash === this.lastSubmittedBlockHash) {
                console.log(`⚠️ 该区块 ${newBlock.hash} 已提交，跳过重复提交。`);
                return;
            } else {
                console.log(`🔎 区块 ${newBlock.hash} 正在提交...`);
            }

            const response = await axios.post(`${serverurl}/submit-block`, { block: newBlock });

            // 检查响应状态码
            if (response.status === 200) {
                console.log('✅ 区块已提交:', newBlock.hash, '响应:', response.data);

                // 成功提交后更新 lastSubmittedBlockHash
                this.lastSubmittedBlockHash = newBlock.hash;

                // 提交成功后，获取最新区块并继续挖矿
                const latestBlock = await this.getLatestBlock();
                this.newBlock = new Block(
                    latestBlock.index + 1,
                    new Date().toISOString(),
                    [],                   // 可根据需要添加交易数据
                    latestBlock.hash,
                   

                );
            } else {
                console.error(`❌ 提交区块失败，状态码: ${response.status}，错误信息:`, response.data);
                console.log('⏸️  暂停 3 秒后重新提交区块...');
                await this.pause(3000);             // 暂停 3 秒
                await this.submitBlock(newBlock);  // 重新提交区块
            }

        } catch (error: unknown) {
            const axiosError = error as AxiosError;

            // 处理请求失败的情况
            if (axiosError.response) {
                console.error('❌ 提交区块时出错，服务器返回的状态码:', axiosError.response.status);
                console.error('❌ 服务器返回的错误信息:', axiosError.response.data);
            } else {
                console.error('❌ 提交区块时发生未知错误:', (error as Error).message);
            }

            // 打印所有的错误报告
            if (axiosError.config) {
                console.error('请求配置:', axiosError.config);
            }
            if (axiosError.code) {
                console.error('错误代码:', axiosError.code);
            }

            console.log('⏸️  暂停 3 秒后重新提交区块...');
            await this.pause(3000);  // 暂停 3 秒
            await this.submitBlock(newBlock);  // 重新提交区块
        }
    }

    // 创建奖励交易
    createRewardTransaction(): Transaction {
        return this.transactionManager.createTransaction('coinbase', this.minerAddress, this.reward);
    }

    

    // 挖矿方法
    // 挖矿逻辑
  async startMining() {
    this.isMining = true;
    console.log(`🚀 Miner ${this.minerAddress} started mining with difficulty ${this.difficulty}...`);

    while (this.isMining) {
      try {
        const latestBlock = await this.getLatestBlock();  // 获取最新区块
        console.log(`📏 Current chain height: ${latestBlock.index}`);
        console.log('⛏️ 基于最新区块挖矿，previousHash:', latestBlock.hash);

        // 创建新区块 ,区块结构，注意这样结构一定要和主网一直，不然无法提交验证
        this.newBlock = new Block(
          latestBlock.index + 1,
          new Date().toISOString(),
          [],                         // 可根据需要添加交易数据
          latestBlock.hash,
       
        );
        
        if(latestBlock.index + 1==this.newBlock.index){
            console.log('\n\n\n 区块高度正确，可以挖矿 \n\n\n');
        }
        logWithTimestamp(`开始挖新区块，当前区块 index: ${this.newBlock.index}`);
        // 开始挖矿
        this.newBlock.mineBlock(this.difficulty);

        console.log(`💎 Block mined! Hash: ${this.newBlock.hash}`);
        console.log('🔍 挖出Hash:', this.newBlock.previousHash);
        console.log('🔍 主节Hash: ', latestBlock.hash);

        // 检查挖出区块的 previousHash 是否匹配最新区块的 hash
        if (this.newBlock.previousHash === latestBlock.hash) {
          console.log('⏳ 正在提交新区块...');
          await this.submitBlock(this.newBlock);
        } else {
          console.error('❌ 区块的 previousHash 与主节点最新区块的 hash 不匹配，不提交区块');
        }

        // 暂停一段时间再进行下一轮挖矿
        await this.pause(3000);  // 可根据需要调整时间

      } catch (error) {
        console.error('❌ 挖矿时发生错误:', error);
        break;  // 如果发生重大错误，停止挖矿
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
const miner = new Miner('miner1', 1,blockchain, balanceManager);

miner.startMining();  // 开始持续挖矿