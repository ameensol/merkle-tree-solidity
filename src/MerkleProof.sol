pragma solidity ^0.4.7;

contract MerkleProof {
  function checkProof(bytes merkleProof, bytes32 root, bytes32 hash) constant returns (bool) {
    bytes32 el;
    bytes32 h = hash;

    for (uint256 i = 32; i <= merkleProof.length; i += 32) {
        assembly {
            el := mload(add(merkleProof, i))
        }

        if (h < el) {
            h = sha3(h, el);
        } else {
            h = sha3(el, h);
        }
    }

    return h == root;
  }
}

