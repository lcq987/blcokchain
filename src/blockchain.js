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
const dgram = require('dgram')
const rsa = require('./rsa')

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
        // 所有节点的网络信息
        this.peers = []
        this.remote = {}
        // 种子节点
        this.seed = {address: 'localhost', port: 8001}
        this.udp = dgram.createSocket('udp4')
        this.init()
    }

    init(){
        this.bindP2p()
        this.bindExit()
    }

    bindP2p(){
        // 处理网络发来的消息
        this.udp.on('message', (data, remote)=>{
            const {address, port} = remote
            const action = JSON.parse(data)
            if(action.type){
                this.dispatch(action, {address, port})
            }
        })

        this.udp.on('listening', ()=>{
            const address = this.udp.address()
            console.log('udp监听完毕 端口是'+address.port)
        })
        // 区分种子节点和普通节点 
        // 普通节点的端口可以是随便一个端口
        // 种子节点的端口必须固定
        const port = Number(process.argv[2] || 0)
        this.startNode(port)
    }

    bindExit(){
        process.on('exit', ()=>{
            console.log('退出blockchain')
        })
    }

    startNode(port){
        this.udp.bind(port)
        if(port !== 8001){
            this.send({
                type: 'newpeer'
            }, this.seed.port, this.seed.address)
            // 把种子节点加入列表
            this.peers.push(this.seed)
        }
    }

    boradcast(action){
        this.peers.forEach(v=>{
            this.send(action, v.port, v.address)
        })
    }

    send(message, port, address){
        this.udp.send(JSON.stringify(message), port, address)
    }

    dispatch(action, remote){
        switch(action.type){
            case 'newpeer':
                // 当前地址
                this.send({
                    type: 'remoteAddress',
                    data: remote
                }, remote.port, remote.address)
                // 同步当前节点列表
                this.send({
                    type: 'peerList',
                    data: this.peers
                }, remote.port, remote.address)
                // 广播要求所有节点跟新节点建立联系
                this.boradcast({
                    type: 'sayHi',
                    data: remote
                })
                // 同步当前区块链数据
                this.send({
                    type: 'blockchain',
                    data: JSON.stringify({
                        blockchain: this.blockchain,
                        trans: this.data
                    })
                }, remote.port, remote.address)
                this.peers.push(remote)
                console.log("新节点加入", remote)
                break
            case 'blockchain':
                let allData = JSON.parse(action.data)
                let newChain = allData.blockchain
                let newTrans = allData.trans
                this.replaceChain(newChain)
                this.replaceTrans(newTrans)
                break
            case 'trans':
                // 是否重复交易
                if(!this.data.find(v=>this.isEqualObj(v, action.data))){
                    this.addTrans(action.data)
                    this.boradcast({
                        type:'trans',
                        data: action.data
                    })
                }
                break
            case 'mine':
                const lastBlcok = this.getLastBlcok()
                if(lastBlcok.hash === action.data.hash) return
                if(this.isValidBlock(action.data, lastBlcok)){
                    this.blockchain.push(action.data)
                    // 清空本地信息
                    this.data = []
                    this.boradcast({
                        type: 'mine',
                        data: action.data
                    })
                }else{
                    console.log('[错误]: 挖矿不合法')
                }
                break
            case 'remoteAddress':
                this.remote = action.data
                break
            case 'peerList':
                const newPeers = action.data
                this.addPeers(newPeers)
                break
            case 'sayHi':
                let data = action.data
                this.peers.push(data)
                this.send({type: 'hi', data: 'welcome'}, data.port, data.address)
                break
            case 'hi':
                console.log(`${remote.address}:${remote.port} ${action.data}`)
                break            
            default:
                console.log("未知节点")
        }
    }

    isEqualObj(obj1, obj2){
        const key1 = Object.keys(obj1)
        const key2 = Object.keys(obj2)
        if(key1.length !== key2.length){
            return false
        }
        return key1.every(key=> obj1[key] === obj2[key])
    }

    addPeers(peers){
        peers.forEach(peer=>{
            if(!this.peers.find(v=> this.isEqualObj(peer, v))){
                this.peers.push(peer)
            }
        })
    }

    replaceChain(newChain){
        if(newChain.length === 1) return
        if(this.isValidBlcokChain(newChain) && newChain.length > this.blockchain.length){
            // 深拷贝
            this.blockchain = JSON.parse(JSON.stringify(newChain))
        }else{
            console.log('[错误]: 不合法链')
        }
    }

    replaceTrans(newTrans){
        if(newTrans.every(v=>this.isValidTransfer(v))){
            this.data = newTrans
        }
    }
    
    // 获取最新区块
    getLastBlcok(){
        return this.blockchain[this.blockchain.length-1]
    }

    // 交易
    transfer(from, to, amount){
        const timestamp = new Date().getTime()
        // 签名校验
        const signature = rsa.sign({from, to, amount, timestamp})
        const sigTrans = {from, to, amount, timestamp, signature}

        if(from !== '0'){
            const blance = this.blance(from)
            if(blance < amount){
                console.log('not enough blance', from, blance, amount)
                return
            }
            this.boradcast({
                type: 'trans',
                data: sigTrans
            })
        }
  
        this.data.push(sigTrans)    
        return sigTrans
    }

    // 查询余额
    blance(address){
        // 粗暴的办法，把所有区块遍历一遍
        let blance = 0
        this.blockchain.forEach(block=>{
            if(Array.isArray(block.data)){
                block.data.forEach(trans=>{
                    if(address == trans.from){
                        blance -= trans.amount
                    }
                    if(address == trans.to){
                        blance += trans.amount
                    }
                })
            }
        })
        return blance
    }

    // 转账是否合法
    isValidTransfer(trans){
        return trans.from === '0' ? true : rsa.verify(trans, trans.from)
    }

    // 挖矿
    mine(address){
        // 旷工奖励
        this.transfer('0', address, 20)
        // 校验所有交易合法性
        this.data = this.data.filter(v=>this.isValidTransfer(v))

        // 校验账户余额是否足够
        let curBlance = this.blance(rsa.keys.pub)
        const enoughTrans = this.data.reduce((prev, cur)=>{
            if(curBlance >= cur.amount || cur.from === '0'){
                prev.push(cur)
                curBlance -= cur.from === '0' ? 0 : cur.amount
            }
            return prev
        }, [])
        this.data = enoughTrans
        const newBlcok = this.generateNewBlock()

        // 校验区块是否合法
        if(this.isValidBlock(newBlcok) && this.isValidBlcokChain()){
            this.blockchain.push(newBlcok)
            this.data = []
            this.boradcast({
                type: 'mine',
                data: newBlcok
            })
            return newBlcok
        }else{
            console.log('error, Invalid Blcok!')
            this.data = []
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

   addTrans(trans){
       if(this.isValidTransfer(trans)){
           this.data.push(trans)
       }
   }
}

module.exports = Blockchain