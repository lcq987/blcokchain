const vorpal = require('vorpal')()      // 命令行工具
const Table = require('cli-table')      // 格式化命令行输出
const Blockchain = require('./blockchain')
const bc = new Blockchain()

function formatLog(data){
    if(!Array.isArray(data)){
        data = [data]
    }
    const first = data[0]
    const head = Object.keys(first)

    const table = new Table({
        head,
        colWidths: new Array(head.length).fill(20)
    })

    const res = data.map(v => {
        return head.map(h=>JSON.stringify(v[h], null, 1))
    })

    table.push(...res)
    console.log(table.toString())
}

// 挖矿
vorpal
    .command('mine <address>', '挖矿')
    .action(function(args, callback){
        const newBlcok = bc.mine(args.address)
        if(newBlcok){
            formatLog(newBlcok)
        }
        callback()
    })

// 查看区块链
vorpal
    .command('blockchain', '查看区块链')
    .action(function(args, callback){
        formatLog(bc.blockchain)
        callback()
    })

// 交易
vorpal
    .command('trans <from> <to> <amount>', '交易')
    .action(function(args, callback){
        let trans = bc.transfer(args.from, args.to, args.amount)
        if(trans){
            formatLog(trans)
        }
        callback()
    })

// 查看区块具体信息
vorpal
    .command('detail <index>', '查看区块具体信息')
    .action(function(args, callback){
        this.log(JSON.stringify(bc.blockchain[args.index], null, 2))
        callback()
    })

// 查询余额
vorpal
    .command('blance <address>', '查询余额')
    .action(function(args, callback){
        const blance = bc.blance(args.address)
        formatLog({address: args.address, blance})
        callback()
    })

console.log('welcome to chian')
vorpal.exec('help')
vorpal.delimiter('chain => ').show()