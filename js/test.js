import { assert } from 'chai'
import p from 'es6-promisify'
import Web3 from 'web3'
import { keccak256 } from 'ethereumjs-util'
import setup from './setup'
import MerkleTree, { checkProof, checkProofOrdered,
  merkleRoot, checkProofSolidityFactory, checkProofOrderedSolidityFactory
} from '../index'
// import MerkleTree, { checkProof, checkProofOrdered,
//   merkleRoot, checkProofSolidityFactory, checkProofOrderedSolidityFactory
// } from './merkle'

describe('MerkleTree -- no preserving order', () => {
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
        assert.isTrue(false)
      } catch (err) {
        assert.equal(err.message, 'elements must be 32 byte buffers')
      }
    })
  })

  it('single', () => {
    const hash_0 = keccak256('x')
    assert.equal(merkleRoot([hash_0]), hash_0)
  })

  it('duplicates', () => {
    const hash_0 = keccak256('x')
    const hash_1 = keccak256('y')

    assert.equal(merkleRoot([hash_0, hash_0]), hash_0)

    const result_0 = merkleRoot([hash_0, hash_1, hash_0])
    const result_1 = merkleRoot([hash_0, hash_1])
    assert.isTrue(result_0.equals(result_1))
  })

  it('duplicates -- with different buffer objects', () => {
    const hash_0 = keccak256('x')
    const hash_0_dup = keccak256('x')
    const hash_1 = keccak256('y')

    assert.equal(merkleRoot([hash_0, hash_0_dup]), hash_0)

    const result_0 = merkleRoot([hash_0, hash_1, hash_0_dup])
    const result_1 = merkleRoot([hash_0, hash_1])
    assert.isTrue(result_0.equals(result_1))
  })

  it('one', () => {
    const hash_0 = keccak256('x')

    const merkleTree = new MerkleTree([hash_0])
    const proof = merkleTree.getProof(hash_0)
    const root = merkleTree.getRoot()

    assert.sameMembers(proof, [])
    assert.equal(root, hash_0)
    assert.isTrue(checkProof(proof, root, hash_0))
  })

  it('one -- different element object', () => {
    // this test is here because getProof was doing an indexOf deep equality
    // search to determine if the element was in the tree
    // it should still work with different but equal buffer objects
    const hash_0 = keccak256('x')
    const hash_0_dup = keccak256('x')

    const merkleTree = new MerkleTree([hash_0])
    const proof = merkleTree.getProof(hash_0_dup)
    const root = merkleTree.getRoot()

    assert.sameMembers(proof, [])
    assert.equal(root, hash_0)
    assert.isTrue(checkProof(proof, root, hash_0))
  })

  it('two', () => {
    const hash_0 = Buffer(makeString('a', 32))
    const hash_1 = Buffer(makeString('b', 32))

    const merkleTree = new MerkleTree([hash_0, hash_1])
    const proof0 = merkleTree.getProof(hash_0)
    const root = merkleTree.getRoot()

    assert.sameMembers(proof0, [hash_1])
    assert.isTrue(root.equals(keccak256(bufSortJoin(hash_0, hash_1))))
    assert.isTrue(checkProof(proof0, root, hash_0))

    const proof1 = merkleTree.getProof(hash_1)

    assert.sameMembers(proof1, [hash_0])
    assert.isTrue(checkProof(proof1, root, hash_1))
  })

  it('three', () => {
    const hash_0 = Buffer(makeString('a', 32))
    const hash_1 = Buffer(makeString('b', 32))
    const hash_2 = Buffer(makeString('c', 32))

    const hash_01 = Buffer('6d65ef9ca93d3516a4d38ab7d989c2b500e2fc89ccdcf878f9c46daaf6ad0d5b', 'hex')

    const calculated_01 = keccak256(bufSortJoin(hash_0, hash_1))
    assert.isTrue(calculated_01.equals(hash_01))

    const calculatedRoot = keccak256(bufSortJoin(hash_01, hash_2))

    const merkleTree = new MerkleTree([hash_0, hash_1, hash_2])
    const proof0 = merkleTree.getProof(hash_0)
    const root = merkleTree.getRoot()

    assert.sameMembers(proof0, [hash_1, hash_2])
    assert.isTrue(root.equals(calculatedRoot))
    assert.isTrue(checkProof(proof0, root, hash_0))

    const proof1 = merkleTree.getProof(hash_1)

    assert.sameMembers(proof1, [hash_0, hash_2])
    assert.isTrue(checkProof(proof1, root, hash_1))

    const proof2 = merkleTree.getProof(hash_2)

    assert.isTrue(proof2[0].equals(hash_01))
    assert.isTrue(checkProof(proof2, root, hash_2))
  })

  it('many', () => {
    const many = 10

    for (let i = 1; i <= many; i++) {
      let elements = range(i).map(e => keccak256(e))
      let merkleTree = new MerkleTree(elements)
      let root = merkleTree.getRoot()

      elements.forEach((element) => {
        let proof = merkleTree.getProof(element)
        assert.isTrue(checkProof(proof, root, element))
      })

      const reverseTree = new MerkleTree(elements.reverse())
      assert.isTrue(root.equals(reverseTree.getRoot()))
    }
  })
})

describe('MerkleTree [preserve order]', () => {
  it('two', () => {
    const hash_0 = Buffer(makeString('a', 32))
    const hash_1 = Buffer(makeString('b', 32))

    const merkleTree = new MerkleTree([hash_0, hash_1], true)
    const proof0 = merkleTree.getProof(hash_0)
    const root = merkleTree.getRoot()

    assert.sameMembers(proof0, [hash_1])
    assert.isTrue(root.equals(keccak256(bufJoin(hash_0, hash_1))))
    assert.isTrue(checkProofOrdered(proof0, root, hash_0, 1))

    const proof1 = merkleTree.getProof(hash_1)

    assert.sameMembers(proof1, [hash_0])
    assert.isTrue(checkProofOrdered(proof1, root, hash_1, 2))
  })

  it('three', () => {
    const hash_0 = Buffer(makeString('a', 32))
    const hash_1 = Buffer(makeString('b', 32))
    const hash_2 = Buffer(makeString('c', 32))

    const hash_01 = Buffer('6d65ef9ca93d3516a4d38ab7d989c2b500e2fc89ccdcf878f9c46daaf6ad0d5b', 'hex')

    const calculated_01 = keccak256(bufJoin(hash_0, hash_1))
    assert.isTrue(calculated_01.equals(hash_01))

    const calculatedRoot = keccak256(bufJoin(hash_01, hash_2))

    const merkleTree = new MerkleTree([hash_0, hash_1, hash_2], true)
    const proof0 = merkleTree.getProof(hash_0)
    const root = merkleTree.getRoot()

    assert.sameMembers(proof0, [hash_1, hash_2])
    assert.isTrue(root.equals(calculatedRoot))
    assert.isTrue(checkProofOrdered(proof0, root, hash_0, 1))

    const proof1 = merkleTree.getProof(hash_1)

    assert.sameMembers(proof1, [hash_0, hash_2])
    assert.isTrue(checkProofOrdered(proof1, root, hash_1, 2))

    const proof2 = merkleTree.getProof(hash_2)

    assert.isTrue(proof2[0].equals(hash_01))
    assert.isTrue(checkProofOrdered(proof2, root, hash_2, 3))
  })

  it('three -- duplicates are preserved', () => {
    const hash_0 = Buffer(makeString('a', 32))
    const hash_1 = Buffer(makeString('b', 32))
    const hash_2 = Buffer(makeString('a', 32))

    const hash_01 = Buffer('6d65ef9ca93d3516a4d38ab7d989c2b500e2fc89ccdcf878f9c46daaf6ad0d5b', 'hex')

    const calculated_01 = keccak256(bufJoin(hash_0, hash_1))
    assert.isTrue(calculated_01.equals(hash_01))

    const calculatedRoot = keccak256(bufJoin(hash_01, hash_2))

    const merkleTree = new MerkleTree([hash_0, hash_1, hash_2], true)
    const proof0 = merkleTree.getProofOrdered(hash_0, 1)
    const root = merkleTree.getRoot()

    assert.sameMembers(proof0, [hash_1, hash_2])
    assert.isTrue(root.equals(calculatedRoot))
    assert.isTrue(checkProofOrdered(proof0, root, hash_0, 1))

    const proof1 = merkleTree.getProofOrdered(hash_1, 2)

    assert.sameMembers(proof1, [hash_0, hash_2])
    assert.isTrue(checkProofOrdered(proof1, root, hash_1, 2))

    const proof2 = merkleTree.getProofOrdered(hash_2, 3)

    assert.isTrue(proof2[0].equals(hash_01))
    assert.isTrue(checkProofOrdered(proof2, root, hash_2, 3))
  })

  it('many', () => {
    const many = 10

    for (let i = 1; i <= many; i++) {
      let elements = range(i).map(e => keccak256(e))
      let merkleTree = new MerkleTree(elements, true)
      let root = merkleTree.getRoot()

      elements.forEach((element, index) => {
        let proof = merkleTree.getProofOrdered(element, index+1)
        assert.isTrue(checkProofOrdered(proof, root, element, index+1))
      })
    }
  })

  it('many -- with duplicates', () => {
    const many = 10

    for (let i = 1; i <= many; i++) {
      let elements = range(i).map(e => keccak256(e % 5))
      let merkleTree = new MerkleTree(elements, true)
      let root = merkleTree.getRoot()

      elements.forEach((element, index) => {
        let proof = merkleTree.getProofOrdered(element, index+1)
        assert.isTrue(checkProofOrdered(proof, root, element, index+1))
      })
    }
  })
})

describe('solidity -- checkProof', async () => {

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
    assert.isTrue(root.equals(keccak256(hash_0 + hash_1)))
    assert.isTrue(checkProof(proof0, root, hash_0))
    assert.isTrue((await checkProofSolidity(proof0, root, hash_0))[0])

    const proof1 = merkleTree.getProof(hash_1)

    assert.sameMembers(proof1, [hash_0])
    assert.isTrue(checkProof(proof1, root, hash_1))
    assert.isTrue((await checkProofSolidity(proof1, root, hash_1))[0])
  })

  it('checkProof - two fails', async () => {
    const hash_0 = Buffer(makeString('a', 32))
    const hash_1 = Buffer(makeString('b', 32))

    const merkleTree = new MerkleTree([hash_0, hash_1])
    const root = merkleTree.getRoot()
    const proof0 = merkleTree.getProof(hash_1) // switched hashes

    assert.sameMembers(proof0, [hash_0])
    assert.isTrue(root.equals(keccak256(hash_0 + hash_1)))
    assert.isFalse(checkProof(proof0, root, hash_0))
    assert.isFalse((await checkProofSolidity(proof0, root, hash_0))[0])
  })

  it('checkProof - many', async () => {
    const many = 10

    for (let i = 1; i <= many; i++) {
      let elements = range(i).map(e => keccak256(e))
      elements.sort(Buffer.compare)
      let merkleTree = new MerkleTree(elements)
      let root = merkleTree.getRoot()

      for (let element of elements) {
        let proof = merkleTree.getProof(element)
        assert.isTrue(checkProof(proof, root, element))
        assert.isTrue((await checkProofSolidity(proof, root, element))[0])
      }

      const reverseTree = new MerkleTree(elements.reverse())
      assert.isTrue(root.equals(reverseTree.getRoot()))
    }
  })
})

describe('solidity -- checkProofOrdered', async () => {

  let merkleProof, eth, accounts, web3
  let checkProofSolidity

  before(async () => {
    let result = await setup()
    merkleProof = result.merkleProof
    eth = result.eth
    accounts = result.accounts
    web3 = result.web3
    checkProofSolidity = checkProofOrderedSolidityFactory(merkleProof.checkProofOrdered)
  })

  it('checkProof - two', async () => {

    const hash_0 = Buffer(makeString('a', 32))
    const hash_1 = Buffer(makeString('b', 32))

    const merkleTree = new MerkleTree([hash_0, hash_1], true)
    const root = merkleTree.getRoot()
    const proof0 = merkleTree.getProof(hash_0)

    assert.sameMembers(proof0, [hash_1])
    assert.isTrue(root.equals(keccak256(hash_0 + hash_1)))
    assert.isTrue(checkProof(proof0, root, hash_0))
    assert.isTrue((await checkProofSolidity(proof0, root, hash_0, 1))[0])

    const proof1 = merkleTree.getProof(hash_1)

    assert.sameMembers(proof1, [hash_0])
    assert.isTrue(checkProof(proof1, root, hash_1))
    assert.isTrue((await checkProofSolidity(proof1, root, hash_1, 2))[0])
  })

  it('checkProof - two fails', async () => {
    const hash_0 = Buffer(makeString('a', 32))
    const hash_1 = Buffer(makeString('b', 32))

    const merkleTree = new MerkleTree([hash_0, hash_1], true)
    const root = merkleTree.getRoot()
    const proof0 = merkleTree.getProof(hash_1) // switched hashes

    assert.sameMembers(proof0, [hash_0])
    assert.isTrue(root.equals(keccak256(hash_0 + hash_1)))
    assert.isFalse(checkProof(proof0, root, hash_0))
    assert.isFalse((await checkProofSolidity(proof0, root, hash_0, 1))[0])
  })

  it('checkProof - many', async () => {
    const many = 10

    for (let i = 1; i <= many; i++) {
      let elements = range(i).map(e => keccak256(e))
      elements.sort(Buffer.compare)
      let merkleTree = new MerkleTree(elements, true)
      let root = merkleTree.getRoot()

      for (let index = 0; index < elements.length; index++) {
        let element = elements[index]
        let proof = merkleTree.getProof(element)
        assert.isTrue(checkProofOrdered(proof, root, element, index+1))
        assert.isTrue((await checkProofSolidity(proof, root, element, index+1))[0])
      }
    }
  })
})

function bufJoin(...args) {
  return Buffer.concat([...args])
}

function bufSortJoin(...args) {
  return Buffer.concat([...args].sort(Buffer.compare))
}

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
