const vorpal = require('vorpal')()
const Blockchain = require('./blockchain')
const bc = new Blockchain()

// 挖矿
vorpal.command('mine', '挖矿').action(function(args, callback){
    const newBlcok = bc.mine()
    if(newBlcok){
        this.log(newBlcok)
    }
    callback()
})

// 查看区块链
vorpal.command('blockchain', '查看区块链').action(function(args, callback){
    this.log(bc.blockchain)
    callback()
})

console.log('welcome to chian')
vorpal.exec('help')
vorpal.delimiter('chain => ').show()