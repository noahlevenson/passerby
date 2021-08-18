/** 
* FTRANS_UDP_SLICE
* Singleton for reading and writing UDP
* slice packet Buffers
* 
* 
* 
*/ 

"use strict";

const cfg = require("../../../../libfood.json");

/*
* A slice is a Buffer structured like so:
* [magic] 4 bytes (magic cookie to identify the packet)
* [version] 1 byte (protocol version)
* [chunk ID] 2 bytes (what chunk does this slice belong to?)
* [slice ID] 1 byte (what slice is this?)
* [n slices] 1 byte (how many slices total are there in this chunk?)
* [slice sz] 2 bytes (how many bytes is the payload? should equal SLICE_SZ except for the last slice)
* [payload] max of SLICE_SZ bytes 
*/

// TODO: To identify slice packets, it's prob more robust to include not the MAGIC and VERSION,
// but a CRC computed over a hash of the MAGIC and VERSION...

class Ftrans_udp_slice {
  static MAGIC = Buffer.from([0xF2, 0x33, 0xF0, 0x0D]);
  static VERSION = 1;
  // Keep SLICE_SZ under your MTU; 512 and 1024 are prob OK
  static SLICE_SZ = 1024;
  // MAX_SLICES is bound by the width of [n slices], [slice ID] & [n slices], [acked] in the ack packet
  static MAX_SLICES = 256;
  static MAX_CHUNK_SZ = Ftrans_udp_slice.SLICE_SZ * Ftrans_udp_slice.MAX_SLICES;
  static MAGIC_OFF = 0;
  static VERSION_OFF = 4;
  static CHUNK_ID_OFF = 5;
  static SLICE_ID_OFF = 7;
  static NSLICES_OFF = 8;
  static SLICE_SZ_OFF = 9;
  static PAYLOAD_OFF = 11;
  static MAX_CHUNKS = 2 ** ((Ftrans_udp_slice.SLICE_ID_OFF - Ftrans_udp_slice.CHUNK_ID_OFF) * 
    cfg.SYS_BYTE_WIDTH);

  // chunk_id, slice_id, nslices as Numbers, payload as Buffer
  static new({chunk_id, slice_id, nslices, payload} = {}) {
    const buf = Buffer.alloc(Ftrans_udp_slice.PAYLOAD_OFF + payload.length);
    Ftrans_udp_slice.set_magic(buf);
    Ftrans_udp_slice.set_version(buf);
    Ftrans_udp_slice.set_chunk_id(buf, chunk_id);
    Ftrans_udp_slice.set_slice_id(buf, slice_id);
    Ftrans_udp_slice.set_nslices(buf, nslices);
    Ftrans_udp_slice.set_slice_sz(buf, payload.length);
    Ftrans_udp_slice.set_payload(buf, payload);
    return buf;
  }

  static is_valid_slice(buf) {
    // Magic cookie is OK?
    if (Buffer.compare(buf.slice(Ftrans_udp_slice.MAGIC_OFF, Ftrans_udp_slice.VERSION_OFF), 
      Ftrans_udp_slice.MAGIC) !== 0) {
      return false;
    }

    // Version number matches?
    if (buf.readUInt8(Ftrans_udp_slice.VERSION_OFF) !== Ftrans_udp_slice.VERSION) {
      return false;
    }

    // Size of slice seems OK?
    if (buf.length !== Ftrans_udp_slice.PAYLOAD_OFF + Ftrans_udp_slice.get_slice_sz(buf)) {
      return false;
    }

    return true;
  }

  // TODO: All gets and sets dangerously assume a safe Buffer length

  static get_magic(buf) {
    return buf.slice(Ftrans_udp_slice.MAGIC_OFF, Ftrans_udp_slice.VERSION_OFF);
  }

  static set_magic(buf) {
    return Ftrans_udp_slice.MAGIC.copy(buf, Ftrans_udp_slice.MAGIC_OFF);
  }

  static get_version(buf) {
    return buf.readUInt8(Ftrans_udp_slice.VERSION_OFF);
  }

  static set_version(buf) {
    return buf.writeUInt8(Ftrans_udp_slice.VERSION, Ftrans_udp_slice.VERSION_OFF);
  }

  static get_chunk_id(buf) {
    return buf.readUInt16LE(Ftrans_udp_slice.CHUNK_ID_OFF);
  }

  static set_chunk_id(buf, val) {
    return buf.writeUInt16LE(val, Ftrans_udp_slice.CHUNK_ID_OFF);
  }

  static get_slice_id(buf) {
    return buf.readUInt8(Ftrans_udp_slice.SLICE_ID_OFF);
  }

  static set_slice_id(buf, val) {
    return buf.writeUInt8(val, Ftrans_udp_slice.SLICE_ID_OFF);
  }

  static get_nslices(buf) {
    return buf.readUInt8(Ftrans_udp_slice.NSLICES_OFF);
  }

  static set_nslices(buf, val) {
    return buf.writeUInt8(val, Ftrans_udp_slice.NSLICES_OFF);
  }

  static get_slice_sz(buf) {
    return buf.readUInt16LE(Ftrans_udp_slice.SLICE_SZ_OFF);
  }

  static set_slice_sz(buf, val) {
    return buf.writeUInt16LE(val, Ftrans_udp_slice.SLICE_SZ_OFF);
  }

  static get_payload(buf) {
    return buf.slice(Ftrans_udp_slice.PAYLOAD_OFF, 
      Ftrans_udp_slice.PAYLOAD_OFF + Ftrans_udp_slice.get_slice_sz(buf));
  }

  static set_payload(buf, payload_buf) {
    return payload_buf.copy(buf, Ftrans_udp_slice.PAYLOAD_OFF);
  }
}

module.exports.Ftrans_udp_slice = Ftrans_udp_slice;