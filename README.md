# web3-simplified - An easier way to use web3

This is a package that wraps the packages [`web3`](https://www.npmjs.com/package/web3) and [`solc`](https://www.npmjs.com/package/solc)  and that provides more user-friendly functions to interact with the blockchain of your choice. Not all the functions from these packages are redefined, but the most common interractions are largely simplified. If you would like to do a more complex interaction that has not been redefined, you still can access to all the functions provided by [`web3`](https://www.npmjs.com/package/web3) and [`solc`](https://www.npmjs.com/package/solc).

## Installation

### Node

```bash
npm install web3-simplified
```

## Usage

### Set up

In order to use all the functions of this package, you will need to have the three `.json` files listed below in your current workspace, in which you will precise your RPCs, your addreses or the addresses of your contracts, and you will be able to give them aliases.

The package will search for this files in your workspace, begining from the directory where your javascript is executed and then by going up one indentation. All your files can be at différent indentations.

#### 1. A file for your providers: `w-providers.json`

`w-providers.json` template:
```json
"ethereum": {
    "public": "https://",
    "my-node": "wss://"
},
"rinkeby": {
    "public": "https://"
}
```

In this file, you will sort your RPCs by network, and you can give them the name you want. Usually, only one file `w-providers.json` is set at the root of your workspace. You can find a list of public providers [here](https://chainlist.org/).

#### 2. A file for your accounts: `w-accounts.json`

`w-accounts.json` template:
```json
"me": {
    "address": "0x",
    "key": "0x"
},
"my-friend": {
    "public": "0x"
}
```

In this file, you can give aliases to EOA addresses. If you want to make a transaction from one of these account, you need to specify a private key. Otherwise, it is not mandatory. If you have a private key in this file, don't forget to put this file in your `.gitignore`. You can have one file `w-providers.json` by folder, if you want to interact from or with different set of addresses in function of the folder you are. 

#### 3. A file for your contracts: `w-contracts.json`

`w-contracts.json` template:
```json
"uniswap": {
    "ethereum": "0x",
    "rinkeby": "0x"
},
"my-contract": {
    "ethereum": "0x"
}
```

In this files you can give aliases to the contracts you want to interact with. If the same contract is deployed on different networks, you can specify all its the addresses. It is usefull if you want to switch easily from testnet to mainnet. Usually, `w-contracts.json` and `w-accounts.json` come together.

Eventually, your workspace can look like that:
```txt
workspace/
├── arbitrage/
│   ├── arbitrage.js
│   ├── w-accounts.json
│   └── w-contracts.json
├── liquidation/
│   ├── aave/
│   │   ├── aliquidation.js
│   │   └── w-contracts.json
│   ├── compound/
│   │   ├── cliquidation.js
│   │   └── w-contracts.json
│   └── w-accounts.json
└── w-providers.json
```

To use the `web3-simplified` in a file, it is now very simple, you will just have to import it as an object, and you can do everything from here!

```javascript
const w = require("web3-simplified");

w.setProvider("ethereum", "public");
```

### Settings

Many settings are available, that you can change directly from your javascript file, but only one is mandatory to do almost everything: [`setProvider`](#setprovider).

- [setBlockCall](#setblockcall)
- [setConfirmations](#setconfirmations)
- [setGasPriceUnit](#setgaspriceûnit)
- [setProvider](#setprovider)
- [setRecaps](#setrecaps)
- [setReceipts](#setreceipts)
- [setValueUnit](#setvalueunit)

---

#### **setBlockCall**

```javascript
setBlockCall(block);
```

Sets the block in whitch to perform all the next calls.

##### **Parameters**

- `block` — The block in whitch to perform all the next calls.

##### **Example**

```javascript
w.setBlockCall(10000000);
```
---

#### **setConfirmations**

```javascript
setConfirmations(value);
```

Specify if you want confirmation messages before any send to a smart contract. By defaut, it is set to `false`, no confirmation message appear.

##### **Parameters**

- `value` — `true` if you want confirmations messages, else `false`.

##### **Example**

```javascript
// enable confirmation messages
w.setConfirmations(true);

// disable confirmation messages
w.setConfirmations(false);
```

---

#### **setGasPriceUnit**

---

#### **setProvider**

```javascript
setProvider(network, name);
```

Sets the provider (and so the network) that will be used for all the future interactions with the blockchain.

##### **Parameters**

- `network` — Network of the new provider, should appear in `w-providers.json`  
- `name` — Alias of the new provider in `w-providers.json` for the given network

##### **Example**

```javascript
w.setProvider("etehereum", "public");
```

---

#### **setRecaps**

---

#### **setReceipts**

---

#### **setValueUnit**

---

### Interactions

The power of `web3-simplified` relies in how easy it is to make transactions to the blockchain or to retrive data stored on it. Usually, you want to perform a [`call`](#call), to get an information from a smart contract without making a transaction, or a `send`, to initiate a transaction. But this library also provides many other handy functions to make some actions easier, as sending multiple transactions at once, or accessing the value in a contract storage. Also, almost all functions that return result as a promise have a "print" version that only prints the result in the terminal when the promise is resolved, instead of returning it. For example, [`printCall`](#printcall) is the "print" version of [`call`](#call).

- [balance](#balance)
- [call](#call)
- [currentBlock](#currentblock)
- [deploy](#deploy)
- [mappingValue](#mappingvalue)
- [mappingValueSlot](#mappingvalueslot)
- [multiSend](#multisend)
- [nonce](#nonce)
- [printBalance](#printbalance)
- [printCall](#printcall)
- [printMappingValue](#printmappingvalue)
- [printNonce](#printnonce)
- [printStorage](#printstorage)
- [send](#send)
- [storage](#storage)
- [transfer](#transfer)

---

#### **balance**

---

#### **call**

```javascript
async call(contract, functionName, args, returns, from)
```

Returns the response of the call to a smart contract.

##### **Parameters**

- `contract` — Address of the contract or its alias in `w-contracts.json`.  
- `functionName` — Name of the function to call.  
- `args` — Arguments to encode, as an array of `[type, value]` tuples. If there is only one argument to encode, it can be `args = [type, value]`.  
- `returns` — Types returned by the function. If not specified it won't decode the output
- `from` — Address of the caller or his alias in `w-accounts.json` or in `w-contracts.json`. Can be `null` or `undefined`.

##### **Returns**

`Promise` Response of the call

##### **Example**

```javascript
let myTokenBalance = await w.call(
    "token",
    "balanceOf",
    // if "me" exists in `w-contracts` or `w-accounts`, this will work as expected. You could also put a real address.
    ["address", "me"],
    "uint256"
    // from has no importance here, it can be omitted
);
```

---

#### **currentBlock**

---

#### **deploy**

---

#### **mappingValue**

---

#### **mappingValueSlot**

---

#### **multiSend**

---

#### **nonce**

```javascript
async nonce(account)
```

Returns the nonce of an address (number of transactions if it is an EOA, number of contract deployed if it is a contract).

##### **Parameters**

- `account` — Address or its alias in `w-accounts.json` or in `w-contracts.json`

##### **Returns**

`Promise` Nonce of the address.

##### **Example**

```javascript
let myNonce = await w.nonce("me");
```

---

#### **printBalance**

---

#### **printCall**

```javascript
printCall(contract, functionName, args, returns, from)
```

Prints the response of the call to a smart contract.

##### **Parameters**

- `contract` —  Address of the contract or its alias in `w-contracts.json`.  
- `functionName` — Name of the function to call.  
- `args` — Arguments to encode, as an array of `[type, value]` tuples. If there is only one argument to encode, it can be `args = [type, value]`.  
- `returns` — Types returned by the function. If not specified it won't decode the output
- `from` — Address of the caller or his alias in `w-accounts.json` or in `w-contracts.json`. Can be `null` or `undefined`.

##### **Example**

```javascript
w.printCall(
    "uniswap-pair",
    "getReserves",
    [],
    ["uint112", "uint112", "uint32"]
    // from has no importance here, it can be omitted
);
```

---

#### **printMappingValue**

---

#### **printNonce**

```javascript
printNonce(account)
```

Prints the nonce of an address (number of transactions if it is an EOA, number of contract deployed if it is a contract).

##### **Parameters**

- `account` — Address or its alias in `w-accounts.json` or in `w-contracts.json`

##### **Example**

```javascript
let myNonce = await w.nonce("me");
```

---

#### **printStorage**

---

#### **send**

```javascript
async send(from, to, functionName, args, value, gasLimit, gasPrice, nonce);
```

Sends a transaction to a smart contact or an account address.

##### **Parameters**

- `from` — Alias of the sinder in w-accounts.json. Its private key should also be present in the file.  
- `to` — Address of the receiver or its alias in w-contracts.json or in w-accounts.json.  
- `functionName` — Name of the function to call. Can be null or undefined.  
- `args` — Arguments to encode, as an array of [type, value] tuples. If there is only one argument to encode, it can be args = [type, value]. Can be null or undefined.    
- `value` — Value to send to the function if it is payable. The value is unit set by the function w.setValueUnit(), by default it is 'ether'.  
- `gasLimit` — Gas limit to the transaction.
- `gasPrice` — Gas price of the transaction. The value is unit set by the function w.setGasPriceUnit(), by default it is 'gwei'.
- `nonce` — Nonce of the transaction. If not specified, the nonce is set so that the transaction will be the next to be sent. If you want to set a relative nonce (to send the transaction after x transactions), you can give as parameter` w.$rel(x)`.

##### **Returns**

`Promise` Response of the signed transaction.

##### **Example**

```javascript
// send with no nonc specified, the transaction will your next transaction
w.send(
    "me", "nft-contract", "safeTransfer", [
        // if "my-friend" exists in `w-contracts` or `w-accounts`, this will work as expected. You could also put a real address.
        ["address", "my-friend"], 
        ["uint256", "111"]
    ], 0, 150000, 35
);

// send with a nonce of 12 specified, the transaction will be your 12th transaction ever.
w.send(
    "me", "nft-contract", "safeTransfer", [
        // if "my-friend" exists in `w-contracts` or `w-accounts`, this will work as expected. You could also put a real address.
        ["address", "my-friend"], 
        ["uint256", "112"]
    ], 0, 150000, 35, 12
);

// send with a relative nonce of 2 specified, this transaction will be effective after 2 other transactions.
w.send(
    "me", "nft-contract", "safeTransfer", [
        // if "my-friend" exists in `w-contracts` or `w-accounts`, this will work as expected. You could also put a real address.
        ["address", "my-friend"], 
        ["uint256", "113"]
    ], 0, 150000, 35, w.$rel(2)
);
```

---

#### **storage**

---

#### **transfer**

---