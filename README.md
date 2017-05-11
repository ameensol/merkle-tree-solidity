## merkle-tree-solidity

JS - Solidity sha3 merkle tree bridge. Generate proofs in JS; verify in Solidity.

## Install

```
npm install --save merkle-tree-solidity
```

## Credit

This is partly a port of Raiden's merkle tree python module and the solidity code is
a close copy.

Merkle Tree
https://github.com/raiden-network/raiden/blob/master/raiden/mtree.py

Solidity
https://github.com/raiden-network/raiden/blob/master/raiden/smart_contracts/NettingChannelLibrary.sol

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

By default, generating the tree doesn't preserve leaf order, but we can
optionally do so.

```js
import MerkleTree, { checkProofOrdered, merkleRoot, checkProofOrderedSolidityFactory } from 'merkle-tree-solidity'
import { sha3 } from 'ethereumjs-util'

// create merkle tree
// expects 32 byte buffers as inputs (no hex strings)
// if using web3.sha3, convert first -> Buffer(web3.sha3('a'), 'hex')
const elements = [1, 2, 3].map(e => sha3(e))

// include the 'true' flag when generating the merkle tree
const merkleTree = new MerkleTree(elements, true)

// [same as above]
// get the merkle root
// returns 32 byte buffer
const root = merkleTree.getRoot()

// [same as above]
// get the merkle root
// generate merkle proof
// returns array of 32 byte buffers
const proof = merkleTree.getProof(elements[0])

// check merkle proof of ordered tree in JS
// expects 1-n indexed element position as last param
// returns bool
const index = 1
checkProofOrdered(proof, root, elements[0], index)

// create the contract abstraction
const merkleProof = await deployMerkleProofContract()

// then use the contract directly
// but the contract requires hex prefixed strings, not buffers
merkleProof.checkProofOrdered(proof, root, hash, index) // -> throws

// or create a helper function from the abstraction
// this function converts the buffers to hex prefixed strings
const checkProofOrderedSolidity = checkProofSolidityOrderedFactory(merkleProof.checkProofOrdered)

// check merkle proof in Solidity
// we can now safely pass in the buffers returned by previous methods
await checkProofOrderedSolidity(proof, root, elements[0], index) // -> true
```

## Licence

This project is licensed under the MIT license, Copyright (c) 2016 Ameen Soleimani
