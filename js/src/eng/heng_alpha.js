const EventEmitter = require("events");
const { Heng } = require("../heng.js");
const { Hmsg } = require("../hmsg.js");

// Heng_alpha is a hoodnet message engine module that takes an event-driven approach and uses promises to avoid keeping message state
class Heng_alpha extends Heng {
	static TIMEOUT = 5000;
	static REPLY_EVENT_PREFIX = "r+";

	constructor() {
		super();
		this.reply = new EventEmitter();  // "Response" is more accurate than reply, this should be changed everywhere

		// I want to see this.node in the constructor for code comprehension
	}
	
	on_message(msg) {
		// Assuming the message is already deserialized & validated to be an Hmsg object!
		if (msg.reply) {
			console.log(`Node ${this.node.node_info.node_id.toString(16)} received a reply from node ${msg.from.node_id.toString(16)}`)
			this.reply.emit(`${Heng_alpha.REPLY_EVENT_PREFIX}${msg.id}`, msg);
			return;
		}

		// The incoming message is request rather than a reply, so just forward it to the protocol layer for decoding and further actions
		console.log(`Node ${this.node.node_info.node_id.toString(16)} received a request from node ${msg.from.node_id.toString(16)}`)
		this.node._on_message(msg);
	}

	// Currently we only listen for replies if the outgoing message is not a reply
	// Not sure if there's some cases where we want to send a reply and continue to listen for a reply
	send(msg, node_info, cb)  {
		if (!msg.reply) {
			const outgoing = new Promise((resolve, reject) => {
				const timeout_id = setTimeout(() => {
					console.log(`Request timed out for msg ${msg.id.toString(16)
					}`);
					reject(); // Maybe we should reject with a proper error code etc
				}, Heng_alpha.TIMEOUT);

				this.reply.once(`${Heng_alpha.REPLY_EVENT_PREFIX}${msg.id}`, (reply_msg) => {
					clearTimeout(timeout_id);

					if (typeof cb === "function") {
						cb(reply_msg);
					}

					resolve();
				});
			}).catch((reason) => {
				// The request timed out, let it go away and do nothing
			});
		}

		this.node.transport.out(msg, node_info);	
	}
}

module.exports.Heng_alpha = Heng_alpha;