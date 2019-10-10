// https://github.com/raiden-network/raiden/blob/master/raiden/mtree.py
// Create a merkle root from a list of elements
// Elements are assumed to be 32 bytes hashes (Buffers)
//  (but may be expressed as 0x prefixed hex strings of length 66)
// The bottom layer of the tree (leaf nodes) are the elements
// All layers above are combined hashes of the element pairs

// Two strategies for creating tree and checking proofs (preserveOrder flag)
// 1. raiden - sort the leaves of the tree, and also sort each pair of
//    pre-images, which allows you to verify the proof without the index
// 2. storj - preserve the order of the leaves and pairs of pre-images, and use
//    the index to verify the proof

// The MerkleTree is a 2d array of layers
// [ elements, combinedHashes1, combinedHashes2, ... root]
// root is a length 1 array

import { keccak256 } from 'ethereumjs-util'

// Expects elements to be Buffers of length 32
// Empty string elements will be removed prior to the buffer check
// by default, order is not preserved
function MerkleTree(elements, preserveOrder) {
  if (!(this instanceof MerkleTree)) {
    return new MerkleTree(elements, preserveOrder)
  }

  // remove empty strings
  this.elements = elements.filter(a => a)

  // check buffers
  if (this.elements.some((e) => !(e.length == 32 && Buffer.isBuffer(e)))) {
    throw new Error('elements must be 32 byte buffers')
  }

  // if we are not preserving order, dedup and sort
  this.preserveOrder = !!preserveOrder
  if (!this.preserveOrder) {
    this.elements = bufDedup(this.elements)
    this.elements.sort(Buffer.compare)
  }

  this.layers = getLayers(this.elements, this.preserveOrder)
}

MerkleTree.prototype.getRoot = function() {
  return this.layers[this.layers.length - 1][0]
}

MerkleTree.prototype.getProof = function(element, hex) {
  const index = getBufIndex(element, this.elements)
  if (index == -1) {
    throw new Error('element not found in merkle tree')
  }
  return getProof(index, this.layers, hex)
}

// Expects 1-n index, converts it to 0-n index internally
MerkleTree.prototype.getProofOrdered = function(element, index, hex) {
  if (!(element.equals(this.elements[index - 1]))) {
    throw new Error('element does not match leaf at index in tree')
  }
  return getProof(index - 1, this.layers, hex)
}

const checkProofOrdered = function(proof, root, element, index) {
  // use the index to determine the node ordering
  // index ranges 1 to n

  let tempHash = element

  for (let i = 0; i < proof.length; i++) {
    let remaining = proof.length - i

    // we don't assume that the tree is padded to a power of 2
    // if the index is odd then the proof will start with a hash at a higher
    // layer, so we have to adjust the index to be the index at that layer
    while (remaining && index % 2 === 1 && index > Math.pow(2, remaining)) {
      index = Math.round(index / 2)
    }

    if (index % 2 === 0) {
      tempHash = combinedHash(proof[i], tempHash, true)
    } else {
      tempHash = combinedHash(tempHash, proof[i], true)
    }
    index = Math.round(index / 2)
  }

  return tempHash.equals(root)
}

const checkProof = function(proof, root, element) {
  return root.equals(proof.reduce((hash, pair) => {
    return combinedHash(hash, pair)
  }, element))
}

const merkleRoot = function(elements, preserveOrder) {
  return (new MerkleTree(elements, preserveOrder)).getRoot()
}

// converts buffers from MerkleRoot functions into hex strings
// merkleProof is the contract abstraction for MerkleProof.sol
const checkProofSolidityFactory = function(checkProofContractMethod) {
  return function(proof, root, hash) {
    proof = '0x' + proof.map(e => e.toString('hex')).join('')
    root = bufToHex(root)
    hash = bufToHex(hash)
    return checkProofContractMethod(proof, root, hash)
  }
}

const checkProofOrderedSolidityFactory = function(checkProofOrderedContractMethod) {
  return function(proof, root, hash, index) {
    proof = '0x' + proof.map(e => e.toString('hex')).join('')
    root = bufToHex(root)
    hash = bufToHex(hash)
    return checkProofOrderedContractMethod(proof, root, hash, index)
  }
}

export default MerkleTree
export { checkProof, checkProofOrdered, merkleRoot, checkProofSolidityFactory,
  checkProofOrderedSolidityFactory
}

function combinedHash(first, second, preserveOrder) {
  if (!second) { return first }
  if (!first) { return second }
  if (preserveOrder) {
    return keccak256(bufJoin(first, second))
  } else {
    return keccak256(bufSortJoin(first, second))
  }
}

function getNextLayer(elements, preserveOrder) {
  return elements.reduce((layer, element, index, arr) => {
    if (index % 2 == 0) { layer.push(combinedHash(element, arr[index + 1], preserveOrder)) }
    return layer
  }, [])
}

function getLayers(elements, preserveOrder) {
  if (elements.length == 0) {
    return [['']]
  }
  const layers = []
  layers.push(elements)
  while (layers[layers.length - 1].length > 1) {
    layers.push(getNextLayer(layers[layers.length - 1], preserveOrder))
  }
  return layers
}

function getProof(index, layers, hex) {
  const proof = layers.reduce((proof, layer) => {
    let pair = getPair(index, layer)
    if (pair) { proof.push(pair) }
    index = Math.floor(index / 2)
    return proof
  }, [])
  if (hex) {
    return '0x' + proof.map(e => e.toString('hex')).join('')
  } else {
    return proof
  }
}

function getPair(index, layer) {
  let pairIndex = index % 2 ? index - 1 : index + 1
  if (pairIndex < layer.length) {
    return layer[pairIndex]
  } else {
    return null
  }
}

function getBufIndex(element, array) {
  for (let i = 0; i < array.length; i++) {
    if (element.equals(array[i])) { return i }
  }
  return -1
}

function bufToHex(element) {
  return Buffer.isBuffer(element) ? '0x' + element.toString('hex') : element
}

function bufJoin(...args) {
  return Buffer.concat([...args])
}

function bufSortJoin(...args) {
  return Buffer.concat([...args].sort(Buffer.compare))
}

function bufDedup(buffers) {
  return buffers.filter((buffer, i) => {
    return getBufIndex(buffer, buffers) == i
  })
}
