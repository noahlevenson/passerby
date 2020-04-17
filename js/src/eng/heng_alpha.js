const EventEmitter = require("events");
const { Heng } = require("../heng.js");
const { Hmsg } = require("../hmsg.js");
const { Hnode } = require("../hnode.js"); // BAD circular dependency - gotta move functions off of Hnode
const { Hutil } = require("../hutil.js");


// Heng_alpha is a hoodnet message engine module that takes an event-driven approach and uses promises to avoid keeping message state
class Heng_alpha extends Heng {
	static TIMEOUT = 5000;
	static RES_EVENT_PREFIX = "r+";

	constructor() {
		super();
		this.res = new EventEmitter();  // "Response" is more accurate than res, this should be changed everywhere

		// I want to see this.node in the constructor for code comprehension
	}
	
	on_message(msg) {
		// Assuming the message is already deserialized & validated to be an Hmsg object!

		// First, update the appropriate k-bucket for the sender's node ID
	
		// ******* THIS SHOULD BE MOVED TO A FUNCTION ON THE HNODE *************************
		// we just call it like:  this.node._update_kbucket(msg.from)
		const d = Hnode.get_distance(msg.from.node_id, this.node.node_id);
		const b = Hutil._log2(d);
		const bucket = this.node.get_kbucket(b);

		const i = bucket.exists(msg.from);

		if (i !== null) {
			bucket.move_to_tail(i);
		} else if (!bucket.is_full()) {
			bucket.push(msg.from);
		} else {
			this.node.ping(bucket.at(0), (res, ctx) => {
				const d = Hnode.get_distance(res.from.node_id, ctx.node.node_id);
				const b = Hutil._log2(d);
				const bucket = ctx.node.get_kbucket(b);

				const i = bucket.exists(res.from);

				if (i !== null) {
					bucket.move_to_tail(i);
				}
			});

			// NEED TO HANDLE THE TIMEOUT CASE!!!!!!!!!
		}
		// *********************************************************************************
		

		if (msg.res) {
			// console.log(`Node ${this.node.node_info.node_id.toString(16)} received a res from node ${msg.from.node_id.toString(16)}`)
			this.res.emit(`${Heng_alpha.RES_EVENT_PREFIX}${msg.id}`, msg);
			return;
		}

		// The incoming message is req rather than a res, so just forward it to the protocol layer for decoding and further actions
		// console.log(`Node ${this.node.node_info.node_id.toString(16)} received a req from node ${msg.from.node_id.toString(16)}`)
		this.node._on_req(msg); // TODO: A question to answer - what's the interface and contract? Currently responses fire an event and 
									// this event is monitored within this module -- Hnodes don't have to listen for Heng response events, Hnodes just
									// need to specify what they want to do in a callback function - so is it also logical that 
									// Hnode wouldn't listen for Heng req events, but rather, Heng would similarly do the work of just magically making them appear in the protocol layer?
	}

	// Currently we only listen for responses if the outgoing message is not a res
	// Not sure if there's some cases where we want to send a res and continue to listen for a res
	send(msg, node_info, cb)  {
		if (!msg.res) {
			const outgoing = new Promise((resolve, reject) => {
				const timeout_id = setTimeout(() => {
					console.log(`req timed out for msg ${msg.id.toString(16)}`);
					this.res.removeAllListeners(`${Heng_alpha.RES_EVENT_PREFIX}${msg.id}`);
					reject(); // Maybe we should reject with a proper error code etc
				}, Heng_alpha.TIMEOUT);

				this.res.once(`${Heng_alpha.RES_EVENT_PREFIX}${msg.id}`, (res_msg) => {
					clearTimeout(timeout_id);

					if (typeof cb === "function") {
						cb(res_msg, this.node);
					}

					resolve();
				});
			}).catch((reason) => {
				// The req timed out, let it go away and do nothing
			});
		}

		this.node.transport.out(msg, node_info);	
	}
}

module.exports.Heng_alpha = Heng_alpha;