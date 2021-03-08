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
const { Happ_env } = require("../happ/happ_env.js");
const { Hid } = require("../hid/hid.js");
const { Hdlt_net } = require("./net/hdlt_net.js");
const { Hdlt_msg } = require("./hdlt_msg.js");
const { Hdlt_block } = require("./hdlt_block.js");
const { Hdlt_store } = require("./hdlt_store.js");
const { Hlog } = require("../hlog/hlog.js");
const { Hbigint } = Happ_env.BROWSER ? require("../htypes/hbigint/hbigint_browser.js") : require("../htypes/hbigint/hbigint_node.js");

// HDLT only concerns itself with the technical functionality of a DLT:
// blocks, transactions, validation, the VM, messaging, and consensus
// It doesn't concern itself with interpreting a blockchain or any notion
// of state (e.g. unspent outputs or a utxo db) - that stuff is the
// responsibility of the application layer

class Hdlt {
	static MSG_TIMEOUT = 5000;

	// TODO: When using AUTH, pass a list of authorities' pubkeys as args
	static CONSENSUS_METHOD = {
		AUTH: 1
	};

	NONCE_INTEGRITY = new Map([
		[Hdlt.CONSENSUS_METHOD.AUTH, this._verify_nonce_auth]
	]);

	FLAVOR_RES_EXEC = new Map([
		[Hdlt_msg.FLAVOR.TX, this._res_tx],
		[Hdlt_msg.FLAVOR.BLOCK, this._res_block],
		[Hdlt_msg.FLAVOR.GETBLOCKS, this._res_getblocks],
		[Hdlt_msg.FLAVOR.GETDATA, this._res_getdata],
	]);

	net;
	hkad;
	consensus;
	args;
	store;
	res;

	constructor({net = null, hkad = null, consensus = Hdlt.CONSENSUS_METHOD.AUTH, args = [], store = new Hdlt_store()} = {}) {
		if (!(net instanceof Hdlt_net)) {
			throw new TypeError("Argument 'net' must be instance of Hdlt_net");
		}

		this.net = net;
		this.hkad = hkad;
		this.consensus = consensus;
		this.args = args;
		this.store = store;
		this.res = new EventEmitter();
	}

	// For AUTH consensus, the nonce must be a signature over the hash of of a copy of the block
	// where block.nonce is replaced with the signer's public key
	static make_nonce_auth(block, pubkey, privkey) {
		const data = Buffer.from(Hdlt_block.sha256(Object.assign(block, {nonce: pubkey})), "hex");
		return Hid.sign(data, privkey).toString("hex");
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

	_res_tx(req, rinfo) {
		// TODO: Handle the incoming transaction 
		// (if we're a validator, add it to our tx cache for the next block)

		return new Hdlt_msg({
			data: "OK",
			type: Hdlt_msg.TYPE.RES,
			flavor: Hdlt_msg.FLAVOR.TX,
			app_id: req.app_id,
			id: req.id
		});
	}

	_res_block(req, rinfo) {
		// TODO: Handle the incoming block
		// (One of 3 cases: its the successor to one of our ultimate blocks,
		// its the successor to one of our penultimate blocks, it's neither
		// and we should discard it and broadcast a GETBLOCKS to try to sync)

		return new Hdlt_msg({
			data: "OK",
			type: Hdlt_msg.TYPE.RES,
			flavor: Hdlt_msg.FLAVOR.BLOCK,
			app_id: req.app_id,
			id: req.id
		});
	}

	_res_getblocks(req, rinfo) {
		// Handle the getblocks request
		// (Find out what blocks we know about after the hash in req.data
		// and reply to the peer with a list of them)

		// DFS inorder traversal starting at the node corresponding to the req hash;
		// we grab every successive block regardless of what branch its in
		let succ = [];
		const start_node = this.store.get_node(req.data);

		if (start_node) {
			succ = this.store.tree.dfs((node, data) => {
				data.push(Hdlt_block.sha256(node.data));
			}, (node, data) => {}, start_node);
		}

		return new Hdlt_msg({
			data: succ,
			type: Hdlt_msg.TYPE.RES,
			flavor: Hdlt_msg.FLAVOR.GETBLOCKS,
			app_id: req.app_id,
			id: req.id
		});
	}

	_res_getdata(req, rinfo) {
		// Handle the getdata request
		// (If we have the requested block, send it)
		let block = null;
		const block_node = this.store.get_node(req.data);

		if (block_node) {
			block = block_node.data;
		}

		return new Hdlt_msg({
			data: block,
			type: Hdlt_msg.TYPE.RES,
			flavor: Hdlt_msg.FLAVOR.GETDATA,
			app_id: req.app_id,
			id: req.id
		});
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

	tx_req({hdlt_tsact = null, addr = null, port = null, success = () => {}, timeout = () => {}} = {}) {
		// For sanity during development, explicitly require arguments
		if (hdlt_tsact === null || addr === null || port === null) {
			throw new Error("Arguments cannot be null");
		}

		const msg = new Hdlt_msg({
			data: hdlt_tsact,
			type: Hdlt_msg.TYPE.REQ,
			flavor: Hdlt_msg.FLAVOR.TX,
			app_id: this.net.app_id,
			id: Hbigint.random(Hdlt_msg.ID_LEN)
		});

		this._send(msg, addr, port, success, timeout);
	}

	block_req({hdlt_block = null, addr = null, port = null, success = () => {}, timeout = () => {}} = {}) {
		// For sanity during development, explicitly require arguments
		if (hdlt_block === null || addr === null || port === null) {
			throw new Error("Arguments cannot be null");
		}

		const msg = new Hdlt_msg({
			data: hdlt_block,
			type: Hdlt_msg.TYPE.REQ,
			flavor: Hdlt_msg.FLAVOR.BLOCK,
			app_id: this.net.app_id,
			id: Hbigint.random(Hdlt_msg.ID_LEN)
		});

		this._send(msg, addr, port, success, timeout);
	}

	getblocks_req({block_hash = null, addr = null, port = null, success = () => {}, timeout = () => {}} = {}) {
		// For sanity during development, explicitly require arguments
		if (block_hash === null || addr === null || port === null) {
			throw new Error("Arguments cannot be null");
		}

		const msg = new Hdlt_msg({
			data: block_hash,
			type: Hdlt_msg.TYPE.REQ,
			flavor: Hdlt_msg.FLAVOR.GETBLOCKS,
			app_id: this.net.app_id,
			id: Hbigint.random(Hdlt_msg.ID_LEN)
		});

		this._send(msg, addr, port, success, timeout);
	}

	getdata_req({block_hash = null, addr = null, port = null, success = () => {}, timeout = () => {}} = {}) {
		// For sanity during development, explicitly require arguments
		if (block_hash === null || addr === null || port === null) {
			throw new Error("Arguments cannot be null");
		}

		const msg = new Hdlt_msg({
			data: block_hash,
			type: Hdlt_msg.TYPE.REQ,
			flavor: Hdlt_msg.FLAVOR.GETDATA,
			app_id: this.net.app_id,
			id: Hbigint.random(Hdlt_msg.ID_LEN)
		});

		this._send(msg, addr, port, success, timeout);
	}
}

module.exports.Hdlt = Hdlt;