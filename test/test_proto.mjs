import { encode, decode } from './src/core/protos.js';

// Test 1: PeerP2PInfos encode/decode
const p2pInfo = encode('PeerP2PInfos', {
  from: { virtualIp: '100.64.0.1', macAddr: new Uint8Array([0xf6,0x18,0xc1,0x45,0x80,0xe8]), pubSocket: '1.2.3.4:443', p2pEndpoint: '1.2.3.4:443', natType: 'Symmetric', lastSeen: 1234567890, p2pCapabilities: ['hole-punch'] },
  to: [{ virtualIp: '100.64.0.2', macAddr: new Uint8Array([0x6a,0x13,0x99,0xce,0xa9,0x1b]), pubSocket: '5.6.7.8:443', p2pEndpoint: '5.6.7.8:443', natType: 'Restricted', lastSeen: 1234567891, p2pCapabilities: ['hole-punch'] }]
});
console.log('PeerP2PInfos encode OK, len=' + p2pInfo.length);
const decoded = decode('PeerP2PInfos', p2pInfo);
console.log('PeerP2PInfos decode OK:', decoded.from.virtualIp, decoded.from.macAddr.length, decoded.to.length);

// Test 2: P2PFullState encode/decode
const fullState = encode('P2PFullState', {
  communityName: 'default',
  isRequest: false,
  reachables: {
    'f6:18:c1:45:80:e8': { from: { virtualIp: '100.64.0.1', macAddr: new Uint8Array([0xf6,0x18,0xc1,0x45,0x80,0xe8]) }, to: [] }
  },
  unreachables: {
    '00:11:22:33:44:55': { desc: 'offline-peer', macAddr: '00:11:22:33:44:55', virtualIp: '100.64.0.3', community: 'default', lastUpdateNs: 1000000000 }
  }
});
console.log('P2PFullState encode OK, len=' + fullState.length);
const fsDecoded = decode('P2PFullState', fullState);
console.log('P2PFullState decode OK:', fsDecoded.communityName, Object.keys(fsDecoded.reachables).length, Object.keys(fsDecoded.unreachables).length);

// Test 3: PeerCachedInfo encode/decode
const cached = encode('PeerCachedInfo', { desc: 'test', macAddr: 'aa:bb:cc:dd:ee:ff', virtualIp: '100.64.0.99', community: 'default', lastUpdateNs: 5000000000 });
console.log('PeerCachedInfo encode OK, len=' + cached.length);
const cDecoded = decode('PeerCachedInfo', cached);
console.log('PeerCachedInfo decode OK:', cDecoded.desc, cDecoded.macAddr, cDecoded.virtualIp, cDecoded.community, cDecoded.lastUpdateNs);

console.log('\nAll tests passed!');