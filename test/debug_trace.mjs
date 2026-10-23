// 跟踪 worker 端 encodeSNPublicSecretJSON 的完整字节流
import { encodeSNPublicSecretJSON, packProtoVDatagram, serializeProtoVHeader } from "./src/core/packet.js";
import { VERSION, HEADER_SIZE, PacketType, hashCommunity, parseMAC } from "./src/core/constants.js";

// 模拟一个简短的 PEM 公钥（实际会更长）
const testPEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA
test
-----END PUBLIC KEY-----`;
const pemBytes = new TextEncoder().encode(testPEM);

console.log("=== Step 1: PEM bytes ===");
console.log("Length:", pemBytes.length);
console.log("Hex:", Array.from(pemBytes).map(b=>b.toString(16).padStart(2,'0')).join(' '));

// Step 2: encodeSNPublicSecretJSON
const responsePayload = encodeSNPublicSecretJSON(pemBytes, false);
console.log("\n=== Step 2: encodeSNPublicSecretJSON output ===");
console.log("Length:", responsePayload.length);
console.log("First byte (mode tag):", "0x" + responsePayload[0].toString(16));
console.log("Full hex:", Array.from(responsePayload).map(b=>b.toString(16).padStart(2,'0')).join(' '));

// Check for null bytes
const nullPositions = [];
for (let i = 0; i < responsePayload.length; i++) {
  if (responsePayload[i] === 0x00) nullPositions.push(i);
}
console.log("Null byte positions:", nullPositions.length > 0 ? nullPositions : "NONE");

// Step 3: Pack into ProtoV datagram
const responseHeader = {
  version: VERSION,
  ttl: 64,
  packetType: PacketType.SNPublicSecret,
  flags: 0,
  sequence: 1,
  communityId: hashCommunity("myc"),
  srcMAC: parseMAC("00:00:00:00:00:00"),
  dstMAC: new Uint8Array(6),
  timestamp: Math.floor(Date.now() / 1000),
  checksum: 0,
};
const packet = packProtoVDatagram(responseHeader, responsePayload);
console.log("\n=== Step 3: Full ProtoV packet ===");
console.log("Total length:", packet.length);
console.log("Header length:", HEADER_SIZE);
console.log("Payload length:", packet.length - HEADER_SIZE);

// Check for null bytes in full packet
const allNullPositions = [];
for (let i = 0; i < packet.length; i++) {
  if (packet[i] === 0x00) allNullPositions.push(i);
}
console.log("All null byte positions in packet:", allNullPositions);

// Step 4: Show the JSON part
const jsonStart = 1; // after mode tag
const jsonBytes = responsePayload.slice(jsonStart);
const jsonStr = new TextDecoder().decode(jsonBytes);
console.log("\n=== Step 4: JSON content ===");
console.log("JSON:", jsonStr);

// Step 5: Parse JSON and check pem_data
const parsed = JSON.parse(jsonStr);
console.log("\n=== Step 5: Parsed JSON ===");
console.log("is_request:", parsed.is_request);
console.log("pem_data type:", typeof parsed.pem_data);
console.log("pem_data length:", parsed.pem_data.length);

// Step 6: Decode base64
const decodedPem = Buffer.from(parsed.pem_data, 'base64');
console.log("\n=== Step 6: Base64 decoded ===");
console.log("Decoded length:", decodedPem.length);
console.log("Decoded matches original:", decodedPem.equals(pemBytes));

// Check null bytes in decoded
const decodedNulls = [];
for (let i = 0; i < decodedPem.length; i++) {
  if (decodedPem[i] === 0x00) decodedNulls.push(i);
}
console.log("Null bytes in decoded PEM:", decodedNulls.length > 0 ? decodedNulls : "NONE");

// Step 7: Simulate Go's json.Unmarshal behavior
// Go would: json.Unmarshal(data[1:], &SNPublicSecret{})
// where SNPublicSecret has PemData []byte
// Go's json.Unmarshal base64-decodes the string into []byte
console.log("\n=== Step 7: Simulating Go decode ===");
console.log("Go would receive payload (after ProtoV header):", Array.from(responsePayload).map(b=>b.toString(16).padStart(2,'0')).join(' '));
console.log("Go checks data[0] == 0x01:", responsePayload[0] === 0x01);
console.log("Go does json.Unmarshal(data[1:], ...)");
console.log("data[1:] length:", responsePayload.length - 1);
console.log("data[1:] as string:", new TextDecoder().decode(responsePayload.slice(1)));

// Step 8: What Go's json.Unmarshal would produce
// In Go, after json.Unmarshal, PemData would be the base64-decoded bytes
// Then crypto.PublicKeyFromPEMData would parse those bytes as PEM
console.log("\n=== Step 8: PEM parsing ===");
try {
  // This is what Go does with the decoded bytes
  const decodedForGo = Buffer.from(parsed.pem_data, 'base64');
  console.log("Bytes to parse as PEM:", decodedForGo.toString('utf8'));
  // Check if it looks like valid PEM
  const pemStr = decodedForGo.toString('utf8');
  console.log("Starts with -----BEGIN:", pemStr.startsWith("-----BEGIN"));
  console.log("Contains -----END:", pemStr.includes("-----END"));
} catch(e) {
  console.error("Error:", e.message);
}
