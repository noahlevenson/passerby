const EventEmitter = require("events");
const { Hkad_eng } = require("../hkad_eng.js");
const { Hkad_msg } = require("../hkad_msg.js");

// Hkad_eng_alpha is a hoodnet message engine module that takes an event-driven approach and uses promises to avoid keeping message state
class Hkad_eng_alpha extends Hkad_eng {
	static TIMEOUT = 5000;
	static RES_EVENT_PREFIX = "r+";
	
	res;

	constructor() {
		super();
		this.res = new EventEmitter();

		// I want to see this.node in the constructor for code comprehension
	}
	
	_on_message(msg) {
		// Assuming the message is already deserialized & validated to be an Hkad_msg object!

		// First, update the appropriate k-bucket for the sender's node ID
		this.node._update_kbucket(msg);
		
		if (msg.type === Hkad_msg.TYPE.RES) {
			// console.log(`Node ${this.node.node_info.node_id.toString(16)} received a res from node ${msg.from.node_id.toString(16)}`)
			this.res.emit(`${Hkad_eng_alpha.RES_EVENT_PREFIX}${msg.id}`, msg);
			return;
		}

		// The incoming message is req rather than a res, so just forward it to the protocol layer for decoding and further actions
		// console.log(`Node ${this.node.node_info.node_id.toString(16)} received a req from node ${msg.from.node_id.toString(16)}`)
		this.node._on_req(msg); // TODO: A question to answer - what's the interface and contract? Currently responses fire an event and 
									// this event is monitored within this module -- Hnodes don't have to listen for Heng response events, Hnodes just
									// need to specify what they want to do in a callback function - so is it also logical that 
									// Hnode wouldn't listen for Heng req events, but rather, Heng would similarly do the work of just magically making them appear in the protocol layer?
	}

	// When we send a message, if the message is a request, we set up listeners and handlers for a potential response
	_send(msg, node_info, success, timeout)  {
		if (msg.type === Hkad_msg.TYPE.REQ) {
			const outgoing = new Promise((resolve, reject) => {
				const timeout_id = setTimeout(() => {
					// console.log(`req timed out for msg ${msg.id.toString(16)}`);
					this.res.removeAllListeners(`${Hkad_eng_alpha.RES_EVENT_PREFIX}${msg.id}`);
					reject(); // Maybe we should reject with a proper error code etc
				}, Hkad_eng_alpha.TIMEOUT);

				this.res.once(`${Hkad_eng_alpha.RES_EVENT_PREFIX}${msg.id}`, (res_msg) => {
					clearTimeout(timeout_id);

					if (typeof success === "function") {
						success(res_msg, this.node);
					}

					resolve(); // Maybe we should resolve with a value
				});
			}).catch((reason) => {
				if (typeof timeout === "function") {
					timeout();
				}
			});
		}

		this.node.trans._out(msg, node_info);	
	}
}

module.exports.Hkad_eng_alpha = Hkad_eng_alpha;