// 1. 区块链的生成，新增，校验
// 2. 交易
// 3. 非对称加密
// 4. 挖矿
// 5. p2p网络

// 区块链数据结构
// [{
//     index,      索引
//     timestamp,  时间戳
//     data,       区块的具体信息, 主要是交易信息
//     hash,       当前区块的哈希
//     prevHash,   上一个区块的哈希
//     nonce,      随机数
// }]

const crypto = require('crypto')

// 创世区块
const initBlock = { index: 0,
    data: 'Welcome to lcq-chain',
    prevHash: '0',
    timestamp: 1590115285533,
    nonce: 27481,
    hash:
     '00007f3cd7bb5e030b751601af7d54276e03df849be1341cad42349dab4d5de2' }
class Blockchain{
    // 构造函数
    constructor(){
        this.blockchain = [initBlock]
        this.data = []
        this.difficutly = 4  // 当前挖矿难度
    }

    // 获取最新区块
    getLastBlcok(){
        return this.blockchain[this.blockchain.length-1]
    }

    // 挖矿
    mine(){
        const newBlcok = this.generateNewBlock()

        // 校验区块是否合法
        if(this.isValidBlock(newBlcok) && this.isValidBlcokChain()){
            this.blockchain.push(newBlcok)
            return newBlcok
        }else{
            console.log('error, Invalid Blcok!')
        }
    }

    // 生成新区块
    generateNewBlock(){
        let nonce = 0
        const index = this.blockchain.length
        const data = this.data
        const prevHash = this.getLastBlcok().hash
        const timestamp = new Date().getTime()
        let hash = this.computeHash(index, prevHash, timestamp, data, nonce)
        while(hash.slice(0, this.difficutly) !== '0'.repeat(this.difficutly)){
            nonce += 1
            hash = this.computeHash(index, prevHash, timestamp, data, nonce)
        }
        
        return {
            index,
            data,
            prevHash,
            timestamp,
            nonce,
            hash
        }
    }

    // 计算哈希
    computeHash(index, prevHash, timestamp, data, nonce){
        return crypto
                .createHash('sha256')
                .update(`${index}${prevHash}${timestamp}${data}${nonce}`)
                .digest('hex')
    }

    computeHashForBlock({index, prevHash, timestamp, data, nonce}){
        return this.computeHash(index, prevHash, timestamp, data, nonce)
    }

    // 校验区块
    isValidBlock(newBlcok, lastBlcok = this.getLastBlcok()){
        // 1. 区块的index等于最新区块的index+1
        // 2. 区块的timestamp大于最新区块
        // 3. 区块的preHash等于最新区块的hash
        // 4. 区块的哈希值符合难度要求
        if(newBlcok.index !== lastBlcok.index+1){
            return false
        }else if(newBlcok.timestamp <= lastBlcok.timestamp){
            return false
        }else if(newBlcok.prevHash !== lastBlcok.hash){
            return false
        }else if(newBlcok.hash.slice(0, this.difficutly) !== '0'.repeat(this.difficutly)){
            return false
        }else if(newBlcok.hash !== this.computeHashForBlock(newBlcok)){
            return false
        }
        return true
    }

    // 校验区块链
    isValidBlcokChain(chain = this.blockchain){
        for(let i = chain.length - 1; i >= 1; i--){
            if(!this.isValidBlock(chain[i], chain[i-1])){
                return false
            }
        }
        if(JSON.stringify(chain[0]) !== JSON.stringify(initBlock)){
            return false
        }
        return true
    }
}

module.exports = Blockchain