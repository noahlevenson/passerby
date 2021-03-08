/** 
* HDLT
* A generalized distributed ledger, built atop a
* stack-based virtual machine, for managing arbitrary
* contracts. HDLT uses HKAD for peer discovery
*
*
*/ 

"use strict";

const EventEmitter = require("events");
const { Hid } = require("../hid/hid.js");
const { Hntree } = require("../htypes/hntree/hntree.js");
const { Hntree_node } = require("../htypes/hntree/hntree_node.js");
const { Hdlt_net } = require("./net/hdlt_net.js");
const { Hdlt_msg } = require("./hdlt_msg.js");
const { Hdlt_block } = require("./hdlt_block.js");
const { Hlog } = require("../hlog/hlog.js");

// HDLT only concerns itself with the technical functionality of a DLT:
// blocks, transactions, validation, the VM, messaging, and consensus
// It doesn't concern itself with interpreting a blockchain or any notion
// of state (e.g. unspent outputs or a utxo db) - that stuff is the
// responsibility of the application layer

class Hdlt {
	static MSG_TIMEOUT = 5000;

	static GENESIS = {
		hash_prev: 0x00,
		hash_merkle_root: 0x00,
		nonce: "00",
		tsacts: []
	};

	// TODO: When using AUTH, pass a list of authorities' pubkeys as args
	static CONSENSUS_METHOD = {
		AUTH: 1
	};

	NONCE_INTEGRITY = new Map([
		[Hdlt.CONSENSUS_METHOD.AUTH, this._verify_nonce_auth]
	]);

	FLAVOR_RES_EXEC = new Map([
		
	]);

	net;
	hkad;
	consensus;
	args;
	blocks;
	res;

	constructor({net = null, hkad = null, consensus = Hdlt.CONSENSUS_METHOD.AUTH, args = [], blocks = new Hntree(new Hntree_node({data: Hdlt.GENESIS}))} = {}) {
		if (!(net instanceof Hdlt_net)) {
			throw new TypeError("Argument 'net' must be instance of Hdlt_net");
		}

		this.net = net;
		this.hkad = hkad;
		this.consensus = consensus;
		this.args = args;
		this.blocks = blocks;
		this.res = new EventEmitter();
	}

	// For AUTH consensus, the nonce must be a signature over the hash of of a copy of the block
	// where block.nonce is replaced with the signer's public key
	static make_nonce_auth(block, pubkey, privkey) {
		const data = Buffer.from(Hdlt_block.sha256(Object.assign(block, {nonce: pubkey})), "hex");
		return Hid.sign(data, privkey).toString("hex");
	}

	// Get the tree nodes corresponding to the deepest blocks in the tree
	// in a tree where there is one longest branch, this will return one node
	get_deepest_blocks() {
		const pg = this.blocks.bfs((node, d, data) => {
			data.push([node, d]);
		});

		const max_d = Math.max(...pg.map(pair => pair[1]));
		return pg.filter(pair => pair[1] === max_d).map(pair => pair[0]);
	}

	// Determine the integrity of a block in a node in our tree
	// Integrity is two checks: the block's hash_prev must match the hash
	// of the previous block, and its nonce must pass the integrity check
	// prescribed by the consensus method associated with this instance of HDLT
	is_valid_block(node) {
		const hash_check = Hdlt_block.sha256(node.parent.data) === node.data.hash_prev;
		const nonce_check = this.verify_nonce(node.data);

		if (hash_check && nonce_check) {
			return true;
		}

		return false;
	}

	verify_nonce(block) {
		return this.NONCE_INTEGRITY.get(this.consensus).bind(this)(block);
	}

	// TODO: this is linear search through the pubkeys in args :(
	_verify_nonce_auth(block) {
		return this.args.some((arg) => {
			const data = Buffer.from(Hdlt_block.sha256(Object.assign({}, block, {nonce: arg})), "hex");
			return Hid.verify(data, Buffer.from(arg, "hex"), Buffer.from(block.nonce, "hex"));
		});
	}

	start() {
		this.net.network.on("message", this._on_message.bind(this));
		Hlog.log(`[HDLT] (${this.net.app_id}) Online`);
	}

	stop() {
		this.net.network.removeListener("message", this._on_message.bind(this));
		Hlog.log(`[HDLT] (${this.net.app_id}) Offline`);
	}

	_on_message(msg, rinfo) {
		if (msg.type === Hdlt_msg.TYPE.RES) {
			Hlog.log(`[HDLT] (${this.net.app_id}) ${Object.keys(Hdlt_msg.FLAVOR)[msg.flavor]} REQ # ${msg.data.id ? msg.data.id.toString() : msg.id.toString()} OK`);
			this.res.emit(msg.id.toString(), msg);
		} else {
			this._on_req(msg, rinfo);
		}
	}

	_on_req(msg, rinfo) {
		Hlog.log(`[HDLT] (${this.net.app_id}) Inbound ${Object.keys(Hdlt_msg.FLAVOR)[msg.flavor]} REQ from ${rinfo.address}:${rinfo.port}`)
		const res = this.FLAVOR_RES_EXEC.get(msg.flavor).bind(this)(msg, rinfo);
		this._send(res, rinfo.address, rinfo.port);
	}

	_send(msg, addr, port, success, timeout) {
		if (msg.type === Hdlt_msg.TYPE.REQ) {
			const outgoing = new Promise((resolve, reject) => {
				const timeout_id = setTimeout(() => {
					this.res.removeAllListeners(msg.id.toString());
					reject();
				}, Hdlt.MSG_TIMEOUT);

				this.res.once(msg.id.toString(), (res_msg) => {
					clearTimeout(timeout_id);

					if (typeof success === "function") {
						success(res_msg, this);
					}

					resolve();
				});
			}).catch((reason) => {
				if (typeof timeout === "function") {
					timeout(msg);
				}
			});
		}	

		Hlog.log(`[HDLT] (${this.net.app_id}) Outbound ${Object.keys(Hdlt_msg.FLAVOR)[msg.flavor]} ${Object.keys(Hdlt_msg.TYPE)[msg.type]} # ${msg.id.toString()} to ${addr}:${port}`);
		this.net._out(msg, {address: addr, port: port});	
	}
}

module.exports.Hdlt = Hdlt;