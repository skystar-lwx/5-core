import axios, { AxiosError } from 'axios';  // 导入 AxiosError
import { Block } from './blockchaintest';  
import { updateBalance } from './balanceManager';
import { Transaction } from './balanceManager';// 假设你已经有 Block 类


const serverurl = "http://localhost:3001"

class Miner {
  minerAddress: string;
  difficulty: number;
  mining: boolean;
  newBlock: Block | null = null;                  // 存储新挖出的区块
  lastSubmittedBlockHash: string | null = null;  // 记录上次提交成功的区块哈希

  constructor(minerAddress: string, difficulty: number) {
    this.minerAddress = minerAddress;
    this.difficulty = difficulty;
    this.mining = false;
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

      const response = await axios.post('http://localhost:3001/submit-block', { block: newBlock });

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
          this.minerAddress

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

 

  // 挖矿逻辑
  async startMining() {
    this.mining = true;
    console.log(`🚀 Miner ${this.minerAddress} started mining with difficulty ${this.difficulty}...`);

    while (this.mining) {
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
          this.minerAddress           // 传入矿工地址
        );

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

  // 停止挖矿
  stopMining() {
    this.mining = false;
  }


   // 辅助函数：暂停一定时间
   pause(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 启动矿工程序
const miner = new Miner('miner1', 1);  // 这里设置矿工地址和难度
miner.startMining();