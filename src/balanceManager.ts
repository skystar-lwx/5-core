import * as fs from 'fs'; // 引入文件系统模块
import * as path from 'path';  // 引入 path 模块以处理文件路径
import { Block } from './blockchaintest'; // 导入 Block 类

// 账户余额文件路径
const accountsFilePath = path.join(__dirname, 'accounts1.json');

// 定义 Transaction 接口（与主区块链文件中保持一致）
export interface Transaction {
    from: string;
    to: string;
    amount: number;
    status: 'confirmed' | 'pending';
    hash: string;
}

// 定义余额字典，保存每个地址的余额
const balances: { [address: string]: number } = {};

// 从文件加载账户余额
function loadBalancesFromFile(): void {
    if (fs.existsSync(accountsFilePath)) {
        const data = fs.readFileSync(accountsFilePath, 'utf8');
        const accountsArray = JSON.parse(data); // 解析 JSON 数组
        // 合并数组中的所有账户余额
        for (const accountData of accountsArray) {
            for (const address in accountData) {
                if (!balances[address]) {
                    balances[address] = 0; // 初始化余额为 0
                }
                balances[address] += accountData[address]; // 合并余额
            }
        }
    } else {
        console.error('accounts.json 文件不存在');
    }
}

// 获取某个地址的余额
export function getBalance(address: string): number {
    return balances[address] || 0;
}

// 更新余额，处理交易时调用
export function updateBalance(transaction: Transaction): void {
    // 处理转入方
    if (!balances[transaction.to]) {
        balances[transaction.to] = 0;
    }
    balances[transaction.to] += transaction.amount;

    // 处理转出方（不处理 coinbase 交易，因为 coinbase 没有转出方）
    if (transaction.from !== 'coinbase') {
        if (!balances[transaction.from]) {
            balances[transaction.from] = 0;
        }
        balances[transaction.from] -= transaction.amount;
    }
}

// 从区块链的每个区块中提取交易，更新所有地址的余额
export function calculateBalances(blockchain: Block[]): void {
    for (const block of blockchain) {
        for (const transaction of block.transactions) {
            updateBalance(transaction);
        }
    }
}

// 打印当前所有地址的余额
// 打印最后一个地址的余额
export function printLastBalance(): void {
    const addresses = Object.keys(balances);  // 获取所有账户地址
    if (addresses.length > 0) {
        const lastAddress = addresses[addresses.length - 1];  // 获取最后一个地址
        console.log(`最后一个地址余额分布:`);
        console.log(`${lastAddress}: ${balances[lastAddress]}`);  // 打印最后一个地址的余额
    } else {
        console.log('没有账户余额信息可显示');
    }
}

// 调用函数，加载账户余额并打印
loadBalancesFromFile();  // 从文件加载余额
printLastBalance();      // 只打印最后一个账户余额

// 调用函数，加载账户余额并打印
     // 打印余额