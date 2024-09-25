import express, { Request, Response }  from 'express';
import { Block } from './blockchaintest';
import { Blockchain } from './blockchaintest';  // 根据你实际的区块链文件路径修改
import os from 'os';  // 引入 os 模块
import bodyParser from 'body-parser';
import cors from 'cors';

// 实例化 Blockchain 类
const blockchain = new Blockchain(); // 生成新的 Blockchain 实例
blockchain.startMining();  // 调用实例的方法进行挖矿

const app = express();
const port = 3001;

app.use(bodyParser.json());
app.use(cors());

interface Balance {
  [address: string]: number;
}



// 获取最新区块，矿工将基于此区块进行挖矿
app.get('/latest-block', (req, res) => {
  const latestBlock = blockchain.getLatestBlock();
  res.json(latestBlock);  // 返回链上最新的区块
});



//  1- 矿工提交挖好的区块
app.post('/submit-block', (req, res) => {
  const newBlockData = req.body.block;
  console.log('⛏️ 收到新的区块:', newBlockData);

  const latestBlock = blockchain.getLatestBlock();

  // console.log('⛏️ 提交的区块 previousHash:', newBlockData.previousHash);
  // console.log('⛏️ 主节点的最新区块 hash:', latestBlock.hash);

  console.log('🔍 挖出Hash:', newBlockData.previousHash);
  console.log('🔍 主节Hsh:', latestBlock.hash);


  // 检查区块结构是否完整
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
  }


  return res.status(200).json({ message: 'Block accepted' });

    // 验证通过，添加区块到区块链中
  try {
    blockchain.addBlock(newBlock);
    console.log('✅ 区块已被接受并添加到链中:', newBlock.hash);
    return res.status(200).json({ message: 'Block accepted' });
  } catch (error) {
    console.error('❌ 添加区块到链时出错:', error);
    return res.status(500).json({ message: 'Error adding block to blockchain' });
  }

});


// 1- 矿工提交挖好的区块 结束


// 2-发送交易接口
app.post('/transaction', (req: Request, res: Response) => {
  const { from, to, amount } = req.body;
  
  // 将amount 转为数值
  const numericAmount = Number(amount);

  // 验证金额是否有效
  // const isValidAddress = (address: string) => /^(0x)?[0-9a-fA-F]{40}$/.test(address);

  // if (!isValidAddress(from) || !isValidAddress(to)) {
  //   return res.status(400).json({ error: "无效的地址" });
  // }


  // 防止自发交易
  if (from === to) {
    return res.status(400).json({ error: "无法向自己发送交易" });
  }

  // 使用区块链的 getBalance 方法来检查余额
  const fromBalance = blockchain.getBalance(from);
  if (fromBalance < numericAmount) {
    return res.status(400).json({ error: "余额不足" });
  }

  // 创建交易并推送到区块链的 pendingTransactions 列表中
  blockchain.createTransaction(from, to, numericAmount);

  // 打印当前的 pendingTransactions 以检查是否成功添加
  console.log(blockchain.pendingTransactions);

  res.json({ message: "交易已创建，等待确认" });
});

// 2-发送交易接口 结束





// 启动主节点服务器，监听3001端口
app.listen(3001, () => {
  const networkInterfaces = os.networkInterfaces();
  const ipAddresses = Object.values(networkInterfaces)
    .flat()
    .filter(iface => iface && iface.family === 'IPv4' && !iface.internal)
    .map(iface => iface?.address)  // 使用可选链操作符

  console.log('Blockchain node running on port 3001');
  console.log('本机IP地址:', ipAddresses.filter(Boolean).join(', '));  // 过滤掉 undefined
});