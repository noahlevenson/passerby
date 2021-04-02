/** 
* HDLT_TSACT
* A single DLT transaction
* 
* 
*
*
*/ 

"use strict";

const { Hutil } = require("../hutil/hutil.js"); 

class Hdlt_tsact {
	static VERSION = {
		V1: 0x01
	};

	static ENCODER = new Map([
		[Hdlt_tsact.VERSION.V1, Hdlt_tsact._encoder_v1]
	]);

	static DECODER = new Map([
		[Hdlt_tsact.VERSION.V1, Hdlt_tsact._decoder_v1]
	]);

	version;
	utxo;
	lock;
	unlock;
	t;

	// utxo as hex string, lock and unlock as buffers or arrays, t as unix time as number
	constructor ({version = Hdlt_tsact.VERSION.V1, utxo, lock, unlock, t} = {}) {
		this.version = version;
		this.utxo = utxo;
		this.lock = Array.from(lock);
		this.unlock = Array.from(unlock);
		this.t = t ? t : Date.now();
	}

	static from(buf) {
		return Hdlt_tsact.DECODER.get(buf[0])(buf);
	}

	// Transactions are serialized as buffers
	static serialize(tsact) {
		// TODO: handle bad version
		return Buffer.from(Hdlt_tsact.ENCODER.get(tsact.version)(tsact));
	}

	// V1 format: version (1 byte), utxo len (2 bytes, uint little endian), utxo, lock len (2 bytes, uint little endian), 
	// lock, unlock len (2 bytes, uint little endian), unlock, unix timestamp (8 bytes, double little endian)
	// TODO: Watch out for integer overflow here 
	static _encoder_v1(tsact) {
		const utxo_buf = Buffer.from(tsact.utxo, "hex");

		const utxo_buf_len = Buffer.alloc(2);
		utxo_buf_len.writeUint16LE(utxo_buf.length, 0);

		const lock_len = Buffer.alloc(2);
		lock_len.writeUint16LE(tsact.lock.length, 0);

		const unlock_len = Buffer.alloc(2);
		unlock_len.writeUint16LE(tsact.unlock.length, 0);

		const t_buf = Buffer.alloc(8);
		t_buf.writeDoubleLE(tsact.t, 0);
		
		return [].concat(
			Hdlt_tsact.VERSION.V1, 
			...utxo_buf_len, 
			...utxo_buf, 
			...lock_len, 
			...tsact.lock, 
			...unlock_len, 
			...tsact.unlock,
			...t_buf
		);
	}

	static _decoder_v1(buf) {
		const utxo_len = buf.readUint16LE(1);
		const utxo_offset = 3;
		const lock_len = buf.readUint16LE(utxo_offset + utxo_len);
		const lock_offset = utxo_offset + 1 + utxo_len + 1; // Extra + 1 here because readUint16LE uses "skipped bytes," not offset
		const unlock_len = buf.readUint16LE(lock_offset + lock_len);
		const unlock_offset = lock_offset + 1 + lock_len + 1; // Extra + 1 here because readUint16LE uses "skipped bytes," not offset
		const t_offset = unlock_offset + unlock_len;
		
		return new Hdlt_tsact({
			utxo: buf.slice(3, 3 + utxo_len).toString("hex"),
			lock: buf.slice(lock_offset, lock_offset + lock_len),
			unlock: buf.slice(unlock_offset, unlock_offset + unlock_len),
			t: buf.slice(t_offset, t_offset + 8).readDoubleLE(0)
		});
	}

	// Compute the SHA256 hash of a serialized transaction, returns a string
	static sha256(buf) {
		return Hutil._sha256(buf.toString("hex"));
	}
}

module.exports.Hdlt_tsact = Hdlt_tsact;