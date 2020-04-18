// Class for a hoodnet k-bucket
class Hkbucket {
	#size;
	#data;

	constructor({size} = {}) {
		// TODO: If no size, throw error
		this.#size = size;
		this.#data = new Array(size);
	}

	_push(node_info) {
		this.#data.push(node_info);
		this.#data.shift();
	}

	at(i) {
		return this.#data[i];
	}

	exists(node_info) {
		for (let i = 0; i < this.#data.length; i += 1) {
			if (this.#data[i] && this.#data[i].node_id === node_info.node_id) {
				return i;
			}
		}

		return null;
	}

	move_to_tail(i) {
		this.#data.push(this.#data.splice(i, 1)[0]);
	}

	is_full() {
		return this.#data.some((elem) => {
			elem !== undefined;
		});
	}

	length() {
		return this.#data.length;
	}

	print() {
		console.log(this.#data);
	}
}

module.exports.Hkbucket = Hkbucket;