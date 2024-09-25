#项目结构如下：
- src/
  - blockchain.ts  // 包含区块和区块链逻辑
  - server.ts      // 区块链节点的主服务文件
  - miner.ts       // 矿工逻辑（独立的矿工程序）


# 运行项目

## 运行env

```
conda activate nodechain
```

## 安装依赖

```
npm install express axios
```

##  1 、启动区块链节点

```
clear &&  lsof -t -i:3001 | xargs kill -9    && npx ts-node server.ts

```

## 访问区块链节点

```


## 2 启动矿工程序
```
npm install axios
```

```
npx ts-node miner.ts
```

# 检查区块链状态

```bash
curl http://localhost:3001/latest-block
```



# 区块链操作
## 发送交易
curl -X POST http://localhost:3001/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "from": "0x1234567890abcdef1234567890abcdef12345678",
    "to": "0xabcdefabcdefabcdefabcdefabcdefabcdef",
    "amount": "10",
    "privateKey": "yourPrivateKey"
  }'

  # 查询发送方的余额
curl -X GET http://localhost:3001/balance/0x1234567890abcdef1234567890abcdef12345678

# 查询接收方的余额
curl -X GET http://localhost:3001/balance/0xabcdefabcdefabcdefabcdefabcdefabcdef

# 使用返回的交易哈希查询交易状态
curl -X GET http://localhost:3001/transaction/0x5dcjqucob9o



# 常见文件及解决

## 1.accounts.json 务必有账号信息不然链起不来

   内容样例
   {
  "accounts": {
    "0x1234567890abcdef1234567890abcdef12345678": 1000,
    "0xabcdefabcdefabcdefabcdefabcdefabcdef": 500
  },
  "0x1234567890abcdef1234567890abcdef12345678": 16110,
  "0xabcdefabcdefabcdefabcdefabcdefabcdef": 290
}