/** 
* FKSRV
* Distributed ledger-based keyserver for 
* web-of-trust-ish system of peer-signed certificates
* 
*
*
*/

"use strict";

const cfg = require("../../libfood.json");
const { Fcrypto } = require("../fcrypto/fcrypto.js");
const { Fid } = require("../fid/fid.js");
const { Fdlt } = require("../fdlt/fdlt.js");
const { Fdlt_net_solo } = require("../fdlt/net/fdlt_net_solo.js");
const { Fdlt_tsact } = require("../fdlt/fdlt_tsact.js");
const { Fdlt_vm } = require("../fdlt/fdlt_vm.js");
const { Fdlt_block } = require("../fdlt/fdlt_block.js");
const { Fgraph } = require("../ftypes/fgraph/fgraph.js"); 
const { Flog } = require("../flog/flog.js");
const { Futil } = require("../futil/futil.js");

// Hi, I'm an application built atop FDLT which provides a distributed database of public keys and
// a record of relationships between keys in the form of signatures and revocations: a peer signs
// another peer's key by spending a persistent token, SIG_TOK. A peer revokes their signature
// by spending a persistent token, REV_TOK. Peers may double spend SIG_TOK and REV_TOK, we interpret
// transactions idempotently. A peer registers their new key with the keyserver by performing a 
// self-signature. Peers may not revoke their self-signature. 

class Fksrv {          
  static REQ_POW_BITS = Fid.POW_LEAD_ZERO_BITS;
  static SIG_TOK = Buffer.from([0xDE, 0xAD]).toString("hex");
  static REV_TOK = Buffer.from([0xBE, 0xEF]).toString("hex");
  static SCRIPT_NO_UNLOCK = [Fdlt_vm.OPCODE.OP_PUSH1, 0x01, 0x00];
  static SCRIPT_IS_VALID_SIG_AND_POW = [Fdlt_vm.OPCODE.OP_CHECKSIGPOW, Fksrv.REQ_POW_BITS];

  static ROOT_KEY = 
    "30820122300d06092a864886f70d01010105000382010f003082010a0282" + 
    "010100ae76dbab80b72039d8c3c31ccc39b8331b36b12cc41587180251d1" + 
    "84a1c33de27c1213270eafb584f43d2bb734eca91054e23fd99be6be28c2" + 
    "eaf9e354b4c1a81f10673092a49d8c7d60a5eac7ac50be55a077ad0fae03" + 
    "64b21fb0ae2737e388c2b8c5b1c19ccfa197aceae3070be8152d763d0b80" + 
    "631733db824953e332743ae3c79c3299cd7edf9c362fd9f48fff53ab162a" + 
    "43196bdad5654a7045068c7ac3ca76efe5ebcd88fecac0ad2bd4406ff245" + 
    "2a5d50340e9b94302ea58918f2de9380eec4e0e249ab86cfe2ecbd87fd12" + 
    "6494da7ee53cdb8ed9701aef22994cd875e007bb64f124e19d00cfb56e1f" + 
    "15e9e114b083188f5a7aefd01fb3f71dcc34170203010001";

  static SIG_TX = new Fdlt_tsact({
    utxo: Fksrv.SIG_TOK.split("").reverse().join(""), 
    lock: [Fdlt_vm.OPCODE.OP_NOOP], 
    unlock: Fksrv.SCRIPT_IS_VALID_SIG_AND_POW,
    t: 31337
  });

  static REV_TX = new Fdlt_tsact({
    utxo: Fksrv.REV_TOK.split("").reverse().join(""),
    lock: [Fdlt_vm.OPCODE.OP_NOOP],
    unlock: Fksrv.SCRIPT_IS_VALID_SIG_AND_POW,
    t: 31337
  })

  // TODO: write an Fdlt application layer base class, and Fksrv should subclass it
  // The 3 hooks below, TX_VALID_HOOK, UTXO_DB_HOOK, UTXO_DB_INIT_HOOK, should be abstract methods

  // TX_VALID_HOOK is where you specify any special validation logic for transactions beyond what's
  // prescribed by the Fdlt layer. Should return true if valid, false if not.
  static TX_VALID_HOOK(tx_new, utxo_db) {
    // TODO: make sure that tx_new only has the scripts it's allowed to have
    
    // TODO: make sure that tx_new is not a self-spend of REV_TOK (though we might instead enforce 
    // that in the unlock script for REV_TOK)
    return true;
  };

  // UTXO_DB_HOOK is expected to modify a UTXO database as is required to accept a new valid 
  // transaction, returning the new state of the database (the default behavior would be to set 
  // tx_new under the key of its hash)
  static UTXO_DB_HOOK(tx_new, utxo_db) {
    utxo_db.set(Fdlt_tsact.sha256(Fdlt_tsact.serialize(tx_new)), tx_new);
    return utxo_db;
  }

  // UTXO_DB_INIT_HOOK is called when initializing a new UTXO DB before computing its state
  static UTXO_DB_INIT_HOOK(utxo_db) {
    // Set our persistent signature and revocation token
    utxo_db.set(Fksrv.SIG_TOK, Fksrv.SIG_TX);
    utxo_db.set(Fksrv.REV_TOK, Fksrv.REV_TX);
    return utxo_db;
  }
  
  dlt;
  
  constructor ({dlt} = {}) {
    this.dlt = dlt;
  }

  start() {
    this.dlt.start();
    Flog.log(`[FKSRV] (${this.dlt.net.app_id}) Online`);
  }

  stop() {
    this.dlt.stop();
    Flog.log(`[FKSRV] (${this.dlt.net.app_id}) Offline`);
  }

  // TODO: We're currently preserving separate sign and revoke functions for compatability, but
  // these functions can be collapsed into one parameterized function

  // Create a signing transaction: peer_a spends SIG_TOK on peer_b
  async sign(peer_a, peer_b) {
    const nonce = Array.from(Buffer.from(peer_a.nonce, "hex"));
    const peer_a_pubkey = Array.from(Buffer.from(peer_a.pubkey, "hex"));
    const peer_b_pubkey = Array.from(Buffer.from(peer_b.pubkey, "hex"));

    // Since no one will ever spend this tx, just lock the output forever
    const tsact = new Fdlt_tsact({
      utxo: Fksrv.SIG_TOK,
      lock: [],
      unlock: Fksrv.SCRIPT_NO_UNLOCK
    }); 

    const privkey = await Fcrypto.get_privkey();

    const sig = await Fcrypto.sign(
      Fdlt_vm.make_sig_preimage(Fksrv.SIG_TX, tsact), Buffer.from(privkey, "hex")
    );

    // Lock script: 
    // push2, len, recip pubkey, push2, len, sig, push2, len, nonce, push2, len, my pubkey
    // (push the recipient's pubkey to the stack just so we have it in the script)

    const lock_script = [].concat([
      Fdlt_vm.OPCODE.OP_PUSH2,
      ...Array.from(Futil.wbuf_uint16be(peer_b_pubkey.length)),
      ...peer_b_pubkey, 
      Fdlt_vm.OPCODE.OP_PUSH2,
      ...Array.from(Futil.wbuf_uint16be(sig.length)),
      ...sig,
      Fdlt_vm.OPCODE.OP_PUSH2, 
      ...Array.from(Futil.wbuf_uint16be(nonce.length)), 
      ...nonce, 
      Fdlt_vm.OPCODE.OP_PUSH2, 
      ...Array.from(Futil.wbuf_uint16be(peer_a_pubkey.length)), 
      ...peer_a_pubkey
    ]);

    tsact.lock = lock_script;
    return tsact;
  }

  // Create a revocation transaction: peer_a spends REV_TOK on peer_b
  async revoke(peer_a, peer_b) {
    const nonce = Array.from(Buffer.from(peer_a.nonce, "hex"));
    const peer_a_pubkey = Array.from(Buffer.from(peer_a.pubkey, "hex"));
    const peer_b_pubkey = Array.from(Buffer.from(peer_b.pubkey, "hex"));

    // Since no one will ever spend this tx, just lock the output forever
    const tsact = new Fdlt_tsact({
      utxo: Fksrv.REV_TOK,
      lock: [],
      unlock: Fksrv.SCRIPT_NO_UNLOCK
    });

    const privkey = await Fcrypto.get_privkey();

    const sig = await Fcrypto.sign(
      Fdlt_vm.make_sig_preimage(Fksrv.REV_TX, tsact), Buffer.from(privkey, "hex")
    );

    // Lock script: 
    // push2, len, recip pubkey, push2, len, sig, push2, len, nonce, push2, len, my pubkey
    // (push the recipient's pubkey to the stack just so we have it in the script)
    const lock_script = [].concat([
      Fdlt_vm.OPCODE.OP_PUSH2,
      ...Array.from(Futil.wbuf_uint16be(peer_b_pubkey.length)),
      ...peer_b_pubkey, 
      Fdlt_vm.OPCODE.OP_PUSH2,
      ...Array.from(Futil.wbuf_uint16be(sig.length)),
      ...sig,
      Fdlt_vm.OPCODE.OP_PUSH2, 
      ...Array.from(Futil.wbuf_uint16be(nonce.length)), 
      ...nonce, 
      Fdlt_vm.OPCODE.OP_PUSH2, 
      ...Array.from(Futil.wbuf_uint16be(peer_a_pubkey.length)), 
      ...peer_a_pubkey
    ]);

    tsact.lock = lock_script;
    return tsact;
  }

  send(tx) {
    if (!(tx instanceof Fdlt_tsact)) {
      return;
    }

    this.dlt.tx_cache.set(Fdlt_tsact.sha256(Fdlt_tsact.serialize(tx)), tx);
    this.dlt.broadcast(this.dlt.tx_req, {fdlt_tsact: tx});
  }

  build_wot() {
    function _get_recip_pubkey(tx) {
      // The recpient's pubkey is the bytes specified by the 0th OP_PUSH2 instruction
      // (which happens to be the 0th byte of the script)
      const recip_len = (tx.lock[1] << cfg.SYS_BYTE_WIDTH) | tx.lock[2];
      return tx.lock.slice(3, 3 + recip_len);
    }

    function _get_sender_pubkey(tx) {
      // If we 0-index the OP_PUSH2 instructions in the script, the signer's pubkey is the bytes 
      // specified by the 3rd OP_PUSH2 instruction... let's find it by iteratively searching over 
      // the script starting from the 0th byte, striding over each push operand
      let idx = 0;
      let start = 0;
      let count = 0;
      
      while (count < 4) {
        idx = tx.lock.indexOf(Fdlt_vm.OPCODE.OP_PUSH2, idx + start);
        start = (tx.lock[idx + 1] << cfg.SYS_BYTE_WIDTH) | tx.lock[idx + 2];
        count += 1;
      }

      const signer_len = (tx.lock[idx + 1] << cfg.SYS_BYTE_WIDTH) | tx.lock[idx + 2];
      return tx.lock.slice(idx + 3, idx + 3 + signer_len);
    }

    // If there's an unresolved accidental fork, we arbitrarily select the 0th branch
    // TODO: this is almost definitely the wrong behavior
    const db = this.dlt.build_db(this.dlt.store.get_deepest_blocks()[0]);
    const wot = new Fgraph();

    Array.from(db.values()).forEach((tx) => {
      const recip = _get_recip_pubkey(tx);
      const sender = _get_sender_pubkey(tx);

      if (tx.utxo === Fksrv.SIG_TOK) {
        wot.add_edge(Buffer.from(sender).toString("hex"), Buffer.from(recip).toString("hex"));
      } else if (tx.utxo === Fksrv.REV_TOK) {
        wot.del_edge(Buffer.from(sender).toString("hex"), Buffer.from(recip).toString("hex"));
      }
    });

    return wot;
  }

  compute_strong_set() {
    const scc = this.build_wot().scc();

    // TODO: surely there's a way to do this that isn't O(n ^ 2)

    for (let i = 0; i < scc.length; i += 1) {
      if (scc[i].includes(Fksrv.ROOT_KEY)) {
        return scc[i];
      }
    }
  }
}

module.exports.Fksrv = Fksrv;