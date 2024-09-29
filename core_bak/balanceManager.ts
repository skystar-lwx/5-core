import * as fs from 'fs';
import * as path from 'path';
import { logWithTimestamp } from './utils';
import { Transaction } from './transaction';

export class BalanceManager {
    balances: { [address: string]: { balance: number } } = {};  // 账户余额的对象结构
    accountsFilePath: string = path.join(__dirname, 'balance/accounts.json');  // 账户余额文件路径

    constructor() {
        this.loadBalancesFromFile();  // 在构造函数中加载账户余额
    }

    // 从文件加载余额
    loadBalancesFromFile(): void {
        try {
            if (fs.existsSync(this.accountsFilePath)) {
                const data = fs.readFileSync(this.accountsFilePath, 'utf8');
                const accountsData = JSON.parse(data);
                
                // 获取 accounts 对象中的数据
                this.balances = accountsData.accounts || {};  // 确保从 "accounts" 中读取余额
                logWithTimestamp('账户余额已从文件加载完成');
            } else {
                logWithTimestamp('未找到账户余额文件，将创建新的文件');
                this.saveBalancesToFile();  // 如果文件不存在，保存初始状态的余额数据
            }
        } catch (error) {
            logWithTimestamp('加载账户余额时发生错误:', error);
        }
    }

    // 保存余额到文件
    saveBalancesToFile(): void {
        try {
            const accountsData = { accounts: this.balances };
            fs.writeFileSync(this.accountsFilePath, JSON.stringify(accountsData, null, 2));
            logWithTimestamp('账户余额已保存到文件:', this.accountsFilePath);
        } catch (error) {
            logWithTimestamp('保存账户余额时发生错误:', error);
        }
    }

    // 更新余额
    updateBalance(transaction: Transaction): void {
        // 更新接收者的余额
        if (!this.balances[transaction.to]) {
            this.balances[transaction.to] = { balance: 0 };
        }
        this.balances[transaction.to].balance += transaction.amount;

        // 如果不是 coinbase 交易，更新发送者的余额
        if (transaction.from !== 'coinbase') {
            if (!this.balances[transaction.from]) {
                this.balances[transaction.from] = { balance: 0 };
            }
            this.balances[transaction.from].balance -= transaction.amount;
        }

        // 记录日志并保存最新的余额数据到文件
        logWithTimestamp(`更新了账户余额，发送者: ${transaction.from}, 接收者: ${transaction.to}, 金额: ${transaction.amount}`);
        this.saveBalancesToFile();  // 每次更新余额后保存
    }

    // 获取某个地址的余额
    getBalance(address: string): number {
        return this.balances[address]?.balance || 0;
    }
}