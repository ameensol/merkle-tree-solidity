pragma solidity ^0.4.7;

contract MerkleProof {

  function checkProof(bytes proof, bytes32 root, bytes32 hash) public pure returns (bool) {
    bytes32 el;
    bytes32 h = hash;

    for (uint256 i = 32; i <= proof.length; i += 32) {
        assembly {
            el := mload(add(proof, i))
        }

        if (h < el) {
            h = keccak256(abi.encodePacked(h, el));
        } else {
            h = keccak256(abi.encodePacked(el, h));
        }
    }

    return h == root;
  }

  // from StorJ -- https://github.com/nginnever/storj-audit-verifier/blob/master/contracts/MerkleVerifyv3.sol
  function checkProofOrdered(
    bytes proof, bytes32 root, bytes32 hash, uint256 index
  )  public pure returns (bool) {
    // use the index to determine the node ordering
    // index ranges 1 to n

    bytes32 el;
    bytes32 h = hash;
    uint256 remaining;

    for (uint256 j = 32; j <= proof.length; j += 32) {
      assembly {
        el := mload(add(proof, j))
      }

      // calculate remaining elements in proof
      remaining = (proof.length - j + 32) / 32;

      // we don't assume that the tree is padded to a power of 2
      // if the index is odd then the proof will start with a hash at a higher
      // layer, so we have to adjust the index to be the index at that layer
      while (remaining > 0 && index % 2 == 1 && index > 2 ** remaining) {
        index = uint(index) / 2 + 1;
      }

      if (index % 2 == 0) {
        h = keccak256(abi.encodePacked(el, h));
        index = index / 2;
      } else {
        h = keccak256(abi.encodePacked(h, el));
        index = uint(index) / 2 + 1;
      }
    }

    return h == root;
  }
}
