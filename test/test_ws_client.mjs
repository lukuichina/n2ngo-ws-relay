import WebSocket from 'ws';

const ws = new WebSocket('ws://127.0.0.1:8787/n2n?community=myc');

ws.on('open', () => {
  console.log('[CLIENT] Connected to worker');
  
  // Send a SNPublicSecret request (bare GOB, as n2n-go does)
  const req = Buffer.from([0x35, 0x7f, 0x03, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00]);
  ws.send(req);
  console.log('[CLIENT] Sent SNPublicSecret request');
});

ws.on('message', (data) => {
  console.log('[CLIENT] Received', data.length, 'bytes');
  console.log('[CLIENT] First 16 bytes:', Buffer.from(data.slice(0, 16)).toString('hex'));
  
  if (data.length > 0 && data[0] === 5) {
    console.log('[CLIENT] Got ProtoV packet, type:', data[2]);
  }
});

ws.on('close', () => {
  console.log('[CLIENT] Disconnected');
});

ws.on('error', (err) => {
  console.log('[CLIENT] Error:', err.message);
});

setTimeout(() => {
  console.log('[CLIENT] Test complete, closing');
  ws.close();
}, 5000);
