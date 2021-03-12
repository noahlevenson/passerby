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
const { Hdlt_tsact } = require("./hdlt_tsact.js");
const { Hdlt_block } = require("./hdlt_block.js");
const { Hdlt_store } = require("./hdlt_store.js");
const { Hdlt_vm } = require("./hdlt_vm.js");
const { Hlog } = require("../hlog/hlog.js");
const { Hntree_node } = require("../htypes/hntree/hntree_node.js");
const { Hbigint } = Happ_env.BROWSER ? require("../htypes/hbigint/hbigint_browser.js") : require("../htypes/hbigint/hbigint_node.js");

// HDLT only concerns itself with the technical functionality of a DLT: blocks, transactions, 
// the VM, messaging/propagation, consensus, and processing state of the chain
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
	tx_cache;
	tx_valid_hook;

	constructor({net = null, hkad = null, consensus = Hdlt.CONSENSUS_METHOD.AUTH, args = [], store = new Hdlt_store(), tx_valid_hook = () => {}, db_hook = () => {}, db_init_hook = () => {}} = {}) {
		if (!(net instanceof Hdlt_net)) {
			throw new TypeError("Argument 'net' must be instance of Hdlt_net");
		}

		this.net = net;
		this.hkad = hkad;
		this.consensus = consensus;
		this.args = args;
		this.store = store;
		this.res = new EventEmitter();
		this.tx_cache = new Map();
		this.tx_valid_hook = tx_valid_hook;
		this.db_hook = db_hook;
		this.db_init_hook = db_init_hook;
	}

	// Compute the state of of a branch of blocks ending with last_node
	// returns a Map of unspent outputs as [tx_hash: tx]
	build_db(last_node) {
		const utxo_db = this.db_init_hook(new Map());
		const branch = [];

		while (last_node !== null) {
			branch.unshift(last_node);
			last_node = last_node.parent;
		}

		// Start at genesis block + 1
		for (let i = 1; i < branch.length; i += 1) {
			branch[i].data.tsacts.forEach((tsact) => {	
				this.db_hook(tsact, utxo_db);		
			});
		}

		return utxo_db;
	}

	// For AUTH consensus, the nonce must be a signature over the hash of of a copy of the block
	// where block.nonce is replaced with the signer's public key
	static make_nonce_auth(block, pubkey, privkey) {
		const data = Buffer.from(Hdlt_block.sha256(Object.assign(block, {nonce: pubkey})), "hex");
		return Hid.sign(data, privkey).toString("hex");
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
		const last_known = this._init();
		Hlog.log(`[HDLT] (${this.net.app_id}) Init: ${this.store.size()} blocks at startup, last known ${last_known}`);
	}

	stop() {
		this.net.network.removeListener("message", this._on_message.bind(this));
		Hlog.log(`[HDLT] (${this.net.app_id}) Offline`);
	}

	_init() {
		// If we have an unresolved accidental fork, just advertise the last known hash before the fork
		const last_known_node = this.store.get_deepest_blocks()[0];
		
		while (last_known_node.parent !== null && last_known_node.parent.degree() > 1) {
			last_known_node = last_known_node.parent;
		}

		const last_known_block_hash = Hdlt_block.sha256(last_known_node.data);

		// TODO: this is doing way too much extra work - a better way is to wait until we get all the lists of blocks,
		// then find the intersection of the lists before asking nodes to send blocks
		// also: since we don't wait for blocks to arrive in order, we may get out of sync and not store any at all
		this.broadcast(this.getblocks_req, {
			block_hash: last_known_block_hash, 
			success: (res, addr, port, ctx) => {
				res.data.forEach((block_hash) => {
					if (!this.store.get_node(block_hash)) {
						this.getdata_req({
							block_hash: block_hash, 
							addr: addr, 
							port: port
						});
					}
				});
			}
		});

		return last_known_block_hash;
	}

	_on_message(msg, rinfo) {
		if (msg.type === Hdlt_msg.TYPE.RES) {
			Hlog.log(`[HDLT] (${this.net.app_id}) ${Object.keys(Hdlt_msg.FLAVOR)[msg.flavor]} REQ # ${msg.data.id ? msg.data.id.toString() : msg.id.toString()} OK`);
			this.res.emit(msg.id.toString(), msg);
		} else {
			this._on_req(msg, rinfo);
		}
	}

	// TODO: make sure req.data is a structurally valid Hdlt_tsact
	// we don't bother ivnestigating whether req.data is valid
	// in the sense that it's spending a valid utxo and its scripts
	// are legal etc - we leave that to the network validators
	// and tbd at block validation time
	_res_tx(req, rinfo) {
		const tx_hash = Hdlt_tsact.sha256(Hdlt_tsact.serialize(req.data));

		if (!this.tx_cache.has(tx_hash)) {
			this.tx_cache.set(tx_hash, req.data);
			this.broadcast(this.tx_req, {hdlt_tsact: req.data});
		}

		return new Hdlt_msg({
			data: "OK",
			type: Hdlt_msg.TYPE.RES,
			flavor: Hdlt_msg.FLAVOR.TX,
			app_id: req.app_id,
			id: req.id
		});
	}

	// TODO: make sure req.data is a structurally valid Hdlt_block
	// Also, we're doing all block validation in here, but we should break this out elsewhere
	_res_block(req, rinfo) {
		const res = new Hdlt_msg({
			data: "OK",
			type: Hdlt_msg.TYPE.RES,
			flavor: Hdlt_msg.FLAVOR.BLOCK,
			app_id: req.app_id,
			id: req.id
		});

		const block_hash = Hdlt_block.sha256(req.data);
		const block_node = this.store.get_node(block_hash);

		// Case 1: we already have the new block
		if (block_node) {
			return res;
		}

		const parent = this.store.get_node(req.data.hash_prev);

		// Case 2: we know the new block's parent, the new block's hash_prev matches the hash of its parent
		// block, and the new block's nonce passes verification
		if (parent && Hdlt_block.sha256(parent.data) === req.data.hash_prev && this.verify_nonce(req.data)) {
			// We'll validate transactions in this new block against the 
			// state of the utxo db as computed from the genesis block through its parent block
			const utxo_db = this.build_db(parent);

			const valid_tsacts = req.data.tsacts.every((tx_new) => {
				const utxo = utxo_db.get(tx_new.utxo);

				if (!utxo) {
					return false;
				}

				const vm = new Hdlt_vm({tx_prev: utxo, tx_new: tx_new});

				if (!vm.exec()) {
					return false;
				}

				const valid = this.tx_valid_hook(tx_new, utxo_db);
				this.db_hook(tx_new, utxo_db);
				return valid; 
			});

			if (valid_tsacts) {
				// Add the new block, rebuild the store index, and rebroadcast it
				const new_node = new Hntree_node({data: req.data, parent: parent})
				parent.add_child(new_node);
				this.store.build_dict();
				Hlog.log(`[HDLT] (${this.net.app_id}) Added new block ${block_hash}, ${this.store.size()} blocks total`);
				this.broadcast(this.block_req, {hdlt_block: req.data});
			}
		} else if (!parent) {
			// Case 3: we don't know the new block's parent
			// perform init function, broadcast our last known block hash with GETBLOCKS
			// and try to rebuild our db

			// TODO: write me after we have our init logic in place
		}

		return res;
	}

	_res_getblocks(req, rinfo) {
		
		


		// DFS inorder traversal starting at the node corresponding to the req hash;
		// we grab every successive block regardless of what branch it's in
		let succ = [];
		const start_node = this.store.get_node(req.data);



		// To handle the case where a peer is advertising a last known hash
		// which is in a branch that is not part of our canonical branch, we use
		// BFS in undirected mode, exploring the tree as though it were an undirected graph
		// starting at the source node corresponding to the peer's last known hash
		const pg = this.tree.bfs((node, d, data) => {
			data.push([node, d]);
		}, start_node, [], true);

		console.log(pg);








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
		// If we have the block, we send a BLOCK message to the requester
		// as well as a RES for their GETDATA message
		const block_node = this.store.get_node(req.data);

		if (block_node) {
			this.block_req({
				hdlt_block: block_node.data, 
				addr: rinfo.addr, 
				port: rinfo.port,
			});
		}

		return new Hdlt_msg({
			data: "OK",
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
						success(res_msg, addr, port, this);
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

	// TODO: for neighbors, we currently use HKAD to select the K_SIZE peers closest 
	// to our peer ID (not including us!) This is probably even less efficient than choosing
	// a random subset of peers from the HKAD routing table
	// Also, this is too brittle - it requires the the structure of the config object 
	// for all of our req functions below to be the same
	broadcast(msg_func, config_obj) {
		const neighbors = this.hkad._new_get_nodes_closest_to(this.hkad.node_id).filter(n => !n.node_id.equals(this.hkad.node_id));
		Hlog.log(`[HDLT] (${this.net.app_id}) Broadcasting a ${msg_func.name} to ${neighbors.length} neighbors...`);

		neighbors.forEach((n) => {
			const arg = Object.assign({}, config_obj, {
				addr: n.addr, 
				port: n.port
			});

			msg_func.bind(this, arg)();
		});
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