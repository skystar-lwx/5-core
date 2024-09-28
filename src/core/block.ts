import { keccak256, toUtf8Bytes } from 'ethers';  // 引入 keccak256 生成哈希
import * as crypto from 'crypto';
export class Block {
    public hash: string;
    public nonce: number = 0;

    constructor(
        public index: number,
        public timestamp: string,
        public transactions: any[],
        public previousHash: string,
        public minerAddress: string
    ) {
        this.hash = this.calculateHash();  // 初始化哈希值
    }

    // 计算区块哈希 64位
    // calculateHash(): string {
    //     return keccak256(toUtf8Bytes(
    //         this.index + 
    //         this.previousHash + 
    //         this.timestamp + 
    //         JSON.stringify(this.transactions) + 
    //         this.nonce
    //     )).substring(0, 5);;
    // }



    calculateHash(): string {
        return crypto.createHash('md5')
            .update(this.index + this.previousHash + this.timestamp + JSON.stringify(this.transactions) + this.nonce)
            .digest('hex')
            .slice(0, 16);  // 截取前16位
    }




    // 挖矿函数，根据难度进行哈希运算
    mineBlock(difficulty: number): void {

        const target = '0'.repeat(difficulty);  // 根据难度生成目标前缀
        let attempt = 0;

        // 循环计算哈希，直到满足难度条件
        while (this.hash.substring(0, difficulty) !== target) {
            this.nonce++;  // 不断尝试改变 nonce
            this.hash = this.calculateHash();  // 重新计算哈希

            attempt++;

            // 每隔 10000 次计算输出一次日志，避免过多输出
            if (attempt % 10000 === 0) {
                console.log(`正在尝试挖矿... 尝试次数: ${attempt}, 当前 nonce: ${this.nonce}, 当前 hash: ${this.hash}`);
            }
        }

        // 当找到符合条件的哈希后输出结果
        console.log(`🎉 区块已成功挖出! nonce: ${this.nonce}, hash: ${this.hash}, 挖矿尝试次数: ${attempt}`);
    }
}