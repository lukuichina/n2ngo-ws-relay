import { encodeSNPublicSecret, decodeSNPublicSecret } from './src/core/packet.js';

// Simulate the n2n-go client's request
// The client sends IsRequest=true with its public key
const clientPubKey = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a]);
const clientRequest = encodeSNPublicSecret(clientPubKey, true);

console.log('Client request length:', clientRequest.length);
console.log('Client request hex:', Buffer.from(clientRequest).toString('hex'));

// Decode the client's request
const decodedRequest = decodeSNPublicSecret(clientRequest);
console.log('Decoded request:', decodedRequest);
console.log('Client public key:', Array.from(decodedRequest.publicKey));

// Worker responds with IsRequest=false and SN's public key
const snPubKey = new Uint8Array([0x0a, 0x09, 0x08, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01]);
const workerResponse = encodeSNPublicSecret(snPubKey, false);

console.log('\nWorker response length:', workerResponse.length);
console.log('Worker response hex:', Buffer.from(workerResponse).toString('hex'));

// Decode the worker's response
const decodedResponse = decodeSNPublicSecret(workerResponse);
console.log('Decoded response:', decodedResponse);
console.log('SN public key:', Array.from(decodedResponse.publicKey));
