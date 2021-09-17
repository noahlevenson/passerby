/** 
* FDLT
* Distributed ledger built atop a stack-based VM
*
* 
*
*
*/ 

"use strict";

const EventEmitter = require("events");
const { Fapp_cfg } = require("../fapp/fapp_cfg.js");
const cfg = require("../../libfood.json"); 
const { Fbigint } = Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE ? 
  require("../ftypes/fbigint/fbigint_rn.js") : require("../ftypes/fbigint/fbigint_node.js");
const { Ftrans_rinfo } = require("../ftrans/ftrans_rinfo.js");
const { Fcrypto } = require("../fcrypto/fcrypto.js");
const { Fdlt_net } = require("./net/fdlt_net.js");
const { Fdlt_msg } = require("./fdlt_msg.js");
const { Fdlt_tsact } = require("./fdlt_tsact.js");
const { Fdlt_block } = require("./fdlt_block.js");
const { Fdlt_store } = require("./fdlt_store.js");
const { Fdlt_vm } = require("./fdlt_vm.js");
const { Flog } = require("../flog/flog.js");
const { Fntree_node } = require("../ftypes/fntree/fntree_node.js");

class Fdlt {
  /**
   * When using CONSENSUS_METHOD.AUTH, the 'args' passed to the Fdlt constructor should be an 
   * object structured like this:  
   * {auth: [pubkey1, pubkey2...], rate: [min_ms, max_ms], t_handle: null}
   * TODO: we should have classes for all the different consensus method args
   */ 

  static MSG_TIMEOUT = 5000;

  static CONSENSUS_METHOD = {
    AUTH: 0
  };

  NONCE_INTEGRITY = new Map([
    [Fdlt.CONSENSUS_METHOD.AUTH, this._verify_nonce_auth]
  ]);

  MAKE_BLOCK_ROUTINE = new Map([
    [Fdlt.CONSENSUS_METHOD.AUTH, this._make_block_auth]
  ]);

  FLAVOR_RES_EXEC = new Map([
    [Fdlt_msg.FLAVOR.TX, this._res_tx],
    [Fdlt_msg.FLAVOR.BLOCK, this._res_block],
    [Fdlt_msg.FLAVOR.GETBLOCKS, this._res_getblocks],
    [Fdlt_msg.FLAVOR.GETDATA, this._res_getdata],
  ]);

  net;
  fkad;
  fid_pub;
  consensus;
  is_validator;
  args;
  store;
  res;
  tx_cache;
  tx_valid_hook;
  db_hook;
  db_init_hook;

  constructor({
    net = null, 
    fkad = null, 
    fid_pub = null, 
    consensus = Fdlt.CONSENSUS_METHOD.AUTH, 
    is_validator = false, 
    args = {}, 
    store = new Fdlt_store(), 
    tx_valid_hook = () => {}, 
    db_hook = () => {}, 
    db_init_hook = () => {}
  } = {}) {
    if (!(net instanceof Fdlt_net)) {
      throw new TypeError("Argument 'net' must be instance of Fdlt_net");
    }

    this.net = net;
    this.fkad = fkad;
    this.fid_pub = fid_pub;
    this.consensus = consensus;
    this.is_validator = is_validator;
    this.args = args;
    this.store = store;
    this.res = new EventEmitter();
    this.tx_cache = new Map();
    this.tx_valid_hook = tx_valid_hook;
    this.db_hook = db_hook;
    this.db_init_hook = db_init_hook;
  }

  /**
   * Compute the state of of a branch of blocks ending with last_node. Returns a Map of unspent 
   * outputs as [tx_hash: tx]
   */
  build_db(last_node) {
    const utxo_db = this.db_init_hook(new Map());
    const branch = this.store.get_branch(last_node);

    // Start at genesis block + 1
    for (let i = 1; i < branch.length; i += 1) {
      branch[i].data.tsacts.forEach((tsact) => {  
        this.db_hook(tsact, utxo_db);   
      });
    }

    return utxo_db;
  }

  /**
   * For AUTH consensus, the nonce must be a signature over the hash of of a copy of the block
   * where block.nonce is replaced with the signer's public key. TODO: handle error/bad passphrase etc
   */ 
  static async make_nonce_auth(block, pubkey) {
    const data = Buffer.from(Fdlt_block.sha256(Object.assign({}, block, {nonce: pubkey})), "hex");
    const privkey = await Fcrypto.get_privkey();
    const res = await Fcrypto.sign(data, Buffer.from(privkey, "hex"));
    return res.toString("hex");
  }

  /**
   * Public method to verify the nonce present in a block
   */ 
  async verify_nonce(block) {
    return await this.NONCE_INTEGRITY.get(this.consensus).bind(this)(block);
  }

  /**
   * AUTH mode nonce verification function. TODO: this is linear search through the pubkeys in args :(
   */ 
  async _verify_nonce_auth(block) {
    for (let i = 0; i < this.args.auth.length; i += 1) {
      const is_valid = await Fcrypto.verify(
        Buffer.from(Fdlt_block.sha256(Object.assign({}, block, {nonce: this.args.auth[i]})), "hex"), 
        Buffer.from(this.args.auth[i], "hex"), 
        Buffer.from(block.nonce, "hex")
      );

      if (is_valid) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Public method to assemble a new block 
   */ 
  async make_block(pred_block_node) {
    return this.MAKE_BLOCK_ROUTINE.get(this.consensus).bind(this)(pred_block_node);
  }

  /**
   * AUTH mode block assembly function
   */ 
  async _make_block_auth(pred_block_node) {
    if (this.args.t_handle !== null) {
      clearTimeout(this.args.t_handle);
    }

    const delta = this.args.rate[1] - this.args.rate[0];
    const t = this.args.rate[0] + Math.floor(Math.random() * delta);
    
    Flog.log(`[FDLT] (${this.net.app_id}) Making successor to block ` + 
      `${Fdlt_block.sha256(pred_block_node.data)} in ${t / 1000}s...`);

    this.args.t_handle = setTimeout(async () => {
      /**
       * Find the transactions in our tx_cache which have not yet been added to a block. TODO: 
       * parameterize this with a max tx per block
       */ 
      const branch = this.store.get_branch(pred_block_node);
      const new_tx = new Map(this.tx_cache);
      
      branch.forEach(node => node.data.tsacts.forEach(tx => 
        new_tx.delete(Fdlt_tsact.sha256(Fdlt_tsact.serialize(tx)))));
      
      const tx_candidates = Array.from(new_tx.entries());
      
      /**
       * Very naive tx ordering logic: ensure that no tx appears before a tx which represents its 
       * utxo. TODO: This is selection sort O(n ^ 2), bad vibes bro
       */ 
      for (let i = 0; i < tx_candidates.length; i += 1) {
        for (let j = i + 1; j < tx_candidates.length; j += 1) {
          /**
           * If the hash of the tx at j equals the current tx's utxo, swap the tx at j with the 
           * current tx and terminate the search over the unsorted righthand subarray
           */ 
          if (tx_candidates[j][0] === tx_candidates[i][1].utxo) {
            const temp = tx_candidates[j];
            tx_candidates[j] = tx_candidates[i];
            tx_candidates[i] = temp;
            break;
          }
        }
      }

      /**
       * Filter out invalid transactions. We create an initial utxo db computed up through our
       * predecessor block, then iterate through all of our candidate transactions, updating the
       * state of the utxo db as we validate each one. TODO: this is very poorly written because
       * it's hard to asynchronously wait for the result of _validate_tx() and also iteratively
       * update the state of utxo_db while stepping through tx_candidates...
       */
      let utxo_db = this.build_db(pred_block_node);
      const valid_tx = [];

      for (const [cand_hash, cand_tx] of tx_candidates) {
        const res = await this._validate_tx({tx: cand_tx, utxo_db: utxo_db});
        utxo_db = res.utxo_db;

        if (res.valid) {
          valid_tx.push(cand_tx);
        }
      }

      /**
       * If we have no tx to put in a new block this time, and we didn't get interrupted by a 
       * new deepest block, then keep working on same predecessor
       */ 
      if (valid_tx.length > 0) {
        const new_block = new Fdlt_block({
          prev_block: pred_block_node.data,
          tsacts: [...valid_tx]
        });

        Fdlt.make_nonce_auth(new_block, this.fid_pub.pubkey).then(async (nonce) => {
          new_block.nonce = nonce;
          const block_hash = Fdlt_block.sha256(new_block);

          /**
           * Add the new block, rebuild the store index, broadcast it, and get to work on the next block
           */ 
          const new_node = new Fntree_node({data: new_block, parent: pred_block_node})
          pred_block_node.add_child(new_node);
          this.store.build_dict();
          
          Flog.log(`[FDLT] (${this.net.app_id}) Made block ${block_hash} (${valid_tx.length} tx, ` + 
            `${tx_candidates.length - valid_tx.length} invalid) ${this.store.size()} blocks total`);

          this.broadcast(this.block_req, {fdlt_block: new_block});
          await this._make_block_auth(new_node);
        });
      } else {
        Flog.log(`[FDLT] (${this.net.app_id}) No valid new tx at block time!`);
        await this._make_block_auth(pred_block_node);
      }
    }, t);
  }

  /**
   * Validate a single tx against the state of 'utxo_db', returns true/false and the new state 
   * of the utxo db
   */ 
  async _validate_tx({tx, utxo_db} = {}) {
    const utxo = utxo_db.get(tx.utxo);
  
    if (!utxo) {
      return {valid: false, utxo_db: utxo_db};
    }

    const vm = new Fdlt_vm({tx_prev: utxo, tx_new: tx});

    if (!(await vm.exec())) {
      return {valid: false, utxo_db: utxo_db};
    }

    const valid = this.tx_valid_hook(tx, utxo_db);

    if (!valid) {
      return {valid: false, utxo_db: utxo_db};
    }

    return {valid: true, utxo_db: this.db_hook(tx, utxo_db)};
  }

  async start() {
    this.net.network.on("message", this._on_message.bind(this));
    
    Flog.log(`[FDLT] (${this.net.app_id}) Online using ` + 
      `${Object.keys(Fdlt.CONSENSUS_METHOD)[this.consensus]} consensus`);

    if (this.is_validator) {
      Flog.log(`[FDLT] (${this.net.app_id}) As validator`);
      await this.make_block(this.store.get_deepest_blocks()[0]);
    }

    this._init();
  }

  stop() {
    this.net.network.removeListener("message", this._on_message.bind(this));
    Flog.log(`[FDLT] (${this.net.app_id}) Offline`);
  }

  _init() {
    /**
     * If we have an unresolved accidental fork, just advertise the last known hash before the fork
     */ 
    const last_known_node = this.store.get_deepest_blocks()[0];
    
    while (last_known_node.parent !== null && last_known_node.parent.degree() > 1) {
      last_known_node = last_known_node.parent;
    }

    const last_hash = Fdlt_block.sha256(last_known_node.data);
    
    Flog.log(`[FDLT] (${this.net.app_id}) Init: ${this.store.size()} known blocks, ` +
      `last known ${last_hash}`);

    /**
     * TODO: this is doing pointless work. A better way is to wait until we get all the lists of 
     * blocks, then find the intersection of the lists before asking nodes to send blocks. Also: 
     * since we don't wait for blocks to arrive in order, we might kick off a lot of 
     * _res_block() CASE 3s...
     */ 
    this.broadcast(this.getblocks_req, {
      block_hash: last_hash, 
      success: (res, addr, port, pubkey, ctx) => {
        res.data.forEach((block_hash) => {
          if (!this.store.get_node(block_hash)) {
            this.getdata_req({
              block_hash: block_hash, 
              addr: addr, 
              port: port,
              pubkey: pubkey
            });
          }
        });
      }
    });
  }

  _on_message(msg, rinfo) {
    if (msg.type === Fdlt_msg.TYPE.RES) {
      Flog.log(`[FDLT] (${this.net.app_id}) ${Object.keys(Fdlt_msg.FLAVOR)[msg.flavor]} ` + 
        `REQ # ${msg.data.id ? msg.data.id.toString() : msg.id.toString()} OK`);

      this.res.emit(msg.id.toString(), msg);
    } else {
      this._on_req(msg, rinfo);
    }
  }

  /**
   * TODO: make sure req.data is a structurally valid Fdlt_tsact. Note: we don't care if req.data is 
   * spending a valid utxo or if its scripts are legal etc. We leave that to network validators to 
   * determine at block creation time
   */ 
  async _res_tx(req, rinfo) {
    const tx_hash = Fdlt_tsact.sha256(Fdlt_tsact.serialize(req.data));

    if (!this.tx_cache.has(tx_hash)) {
      this.tx_cache.set(tx_hash, req.data);
      this.broadcast(this.tx_req, {fdlt_tsact: req.data});
    }

    return new Fdlt_msg({
      data: "OK",
      type: Fdlt_msg.TYPE.RES,
      flavor: Fdlt_msg.FLAVOR.TX,
      app_id: req.app_id,
      id: req.id
    });
  }

  /**
   * TODO: make sure req.data is a structurally valid Fdlt_block
   * TODO: we're doing block validation in here, but we should break out elsewhere
   */ 
  async _res_block(req, rinfo) {
    const res = new Fdlt_msg({
      data: "OK",
      type: Fdlt_msg.TYPE.RES,
      flavor: Fdlt_msg.FLAVOR.BLOCK,
      app_id: req.app_id,
      id: req.id
    });

    const block_hash = Fdlt_block.sha256(req.data);
    const block_node = this.store.get_node(block_hash);

    /**
     * CASE 1: we already have the new block
     */ 
    if (block_node) {
      return res;
    }

    const parent = this.store.get_node(req.data.hash_prev);

    /**
     * CASE 2: we know the new block's parent, the new block's hash_prev matches the hash of its 
     * parent block, and the new block's nonce passes verification
     */ 
    if (parent && Fdlt_block.sha256(parent.data) === req.data.hash_prev && 
      await this.verify_nonce(req.data)) {
      /**
       * We'll validate transactions in this new block against the state of the utxo db as 
       * computed from the genesis block through the parent block to the new block. TODO: this is 
       * poorly written for the same reason as the tx filtering logic in _make_block_auth()
       */ 
      let utxo_db = this.build_db(parent);
      const valid_tx = [];

      for (const tx of req.data.tsacts) {
        const res = await this._validate_tx({tx: tx, utxo_db: utxo_db});
        utxo_db = res.utxo_db;
        valid_tx.push(res.valid);
      }
      
      if (valid_tx.every(res => res)) {
        /**
         * Add the new block, rebuild the store index, and rebroadcast it
         */ 
        const new_node = new Fntree_node({data: req.data, parent: parent})
        parent.add_child(new_node);
        this.store.build_dict();
        
        Flog.log(`[FDLT] (${this.net.app_id}) Added new block ${block_hash}, ` + 
          `${this.store.size()} blocks total`);

        this.broadcast(this.block_req, {fdlt_block: req.data});

        /**
         * If I'm a validator and the new block is the first block at a new height, then it's time 
         * to discard my work and start a new block
         */ 
        const new_d = this.store.get_deepest_blocks();

        if (this.is_validator && new_d.length === 1 && new_d[0] === new_node) {
          await this.make_block(new_node);
        }
      }
    } else if (!parent) {
      /**
       * CASE 3: we don't know the new block's parent, run init to rebuild our store
       */ 
      this._init();
    }

    return res;
  }

  /**
   * To handle the case where a peer advertises a last known hash which is in a branch that's 
   * not part of our canonical branch, we perform BFS in undirected mode. TODO: since we use BFS, 
   * this method sends block hashes ordered by their distance from the last known block, which seems 
   * desirable... but it also sends every single block in our store except for the one known to the 
   * peer... seems like we can do this better?
   */ 
  async _res_getblocks(req, rinfo) {
    const start_node = this.store.get_node(req.data);
    const succ = [];

    if (start_node) {
      this.store.tree.bfs((node, d, data) => {
        data.push(Fdlt_block.sha256(node.data));
      }, start_node, succ, true);
    }
    
    return new Fdlt_msg({
      data: succ,
      type: Fdlt_msg.TYPE.RES,
      flavor: Fdlt_msg.FLAVOR.GETBLOCKS,
      app_id: req.app_id,
      id: req.id
    });
  }

  async _res_getdata(req, rinfo) {
    /**
     * If we have the block, we send a BLOCK message to the requester and a RES for their GETDATA message
     */ 
    const block_node = this.store.get_node(req.data);

    if (block_node) {
      this.block_req({
        fdlt_block: block_node.data, 
        addr: rinfo.address, 
        port: rinfo.port,
        pubkey: rinfo.pubkey
      });
    }

    return new Fdlt_msg({
      data: "OK",
      type: Fdlt_msg.TYPE.RES,
      flavor: Fdlt_msg.FLAVOR.GETDATA,
      app_id: req.app_id,
      id: req.id
    });
  }

  async _on_req(msg, rinfo) {
    Flog.log(`[FDLT] (${this.net.app_id}) Inbound ${Object.keys(Fdlt_msg.FLAVOR)[msg.flavor]} ` + 
      `REQ from ${rinfo.address}:${rinfo.port}`);

    const res = await this.FLAVOR_RES_EXEC.get(msg.flavor).bind(this)(msg, rinfo);
    this._send(res, rinfo);
  }

  _send(msg, ftrans_rinfo, success = () => {}, timeout = () => {}) {
    if (msg.type === Fdlt_msg.TYPE.REQ) {
      const outgoing = new Promise((resolve, reject) => {
        const timeout_id = setTimeout(() => {
          this.res.removeAllListeners(msg.id.toString());
          reject();
        }, Fdlt.MSG_TIMEOUT);

        this.res.once(msg.id.toString(), (res_msg) => {
          clearTimeout(timeout_id);
          success(res_msg, ftrans_rinfo.address, ftrans_rinfo.port, ftrans_rinfo.pubkey, this);
          resolve();
        });
      }).catch((reason) => {
        timeout(msg);
      });
    } 

    Flog.log(`[FDLT] (${this.net.app_id}) Outbound ${Object.keys(Fdlt_msg.FLAVOR)[msg.flavor]} ` +
      `${Object.keys(Fdlt_msg.TYPE)[msg.type]} # ${msg.id.toString()} to ` +
      `${ftrans_rinfo.address}:${ftrans_rinfo.port}`);

    this.net._out(msg, ftrans_rinfo); 
  }

  /**
   * TODO: to find neighbors, we use FKAD to select the K_SIZE peers closest to our peer ID. This is 
   * prob even less efficient than choosing a random subset of peers from FKAD's routing table!
   * This also dangerously assumes that the config object passed to each req function is the same.
   */ 
  broadcast(msg_func, config_obj) {
    const neighbors = this.fkad._get_nodes_closest_to({key: this.fkad.node_id}).filter(n => 
      !n.node_id.equals(this.fkad.node_id));
    
    Flog.log(`[FDLT] (${this.net.app_id}) Broadcasting a ${msg_func.name} to ` + 
      `${neighbors.length} neighbors...`);

    neighbors.forEach((n) => {
      const arg = Object.assign({}, config_obj, {
        addr: n.addr, 
        port: n.port,
        pubkey: n.pubkey
      });

      msg_func.bind(this, arg)();
    });
  }

  tx_req({
    fdlt_tsact = null, 
    addr = null, 
    port = null, 
    pubkey = null, 
    success = () => {}, 
    timeout = () => {}
  } = {}) {
    // TODO: For sanity during development, explicitly require arguments
    if (fdlt_tsact === null || addr === null || port === null || pubkey === null) {
      throw new Error("Arguments cannot be null");
    }

    const msg = new Fdlt_msg({
      data: fdlt_tsact,
      type: Fdlt_msg.TYPE.REQ,
      flavor: Fdlt_msg.FLAVOR.TX,
      app_id: this.net.app_id,
      id: Fbigint.unsafe_random(Fdlt_msg.ID_LEN)
    });

    this._send(msg, new Ftrans_rinfo({address: addr, port: port, pubkey: pubkey}), success, timeout);
  }

  block_req({
    fdlt_block = null, 
    addr = null, 
    port = null, 
    pubkey = null, 
    success = () => {}, 
    timeout = () => {}
  } = {}) {
    // TODO: For sanity during development, explicitly require arguments
    if (fdlt_block === null || addr === null || port === null || pubkey === null) {
      throw new Error("Arguments cannot be null");
    }

    const msg = new Fdlt_msg({
      data: fdlt_block,
      type: Fdlt_msg.TYPE.REQ,
      flavor: Fdlt_msg.FLAVOR.BLOCK,
      app_id: this.net.app_id,
      id: Fbigint.unsafe_random(Fdlt_msg.ID_LEN)
    });

    this._send(msg, new Ftrans_rinfo({address: addr, port: port, pubkey: pubkey}), success, timeout);
  }

  getblocks_req({
    block_hash = null, 
    addr = null, 
    port = null, 
    pubkey = null, 
    success = () => {}, 
    timeout = () => {}
  } = {}) {
    // TODO: For sanity during development, explicitly require arguments
    if (block_hash === null || addr === null || port === null || pubkey === null) {
      throw new Error("Arguments cannot be null");
    }

    const msg = new Fdlt_msg({
      data: block_hash,
      type: Fdlt_msg.TYPE.REQ,
      flavor: Fdlt_msg.FLAVOR.GETBLOCKS,
      app_id: this.net.app_id,
      id: Fbigint.unsafe_random(Fdlt_msg.ID_LEN)
    });

    this._send(msg, new Ftrans_rinfo({address: addr, port: port, pubkey: pubkey}), success, timeout);
  }

  getdata_req({
    block_hash = null, 
    addr = null, 
    port = null, 
    pubkey = null, 
    success = () => {}, 
    timeout = () => {}
  } = {}) {
    // TODO: For sanity during development, explicitly require arguments
    if (block_hash === null || addr === null || port === null || pubkey === null) {
      throw new Error("Arguments cannot be null");
    }

    const msg = new Fdlt_msg({
      data: block_hash,
      type: Fdlt_msg.TYPE.REQ,
      flavor: Fdlt_msg.FLAVOR.GETDATA,
      app_id: this.net.app_id,
      id: Fbigint.unsafe_random(Fdlt_msg.ID_LEN)
    });

    this._send(msg, new Ftrans_rinfo({address: addr, port: port, pubkey: pubkey}), success, timeout);
  }
}

module.exports.Fdlt = Fdlt;