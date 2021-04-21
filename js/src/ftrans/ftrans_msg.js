/** 
* FTRANS_MSG
* Class for an FTRANS message
* Serialized FTRANS messages (as buffers) are our wire format
* 
* 
* 
*/ 

"use strict";

const { Fapp_env } = require("../fapp/fapp_env.js");
const { Fkad_msg } = require("../fkad/fkad_msg.js");
const { Fstun_msg } = require("../fstun/fstun_msg.js"); 
const { Fbuy_msg } = require("../fbuy/fbuy_msg.js");
const { Fdlt_msg } = require("../fdlt/fdlt_msg.js");
const { Fcrypto } = require("../fcrypto/fcrypto.js");
const { Fbigint } = Fapp_env.ENV === Fapp_env.ENV_TYPE.REACT_NATIVE ? require("../ftypes/fbigint/fbigint_rn.js") : require("../ftypes/fbigint/fbigint_node.js");

class Ftrans_msg {
	static ID_LEN = 8;
	
	static TYPE = {
		FKAD: 0,
		FSTUN: 1,
		FBUY: 2,
		FDLT: 3,
		ACK: 4,
	};

	msg;
	type;
	pubkey;
	sig;
	iv;
	id;

	constructor({msg = null, type = null, pubkey = null, sig = null, key = null, iv = null, id = null} = {}) {
		// TODO: validation - this is our wire format, so the constructor should prob discern between a valid
		// dehydrated Ftrans_msg and what might be some garbage or malicious data
		
		this.msg = msg;
		this.type = type;
		this.pubkey = pubkey; // Sender's pubkey
		this.sig = sig; // Signature of sender over msg
		this.key = key; // One time symmetric key (must be encrypted)
		this.iv = iv; // IV for one time key (send it in the clear)
		this.id = id; // Not used by default, but Ftrans subclasses may utilize it
	}

	// Construct a decrypted Ftrans_msg from an Ftrans_msg that was encrypted using Ftrans_msg.encrypted_from
	static async decrypted_from(ftrans_msg) {
		try {
			const privkey = await Fcrypto.get_privkey();
			const one_time_key = await Fcrypto.private_decrypt(Buffer.from(ftrans_msg.key, "hex"), privkey);
			const decrypted_msg = await Fcrypto.symmetric_decrypt(Buffer.from(ftrans_msg.msg, "hex"), one_time_key, Buffer.from(ftrans_msg.iv, "hex"));
			const valid_sig = await Fcrypto.verify(decrypted_msg, Buffer.from(ftrans_msg.pubkey, "hex"), Buffer.from(ftrans_msg.sig, "hex"));

			if (!valid_sig) {
				throw new Error();
			}

			return new Ftrans_msg({
				msg: JSON.parse(decrypted_msg.toString(), Fbigint._json_revive),
				type: ftrans_msg.type,
				pubkey: ftrans_msg.pubkey,
				sig: ftrans_msg.sig,
				key: ftrans_msg.key,
				iv: ftrans_msg.iv,
				id: ftrans_msg.id
			});
		} catch (err) {
			return null;
		}
	}

	// Construct an encrypted Ftrans_msg
	static async encrypted_from({msg = null, sender_pubkey = null, recip_pubkey = null, id = null} = {}) {
		const ftrans_msg = new Ftrans_msg({id: id});

		if (msg instanceof Fkad_msg) {
			ftrans_msg.type = Ftrans_msg.TYPE.FKAD;
		} else if (Buffer.isBuffer(msg)) {
			// TODO: FSTUN breaks the pattern by delivering messages as Buffers, this is brittle n sketchy
			ftrans_msg.type = Ftrans_msg.TYPE.FSTUN;
		} else if (msg instanceof Fbuy_msg) {
			ftrans_msg.type = Ftrans_msg.TYPE.FBUY;
		} else if (msg instanceof Fdlt_msg) {
			ftrans_msg.type = Ftrans_msg.TYPE.FDLT;
		} else {
			throw new Error("msg must be instance of Fkad_msg, Fbuy_msg, Fdlt_msg, or Buffer");
		}

		if (typeof sender_pubkey !== "string" || typeof recip_pubkey !== "string") {
			throw new Error("both pubkeys must be strings");
		}

		const privkey = await Fcrypto.get_privkey();
		const msg_buf = Buffer.from(JSON.stringify(msg));
		const sig = await Fcrypto.sign(msg_buf, privkey);
		const one_time_key = await Fcrypto.generate_one_time_key();
		const iv = await Fcrypto.generate_one_time_iv();
		const encrypted_msg = await Fcrypto.symmetric_encrypt(msg_buf, one_time_key, iv);
		const encrypted_key = await Fcrypto.public_encrypt(one_time_key, Buffer.from(recip_pubkey, "hex"))

		ftrans_msg.sig = sig.toString("hex");
		ftrans_msg.iv = iv.toString("hex");
		ftrans_msg.msg = encrypted_msg.toString("hex");
		ftrans_msg.key = encrypted_key.toString("hex");
		ftrans_msg.pubkey = sender_pubkey;
		return ftrans_msg;
	}
}

module.exports.Ftrans_msg = Ftrans_msg;