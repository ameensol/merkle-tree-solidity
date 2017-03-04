import { assert } from 'chai'
import p from 'es6-promisify'
import Web3 from 'web3'
import { sha3 } from 'ethereumjs-util'
import setup from './setup'
import MerkleTree, { checkProof, merkleRoot, checkProofSolidityFactory } from './merkle'


// TODO
// need better merkle tree
// upgrade solc for faster compiles?
// dedicated deploy scripts
// mocha async
// - http://staxmanade.com/2015/11/testing-asyncronous-code-with-mochajs-and-es7-async-await/

describe('MerkleTree', () => {
  it('empty', () => {
    assert.equal(merkleRoot([]), '')
    assert.equal(merkleRoot(['']), '')
  })

  it('multiple empty', () => {
    assert.equal(merkleRoot(['', '']), '')
  })

  it('elements must be 32 byte buffers', () => {
    const inputs = [
      makeString('x', 32),
      Buffer(makeString('x', 33)),
      '0x' + Buffer(makeString('x', 32)).toString('hex'),
      123
    ]

    inputs.forEach((input) => {
      try {
        merkleRoot([input])
        assert.ok(false)
      } catch (err) {
        assert.equal(err.message, 'elements must be 32 byte buffers')
      }
    })
  })

  it('single', () => {
    const hash_0 = sha3('x')
    assert.equal(merkleRoot([hash_0]), hash_0)
  })

  it('duplicates', () => {
    const hash_0 = sha3('x')
    const hash_1 = sha3('y')

    assert.equal(merkleRoot([hash_0, hash_0]), hash_0)

    const result_0 = merkleRoot([hash_0, hash_1, hash_0])
    const result_1 = merkleRoot([hash_0, hash_1])
    assert.ok(result_0.equals(result_1))
  })

  it('one', () => {
    const hash_0 = sha3('x')

    const merkleTree = new MerkleTree([hash_0])
    const proof = merkleTree.getProof(hash_0)
    const root = merkleTree.getRoot()

    assert.sameMembers(proof, [])
    assert.equal(root, hash_0)
    assert.ok(checkProof(proof, root, hash_0))
  })

  it('two', () => {
    const hash_0 = Buffer(makeString('a', 32))
    const hash_1 = Buffer(makeString('b', 32))

    const merkleTree = new MerkleTree([hash_0, hash_1])
    const proof0 = merkleTree.getProof(hash_0)
    const root = merkleTree.getRoot()

    assert.sameMembers(proof0, [hash_1])
    assert.ok(root.equals(sha3(hash_0 + hash_1)))
    assert.ok(checkProof(proof0, root, hash_0))

    const proof1 = merkleTree.getProof(hash_1)

    assert.sameMembers(proof1, [hash_0])
    assert.ok(checkProof(proof1, root, hash_1))
  })

  it('three', () => {
    const sortJoin = (first, second) => ''.join([first, second].sort())

    const hash_0 = Buffer(makeString('a', 32))
    const hash_1 = Buffer(makeString('b', 32))
    const hash_2 = Buffer(makeString('c', 32))

    const hash_01 = Buffer('6d65ef9ca93d3516a4d38ab7d989c2b500e2fc89ccdcf878f9c46daaf6ad0d5b', 'hex')

    assert.ok(sha3(hash_0 + hash_1).equals(hash_01))

    const calculatedRoot = sha3(hash_2 + hash_01)

    const merkleTree = new MerkleTree([hash_0, hash_1, hash_2])
    const proof0 = merkleTree.getProof(hash_0)
    const root = merkleTree.getRoot()

    assert.sameMembers(proof0, [hash_1, hash_2])
    assert.ok(root.equals(calculatedRoot))
    assert.ok(checkProof(proof0, root, hash_0))

    const proof1 = merkleTree.getProof(hash_1)

    assert.sameMembers(proof1, [hash_0, hash_2])
    assert.ok(checkProof(proof1, root, hash_1))

    const proof2 = merkleTree.getProof(hash_2)

    assert.ok(proof2[0].equals(hash_01))
    assert.ok(checkProof(proof2, root, hash_2))
  })

  it('many', () => {
    const many = 10

    for (let i = 1; i <= many; i++) {
      let elements = range(i).map(e => sha3(e))
      let merkleTree = new MerkleTree(elements)
      let root = merkleTree.getRoot()

      elements.forEach((element) => {
        let proof = merkleTree.getProof(element)
        assert.ok(checkProof(proof, root, element))
      })

      const reverseTree = new MerkleTree(elements.reverse())
      assert.ok(root.equals(reverseTree.getRoot()))
    }
  })
})

describe('solidity', async () => {

  let merkleProof, eth, accounts, web3
  let checkProofSolidity

  before(async () => {
    let result = await setup()
    merkleProof = result.merkleProof
    eth = result.eth
    accounts = result.accounts
    web3 = result.web3
    checkProofSolidity = checkProofSolidityFactory(merkleProof.checkProof)
  })

  it('checkProof - two', async () => {
    const hash_0 = Buffer(makeString('a', 32))
    const hash_1 = Buffer(makeString('b', 32))

    const merkleTree = new MerkleTree([hash_0, hash_1])
    const root = merkleTree.getRoot()
    const proof0 = merkleTree.getProof(hash_0)

    assert.sameMembers(proof0, [hash_1])
    assert.ok(root.equals(sha3(hash_0 + hash_1)))
    assert.ok(checkProof(proof0, root, hash_0))
    assert.ok((await checkProofSolidity(proof0, root, hash_0))[0])

    const proof1 = merkleTree.getProof(hash_1)

    assert.sameMembers(proof1, [hash_0])
    assert.ok(checkProof(proof1, root, hash_1))
    assert.ok((await checkProofSolidity(proof1, root, hash_1))[0])
  })

  it('checkProof - two fails', async () => {
    const hash_0 = Buffer(makeString('a', 32))
    const hash_1 = Buffer(makeString('b', 32))

    const merkleTree = new MerkleTree([hash_0, hash_1])
    const root = merkleTree.getRoot()
    const proof0 = merkleTree.getProof(hash_1) // switched hashes

    assert.sameMembers(proof0, [hash_0])
    assert.ok(root.equals(sha3(hash_0 + hash_1)))
    assert.notOk(checkProof(proof0, root, hash_0))
    assert.notOk((await checkProofSolidity(proof0, root, hash_0))[0])
  })

  it('checkProof - many', async () => {
    const many = 10

    for (let i = 1; i <= many; i++) {
      let elements = range(i).map(e => sha3(e))
      let merkleTree = new MerkleTree(elements)
      let root = merkleTree.getRoot()

      elements.forEach(async (element) => {
        let proof = merkleTree.getProof(element)
        assert.ok(checkProof(proof, root, element))
        assert.ok((await checkProofSolidity(proof, root, element))[0])
      })

      const reverseTree = new MerkleTree(elements.reverse())
      assert.ok(root.equals(reverseTree.getRoot()))
    }
  })
})

function makeString(char, length) {
  let string = ''
  for (let i=0; i < length; i++) {
    string += char
  }
  return string
}

function range(max) {
  const arr = []
  for (let i = 0; i < max; i++) {
    arr.push(i + 1)
  }
  return arr
}
