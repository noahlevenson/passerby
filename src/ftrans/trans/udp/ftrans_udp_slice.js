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
* [checksum] 4 bytes (identifies the contents of the chunk that this slice belongs to)
* [payload] max of SLICE_SZ bytes 
*/

/*
* Deep thoughts about the checksum:
* The checksum, which tells us something about the contents of a chunk, was added to mitigate the
* rare bad event that might result from a peer attempting to send us two different chunks with the 
* same chunk ID. This could happen if a peer sends us a chunk while having connectivity issues, 
* and by rebooting, they manage to reset their write pointer before our garbage collector can clean
* their incomplete chunk from our recv buffer. We're just taking the first 4 bytes over the hash of
* the chunk; it'd be more rigorous and more expensive to compute a CRC. It'd be less rigorous
* and less expensive to take the 4 low order bytes of the unix epoch time the chunk was created.
*/

class Ftrans_udp_slice {
  static MAGIC_LEN = 4;
  static VERSION_LEN = 1;
  static CHUNK_ID_LEN = 2;
  static SLICE_ID_LEN = 1;
  static NSLICES_LEN = 1;
  static SLICE_SZ_LEN = 2;
  static CHECKSUM_LEN = 4;

  static MAGIC = Buffer.from([0xF2, 0x33, 0xF0, 0x0D]);
  static VERSION = 1;
  static MAGIC_OFF = 0;
  static VERSION_OFF = Ftrans_udp_slice.MAGIC_OFF + Ftrans_udp_slice.MAGIC_LEN;
  static CHUNK_ID_OFF = Ftrans_udp_slice.VERSION_OFF + Ftrans_udp_slice.VERSION_LEN;
  static SLICE_ID_OFF = Ftrans_udp_slice.CHUNK_ID_OFF + Ftrans_udp_slice.CHUNK_ID_LEN;
  static NSLICES_OFF = Ftrans_udp_slice.SLICE_ID_OFF + Ftrans_udp_slice.SLICE_ID_LEN;
  static SLICE_SZ_OFF = Ftrans_udp_slice.NSLICES_OFF + Ftrans_udp_slice.NSLICES_LEN;
  static CHECKSUM_OFF = Ftrans_udp_slice.SLICE_SZ_OFF + Ftrans_udp_slice.SLICE_SZ_LEN;
  static PAYLOAD_OFF = Ftrans_udp_slice.CHECKSUM_OFF + Ftrans_udp_slice.CHECKSUM_LEN;

  // Keep SLICE_SZ under your MTU; 512 and 1024 are prob OK
  static SLICE_SZ = 1024;
  // MAX_SLICES is bound by the width of [n slices], [slice ID] & [n slices], [acked] in the ack packet
  static MAX_SLICES = 256;
  static MAX_CHUNK_SZ = Ftrans_udp_slice.SLICE_SZ * Ftrans_udp_slice.MAX_SLICES;
  static MAX_CHUNKS = 2 ** ((Ftrans_udp_slice.SLICE_ID_OFF - Ftrans_udp_slice.CHUNK_ID_OFF) * 
    cfg.SYS_BYTE_WIDTH);

  // chunk_id, slice_id, nslices as Numbers, checksum and payload as Buffers
  static new({chunk_id, slice_id, nslices, checksum, payload} = {}) {
    const buf = Buffer.alloc(Ftrans_udp_slice.PAYLOAD_OFF + payload.length);
    Ftrans_udp_slice.set_magic(buf);
    Ftrans_udp_slice.set_version(buf);
    Ftrans_udp_slice.set_chunk_id(buf, chunk_id);
    Ftrans_udp_slice.set_slice_id(buf, slice_id);
    Ftrans_udp_slice.set_nslices(buf, nslices);
    Ftrans_udp_slice.set_slice_sz(buf, payload.length);
    Ftrans_udp_slice.set_checksum(buf, checksum);
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

  static get_checksum(buf) {
    return buf.slice(Ftrans_udp_slice.CHECKSUM_OFF, Ftrans_udp_slice.PAYLOAD_OFF);
  }

  static set_checksum(buf, checksum_buf) {
    return checksum_buf.copy(buf, Ftrans_udp_slice.CHECKSUM_OFF);
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