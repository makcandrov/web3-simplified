const Web3 = require("web3");
const fs = require("fs");
const path = require("path");
const readline = require('readline');
const assert = require('assert');
const solc = require('solc');
const uncRjc = 'unhandledRejection';
const listeners = process.listeners(uncRjc);
process.removeListener(uncRjc, listeners[listeners.length - 1]);

/**
 * Prompts a confirmation message in the terminal.
 * @param {string} message Confirmation message to show to the user.
 * @returns {Promise} Promise resolved when the users reponds, and returns the response.
 */
function askConfirmation(message) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(message, ans => {
        rl.close();
        resolve(ans && ['y', 'Y', 'yes', 'Yes'].includes(ans));
    }))
}

/**
 * Does the same as `assert`, but prints the error in red.
 * @param {boolean} value 
 * @param {message} message 
 */
function assertRed(value, message) {
    assert(value, colorize(message, 'red'));
}

/**
 * Throws an error if `value` is not of the type expected.
 * @param {*} value Value to check the type of.
 * @param {string} type Type expected.
 */
function typeAssertion(value, type) {
    let typeofValue = typeof value;
    assertRed(
        typeofValue === type,
        `Variable of type ${type} expected, ${typeofValue} given (\`${value}\`).`
    );
}

/**
 * Colorises a message before being print in the terminal.
 * @param {string} message Message to be colored.
 * @param {string} color Color within `'black'`, `'red'`, `'green'`, `'yellow'`, `'blue'`, `'magenta'`,
 * `'cyan'` and `'white'`.
 * @returns The colorized message.
 */
function colorize(message, color) {
    switch (color) {
        case 'black': return `\x1b[30m${message}\x1b[0m`;
        case 'red': return `\x1b[31m${message}\x1b[0m`;
        case 'green': return `\x1b[32m${message}\x1b[0m`;
        case 'yellow': return `\x1b[33m${message}\x1b[0m`;
        case 'blue': return `\x1b[34m${message}\x1b[0m`;
        case 'magenta': return `\x1b[35m${message}\x1b[0m`;
        case 'cyan': return `\x1b[36m${message}\x1b[0m`;
        case 'white': return `\x1b[37m${message}\x1b[0m`;
        default: return message;
    }
}

/**
 * Prints a warning.
 * @param {message} message Content of the warning.
 */
function warning(message) {
    console.log(
        colorize("Warning: " + message, 'yellow')
    )
}

class W {

    constructor() {
        let parentPaths = module.parent.paths.map((path) => {
            return path.slice(0, - 'node_modules'.length);
        });

        let foundConfiguration = false;
        let i = 0;
        while (!foundConfiguration && i < parentPaths.length) {
            let accountsPath = parentPaths[i] + 'w-accounts.json';
            let contractsPath = parentPaths[i] + 'w-contracts.json';
            let providersPath = parentPaths[i] + 'w-providers.json';
            try {
                this.accounts = this.accounts || require(accountsPath);
            } catch { }

            try {
                this.contracts = this.contracts || require(contractsPath);
            } catch { }

            try {
                this.providers = this.providers || require(providersPath);
            } catch { }

            foundConfiguration = this.accounts && this.contracts && this.providers;
            i++;
        }

        if (!this.accounts) warning('`w-accounts.json` is missing. Some functions may not work.');
        if (!this.contracts) warning('`w-contracts.json` is missing. Some functions may not work.');
        if (!this.providers) warning('`w-providers.json` is missing. Some functions may not work.');

        this.ETHER = 'ether';
        this.MILLIETHER = 'milliether';
        this.MICROETHER = 'microether';
        this.GWEI = 'gwei';
        this.WEI = 'wei';

        this.provider = null;
        this.web3 = null;

        this.valueUnit = this.ETHER;
        this.gasPriceUnit = this.GWEI;
        this.blockCall = 'latest';

        this.confirmations = false;
        this.recaps = false;
        this.receipts = true;
    }

    /**
     * Throws an error if the network is not set.
     */
    _web3Assertion() {
        this._providersAssertion();
        assertRed(
            this.web3,
            'Network not set, use `w.setProvider()`.'
        );
    }

    _accountsAssertion() {
        assertRed(
            this.accounts,
            '`w-accounts.json` is missing.'
        );
    }

    _contractsAssertion() {
        assertRed(
            this.contracts,
            '`w-contracts.json` is missing.'
        );
    }

    _providersAssertion() {
        assertRed(
            this.providers,
            '`w-providers.json` is missing.'
        );
    }

    /**
     * @notice Checks if the given `string` is an address, without checksum verification.
     * @param {string} address Address to check
     * @returns {bool} Wether `address` has the address format or not
     */
    _isAddress(address) {
        return /0x([0-9]|[a-f]|[A-F]){40}/.test(address);
    }

    /**
     * @notice Checks if the given `string` is a valid address, with checksum verification.
     * @param {string} address Address to check
     * @returns {bool} Wether `address` is a valid address or not
     */
    _isValidAddress(address) {
        this._web3Assertion();
        return this._isAddress(address) && this.web3.utils.checkAddressChecksum(address);
    }

    /**
     * Converts the given address to a valid address (checksum).
     * @param {String} address Address to convert
     * @returns The valid version of the address
     */
    _toValidAddress(address) {
        return this.web3.utils.toChecksumAddress(address);
    }

    /**
     * @notice If `account` is already is a valid address, it returns the same address.
     * If it is not, it returns the address corresponding the the alias `account` in the file
     * `w-accounts.json` first, and in the file `w-contracts` after. If it is not corresponding to
     * anything, it returns `null`.
     * @param {string} account Account address or alias.
     * @param {bool} validityCheck Whether to check if `account` is a valid address or not.
     * Its default value is `true`.
     * @returns {string} Address corresponding to the given account.
     */
    _accountsAliasesHandler(account, validityCheck = true) {
        let accountAddress = null;
        if (validityCheck && this._isAddress(account)) {
            if (this._isValidAddress(account)) {
                accountAddress = account;
            } else {
                accountAddress = this._toValidAddress(account);
            }
        } else if (this.accounts && this.accounts[account]) {
            accountAddress = this.accounts[account].address;
        }
        return accountAddress;
    }

    /**
     * @notice If `contract` is already is a valid address, it returns the same address.
     * If it is not, it returns the address corresponding the the alias `contract` in the file
     * `w-contracts`. If it is not corresponding to anything, it returns `null`.
     * @param {string} contract Contract address or alias.
     * @param {bool} validityCheck Whether to check if `contract` is a valid address or not.
     * Its default value is `true`.
     * @returns {string} Address corresponding to the given contract.
     */
    _contractsAliasesHandler(contract, validityCheck = true) {
        let contractAddress = null;
        if (validityCheck && this._isAddress(contract)) {
            if (this._isValidAddress(contract)) {
                contractAddress = contract;
            } else {
                contractAddress = this._toValidAddress(contract);
            }
        } else if (this.contracts && this.provider && this.contracts[contract]) {
            contractAddress = this.contracts[contract][this.provider?.network];
        }
        return contractAddress;
    }

    /**
     * If `alias` is already is a valid address, it returns the same address.
     * If it is not, it returns the address corresponding the the alias in the file
     * `w-accounts.json` or `w-contracts.json`. If it is not corresponding to anything, it returns `null`.
     * @param {string} alias Address or an alias.
     * @param {string} order Defines the order it searches between accounts and contracts. `'ac'` corresponds
     * to accounts first and contracts then, and `'ca'` contracts first and accounts then. If not specified, it
     * checks accounts first.
     * @returns {string} Address corresponding to the given alias.
     */
    _aliasesHandler(alias, order = 'ac') {
        let address = null;
        if (this._isAddress(alias)) {
            if (this._isValidAddress(alias)) {
                address = alias;
            } else {
                address = this._toValidAddress(alias);
            }
        } else if (order === 'ca') {
            address = this._contractsAliasesHandler(alias, false) || this._accountsAliasesHandler(alias, false);
        } else {
            address = this._accountsAliasesHandler(alias, false) || this._contractsAliasesHandler(alias, false);
        }
        return address;
    }

    /**
     * @param {string} functionName Name of the function to call
     * @param {string[]} types Types of the arguments of the function
     * @returns Function selector
     */
    _selector(functionName, types = null) {
        this._web3Assertion();
        let toEncode = functionName + '(';
        if (types && types.length > 0) {
            types.forEach(type => {
                toEncode += type + ',';
            });
            toEncode = toEncode.slice(0, toEncode.length - 1);
        }
        toEncode += ')';
        return this.web3.eth.abi.encodeFunctionSignature(toEncode);
    }

    /**
     * @param {string[]} argsTypes Types of the arguments
     * @param {string[]} argsValues Values of the arguments
     * @returns The encoded arguments
     */
    _encodeArgs(argsTypes, argsValues) {
        this._web3Assertion();
        return this.web3.eth.abi.encodeParameters(argsTypes, argsValues);
    }

    /**
     * @param {string} functionName Name of the function to encode
     * @param {string[][]} args Arguments to encode, as an array of `[type, value]` tuples.
     * If there is only one argument to encode, it can be `args = [type, value]`
     * @returns {string} The encoded data
     */
    _encodeData(functionName, args = null) {
        let argsTypes = [];
        let argsValues = [];
        if (args && args.length !== 0) {
            if (args.length === 2 && typeof args[0] === "string") {
                argsTypes = [args[0]];
                argsValues = [args[1]];
            } else {
                args.forEach(([type, value]) => {
                    argsTypes.push(type);
                    argsValues.push(value);
                });
            }

            for (let i = 0; i < argsTypes.length; i++) {
                if (argsTypes[i] === 'address') {
                    argsValues[i] = this._aliasesHandler(argsValues[i]);
                } else if (argsTypes[i] === 'address[]') {
                    argsValues[i] = argsValues[i].map(address => this._aliasesHandler(address));
                }
            }
        }

        return this._selector(functionName, argsTypes) + this._encodeArgs(argsTypes, argsValues).slice(2);
    }

    _decode(values, types) {
        this._web3Assertion();
        if (typeof types === 'string') return this.web3.eth.abi.decodeParameter(types, values);
        else return this.web3.eth.abi.decodeParameters(types, values);
    }

    /**
     * Switches provider 
     * @param {string} network Network of the new provider, should appear in `w-providers.json`
     * @param {string} name Alias of the new provider in `w-providers.json` for the given network
     */
    setProvider(network, name) {
        let networkProviders = this.providers[network];
        assertRed(
            networkProviders,
            'Network unknown, add it in `providers.json`'
            + '\nGiven network: ' + network
        );
        let rpc = networkProviders[name];
        assertRed(
            rpc,
            'Provider unknown, add it in `providers.json`'
            + '\nGiven network: ' + network
            + '\nGiven RPC name: ' + name
        );
        this.provider = {
            network: network,
            name: name,
            rpc: rpc
        };
        this.web3 = new Web3(rpc)
        console.log(
            colorize(`Connected to the provider ${network}/${name} (${rpc})`, 'cyan')
        );
    }

    /**
     * Specify if you want confirmation messages before any `send` to a smart contract.
     * By defaut, it is set to `false`, no confirmation message appear.
     * @param {bool} value `true` if you want confirmations messages, else `false`.
     */
    setConfirmations(value) {
        typeAssertion(value, 'boolean');
        this.confirmations = value;
    }

    /**
     * Specify if you want transaction summaries before sending any `call` or `send` to a smart contract.
     * It won't prevent the transaction from being sent. By defaut, it is set to `false`.
     * @param {bool} value `true` if you want transaction summaries, else `false`.
     */
    setRecaps(value) {
        typeAssertion(value, 'boolean');
        this.recaps = value;
    }

    /**
     * Specify if you want to print the receipt after a `send` to a smart contract.
     * By defaut, it is set to `true`.
     * @param {bool} value `true` if you want receipts, else `false`.
     */
    setReceipts(value) {
        typeAssertion(value, 'boolean');
        this.receipts = value;
    }

    /**
     * @notice Sets the value unit for all the further transactions.
     * By default, it is set to `'ether'`.
     * @param {string} unit New value unit. The following variables can be used : 
     * `w.WEI`, `w.GWEI`, `w.MICROETHER`, `w.MILLIETHER`, `w.ETHER`.
     */
    setValueUnit(unit) {
        this.valueUnit = unit;
    }

    /**
     * Sets the gas price unit for all the further transactions.
     * By default, it is set to `'gwei'`.
     * @param {string} unit New gas price unit. The following variables can be used : 
     * `w.WEI`, `w.GWEI`, `w.MICROETHER`, `w.MILLIETHER`, `w.ETHER`.
     */
    setGasPriceUnit(unit) {
        this.gaspriceUnit = unit;
    }

    /**
     * Sets the block in which to perform all the next calls.
     * @param {String} block The block in which to perform all the next calls.
     */
    setBlockCall(block) {
        this.blockCall = block;
    }

    /**
     * Converts `value` from the unit set by `setValueUnit`. By default, the unit is `'ether'`.
     * @param {integer} value Value to convert
     * @returns The converted amount
     */
    _convertValue(value) {
        this._web3Assertion();
        return this.web3.utils.toWei(value.toString(), this.valueUnit);
    }

    /**
     * Converts `gas` from the unit set by `setGasPriceUnit`. By default, the unit is `'gwei'`.
     * @param {integer} value Gas to convert
     * @returns The converted amount
     */
    _convertGasPrice(gas) {
        this._web3Assertion();
        return this.web3.utils.toWei(gas.toString(), this.gasPriceUnit);
    }

    /**
     * Returns the nonce of an address (number of transactions if it is an EOA, number of contract deployed if it is a contract).
     * @param {string} account Address or its alias in `w-accounts.json` or in `w-contracts.json`
     * @returns {Promise} Nonce of the address.
     */
    async nonce(account) {
        this._web3Assertion();
        let accountAddress = this._aliasesHandler(account);
        assertRed(
            accountAddress,
            'Unknown alias (neither in `w-accounts.json` nor in `w-contracts.json`) or invalid address.'
            + '\nGiven : ' + account
        );
        return this.web3.eth.getTransactionCount(accountAddress);
    }

    /**
     * Prints the nonce of an address (number of transactions if it is an EOA, number of contract deployed if it is a contract).
     * @param {string} account Address or its alias in `w-accounts.json` or in `w-contracts.json`
     */
    printNonce(account) {
        this.nonce(account).then(console.log);
    }

    /**
     * @notice Returns the response of the call to a smart contract.
     * @param {string} contract Address of the contract or its alias in `w-contracts.json`
     * @param {string} functionName Name of the function to call
     * @param {string[][]} args Arguments to encode, as an array of `[type, value]` tuples.
     * If there is only one argument to encode, it can be `args = [type, value]`
     * @param {string[]} returns Types returned by the function. If not specified it won't decode the output
     * @param {string} from Address of the caller or his alias in `w-accounts.json` or in `w-contracts.json`
     * Can be `null` or `undefined`.
     * @returns {Promise} Response of the call
     */
    async call(contract, functionName, args, returns, from) {
        this._web3Assertion();
        let contractAddress = this._contractsAliasesHandler(contract);
        assertRed(
            contractAddress,
            'Unknown contract alias (not in `w-contracts.json`) or invalid address.'
            + '\nGiven : ' + contract
        );
        let options = {
            to: contractAddress,
            data: this._encodeData(functionName, args)
        };
        if (from) {
            let fromAddress = this._aliasesHandler(from);
            assertRed(
                fromAddress,
                'Unknown alias (neither in `w-accounts.json` nor in `w-contracts.json`) or invalid address.'
                + '\nGiven : ' + from
            );
            options.from = fromAddress;
        }
        if (this.recaps) {
            console.log(colorize('• Call options :', 'cyan'))
            console.log(options);
            console.log();
        }
        let encodedResult = await this.web3.eth.call(options, this.blockCall);
        return returns ? this._decode(encodedResult, returns) : encodedResult;
    }

    /**
     * @notice Prints the response of the call to the smart contract.
     * @param {string} contract Address of the contract or its alias in `w-contracts.json`.
     * @param {string} functionName Name of the function to call.
     * @param {string[][]} args Arguments to encode, as an array of `[type, value]` tuples.
     * If there is only one argument to encode, it can be `args = [type, value]`. Can be `null` or `undefined`.
     * @param {string[]} returns Types returned by the function. Can be `null` or `undefined`,
     * in which case it won't decode the output
     * @param {string} from Address of the caller or his alias in `w-accounts.json` or in `w-contracts.json`.
     * Can be `null` or `undefined`.
     */
    printCall(contract, functionName, args, returns, from) {
        this.call(contract, functionName, args, returns, from)
            .then((value) => {
                console.log(colorize('• Call result : ', 'cyan') + value);
            })
            .catch((err) => {
                console.log(colorize('✖ Error occured during the call : ', 'red') + err);
            });
    }

    /**
     * Create a transaction object, without signing it nor sending it.
     * @param {string} from Address of the sender or its alias in `w-accounts.json`. Its private key should also
     * be present in the file.
     * @param {string} to Address of the receiver or its alias in `w-contracts.json` or in `w-accounts.json`. 
     * @param {string} functionName Name of the function to call.
     * @param {string[][]} args Arguments to encode, as an array of `[type, value]` tuples.
     * If there is only one argument to encode, it can be `args = [type, value]`. Can be `null` or `undefined`.
     * @param {int} value Value to send to the function if it is `payable`. The value is unit set by the function
     * `w.setValueUnit()`, by default it is `'ether'`.
     * @param {int} gasLimit Gas limit to the transaction.
     * @param {int} gasPrice Gas price of the transaction. The value is unit set by the function
     * `w.setGasPriceUnit()`, by default it is `'gwei'`.
     * @param {int} nonce Nonce of the transaction. If not specified, the nonce is set so that the transaction
     * will be the next to be sent. If you want to set a relative nonce (to send the transaction after `x` transactions),
     * you can give as parameter `w.$rel(x)`.
     * @return {Object} Transaction object.
     */
    prepareTransaction(from, to, functionName, args, value, gasLimit, gasPrice, nonce) {
        this._accountsAssertion();
        let fromAccount = this.accounts[from];
        assertRed(
            fromAccount,
            'Unknown account alias (not in `w-accounts.json`).'
            + '\nGiven account alias: ' + from
        );
        assertRed(
            fromAccount.key,
            'Private key not set in `w-accounts.json` for the given alias.'
            + '\nGiven account alias: ' + from
        );
        let toAddress = this._aliasesHandler(to);
        assertRed(
            toAddress,
            'Unknown alias (neither in `w-accounts.json` nor in `w-contracts.json`) or invalid address.'
            + '\nGiven : ' + to
        );
        let transaction = {
            from: fromAccount,
            to: toAddress,
            gas: gasLimit
        };
        if (functionName) transaction.data = this._encodeData(functionName, args);
        if (value) transaction.value = this._convertValue(value);
        if (gasPrice) transaction.gasPrice = this._convertGasPrice(gasPrice);
        if (nonce) transaction.nonce = nonce;
        return transaction;
    }

    /**
     * Sends a transaction to a smart contact or an account address.
     * @param {string} from Alias of the sinder in `w-accounts.json`. Its private key should also
     * be present in the file.
     * @param {string} to Address of the receiver or its alias in `w-contracts.json` or in `w-accounts.json`. 
     * @param {string} functionName Name of the function to call. Can be `null` or `undefined`.
     * @param {string[][]} args Arguments to encode, as an array of `[type, value]` tuples.
     * If there is only one argument to encode, it can be `args = [type, value]`. Can be `null` or `undefined`.
     * @param {int} value Value to send to the function if it is `payable`. The value is unit set by the function
     * `w.setValueUnit()`, by default it is `'ether'`.
     * @param {int} gasLimit Gas limit to the transaction.
     * @param {int} gasPrice Gas price of the transaction. The value is unit set by the function
     * `w.setGasPriceUnit()`, by default it is `'gwei'`.
     * @param {int} nonce Nonce of the transaction. If not specified, the nonce is set so that the transaction
     * will be the next to be sent. If you want to set a relative nonce (to send the transaction after `x` transactions),
     * you can give as parameter `w.$rel(x)`.
     * @returns {Promise} Response of the signed transaction.
     */
    async send(from, to, functionName, args, value, gasLimit, gasPrice, nonce) {
        this._web3Assertion();
        this._accountsAssertion();
        let transaction = await this.prepareTransaction(from, to, functionName, args, value, gasLimit, gasPrice, nonce)
        let fromAccount = transaction.from;
        transaction = { ...transaction, from: fromAccount.address };

        let [isRel, decodedNonce] = this.#decode$rel(transaction.nonce);
        if (transaction.nonce) {
            if (isRel) {
                transaction.nonce = await this.nonce(transaction.from) + decodedNonce;
            } else {
                transaction.nonce = decodedNonce;
            }
        }

        let confirmation = true;
        if (this.recaps || this.confirmations) {
            console.log(colorize('• Transaction to be sent :', 'cyan'))
            console.log(transaction);
            console.log();
        }
        if (this.confirmations) {
            confirmation = await askConfirmation(
                colorize('\nDo you really want to make a `send` with these options (y/n) ? ', 'yellow')
            );
            console.log();
        }

        if (confirmation) {
            let signedTransaction = await this.web3.eth.accounts.signTransaction(transaction, fromAccount.key);
            let result = this.web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);
            if (this.receipts) {
                result
                    .then((receipt) => {
                        console.log(colorize('✔ Transaction succeed.', 'green'));
                        console.log(receipt);
                    })
                    .catch((err) => {
                        if (err.receipt) {
                            console.log(colorize('✖ Transaction reverted.', 'red'));
                            console.log(err.receipt);
                        } else {
                            console.log(err);
                        }
                    });
            }
            return result;
        } else {
            return Promise.reject(new Error('Send aborted by the user.'));
        }
    }

    /**
     * @notice Sends multiple transactions simultaneously. The nonces are ordered as the transactions
     * are ordered in the array.
     * @param {Object[]} transactions List of transactions to send created by `prepareTransaction()`.
     */
    async multiSend(preparedTransactions, resolves, rejects) {
        this._web3Assertion();
        this._accountsAssertion();

        let lastNonceByAddress = {};
        let currentNonceByAddress = {}
        let signedTransactions = []
        for (let i = 0; i < preparedTransactions.length; i++) {
            let transaction = preparedTransactions[i];
            let fromAccount = transaction.from;
            transaction.from = fromAccount.address;

            let [isRel, decodedNonce] = this.#decode$rel(transaction.nonce);
            if (transaction.nonce) {
                if (isRel) {
                    if (!currentNonceByAddress[transaction.from]) {
                        currentNonceByAddress[transaction.from] = await this.nonce(transaction.from)
                    }
                    transaction.nonce = currentNonceByAddress[transaction.from] + decodedNonce;
                } else {
                    transaction.nonce = decodedNonce;
                }
            } else {
                if (lastNonceByAddress[transaction.from]) {
                    transaction.nonce = lastNonceByAddress[transaction.from] + 1;
                } else {
                    if (!currentNonceByAddress[transaction.from]) {
                        currentNonceByAddress[transaction.from] = await this.nonce(transaction.from);
                    }
                    transaction.nonce = currentNonceByAddress[transaction.from]
                }

            }
            lastNonceByAddress[transaction.from] = transaction.nonce;
            signedTransactions[i] = await this.web3.eth.accounts.signTransaction(transaction, fromAccount.key);
        }

        let confirmation = true;
        if (this.recaps || this.confirmations) {
            for (let i = 0; i < preparedTransactions.length; i++) {
                console.log(colorize(`• Transaction n°${i + 1} to be sent :`, 'cyan'))
                console.log(preparedTransactions[i]);
                console.log();
            }
        }
        if (this.confirmations) {
            confirmation = await askConfirmation(
                colorize('\nDo you really want to make all these `send` with these options (y/n) ? ', 'yellow')
            );
            console.log();
        }

        if (confirmation) {
            for (let i = 0; i < signedTransactions.length; i++) {
                let resolve = resolves && resolves[i] ? resolves[i] : () => { };
                let reject = rejects && rejects[i] ? rejects[i] : () => { };
                this.web3.eth.sendSignedTransaction(signedTransactions[i].rawTransaction)
                    .then(resolve)
                    .catch(reject);
            }
        } else {
            return Promise.reject(new Error('Send aborted by the user.'));
        }
    }

    /**
     * Transfers ether or ERC20 token.
     * @param {string} from Alias of the sinder in `w-accounts.json`. Its private key should also
     * be present in the file.
     * @param {string} to Receiver address or alias.
     * @param {int} amount Amount transfered, in the unit set by setValueUnit
     * @param {string} token ERC20 contract address or alias of the token to be transfered. If it is not 
     * specified, it will transfer ether.
     * @return {Promise} Transaction result.
     */
    async transfer(from, to, amount, token) {
        let toAddress = this._aliasesHandler(to);
        if (token) {
            return this.send(
                from,
                token,
                'transfer',
                [['address', toAddress], ['uint256', this._convertValue(amount)]],
                null,
                100000,
                null
            );
        } else {
            return this.send(from, to, null, null, amount, 21000, null);
        }
    }

    /**
     * Returns the amount of ether or ERC20 token of an account.
     * @param {string} account Account to check.
     * @param {string} token ERC20 contract address or its alias alias in `w-contracts.json` to be transfered. If it is not 
     * specified, it will return the amount of ether.
     * @returns {Promise} Balance of the account.
     */
    async balance(account, token) {
        this._web3Assertion();
        let address = this._aliasesHandler(account);
        assertRed(
            address,
            'Unknown alias (neither in `w-accounts.json` nor in `w-contracts.json`) or invalid address.'
            + '\nGiven : ' + account
        );
        if (token) {
            return this.call(token, 'balanceOf', ['address', address], 'uint256');
        } else {
            return this.web3.eth.getBalance(address);
        }
    }

    /**
     * Prints the amount of ether or ERC20 token of an account.
     * @param {string} account Account to check.
     * @param {string} token ERC20 contract address or its alias alias in `w-contracts.json` to be transfered. If it is not 
     * specified, it will return the amount of ether.
     */
    printBalance(account, token) {
        this.balance(account, token).then((value) => {
            console.log(`${this.web3.utils.fromWei(value.toString(), this.valueUnit)} ${this.valueUnit}`);
        });
    }

    /** Deploys a contract.
     * @param {string} from Alias of the sender in `w-accounts.json`. Its private key should also
     * be present in the file.
     * @param {string} folders Folder in witch the contracts are located.
     * @param {string} contractName Name of the contract to be deployed.
     * @param {string} args Arguments of the constructor.
     * @param {string} optimization Number of runs of the optimizer.
     * @param {string} gasPrice Gas price of the transaction. The value is unit set by the function
     * `w.setGasPriceUnit()`, by default it is `'gwei'`.
     */
    async deploy(from, folders, contractName, args, optimization, gasPrice) {
        this._web3Assertion();
        this._accountsAssertion();

        let success = true;
        let filesPaths = []
        let input = {
            language: 'Solidity',
            sources: {},
            settings: { outputSelection: { '*': { '*': ['*'] } } }
        };
        if (optimization) {
            input.settings.optimizer = { runs: optimization };
        }

        for (let folder of folders) {
            for (let file of fs.readdirSync(folder)) {
                if (file.slice(-4) === '.sol') {
                    filesPaths.push(folder + file)
                }
            }
        }

        for (let i = 0; i < filesPaths.length; i++) {
            try {
                let data = fs.readFileSync(filesPaths[i], { encoding: 'utf8', flag: 'r' });
                let baseName = path.win32.basename(filesPaths[i]);
                if (baseName) {
                    input.sources[baseName] = { content: data };
                } else {
                    success = false;
                }
            } catch {
                console.log(colorize(`Unable to find ${filesPaths[i]}`, 'red'))
                success = false;
            }
        }

        assert(success);

        let output = JSON.parse(solc.compile(JSON.stringify(input)));

        if (output.errors) {
            for (let error of output.errors) {
                if (error.severity === 'warning') {
                    if (this.recaps) {
                        console.log(colorize(error.formattedMessage, 'yellow'));
                    }
                } else {
                    console.log(colorize(error.formattedMessage, 'red'));
                    success = false;
                }

            }
        }

        assertRed(success, 'Compilation failed.')
        let contractFile;

        for (let file in output.contracts) {
            for (let contract in output.contracts[file]) {
                if (contract === contractName) {
                    contractFile = file;
                    break;
                }
                if (contractFile) break;
            }
        }

        let outputContract = output.contracts[contractFile];
        let bytecode = outputContract[contractName].evm.bytecode.object;
        let abi = outputContract[contractName].abi;
        let contract = new this.web3.eth.Contract(abi);
        let transaction = contract.deploy({
            data: bytecode,
            arguments: args,
        });

        let fromAccount = this.accounts[from];
        assertRed(
            fromAccount,
            'Unknown account alias (not in `w-accounts.json`).'
            + '\nGiven : ' + from
        );

        let signedTransaction = await this.web3.eth.accounts.signTransaction({
            from: fromAccount.address,
            data: transaction.encodeABI(),
            gas: '8000000',
            gasPrice: this._convertGasPrice(gasPrice)
        }, fromAccount.key);

        let confirmation = true;
        if (this.recaps || this.confirmations) {
            console.log(colorize(`• Contract to be deployed :`, 'cyan'))
            console.log(input.sources[contractFile].content)
        }
        if (this.confirmations) {
            confirmation = await askConfirmation(
                colorize('\nDo you really want to deploy this contract (y/n) ? ', 'yellow')
            );
            console.log();
        }

        if (confirmation) {
            let result = this.web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);
            if (this.receipts) {
                result
                    .then((receipt) => {
                        console.log(colorize('✔ Contract deployed.', 'green'));
                        console.log(receipt);
                    })
                    .catch((err) => {
                        if (err.receipt) {
                            console.log(colorize('✖ Deployment reverted.', 'red'));
                            console.log(err.receipt);
                        } else {
                            console.log(err);
                        }
                    });
            }
            let receipt = await result;
            return receipt.contractAddress;
        } else {
            return Promise.reject(new Error('Send aborted by the user.'));
        }
    }

    /**
     * Returns the storage at an index of a contract.
     * @param {string} contract Contract address or its alias in `w-contracts.json`.
     * @param {int | string} slot Slot of the storage, as an integer or hexadecimal string.
     * @returns {Promise<string>} Value of the storage at the given index.
     */
    async storage(contract, slot, returns) {
        this._web3Assertion();
        let address = this._aliasesHandler(contract);
        assertRed(
            address,
            'Unknown alias (not in `w-contracts.json`) or invalid address.'
            + '\nGiven : ' + contract
        );
        let encodedResult = await this.web3.eth.getStorageAt(address, slot, this.blockCall);
        return returns ? this._decode(encodedResult, returns) : encodedResult;
    }

    /**
     * Prints the storage at an index of a contract.
     * @param {string} contract Contract address or its alias in `w-contracts.json`.
     * @param {int | string} slot Slot of the storage, as an integer or hexadecimal string.
     * @param {string[]} returns Types stored at the slot. If not specified it won't decode the output
     */
    async printStorage(contract, slot, returns) {
        this.storage(contract, slot, returns).then(console.log);
    }

    /**
     * Returns the keccak256 hash of the given input. 
     * @param {String} value Value to be hashed.
     * @returns {String} Keccak256 hash of the given input.
     */
    keccak256(value) {
        return this.web3.utils.soliditySha3(value);
    }

    /** 
     * Returns the storage index of a value in a mapping.
     * @param {int | string} slot Slot of the mapping, as an integer or hexadecimal string.
     * @param {string[]} key Key of the mapping, with the format `[type, value]`.
     * @returns {Promise<string>} The storage index of the value.
    */
    mappingValueSlot(slot, key) {
        return this.keccak256(
            this.web3.eth.abi.encodeParameters([key[0], 'uint256'], [key[1], slot])
        );
    }

    /**
     * Returns the value of a mapping at a given index for a given key.
     * @param {string} contract Contract address or its alias in `w-contracts.json`.
     * @param {int | string} slot Slot of the mapping, as an integer or hexadecimal string.
     * @param {*} key Key of the mapping, with the format `[type, value]`.
     * @returns {Promise<string>} Value of the mapping at the given index for the given key.
     */
    mappingValue(contract, slot, key, returns) {
        let storageAddress = this.mappingValueSlot(slot, key);
        return this.storage(contract, storageAddress, returns);
    }

    /**
     * Prints the value of a mapping at a given index for a given key.
     * @param {string} contract Contract address or its alias in `w-contracts.json`.
     * @param {int | string} slot Slot of the mapping, as an integer or hexadecimal string.
     * @param {*} key Key of the mapping, with the format `[type, value]`.
     */
    printMappingValue(contract, slot, key, returns) {
        this.mappingValue(contract, slot, key, returns).then(console.log);
    }

    /**
     * Returns the current block number.
     * @returns {Promise<int>} Number of the current block.
     */
    async currentBlock() {
        this._web3Assertion();
        return this.web3.eth.getBlockNumber();
    }

    /**
     * Prints the current block number.
     */
    async printCurrentBlock() {
        this.currentBlock().then(console.log);
    }

    $rel(nonce) {
        return "$rel" + nonce;
    }

    #decode$rel(encodedNonce) {
        let isRel = typeof encodedNonce === 'string' && encodedNonce.startsWith('$rel');
        return [isRel, parseInt(isRel ? encodedNonce.substring('$rel'.length) : encodedNonce)];
    }

    /**
     * Restores the public key of an account from a private key.
     * @param {string} privateKey Private key of the account.
     * @returns {string} Public key of the account.
     */
    publicKey(privateKey) {
        return this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
    }
}

module.exports = new W();