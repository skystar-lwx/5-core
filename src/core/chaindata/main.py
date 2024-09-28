from fastapi import FastAPI, HTTPException
from fastapi.responses import PlainTextResponse
import json
from pathlib import Path

app = FastAPI()

# 定义区块链数据的文件路径
blockchain_file = Path("chaindata/blockchain.json")

# 读取区块链数据的函数


def read_blockchain():
    if blockchain_file.exists():
        with open(blockchain_file, "r") as f:
            return json.load(f)
    else:
        raise HTTPException(
            status_code=404, detail="Blockchain file not found")

# 首页路由，打印 API 路径


@app.get("/", response_class=PlainTextResponse)
def read_root():
    return (

        "Welcome to the Blockchain API \n\n"
        "Available Endpoints: \n\n"
        "1. Get Blockchain Data: /blockchain \n\n"
        "2. Get Latest Block Height: /blockchain/height \n\n"
        "3. Get Latest Block Height:/blockchain/last_block \n\n"

    )

# 定义FastAPI的路由，读取区块链数据


@app.get("/blockchain")
def get_blockchain():
    try:
        blockchain_data = read_blockchain()
        return blockchain_data
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="An error occurred while reading the blockchain")

# 获取最新区块高度


@app.get("/blockchain/height")
def get_latest_block_height():
    try:
        blockchain_data = read_blockchain()
        if isinstance(blockchain_data, list) and len(blockchain_data) > 0:
            latest_block = blockchain_data[-1]
            return {"block_height": latest_block.get("index")}
        else:
            raise HTTPException(
                status_code=404, detail="No blocks found in blockchain")
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="An error occurred while fetching block height")

    # 新增路由：获取最后一个区块的所有信息


@app.get("/blockchain/last_block")
def get_last_block():
    try:
        blockchain_data = read_blockchain()
        if isinstance(blockchain_data, list) and len(blockchain_data) > 0:
            last_block = blockchain_data[-1]
            return last_block
        else:
            raise HTTPException(
                status_code=404, detail="No blocks found in blockchain")
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="An error occurred while fetching the last block")
