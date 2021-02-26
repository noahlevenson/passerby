/** 
* HDLT_VM
* Stack-based virtual machine with a 
* simple bytecode instruction set
* 
*
*
*/ 

"use strict";

const { Hdlt_tsact } = require("./hdlt_tsact.js");
const { Hid } = require("../hid/hid.js");
const { Happ } = require("../happ/happ.js");
const { Happ_env } = require("../happ/happ_env.js");
const { Hutil } = require("../hutil/hutil.js");
const { Hbigint } = Happ_env.BROWSER ? require("../htypes/hbigint/hbigint_browser.js") : require("../htypes/hbigint/hbigint_node.js");

class Hdlt_vm {
	static STACK_SZ = 1024;

	static OPCODE = {
		OP_NOOP: 0x61,
		OP_PUSH1: 0x64,
		OP_CHECKSIG: 0xAC,
		OP_CHECKPOW: 0xFF
	};

	GRAMMAR = new Map([
		[Hdlt_vm.OPCODE.OP_NOOP, this._op_noop],
		[Hdlt_vm.OPCODE.OP_PUSH1, this._op_push1],
		[Hdlt_vm.OPCODE.OP_CHECKSIG, this._op_checksig],
		[Hdlt_vm.OPCODE.OP_CHECKPOW, this._op_checkpow]
	]);

	STACK;
	SP;
	PC;
	tx_prev;
	tx_new;
	program;

	// The VM accepts as inputs the previous tx and the new tx
	// its preprocessor constructs a program from the appropriate lock and unlock scripts
	constructor ({tx_prev, tx_new} = {}) {
		this.STACK = new Array(Hdlt_vm.STACK_SZ);
		this.SP = 0;
		this.PC = 0;
		this.tx_prev = tx_prev;
		this.tx_new = tx_new;
		this.program = this.preproc();
	}

	// Create a the preimage for a signature for tx_new as prescribed by the OP_CHECKSIG instruction
	// tx_prev is the transaction corresponding to tx_new's utxo
	static make_sig_preimage(tx_prev, tx_new) {
		const tsact = new Hdlt_tsact({
			utxo: tx_new.utxo.slice(),
			lock: [...tx_prev.unlock],
			unlock: [...tx_new.unlock]
		});

		return Hdlt_tsact.serialize(tsact);
	}

	preproc() {
		return Buffer.from(this.tx_new.lock.concat(this.tx_prev.unlock));
	}

	// Execute the stored program until the end of instructions
	// Returns true if no errors and the topmost stack value is nonzero
	exec() {
		const inst = this.GRAMMAR.get(this.program[this.PC]);

		if (!inst) {
			return false; // Program error
		}

		inst.bind(this)();

		if (this.PC < this.program.length) {
			return this.exec();
		}

		return this.SP - 1 >= 0 && !this.STACK[this.SP - 1].equals(new Hbigint(0)) ? true : false;
	}

	// No op
	_op_noop() {
		return;
	}

	// The next byte represents the number of following bytes to push onto the stack
	_op_push1() {
		const n = this.program[this.PC + 1];
		const start = this.PC + 2;
		this.STACK[this.SP] = new Hbigint(`${this.program.slice(start, start + n).toString("hex")}`);
		this.SP += 1;
		this.PC += 2 + n;
	}

	// Verify that the signature at (SP - 1) is valid for the pubkey at (SP - 2) - returns 1 if valid, 0 otherwise
	// Like Bitcoin's OP_CHECKSIG instruction, it compares the sig against a copy of tx_new with its lock script replaced by tx_prev's unlock script
	_op_checksig() {
		const pubkey = this.STACK[this.SP - 1];
		this.SP -= 2;
		const sig = this.STACK[this.SP];

		const copy = new Hdlt_tsact({
			utxo: this.tx_new.utxo.slice(),
			lock: [...this.tx_prev.unlock],
			unlock: [...this.tx_new.unlock]
		});

		const res = Happ.verify(
			Hdlt_tsact.serialize(copy), 
			Buffer.from(pubkey.toString(16), "hex"), 
			Buffer.from(sig.toString(16), "hex")
		) ? 1 : 0;

		this.STACK[this.SP] = new Hbigint(res);
		this.SP += 1;
		this.PC += 1;
	}

	// Verify that the proof of work for the nonce at (SP - 1) is valid for the pubkey at (SP - 2)
	// OP_CHECKPOW assumes the next byte represents the number of leading zero bits required
	// returns 1 if valid, 0 otherwise
	_op_checkpow() {
		const n = this.program[this.PC + 1];
		const pubkey = this.STACK[this.SP - 1];
		this.SP -= 2;
		
		// TODO: this is pure noob but necessary to match the leading zero established in Hid_pub
		let nonce = this.STACK[this.SP].toString(16);
		nonce = nonce.padStart(nonce.length + (nonce.length % 2), "0");

		const h = Hid.hash_cert(pubkey.toString(16), nonce);
		const res = Hid.is_valid_pow(h, n) ? 1 : 0;

		this.STACK[this.SP] = new Hbigint(res);
		this.SP += 1;
		this.PC += 2;
	}
}

module.exports.Hdlt_vm = Hdlt_vm;