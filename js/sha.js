var sha3 = require('ethereumjs-util').sha3

var es = [ '0x5fe7f977e71dba2ea1a68e21057beebb9be2ac30c6410aa38d4f3fbe41dcffd2',
  '0xf2ee15ea639b73fa3db9b34a245bdfa015c260c598b211bf05a1ecc4b3e3b4f2',
  '0x69c322e3248a5dfc29d73c5b0553b0185a35cd5bb6386747517ef7e53b15e287',
  '0xf343681465b9efe82c933c3e8748c70cb8aa06539c361de20f72eac04e766393' ]

var sorted_es = es.slice().sort()

var getBuffers = function(hexStrings) {
  return hexStrings.map(function(str) {
    return Buffer(str.slice(2), 'hex')
  })
}

var buffers = getBuffers(es)

var presortedBuffers = getBuffers(sorted_es)

var sortedBuffers = getBuffers(es).sort(Buffer.compare)

var sortedPresortedBuffers = getBuffers(sorted_es).sort(Buffer.compare)

console.log('ELEMENTS')
console.log(es)
console.log('\n')
console.log('SORTED ELEMENTS')
console.log(sorted_es)
console.log('\n')
console.log('PRESORTED BUFFERS (se -> b)')
console.log(presortedBuffers)
console.log('\n')
console.log('BUFFERS (e -> b)')
console.log(buffers)
console.log('\n')
console.log('SORTED BUFFERS (e -> sb)')
console.log(sortedBuffers)
console.log('\n')
console.log('SORTED PRESORTED BUFFERS (se -> sb)')
console.log(sortedPresortedBuffers)
console.log('\n')


hash_01 = sha3(Buffer.concat([sortedBuffers[0], sortedBuffers[1]]))
console.log('hash_01', hash_01)
hash_10 = sha3(Buffer.concat([sortedBuffers[1], sortedBuffers[0]]))
console.log('hash_10', hash_10)
hash_23 = sha3(Buffer.concat([sortedBuffers[2], sortedBuffers[3]]))
console.log('hash_23', hash_23)
hash_32 = sha3(Buffer.concat([sortedBuffers[3], sortedBuffers[2]]))
console.log('hash_32', hash_32)

function combinedHash(first, second) {
  if (!second) { return first }
  if (!first) { return second }
  return sha3(Buffer.concat([first, second].sort(Buffer.compare)))
  /*
  if (first > second) { return sha3(Buffer.concat([second, first])) }
  return sha3(Buffer.concat([first, second]))
  */
}


