import express, { Request, Response } from 'express';
import os from 'os';
import bodyParser from 'body-parser';
import cors from 'cors';
import { Blockchain } from './blockchain';  // 从你的模块化文件导入
import { Block } from './block';  // 从你的模块化文件导入
import { Transaction } from './transaction';  // 从你的模块化文件导入
import { BalanceManager } from './balanceManager';

import { logWithTimestamp } from './utils';
// 实例化区块链
const blockchain = new Blockchain();
const balanceManager = new BalanceManager();  // 实例化余额管理器

// 指定矿工地址
const minerAddress = 'miner1';  // 你可以将其改为任何你想要的矿工地址
 blockchain.startMining(minerAddress);  // 启动挖矿任务

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

  // 检查区块结构
  if (!newBlockData || !newBlockData.index || !newBlockData.timestamp || !newBlockData.transactions || !newBlockData.previousHash || !newBlockData.nonce || !newBlockData.hash) {
    return res.status(400).json({ message: 'Invalid block structure' });
  }

  const latestBlock = blockchain.getLatestBlock();

  // 验证 previousHash 是否匹配最新区块
  if (newBlockData.previousHash !== latestBlock.hash) {
    return res.status(400).json({ message: 'Invalid previousHash' });
  }

  // 重新实例化为 Block 类对象
  const newBlock = new Block(
    newBlockData.index,
    newBlockData.timestamp,
    newBlockData.transactions,
    newBlockData.previousHash,
    newBlockData.minerAddress
  );
  newBlock.nonce = newBlockData.nonce;
  newBlock.hash = newBlockData.hash;

  // 验证区块是否满足难度要求
  if (!blockchain.isValidBlock(newBlock)) {
    return res.status(400).json({ message: 'Invalid block difficulty' });
  }

  // 添加区块到区块链
  try {
    blockchain.addBlock(newBlock);
    return res.status(200).json({ message: 'Block accepted', block: newBlock });
  } catch (error) {
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

  // 检查账户余额 开始

  const fromBalance = balanceManager.getBalance(from); // 获取账户余额
  const toBalance = balanceManager.getBalance(to); // 获取账户余额
  console.log('****************************************************');

  // 打印返回的余额信息和输入金额
  console.log(
    `fromBalance: ${fromBalance} \n, 
    toBalance: ${toBalance}  \n ,
    numericAmount: ${numericAmount} \n
    `);
  console.log('****************************************************');

  // 检查账户是否存在或余额是否足够
  // 检查账户是否存在或余额是否足够
  if (fromBalance === -1) {
    // 如果发送方账户不存在，返回 404 错误
    logWithTimestamp(`error:发送方账户 ${from} 不存在` )
    return res.status(404).json({ error: `发送方账户 ${from} 不存在` });
   
  } else if (toBalance === -1) {
    // 如果接收方账户不存在，返回 404 错误
    logWithTimestamp(`error:接收方账户 ${to} 不存在` )
    return res.status(404).json({ error: `接收方账户 ${to} 不存在` });
    
  } else if (fromBalance < numericAmount) {
    // 如果余额不足，返回 400 错误
    return res.status(400).json({ error: '发送方账户余额不足' });
  }

  // 检查账户余额结束


  // 创建交易并推送到待处理交易列表
  blockchain.createTransaction(from, to, numericAmount);
  console.log('****************************************&');
  console.log(`from: ${from}, to: ${to}, amount: ${numericAmount}`);
  console.log('*4444444444444444444444444444444444444&');
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