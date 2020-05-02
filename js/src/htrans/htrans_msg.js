// Class for a transport service message object
class Htrans_msg {
	msg;
	addr;
	fam;
	port;
	size;

	constructor({msg = null, addr = null, fam = null, port = null, size = null} = {}) {
		this.msg = msg;
		this.addr = addr;
		this.fam = fam;
		this.port = port;
		this.size = size;
	}
}

module.exports.Htrans_msg = Htrans_msg;