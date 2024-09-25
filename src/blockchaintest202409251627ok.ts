// import { ethers } from 'ethers';
import { keccak256, toUtf8Bytes, Wallet } from 'ethers'; // 引入 v6 的 keccak256 和 toUtf8Bytes
import * as fs from 'fs';
import * as path from 'path';  // 引入 path 模块以处理文件路径



// 账户余额文件路径
const accountsFilePath = path.join(__dirname, 'accounts.json');

// 读取账户余额数据
function loadAccounts() {
  if (fs.existsSync(accountsFilePath)) {
    return JSON.parse(fs.readFileSync(accountsFilePath, 'utf-8'));
  } else {
    return {};
  }
}

// 保存账户余额数据
function saveAccounts(accounts: any) {
  fs.writeFileSync(accountsFilePath, JSON.stringify(accounts, null, 2));
}

// 获取账户余额（从持久化文件中读取）
function getAccountBalance(address: string): number {
  const accounts = loadAccounts();
  return accounts[address] || 0;
}

// 更新账户余额
function updateAccountBalance(address: string, amount: number): void {
  const accounts = loadAccounts();
  accounts[address] = getAccountBalance(address) + amount;
  saveAccounts(accounts);
}


// 定义交易类型
export interface Transaction {
  from: string;
  to: string;
  amount: number;
  status: 'confirmed' | 'pending';
  hash: string;
}

// 定义区块
export class Block {
  index: number;
  timestamp: string;
  transactions: Transaction[];
  previousHash: string;
  hash: string;
  nonce: number;

  constructor(index: number, timestamp: string, transactions: Transaction[], previousHash: string = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.nonce = 0; // 初始化 nonce 为 0
    this.hash = this.calculateHash();
    // 初始化硬编码地址的余额
    updateAccountBalance('0x1234567890abcdef1234567890abcdef12345678', 100); // 为这个地址初始化 100 单位
  }



  // import { keccak256, toUtf8Bytes } from 'ethers'; 
  // 引入 v6 的 keccak256 和 toUtf8Bytes
  calculateHash(): string {
    return keccak256(toUtf8Bytes(
      this.index +
      this.previousHash +
      this.timestamp +
      JSON.stringify(this.transactions) +
      this.nonce
    ));
  }

  // 挖矿方法
  mineBlock(difficulty: number): void {
    const target = '0'.repeat(difficulty);
    while (!this.hash.startsWith(target)) {
      this.nonce++;
      this.hash = this.calculateHash();
      if (this.nonce % 10000 === 0) {
        logWithTimestamp(`[Mining] Nonce: ${this.nonce}, Current hash: ${this.hash}`);
      }
    }
    // 挖矿成功后确认交易并更新账户余额
    for (const tx of this.transactions) {
      tx.status = 'confirmed';
      updateAccountBalance(tx.from, -tx.amount);  // 更新发送方余额
      updateAccountBalance(tx.to, tx.amount);    // 更新接收方余额
    }
    saveAccounts(loadAccounts());  // 保存更新后的账户信息
    logWithTimestamp(`Block mined successfully, Nonce: ${this.nonce}, Hash: ${this.hash} \n\n`);
  }
}

// 定义区块链
export class Blockchain {
  chain: Block[];
  difficulty: number;
  pendingTransactions: Transaction[];

  constructor() {
    this.chain = [];
    this.difficulty = 1; // 设置挖矿难度
    this.pendingTransactions = [];

     // 从文件中加载区块链数据（如果存在）
    this.loadBlockchainFromFile();

    // 如果链为空，创建创世区块并发放初始余额
    if (this.chain.length === 0) {
      this.chain.push(this.createGenesisBlock());
      this.saveBlockchainToFile();

      // 发放初始余额到硬编码地址
      this.createTransaction('coinbase', '0x1234567890abcdef1234567890abcdef12345678', 100);
    }
  }

  // 创建创世区块（区块链的第一个区块）
  createGenesisBlock(): Block {
    return new Block(0, new Date().toISOString(), [], 'hi');
  }


  // 获取最新的区块
  getLatestBlock(): Block {
    return this.chain[this.chain.length - 1]; // 返回链中的最后一个区块
  }

  // 验证区块是否有效
  isValidBlock(newBlock: Block): boolean {
    const latestBlock = this.getLatestBlock();

    // 1. 验证区块的 previousHash 是否与链上最新区块的哈希一致
    if (newBlock.previousHash !== latestBlock.hash) {
      logWithTimestamp(`Invalid block: Previous hash doesn't match. Expected: ${latestBlock.hash}, but got: ${newBlock.previousHash}`);
      return false;
    }

    // 2. 验证区块的哈希是否符合当前难度
    const hashTarget = "0".repeat(this.difficulty);// 根据当前难度生成目标哈希
    if (!newBlock.hash.startsWith(hashTarget)) {
      logWithTimestamp(`Invalid block: Hash doesn't meet difficulty requirements. Hash: ${newBlock.hash}`);
      return false;
    }

    // 3. 你可以在这里添加更多的验证逻辑，例如对区块中的交易进行验证（可选）
    // 如果所有验证都通过，返回 true

    return true; // 如果所有验证通过，返回 true
  }


  
  // 添加区块
  addBlock(newBlock: Block): void {

    // 验证区块是否合法
    if (!this.isValidBlock(newBlock)) {
      logWithTimestamp('Block rejected: The block is invalid and was not added to the chain.');
      return;  // 如果区块无效，直接返回，不添加到链上
    }
    // 设置前一个区块的哈希值
    newBlock.previousHash = this.getLatestBlock().hash;

    // 挖矿（注意：这里的difficulty决定了挖矿难度）
    newBlock.mineBlock(this.difficulty);

    // 将新块添加到链中
    this.chain.push(newBlock);

    // 保存更新后的区块链
    this.saveBlockchainToFile();

    // 打印日志，确认区块被成功添加
    logWithTimestamp(`Block added: ${newBlock.hash}`);
  }

  // 保存区块链到文件
  saveBlockchainToFile(): void {
    const filePath = path.join(__dirname, 'blockchain.json'); // 使用绝对路径
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([this.createGenesisBlock()], null, 2));
      logWithTimestamp('File does not exist, created genesis block.');
    } else {
      fs.writeFileSync(filePath, JSON.stringify(this.chain, null, 2));
      logWithTimestamp('Blockchain saved to file blockchain.json successfully');
    }
  }

  // 从文件加载区块链
  loadBlockchainFromFile(): void {
    const filePath = path.join(__dirname, 'blockchain.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      this.chain = JSON.parse(data);
    } else {
      this.chain = [];
    }
  }


  // 启动挖矿

  startMining(): void {
    console.log("\n\n*****************  RTFChain Test Network Starting  *******************\n\n");
    setInterval(() => {
      try {

        if (this.pendingTransactions.length === 0) {
          logWithTimestamp('Transaction queue is empty, generating empty block...');
          // 如果没有交易，创建一个包含默认信息的空区块
          const blockIndex = this.chain.length;
          const newBlock = new Block(
            blockIndex,
            new Date().toISOString(),
            [], // 空区块
            this.getLatestBlock().hash
          );
  
          // 挖矿过程（空区块）
          newBlock.mineBlock(this.difficulty);
          logWithTimestamp(`Empty block #${blockIndex} mined successfully, hash: ${newBlock.hash}`);
  
          this.addBlock(newBlock); // 添加区块到链并保存
        } else {
          logWithTimestamp('Starting to process pending transactions...');
          const blockIndex = this.chain.length;
          const newBlock = new Block(
            blockIndex,
            new Date().toISOString(),
            [...this.pendingTransactions], // 把 `pendingTransactions` 添加到区块
            this.getLatestBlock().hash
          );
  
          // 输出醒目的矿工日志
          
          console.log("\n\n\n********************** 💰 RTFChain 💰 ***************************\n\n");
          
  
          console.log(`⛏️  Started mining block #${blockIndex}, \ncontaining ${this.pendingTransactions.length} \ntransactions...\n\n`);
  
          // 挖矿过程（带交易的区块）
          newBlock.mineBlock(this.difficulty);
  
          console.log(`✅  Block #${blockIndex} mined successfully, \n hash: ${newBlock.hash}`);
          console.log("\n\n************************************************************************\n\n");
  
          this.addBlock(newBlock); // 添加区块到链
  
          // 将所有待确认交易标记为已确认
          for (let i = 0; i < this.pendingTransactions.length; i++) {
            this.pendingTransactions[i].status = 'confirmed';
          }
  
          // 清空 pendingTransactions
          this.pendingTransactions = [];
          logWithTimestamp('Pending transactions processed successfully, block generated and mined');
        }
      } catch (error) {
        console.error("Error during mining:", error);
        
      }
    }, 10000); // 每 10 秒检查一次交易池并挖矿
  }
  
  //挖矿结束

  //生成新的钱包 // 区块链类中的 generateWallet 方法
  GenerateNewWallet() {
    const wallet = Wallet.createRandom(); // 使用 ethers.js v6 创建随机钱包

    console.log('**********************💰-RTFChain Wallet-💰**********************\n\n');

    logWithTimestamp('New Wallet Created:');
    console.log('Address:', wallet.address);
    console.log('Private Key:', wallet.privateKey);
    console.log('Mnemonic:', wallet.mnemonic?.phrase || 'No mnemonic available');

    console.log('Please remember your mnemonic, it can be used to recover your wallet.');
    console.log('Wallet and chain are synchronized, please start using your wallet for transactions.');
    console.log('\n\n**********************💰-RTFChain Wallet-💰**********************');

    // 保存钱包信息到文档
    const walletData = {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic?.phrase || 'No mnemonic available', // 如果助记词不存在，给个默认值
    };

    const filePath = path.join(__dirname, 'wallet.json');
    fs.writeFileSync(filePath, JSON.stringify(walletData, null, 2));
    logWithTimestamp('Wallet information saved to file wallet.json');
    logWithTimestamp('Please remember your mnemonic, it can be used to recover your wallet.');
    logWithTimestamp('Wallet and chain are synchronized, please start using your wallet for transactions.');
  }//钱包生成结束

  // 发送交易
  // 在 Blockchain 类中添加 createTransaction 方法
  // 创建交易
  createTransaction(from: string, to: string, amount: number) {
    if (!from || !to || amount <= 0) {
      logWithTimestamp('Invalid transaction parameters');
      return;
    }

    // 检查发送方余额
    const fromBalance = getAccountBalance(from);// 从持久化文件中读取余额
    if (fromBalance < amount) {
      console.log(`Insufficient balance, unable to complete the transaction. Current balance: ${fromBalance}, required amount: ${amount}`);
      return;
    }

    // 创建交易
    const transaction: Transaction = {
      from,
      to,
      amount,
      status: 'pending',
      hash: keccak256(toUtf8Bytes(from + to + amount + Date.now()))
    };

    this.pendingTransactions.push(transaction);
    logWithTimestamp(`Transaction created, transaction hash: ${transaction.hash}`);

    // 更新持久化文件中的账户余额
    updateAccountBalance(from, -amount);
    updateAccountBalance(to, amount);
    saveAccounts(loadAccounts());  // 保存账户余额到文件
  }

  // 获取账户余额的方法
  getBalance(address: string): number {
    let balance = getAccountBalance(address);  // 从文件中获取账户余额

    // 遍历区块链的每个区块，计算交易
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.from === address) {
          balance -= tx.amount;
        }
        if (tx.to === address) {
          balance += tx.amount;
        }
      }
    }
    // 考虑未确认的 pendingTransactions
    for (const pendingTx of this.pendingTransactions) {
      if (pendingTx.from === address) {
        balance -= pendingTx.amount; // 扣除待确认的交易金额
      }
      if (pendingTx.to === address) {
        balance += pendingTx.amount; // 加上待确认的接收金额
      }
    }

    logWithTimestamp(`Balance for address: ${address} is: ${balance}`);
    return balance;  // 返回动态计算的余额，而不是持久化文件中的旧余额
  }//交易生成结束



}//主程序结束


//****************  辅助函数 ****************   
// 辅助函数：生成带时间戳的日志信息
function logWithTimestamp(message: string) {
  const now = new Date();
  const timestamp = now.toISOString(); // 使用 ISO 时间格式
  console.log(`[${timestamp}] ${message}`);
}

export const blockchain = new Blockchain();


// 生成一个新钱包并保存
// blockchain.GenerateNewWallet();
