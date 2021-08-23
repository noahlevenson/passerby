/** 
* FTRANS_UDP_ACK
* Singleton for reading and writing UDP
* ack packet Buffers
* 
* 
* 
*/ 

"use strict";

const cfg = require("../../../../libfood.json");
const { Ftrans_udp_slice } = require("./ftrans_udp_slice.js");

/*
* An ack is a Buffer structured like so:
* [magic] 4 bytes (magic cookie to identify the packet)
* [version] 1 byte (protocol version)
* [chunk ID] 2 bytes (what chunk is this ack referencing?)
* [n slices] 1 byte (how many slices total are there in the chunk referenced by this ack?)
* [acked] MAX_SLICES / 8 bytes aka 1 bit per slice (which slices have we acknowledged so far?)
*/

class Ftrans_udp_ack {
  static MAGIC_LEN = 4;
  static VERSION_LEN = 1;
  static CHUNK_ID_LEN = 2;
  static NSLICES_LEN = 1;
  static ACKED_LEN = Ftrans_udp_slice.MAX_SLICES / cfg.SYS_BYTE_WIDTH;
  
  static MAGIC = Buffer.from([0xFE, 0xED, 0xFA, 0xCE]);
  static VERSION = 1;
  static MAGIC_OFF = 0;
  static VERSION_OFF = Ftrans_udp_ack.MAGIC_OFF + Ftrans_udp_ack.MAGIC_LEN;
  static CHUNK_ID_OFF = Ftrans_udp_ack.VERSION_OFF + Ftrans_udp_ack.VERSION_LEN;
  static NSLICES_OFF = Ftrans_udp_ack.CHUNK_ID_OFF + Ftrans_udp_ack.CHUNK_ID_LEN;
  static ACKED_OFF = Ftrans_udp_ack.NSLICES_OFF + Ftrans_udp_ack.NSLICES_LEN;
  
  static ACK_SZ = Ftrans_udp_ack.ACKED_OFF + Ftrans_udp_ack.ACKED_LEN;

  // chunk_id, nslices as Numbers, acked as array of bools
  static new({chunk_id, nslices, acked} = {}) {
    const buf = Buffer.alloc(Ftrans_udp_ack.ACKED_OFF + Ftrans_udp_ack.ACKED_LEN);
    Ftrans_udp_ack.set_magic(buf);
    Ftrans_udp_ack.set_version(buf);
    Ftrans_udp_ack.set_chunk_id(buf, chunk_id);
    Ftrans_udp_ack.set_nslices(buf, nslices);
    Ftrans_udp_ack.set_acked(buf, acked);
    return buf;
  }

  static is_valid_ack(buf) {
    // Magic cookie is OK?
    if (Buffer.compare(buf.slice(Ftrans_udp_ack.MAGIC_OFF, Ftrans_udp_ack.VERSION_OFF), 
      Ftrans_udp_ack.MAGIC) !== 0) {
      return false;
    }

    // Version number matches?
    if (buf.readUInt8(Ftrans_udp_ack.VERSION_OFF) !== Ftrans_udp_ack.VERSION) {
      return false;
    }

    // Size of ack seems OK?
    if (buf.length !== Ftrans_udp_ack.ACKED_OFF + Ftrans_udp_ack.ACKED_LEN) {
      return false;
    }

    return true;
  }

  // TODO: All gets and sets dangerously assume a safe Buffer length

  static get_magic(buf) {
    return buf.slice(Ftrans_udp_ack.MAGIC_OFF, Ftrans_udp_ack.VERSION_OFF);
  }

  static set_magic(buf) {
    return Ftrans_udp_ack.MAGIC.copy(buf, Ftrans_udp_ack.MAGIC_OFF);
  }

  static get_version(buf) {
    return buf.readUInt8(Ftrans_udp_ack.VERSION_OFF);
  }

  static set_version(buf) {
    return buf.writeUInt8(Ftrans_udp_ack.VERSION, Ftrans_udp_ack.VERSION_OFF);
  }

  static get_chunk_id(buf) {
    return buf.readUInt16LE(Ftrans_udp_ack.CHUNK_ID_OFF);
  }

  static set_chunk_id(buf, val) {
    return buf.writeUInt16LE(val, Ftrans_udp_ack.CHUNK_ID_OFF);
  }

  static get_nslices(buf) {
    return buf.readUInt8(Ftrans_udp_ack.NSLICES_OFF);
  }

  static set_nslices(buf, val) {
    return buf.writeUInt8(val, Ftrans_udp_ack.NSLICES_OFF);
  }

  // Returns an array of bools with a length equal to [n slices]
  static get_acked(buf) {
    const acked = [];

    for (let i = 0; i < Ftrans_udp_ack.get_nslices(buf); i += 1) {
      acked.push((buf[Ftrans_udp_ack.ACKED_OFF + Math.floor(i / cfg.SYS_BYTE_WIDTH)] >> 
        (i % cfg.SYS_BYTE_WIDTH)) & 0x01 === 0x01 ? true : false);
    }
    
    return acked;
  }

  // arr as an array of bools with a length equal to [n slices], we hope
  static set_acked(buf, arr) {
    for (let i = 0; i < arr.length; i += 1) {
      if (arr[i]) {
        buf[Ftrans_udp_ack.ACKED_OFF + Math.floor(i / cfg.SYS_BYTE_WIDTH)] |= 
          (0x01 << (i % cfg.SYS_BYTE_WIDTH));
      }
    }

    return buf;
  }
}

module.exports.Ftrans_udp_ack = Ftrans_udp_ack;