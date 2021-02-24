/** 
* HDLT_VM
* Stack-based virtual machine with a 
* simple bytecode instruction set
* 
*
*
*/ 

"use strict";

const { Happ_env } = require("../happ/happ_env.js");
const { Hutil } = require("../hutil/hutil.js");
const { Hbigint } = Happ_env.BROWSER ? require("../htypes/hbigint/hbigint_browser.js") : require("../htypes/hbigint/hbigint_node.js");

class Hdlt_vm {
	static STACK_SZ = 1024;

	static OPCODE = {
		OP_PUSH1: 0x64,
		OP_CODE_SEP: 0xAB,
		OP_CHECKSIG: 0xAC
	};

	GRAMMAR = new Map([
		[Hdlt_vm.OPCODE.OP_PUSH1, this._op_push1],
		[Hdlt_vm.OPCODE.OP_CODE_SEP, this._op_code_sep],
		[Hdlt_vm.OPCODE.OP_CHECKSIG, this._op_checksig]
	]);

	STACK;
	SP;
	PC;
	tx_prev;
	tx_new;
	program;
	code_sep;

	constructor ({tx_prev, tx_new} = {}) {
		this.STACK = new Array(Hdlt_vm.STACK_SZ);
		this.SP = 0;
		this.PC = 0;
		this.tx_prev = tx_prev;
		this.tx_new = tx_new;
		this.program = this.preproc();
		this.code_sep = 0;
	}

	preproc() {
		return this.tx_new.lock.concat(this.tx_prev.unlock);
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

		return !this.STACK[this.SP - 1].equals(new Hbigint(0)) ? true : false;
	}

	// The next byte contains the number of bytes to push onto the stack
	_op_push1() {
		const n = this.program[this.PC + 1];
		const start = this.PC + 2;
		this.STACK[this.SP] = new Hbigint(`${this.program.slice(start, start + n).toString("hex")}`);
		this.SP += 1;
		this.PC += 2 + n;
	}

	// OP_CODE_SEP marks a code segment; during execution, we maintain a ref to the most recently encountered
	_op_code_sep() {
		this.code_sep = this.PC;
		this.PC += 1;
	}

	// Verify that the signature at SP - 1 is valid for the pubkey at SP
	_op_checksig() {
		
	}
}

module.exports.Hdlt_vm = Hdlt_vm;