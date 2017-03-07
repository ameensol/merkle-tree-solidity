// https://github.com/raiden-network/raiden/blob/master/raiden/mtree.py
// Create a merkle root from a list of elements
// Elements are assumed to be 32 bytes hashes (Buffers)
//  (but may be expressed as 0x prefixed hex strings of length 66)
// The bottom layer of the tree (leaf nodes) are the elements
// All layers above are combined hashes of the element pairs
// When combining hashes, we respect character ordering
// If an element in a pair doesn't exist (because odd), keep that element in
//  the next layer

// The MerkleTree is a 2d array of layers
// [ elements, combinedHashes1, combinedHashes2, ... root]
// root is a length 1 array

import { sha3 } from 'ethereumjs-util'

// Expects elements to be Buffers of length 32
// empty string elements will be removed prior to the buffer check
function MerkleTree(elements) {
  this.elements = Array.from(new Set(elements.filter(a => a).sort()))
  if (this.elements.some((e) => !(e.length == 32 && Buffer.isBuffer(e)))) {
    throw new Error('elements must be 32 byte buffers')
  }
  this.layers = getLayers(this.elements)
  return this
}

MerkleTree.prototype.getRoot = function() {
  return this.layers[this.layers.length - 1][0]
}

MerkleTree.prototype.getProof = function(element) {
  const index = this.elements.indexOf(element)
  if (index == -1) {
    throw new Error('element not found in merkle tree')
  }
  return getProof(index, this.layers)
}

const checkProof = function(proof, root, element) {
  return root.equals(proof.reduce((hash, pair) => {
    return combinedHash(hash, pair)
  }, element))
}

const merkleRoot = function(elements) {
  return (new MerkleTree(elements)).getRoot()
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

export default MerkleTree
export { checkProof, merkleRoot, checkProofSolidityFactory }

function combinedHash(first, second) {
  if (!second) { return first }
  if (!first) { return second }
  return sha3(Buffer.concat([first, second].sort(Buffer.compare)))
}

function getNextLayer(elements) {
  return elements.reduce((layer, element, index, arr) => {
    if (index % 2 == 0) { layer.push(combinedHash(element, arr[index + 1])) }
    return layer
  }, [])
}

function getLayers(elements) {
  if (elements.length == 0) {
    return [['']]
  }
  const layers = []
  layers.push(elements)
  while (layers[layers.length - 1].length > 1) {
    layers.push(getNextLayer(layers[layers.length - 1]))
  }
  return layers
}

function getProof(index, layers) {
  return layers.reduce((proof, layer) => {
    let pair = getPair(index, layer)
    if (pair) { proof.push(pair) }
    index = Math.floor(index / 2)
    return proof
  }, [])
}

function getPair(index, layer) {
  let pairIndex = index % 2 ? index - 1 : index + 1
  if (pairIndex < layer.length) {
    return layer[pairIndex]
  } else {
    return null
  }
}

function bufToHex(element) {
  return Buffer.isBuffer(element) ? '0x' + element.toString('hex') : element
}

