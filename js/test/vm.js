const { Hdlt_vm } = require("../src/hdlt/hdlt_vm.js");

const program = Buffer.from([0x64, 0x03, 0x64, 0x03, 0x67, 0xC8]);

const vm = new Hdlt_vm(program);

vm.exec();

