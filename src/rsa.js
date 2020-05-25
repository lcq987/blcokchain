// 加密
// RSA非对称加密
// 私钥加密信息 公钥验证信息是否合法

// 1. 生成公私钥对
// 2. 公钥当做地址

const EC = require('elliptic').ec

var ec = new EC('secp256k1')

const keypair = ec.genKeyPair()

const res = {
    prv: keypair.getPrivate('hex').toString(),
    pub: keypair.getPublic('hex').toString()
}

// 1. 获取公私钥对（持久化）
function generateKeys(){
    
}
// 2. 签名

// 3. 校验签名