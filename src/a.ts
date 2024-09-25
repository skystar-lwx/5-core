import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { blockchain } from './b';

// 定义余额接口
interface Balance {
  [address: string]: number;
}

// 模拟存储地址余额
let balances: Balance = {
  '0x1234567890abcdef1234567890abcdef12345678': 100,
  '0xabcdefabcdefabcdefabcdefabcdefabcdef': 100,
};

const app = express();
const port = 3001;

app.use(bodyParser.json());
app.use(cors());

// 获取余额接口
app.get('/balance/:address', (req: Request, res: Response) => {
  const address = req.params.address;
  const balance = balances[address] || 0;
  res.json({ address, balance });
});// 获取余额接口结束




// 发送交易接口
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

// 发送交易接口 结束





// 获取区块链数据接口，按倒序返回
app.get('/blockchain', (_req: Request, res: Response) => {
  const reversedChain = [...blockchain.chain].reverse();  // 使用 .reverse() 方法倒序
  res.json(reversedChain);
});


// 启动服务器并开始挖矿
app.listen(port, () => {

  // Start mining
 
  console.log("\n\n*************** RTFChain Test Network ***************\n");

  console.log(`🌐  Blockchain API is running at: http://testnet.rtxchain.com:${port}`);
  console.log('\n📚 Available Interfaces:');
  console.log(`1. 💰 Get balance:              GET  http://testnet.rtxchain.com:${port}/balance/:address`);
  console.log(`2. ✉️ Send transaction:          POST http://testnet.rtxchain.com:${port}/transaction`);
  console.log(`3. ➕ Generate new address:     GET  http://testnet.rtxchain.com:${port}/newAddress`);
  console.log(`4. 🔄 Restore wallet:           POST http://testnet.rtxchain.com:${port}/restoreWallet`);
  console.log(`5. 🔍 Query transaction status: GET  http://testnet.rtxchain.com:${port}/transaction/:hash`);
  console.log(`6. 📊 Get blockchain data:      GET  http://testnet.rtxchain.com:${port}/blockchain`);
  console.log("\n*****************************************************\n");

  // 启动挖矿ßß
  if (blockchain) {
    blockchain.startMining(); // 只有在 blockchain 定义后才调用
  } else {
    console.error("blockchain 未定义。");
  }
});