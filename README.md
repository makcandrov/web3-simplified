# web3-simplified - An easier way to use web3

This is a package that wraps the packages [`web3`](https://www.npmjs.com/package/web3) and [`solc`](https://www.npmjs.com/package/solc)  and that provides more user-friendly functions to interact with the blockchain of your choice. Not all the functions from these packages are redefined, but the most common interractions are largely simplified. If you would like to do a more complex interaction that has not been redefined, you still can access to all the functions provided by [`web3`](https://www.npmjs.com/package/web3) and [`solc`](https://www.npmjs.com/package/solc).

## Installation

### Node

```bash
npm install web3-simplified
```

## Usage

### Set up

In order to use all the functions of this package, you will need to have the three `.json` files listed below in your current directory, in which you will precise yor RPCs, your addreses or the addresses of your contracts, and you will be able to give them aliases.

The package will search for this files in your workspace, begining from the directory where your javascript is executed and then by going up one indentation. All your files can be at différent indentations.

#### 1. A file for your providers `w-providers.json`

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

In this file, you will sort your RPCs by network, and you can give them the name you want. Usually, only one file `w-providers.json` is set at the root of your workspace.

#### 2. A file for your EOA addresses `w-accounts.json`

`w-accounts.json` template:
```json
"me": {
    "address": "0x",
    "key": "0x"
},
"vitalik": {
    "public": "0x"
}
```

In this file, you can give aliases to EOA addresses. If you want to make a transaction from one of these account, you need to specify a private key. Otherwise, it is not mandatory. If you have a private key in this file, don't forget to put this file in your `.gitignore`. You can have one file `w-providers.json` by folder, if you want to interact from or with different set of addresses in function of the folder you are. 

#### 3. A file for your contracts `w-contracts.json`

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

---

#### **setBlockCall**

```javascript
setBlockCall(block);
```

Sets the block in whitch to perform the next call.

##### **Parameters**

`block` — The block in whitch to perform the next call.

##### **Example**

```javascript
setBlockCall(10000000);
```
---

#### **setProvider**

```javascript
w.setProvider(network, name);
```

Sets the provider (and so the network) that will be used for all the future interactions with the blockchain.

##### **Parameters**

`network` — Network of the new provider, should appear in `w-providers.json`  
`name` — Alias of the new provider in `w-providers.json` for the given network

##### **Example**

```javascript
w.setProvider("etehereum", "public");
```

---

### Interactions

The power of `web3-simplified` is how easy it is to make transactions to the blockchain or to retrive data stored on it. Usually, you want to perform a [`call`](#call), to get an information from a smart contract without making a transaction, or a `send`, to initiate a transaction. But this library also provides many other handy functions to make some actions easier, as sending multiple transactions at a time, or accessing the value in a contract storage. Also, almost all functions that return result as a promise have a "print" version that only prints the result in the terminal when the promise is resolved, instead of returning it. For example, [`printCall`](#printcall) is the "print" version of [`call`](#call).

---

#### **call**

```javascript
async call(contract, functionName, args, returns, from)
```

Returns the response of the call to a smart contract.

##### **Parameters**

- `contract` -  Address of the contract or its alias in `w-contracts.json`.  
- `functionName` - Name of the function to call.  
- `args` - Arguments to encode, as an array of `[type, value]` tuples. If there is only one argument to encode, it can be `args = [type, value]`.  
- `returns` - Types returned by the function. If not specified it won't decode the output
- `from` - Address of the caller or his alias in `w-accounts.json` or in `w-contracts.json`. Can be `null` or `undefined`.

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

#### **printCall**

```javascript
async printCall(contract, functionName, args, returns, from)
```

Prints the response of the call to a smart contract.

##### **Parameters**

- `contract` -  Address of the contract or its alias in `w-contracts.json`.  
- `functionName` - Name of the function to call.  
- `args` - Arguments to encode, as an array of `[type, value]` tuples. If there is only one argument to encode, it can be `args = [type, value]`.  
- `returns` - Types returned by the function. If not specified it won't decode the output
- `from` - Address of the caller or his alias in `w-accounts.json` or in `w-contracts.json`. Can be `null` or `undefined`.

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