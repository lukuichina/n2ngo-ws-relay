import { encodeSNPublicSecret } from './src/core/packet.js';

// Same data as Go: 0x01..0x0a
const pubKey = new Uint8Array(10);
for (let i = 0; i < 10; i++) pubKey[i] = i + 1;

const encoded = encodeSNPublicSecret(pubKey, false);
console.log('JS 10-byte response length:', encoded.length);
let hex = '';
for (let i = 0; i < encoded.length; i++) hex += encoded[i].toString(16).padStart(2,'0') + ' ';
console.log('Hex:', hex);

// Go reference for 10-byte (isRequest=false)
const goRef = '357f0301010e534e5075626c696353656372657401ff800001020109497352657175657374010200010750656d44617461010a0000000aff8002fe01260001020304050607080900';
const goBytes = new Uint8Array(goRef.length / 2);
for (let i = 0; i < goRef.length; i += 2) goBytes[i/2] = parseInt(goRef.substr(i,2),16);

console.log('Go 10-byte response length:', goBytes.length);
hex = '';
for (let i = 0; i < goBytes.length; i++) hex += goBytes[i].toString(16).padStart(2,'0') + ' ';
console.log('Go Hex:', hex);

// Diff
console.log('\nDifferences:');
for (let i = 0; i < Math.max(encoded.length, goBytes.length); i++) {
  if (encoded[i] !== goBytes[i]) {
    console.log(`  Offset ${i} (0x${i.toString(16)}): JS=0x${(encoded[i]??0).toString(16).padStart(2,'0')} Go=0x${goBytes[i].toString(16).padStart(2,'0')}`);
  }
}