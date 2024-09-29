import { Blockchain } from './2-blockchain';            // 引入 Blockchain 类
import { Miner } from './miner';                      // 引入 Miner 类
import { BalanceManager } from './balanceManager';    // 引入 BalanceManager 类
import { logWithTimestamp } from './utils';    // 引入日志输出函数

// 测试运行函数
function runTest() {
  // 创建一个新的区块链
  const blockchain = new Blockchain();
  logWithTimestamp('区块链已创建，当前区块链长度:', blockchain.chain.length); // 输出区块链创建信息

  // 创建一个矿工
  const miner = new Miner('miner1', blockchain);
  logWithTimestamp(`矿工 ${miner.minerAddress} 已创建。`);     // 输出矿工创建信息

  // 开始挖矿
  logWithTimestamp('⛏️ 开始挖矿...');
  miner.mine();                                        // 执行挖矿

  // // 显示当前区块链中的区块
  // logWithTimestamp('当前区块链：', blockchain.chain);        // 输出当前区块链信息

  // 打印所有账户的余额
  const balanceManager = new BalanceManager();        // 创建余额管理器实例
  blockchain.chain.forEach(block => {
    block.transactions.forEach(tx => {
      balanceManager.updateBalance(tx);               // 更新每个交易的余额
    });
  });
  
  // 输出账户余额分布
  logWithTimestamp('💰 账户余额分布:');
  logWithTimestamp(balanceManager.balances);              // 打印账户余额
}

// 执行测试
runTest();