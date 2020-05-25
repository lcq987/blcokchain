// 加密
// RSA非对称加密
// 私钥加密信息 公钥验证信息是否合法

// 1. 生成公私钥对
// 2. 公钥当做地址

const fs = require('fs')
const path = require('path')
const EC = require('elliptic').ec

let ec = new EC('secp256k1')

let keypair = ec.genKeyPair()

// 1. 获取公私钥对（持久化）
function generateKeys(){
    const fileName = 'wallet.json'
    const filePath = path.resolve(__dirname, `./store/${fileName}`)
    try{
        const res = JSON.parse(fs.readFileSync(filePath))
        if(res.prv && res.pub && getPub(res.prv) === res.pub){
            keypair = ec.keyFromPrivate(res.prv)
            return res
        }else{
            // 验证失败
            throw 'not vaild wallet.json'
        }
    }catch(e){
        // 文件不存在，或文件内容不合法，重新生成
        const res = {
            prv: keypair.getPrivate('hex').toString(),
            pub: keypair.getPublic('hex').toString()
        }
        fs.writeFileSync(filePath, JSON.stringify(res, null, 2))
    }
}

// 根据私钥计算公钥
function getPub(prv){
    return ec.keyFromPrivate(prv).getPublic('hex').toString()
}
// 2. 签名
function sign({from, to, amount, timestamp}){
    const bufferMsg = Buffer.from(`${timestamp}-${from}-${to}-${amount}`)
    const signature = Buffer.from(keypair.sign(bufferMsg).toDER()).toString('hex')
    return signature
}
// 3. 校验签名
function verify({from, to, amount, timestamp, signature}, pub){
    const keypairTemp = ec.keyFromPublic(pub, 'hex')
    const bufferMsg = Buffer.from(`${timestamp}-${from}-${to}-${amount}`)
    return keypairTemp.verify(bufferMsg, signature) 
}

const keys = generateKeys()

module.exports = {sign, verify, generateKeys, keys}