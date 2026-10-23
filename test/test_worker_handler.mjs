import { decodeSNPublicSecret, encodeSNPublicSecret } from './src/core/packet.js';

// Simulate the n2n-go client's request (10-byte PemData)
const clientPubKey = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a]);
const clientRequest = encodeSNPublicSecret(clientPubKey, true);

console.log('=== Client Request ===');
console.log('Length:', clientRequest.length);
console.log('Hex:', Buffer.from(clientRequest).toString('hex'));

// Decode the client's request (as the Worker would)
const decodedRequest = decodeSNPublicSecret(clientRequest);
console.log('Decoded:', decodedRequest);
console.log('Client public key:', Array.from(decodedRequest.publicKey));

// Worker responds with SN's public key (294 bytes for real, but using 10 bytes for test)
const snPubKey = new Uint8Array([0x0a, 0x09, 0x08, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01]);
const workerResponse = encodeSNPublicSecret(snPubKey, false);

console.log('\n=== Worker Response ===');
console.log('Length:', workerResponse.length);
console.log('Hex:', Buffer.from(workerResponse).toString('hex'));

// Decode the worker's response (as the client would)
const decodedResponse = decodeSNPublicSecret(workerResponse);
console.log('Decoded:', decodedResponse);
console.log('SN public key:', Array.from(decodedResponse.publicKey));

console.log('\n=== Test Summary ===');
console.log('Request decode OK:', Buffer.from(decodedRequest.publicKey).equals(clientPubKey));
console.log('Response decode OK:', Buffer.from(decodedResponse.publicKey).equals(snPubKey));
console.log('Response isRequest=false:', decodedResponse.isRequest === false);
