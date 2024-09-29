import express, { Request, Response } from 'express';
import os from 'os';
import bodyParser from 'body-parser';
import cors from 'cors';
import { Blockchain } from './2-blockchain';  // 从你的模块化文件导入
import { Block } from './block';  // 从你的模块化文件导入
import { Transaction } from './transaction';  // 从你的模块化文件导入
import { BalanceManager } from './balanceManager';
import { logWithTimestamp } from './utils';
import { initP2PServer, connectToPeer, broadcast } from './6-p2p';  // 引入P2P功能

// 实例化区块链和余额管理器
const blockchain = new Blockchain();
const balanceManager = new BalanceManager();  // 实例化余额管理器

// 指定矿工地址
const minerAddress = 'miner1';  // 你可以将其改为任何你想要的矿工地址
blockchain.startMining(minerAddress);  // 启动挖矿任务

// 初始化P2P服务器
initP2PServer(6001, blockchain);

// 创建Express服务器实例
const app = express();
const port = 3001;

app.use(bodyParser.json());
app.use(cors());

// 获取最新区块，矿工将基于此区块进行挖矿
app.get('/latest-block', (req, res) => {
  const latestBlock = blockchain.getLatestBlock();
  res.json(latestBlock);  // 返回链上最新的区块
});

// 矿工提交挖好的区块
app.post('/submit-block', (req, res) => {
  const newBlockData = req.body.block;
  console.log('\n\n ⛏️ 收到新的区块:', newBlockData);

  const latestBlock = blockchain.getLatestBlock();
  console.log('🔍 挖出Hash:', newBlockData.previousHash);
  console.log('🔍 主节Hash:', latestBlock.hash);

  // 验证区块结构
  if (!newBlockData || typeof newBlockData.index === 'undefined' || !newBlockData.timestamp || !newBlockData.transactions || !newBlockData.previousHash || typeof newBlockData.nonce === 'undefined' || !newBlockData.hash) {
    console.error('❌ 收到的区块结构无效:', newBlockData);
    return res.status(401).json({ message: 'Invalid block structure' });
  }

  // 验证 previousHash 是否匹配
  if (newBlockData.previousHash !== latestBlock.hash) {
    console.error('❌ previousHash 不匹配，拒绝区块:', newBlockData.hash);
    return res.status(402).json({ message: 'Invalid previousHash' });
  }

  // 重新实例化为 Block 类对象
  const newBlock = new Block(
    newBlockData.index,
    newBlockData.timestamp,
    newBlockData.transactions,
    newBlockData.previousHash
  );
  newBlock.nonce = newBlockData.nonce;
  newBlock.hash = newBlockData.hash;

  // 验证区块是否满足难度要求
  const isBlockValid = blockchain.isValidBlock(newBlock);
  if (!isBlockValid) {
    console.error('❌ 区块难度验证失败:', newBlock.hash);
    return res.status(403).json({ message: 'Invalid block difficulty' });
  } else {
    logWithTimestamp(' \n\n\n 区块难度验证 成功 \n\n\n');
  }

  // 添加区块到区块链
  try {
    blockchain.addBlock(newBlock);
    console.log('✅ 区块已被接受并添加到链中:', newBlock.hash);

    // 广播新块到P2P网络
    broadcast({ type: 'NEW_BLOCK', data: newBlock });

    return res.status(200).json({ message: 'Block accepted' });
  } catch (error) {
    console.error('❌ 添加区块到链时出错:', error);
    return res.status(500).json({ message: 'Error adding block to blockchain' });
  }
});

// 发送交易接口
app.post('/transaction', (req: Request, res: Response) => {
  const { from, to, amount } = req.body;

  // 验证金额有效性
  const numericAmount = Number(amount);
  if (!from || !to || isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'Invalid transaction data' });
  }

  // 防止自发交易
  if (from === to) {
    return res.status(400).json({ error: 'Cannot send transaction to self' });
  }

  // 检查账户余额
  const fromBalance = balanceManager.getBalance(from); 
  const toBalance = balanceManager.getBalance(to); 

  console.log(`fromBalance: ${fromBalance}, toBalance: ${toBalance}, numericAmount: ${numericAmount}`);

  if (fromBalance === -1) {
    logWithTimestamp(`发送方账户 ${from} 不存在`);
    return res.status(404).json({ error: `发送方账户 ${from} 不存在` });
  } else if (toBalance === -1) {
    logWithTimestamp(`接收方账户 ${to} 不存在`);
    return res.status(404).json({ error: `接收方账户 ${to} 不存在` });
  } else if (fromBalance < numericAmount) {
    return res.status(400).json({ error: '发送方账户余额不足' });
  }

  // 创建交易并推送到待处理交易列表
  blockchain.createTransaction(from, to, numericAmount);
  logWithTimestamp(`Transaction created from ${from} to ${to} amount: ${numericAmount}`);

  // 广播交易到P2P网络
  broadcast({ type: 'NEW_TRANSACTION', data: { from, to, amount } });

  return res.status(200).json({ message: 'Transaction created successfully' });
});

// 启动主节点服务器，监听3001端口
app.listen(port, () => {
  const networkInterfaces = os.networkInterfaces();
  const ipAddresses = Object.values(networkInterfaces)
    .flat()
    .filter(iface => iface && iface.family === 'IPv4' && !iface.internal)
    .map(iface => iface?.address);

  console.log(`Blockchain node running on port ${port}`);
  console.log('本机IP地址:', ipAddresses.filter(Boolean).join(', '));
});