## ethjs-util

JS - Solidity sha3 merkle tree bridge. Generate proofs in JS; verify in Solidity.

## Install

```
npm install --save merkle-tree-solidity
```

## Credit

This is a port of Raiden's merkle tree python module and the solidity code is
a close copy.

Merkle Tree
https://github.com/raiden-network/raiden/blob/master/raiden/mtree.py

Solidity
https://github.com/raiden-network/raiden/blob/master/raiden/smart_contracts/NettingChannelLibrary.sol#L356-L370

## Usage

```js
import MerkleTree, { checkProof, merkleRoot, checkProofSolidityFactory } from 'merkle-tree-solidity'
import { sha3 } from 'ethereumjs-util'

// create merkle tree
// expects 32 byte buffers as inputs (no hex strings)
// if using web3.sha3, convert first -> Buffer(web3.sha3('a'), 'hex')
const elements = [1, 2, 3].map(e => sha3(e))
const merkleTree = new MerkleTree(elements)

// get the merkle root
// returns 32 byte buffer
const root = merkleTree.getRoot()

// for convenience if only the root is desired
// this creates a new MerkleTree under the hood
const easyRoot = merkleRoot(elements)

// generate merkle proof
// returns array of 32 byte buffers
const proof = merkleTree.getProof(elements[0])

// check merkle proof in JS
// returns bool
checkProof(proof, root, elements[0])

// create the contract abstraction
const merkleProof = await deployMerkleProofContract()

// then use the contract directly
// but the contract requires hex prefixed strings, not buffers
merkleProof.checkProof(proof, root, hash) // -> throws

// or create a helper function from the abstraction
// this function converts the buffers to hex prefixed strings
const checkProofSolidity = checkProofSolidityFactory(merkleProof.checkProof)

// check merkle proof in Solidity
// we can now safely pass in the buffers returned by previous methods
await checkProofSolidity(proof, root, elements[0]) // -> true

```

## Licence

This project is licensed under the MIT license, Copyright (c) 2016 Ameen Soleimani
