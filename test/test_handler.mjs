// Test the actual handler code
import { PacketHandler } from './src/core/handler.js';
import { PacketType } from './src/core/constants.js';

// Create a mock environment
const mockEnv = {
  SN_KEYS: {
    get: async (key) => {
      if (key === 'sn_private_key') {
        return null; // No existing key
      }
      if (key === 'sn_public_key_der') {
        return null; // No existing key
      }
      return null;
    },
    put: async (key, value) => {
      console.log(`[MockEnv] Putting ${key}:`, value);
      return;
    }
  }
};

// Create a mock relay room
const mockRelayRoom = {
  communityManager: {
    getCommunity: async (communityId) => {
      return {
        community: communityId,
        peers: new Map()
      };
    }
  }
};

// Create a mock WebSocket
const mockWs = {
  send: (data) => {
    console.log('[MockWs] Sending data, length:', data.length);
  }
};

// Create the handler
const handler = new PacketHandler(mockEnv, mockRelayRoom);

// Initialize the handler (generates keys)
await handler.init();
console.log('SN public key length:', handler.snPublicKeyDER.length);

// Simulate the client's request (10-byte PemData)
import { encodeSNPublicSecret } from './src/core/packet.js';
const clientPubKey = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a]);
const clientRequest = encodeSNPublicSecret(clientPubKey, true);

console.log('\n=== Testing handleSNPublicSecretRequest ===');
console.log('Client request length:', clientRequest.length);

// Create a mock community state
const commState = {
  community: 'myc',
  peers: new Map()
};

// Handle the request
try {
  await handler.handleSNPublicSecretRequest(mockWs, commState, clientRequest);
  console.log('Request handled successfully');
} catch (e) {
  console.error('Error handling request:', e);
}
