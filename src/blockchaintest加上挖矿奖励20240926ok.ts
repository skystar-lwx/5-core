// import { ethers } from 'ethers';
import { keccak256, toUtf8Bytes, Wallet } from 'ethers'; // 引入 v6 的 keccak256 和 toUtf8Bytes
import * as fs from 'fs'; // 引入文件系统模块
import * as path from 'path';  // 引入 path 模块以处理文件路径
import { getBalance, updateBalance, calculateBalances, printBalances } from './balanceManager';



// 账户余额文件路径
const accountsFilePath = path.join(__dirname, 'accounts.json');

// 自定义链文件存储路径
const chainFilePath = path.join(__dirname, 'chaindata', 'blockchain.json'); // 指定存放在 data 目录下

//日志保存路径
const logFilePath = path.join(__dirname, 'RFChainlogs.txt');

//奖励代币数
const MINING_REWARD = 10; // 假设奖励50个代币



// 读取账户余额数据
function loadAccounts() {
  if (fs.existsSync(accountsFilePath)) { // 检查文件是否存在
    return JSON.parse(fs.readFileSync(accountsFilePath, 'utf-8')); // 读取并解析文件内容
  } else {
    return {}; // 如果文件不存在，返回空对象
  }
}

// 保存账户余额数据
function saveAccounts(accounts: any) {
  fs.writeFileSync(accountsFilePath, JSON.stringify(accounts, null, 2)); // 将账户数据写入文件
}

// 获取账户余额（从持久化文件中读取）
function getAccountBalance(address: string): number {
  const accounts = loadAccounts(); // 加载账户数据
  return accounts[address] || 0; // 返回指定地址的余额，若不存在则返回0
}

// 更新账户余额
function updateAccountBalance(address: string, amount: number): void {
  const accounts = loadAccounts(); // 加载账户数据
  accounts[address] = getAccountBalance(address) + amount; // 更新指定地址的余额
  saveAccounts(accounts); // 保存更新后的账户数据
}

// 定义交易类型
export interface Transaction {
  from: string; // 发送方地址
  to: string; // 接收方地址
  amount: number; // 交易金额
  status: 'confirmed' | 'pending'; // 交易状态
  hash: string; // 交易哈希
}

// 定义区块
export class Block {
  index: number;                // 区块索引
  timestamp: string;            // 区块时间戳
  transactions: Transaction[];  // 区块中的交易
  previousHash: string;         // 前一个区块的哈希
  hash: string;                 // 当前区块的哈希
  nonce: number;                // 随机数，用于挖矿
  minerAddress: string;         // 新增矿工地址

  //构造函数
  constructor(

    index: number,
    timestamp: string,
    transactions: Transaction[],
    previousHash: string = '',
  
    minerAddress: string        // 传入矿工地址

  ) {

    this.index = index;                 // 设置区块索引
    this.timestamp = timestamp;         // 设置时间戳
    this.transactions = transactions;   // 设置交易列表
    this.previousHash = previousHash;   // 设置前一个区块的哈希
    this.nonce = 0;                     // 初始化 nonce 为 0
    this.hash = this.calculateHash();   // 计算当前区块的哈希
    this.minerAddress = minerAddress;   // 赋值矿工地址

    // 初始化硬编码地址的余额 // 为这个地址初始化 100 单位
    updateAccountBalance('0x1234567890abcdef1234567890abcdef12345678', 100); 
  }

  // 计算当前区块的哈希
  calculateHash(): string {
    return keccak256(toUtf8Bytes(
        this.index.toString() +                 // 将数字转成字符串
        this.previousHash +                     // 直接使用字符串
        this.timestamp +                        // 时间戳是字符串
        JSON.stringify(this.transactions) +     // 将对象序列化成字符串
        this.nonce.toString() +                 // 将数字转成字符串
        this.minerAddress                       // 直接使用矿工地址字符串
    ));
  }

  // 挖矿方法
  mineBlock(difficulty: number): void {
    // const target = '0'.repeat(difficulty); // 根据难度生成目标哈希前缀
    // while (!this.hash.startsWith(target)) { // 挖矿直到找到符合难度的哈希
    const target = Array(difficulty + 1).join('0'); // 创建一个以 "difficulty" 个 0 开头的字符串
    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++; // 增加 nonce
      this.hash = this.calculateHash(); // 重新计算哈希
      if (this.nonce % 10000 === 0) { // 每10000次输出一次日志
        logWithTimestamp(`[Mining] Nonce: ${this.nonce}, Current hash: ${this.hash}`);
      }
    }
    // 挖矿成功后确认交易并更新账户余额  ？？？？
    for (const tx of this.transactions) {
      tx.status = 'confirmed'; // 更新交易状态为已确认
      updateAccountBalance(tx.from, -tx.amount);  // 更新发送方余额
      updateAccountBalance(tx.to, tx.amount);    // 更新接收方余额
    }
    saveAccounts(loadAccounts());  // 保存更新后的账户信息
    logWithTimestamp(`Block mined successfully, Nonce: ${this.nonce}, Hash: ${this.hash} \n\n`);
  }
}

// 定义区块链
export class Blockchain {
  chain: Block[]; // 区块链数组
  difficulty: number; // 挖矿难度
  pendingTransactions: Transaction[]; // 待处理交易

  constructor() {
    this.chain = []; // 初始化区块链为空数组
    this.difficulty = 1; // 设置挖矿难度
    this.pendingTransactions = []; // 初始化待处理交易为空数组

    // 从文件中加载区块链数据（如果存在）
    this.loadBlockchainFromFile();

    // 如果链为空，创建创世区块并发放初始余额
    if (this.chain.length === 0) {
      this.chain.push(this.createGenesisBlock()); // 创建创世区块
      this.saveBlockchainToFile(); // 保存区块链到文件

      // 发放初始余额到硬编码地址
      this.createTransaction('coinbase', '0x1234567890abcdef1234567890abcdef12345678', 100);
    }
  }

  // 创建创世区块（区块链的第一个区块）
  createGenesisBlock(): Block {
    return new Block(0, new Date().toISOString(), [], 'Hi RTFChian',''); // 创建并返回创世区块
  }

  // 获取最新的区块
  getLatestBlock(): Block {
    return this.chain[this.chain.length - 1]; // 返回链中的最后一个区块
  }

  // 验证区块是否有效
  isValidBlock(newBlock: Block): boolean {
    const latestBlock = this.getLatestBlock(); // 获取最新区块

    // 1. 验证区块的 previousHash 是否与链上最新区块的哈希一致
    if (newBlock.previousHash !== latestBlock.hash) {
      logWithTimestamp(`Invalid block: Previous hash doesn't match. Expected: ${latestBlock.hash}, but got: ${newBlock.previousHash}`);
      return false; // 如果不一致，返回无效
    }

    // 2. 验证区块的哈希是否符合当前难度
    const hashTarget = "0".repeat(this.difficulty); // 根据当前难度生成目标哈希
    if (!newBlock.hash.startsWith(hashTarget)) {
      logWithTimestamp(`Invalid block: Hash doesn't meet difficulty requirements. Hash: ${newBlock.hash}`);
      return false; // 如果不符合，返回无效
    }

    // 3. 你可以在这里添加更多的验证逻辑，例如对区块中的交易进行验证（可选）
    // 如果所有验证都通过，返回 true

    return true; // 如果所有验证通过，返回 true
  }

  // 添加区块
  //修改添加区块时候进行奖励 20240926 0956 yzm
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


    //添加区块是进行奖励20240926 0956 yzm

// 生成矿工奖励交易的代码：
// 生成交易哈希的方法

    const rewardTransaction: Transaction = {
      from: 'coinbase',                 // 系统账户，或称作“coinbase”
      to: newBlock.minerAddress,        // 矿工地址
      amount: MINING_REWARD,            // 奖励金额
      status: 'confirmed',               // 交易状态设为已确认
      hash: generateTransactionHash('coinbase', newBlock.minerAddress, MINING_REWARD)  // 生成交易哈希
    };

 
    //将奖励交易添加到新块的交易列表中
    newBlock.transactions.push(rewardTransaction);


    // 将新块添加到链中
    this.chain.push(newBlock);

    // 保存更新后的区块链
    this.saveBlockchainToFile();

    // 打印日志，确认区块被成功添加
    logWithTimestamp(`Block added: ${newBlock.hash}, reward sent to miner: ${newBlock.minerAddress}`);
  }

  //更新账户余额
  updateAccountBalance(address: string, amount: number): void {
    let accounts = this.loadAccounts()   //加载现有账户信息
    if (!accounts[address]) {
      accounts[address] = 0;            //如果账户不存储，初始化为0
    }
    accounts[address] += amount;         //更新账号余额
    this.saveAccounts(accounts);   //保存更新后的账户信息

  }

  //从文件中加载账户信息
  loadAccounts(): Record<string, number> {
    const filePath = path.join(__dirname, 'accounts.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } else {
      return {}; // 如果文件不存在，返回空账户记录
    }
  }

  //保存账号信息到文件
  saveAccounts(accounts: Record<string, number>): void {
    const filePath = path.join(__dirname, 'accounts.json');
    fs.writeFileSync(filePath, JSON.stringify(accounts, null, 2));
  }



  // 从文件加载区块链
  loadBlockchainFromFile(): void {
    // const filePath = path.join(__dirname, 'blockchain.json'); // 使用绝对路径

    const filePath = path.join(chainFilePath)

    if (fs.existsSync(filePath)) { // 检查文件是否存在
      const data = fs.readFileSync(filePath, 'utf8'); // 读取文件内容
      this.chain = JSON.parse(data); // 解析并加载区块链数据
    } else {
      this.chain = []; // 如果文件不存在，初始化为空数组
    }
  }

  // 保存区块链到文件
  saveBlockchainToFile(): void {
    // const filePath = path.join(__dirname, 'blockchain.json'); // 使用绝对路径
    const filePath = path.join(chainFilePath)

    if (!fs.existsSync(filePath)) { // 检查文件是否存在
      fs.writeFileSync(filePath, JSON.stringify([this.createGenesisBlock()], null, 2)); // 创建创世区块并写入文件
      logWithTimestamp('File does not exist, created genesis block.');
    } else {
      fs.writeFileSync(filePath, JSON.stringify(this.chain, null, 2)); // 将区块链数据写入文件
      logWithTimestamp('Blockchain saved to file blockchain.json successfully');
    }
  }


  //添加区块时进行奖励



  // 启动挖矿
  startMining(): void {
    console.log("\n\n*****************  RTFChain Test Network Starting  *******************\n\n");
    setInterval(() => { // 每隔10秒检查交易池并挖矿
      try {
        if (this.pendingTransactions.length === 0) { // 如果没有待处理交易
          logWithTimestamp('Transaction queue is empty, generating empty block...');

          // 创建一个包含默认信息的空区块
          const blockIndex = this.chain.length;
          const newBlock = new Block(
            blockIndex,
            new Date().toISOString(),
            [], // 空区块
            this.getLatestBlock().hash,
            'miner1' // 矿工地址，可以动态传入

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
            this.getLatestBlock().hash,
            'miner1' // 矿工地址，可以动态传入
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
            this.pendingTransactions[i].status = 'confirmed'; // 更新交易状态
          }

          // 清空 pendingTransactions
          this.pendingTransactions = [];
          logWithTimestamp('Pending transactions processed successfully, block generated and mined');
        }
      } catch (error) {
        console.error("Error during mining:", error); // 捕获并打印挖矿过程中的错误
      }
    }, 10000); // 每 10 秒检查一次交易池并挖矿
  }//挖矿结束

  // 生成新的钱包 // 区块链类中的 generateWallet 方法
  GenerateNewWallet() {
    const wallet = Wallet.createRandom(); // 使用 ethers.js v6 创建随机钱包

    console.log('**********************💰-RTFChain Wallet-💰**********************\n\n');

    logWithTimestamp('New Wallet Created:');
    console.log('Address:', wallet.address); // 打印钱包地址
    console.log('Private Key:', wallet.privateKey); // 打印私钥
    console.log('Mnemonic:', wallet.mnemonic?.phrase || 'No mnemonic available'); // 打印助记词

    console.log('Please remember your mnemonic, it can be used to recover your wallet.');
    console.log('Wallet and chain are synchronized, please start using your wallet for transactions.');
    console.log('\n\n**********************💰-RTFChain Wallet-💰**********************');

    // 保存钱包信息到文档
    const walletData = {
      address: wallet.address, // 钱包地址
      privateKey: wallet.privateKey, // 私钥
      mnemonic: wallet.mnemonic?.phrase || 'No mnemonic available', // 助记词
    };

    const filePath = path.join(__dirname, 'wallet.json'); // 钱包信息文件路径
    fs.writeFileSync(filePath, JSON.stringify(walletData, null, 2)); // 将钱包信息写入文件
    logWithTimestamp('Wallet information saved to file wallet.json');
    logWithTimestamp('Please remember your mnemonic, it can be used to recover your wallet.');
    logWithTimestamp('Wallet and chain are synchronized, please start using your wallet for transactions.');
  } // 钱包生成结束

  // 发送交易
  // 在 Blockchain 类中添加 createTransaction 方法
  // 创建交易
  createTransaction(from: string, to: string, amount: number) {
    if (!from || !to || amount <= 0) { // 检查交易参数有效性
      logWithTimestamp('Invalid transaction parameters');
      return; // 如果参数无效，返回
    }

    // 检查发送方余额
    const fromBalance = getAccountBalance(from); // 从持久化文件中读取余额
    if (fromBalance < amount) { // 如果余额不足
      console.log(`Insufficient balance, unable to complete the transaction. Current balance: ${fromBalance}, required amount: ${amount}`);
      return; // 返回，交易无法完成
    }

    // 创建交易
    const transaction: Transaction = {
      from,
      to,
      amount,
      status: 'pending', // 初始状态为待处理
      hash: keccak256(toUtf8Bytes(from + to + amount + Date.now())) // 生成交易哈希
    };

    this.pendingTransactions.push(transaction); // 将交易添加到待处理交易列表
    logWithTimestamp(`Transaction created, transaction hash: ${transaction.hash}`);

    // 更新持久化文件中的账户余额
    updateAccountBalance(from, -amount); // 扣除发送方余额
    updateAccountBalance(to, amount); // 增加接收方余额
    saveAccounts(loadAccounts());  // 保存账户余额到文件
  }

  // 获取账户余额的方法
  getBalance(address: string): number {
    let balance = getAccountBalance(address);  // 从文件中获取账户余额

    // 遍历区块链的每个区块，计算交易
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.from === address) {
          balance -= tx.amount; // 扣除发送方的交易金额
        }
        if (tx.to === address) {
          balance += tx.amount; // 增加接收方的交易金额
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

    logWithTimestamp(`Balance for address: ${address} is: ${balance}`); // 打印余额信息
    return balance;  // 返回动态计算的余额，而不是持久化文件中的旧余额
  } // 交易生成结束
} // 主程序结束

// ****************  辅助函数 ****************   
// 辅助函数：生成带时间戳的日志信息
function logWithTimestamp(message: string) {
  const now = new Date(); // 获取当前时间
  const timestamp = now.toISOString(); // 使用 ISO 时间格式
  console.log(`[${timestamp}] ${message}`); // 打印带时间戳的日志信息
}

// 辅助函数：生成带hash
function generateTransactionHash(from: string, to: string, amount: number): string {
  const transactionData = `${from}-${to}-${amount}-${Date.now()}`;  // 可以使用 `from`、`to`、`amount` 和当前时间戳来生成唯一哈希
  return keccak256(toUtf8Bytes(transactionData)).toString(); 
  
}




export const blockchain = new Blockchain(); // 导出区块链实例

// 生成一个新钱包并保存
// blockchain.GenerateNewWallet(); // 可选：生成新钱包并保存