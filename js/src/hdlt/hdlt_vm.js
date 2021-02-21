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
		OP_NOOP: 0x61,
		OP_PUSH1: 0x64,
		OP_SHA256: 0xC8
	};

	GRAMMAR = new Map([
		[Hdlt_vm.OPCODE.OP_NOOP, this._op_noop],
		[Hdlt_vm.OPCODE.OP_PUSH1, this._op_push1],
		[Hdlt_vm.OPCODE.OP_SHA256, this._op_sha256]	
	]);

	STACK;
	SP;
	PC;
	program;

	constructor (program) {
		this.STACK = new Array(Hdlt_vm.STACK_SZ);
		this.SP = 0;
		this.PC = 0;
		this.program = program;
	}

	exec() {
		while (this.PC < this.program.length) {
			const inst = this.GRAMMAR.get(this.program[this.PC]);

			if (!inst) {
				return false; // Program failure
			}

			inst.bind(this)();
		}

		return true;
	}

	// No operation
	_op_noop() {
		return;
	}

	// The next byte contains the number of bytes to push onto the stack
	_op_push1() {
		const n = this.program[this.PC + 1];
		this.STACK[this.SP] = new Hbigint(`${this.program.slice(this.PC + 2, this.PC + 2 + n).toString("hex")}`);
		this.SP += 1;
		this.PC += 2 + n;
	}

	// SHA256 hash operation
	_op_sha256() {
		this.STACK[this.SP] = new Hbigint(Hutil._sha256(this.STACK[this.SP - 1].toString()));
		this.SP += 1;
		this.PC += 1;
	}
}

module.exports.Hdlt_vm = Hdlt_vm;