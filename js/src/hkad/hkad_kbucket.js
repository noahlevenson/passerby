// Class for a hoodnet k-bucket
class Hkad_kbucket {
	size;
	data;

	constructor({size} = {}) {
		// TODO: If no size, throw error
		this.size = size;
		this.data = [];

		for (let i = 0; i < this.size; i += 1) {
			this.data.push(undefined);
		}
	}

	// NEVER call this without first checking if the bucket _exists() first 
	// TODO: We should probably join the functions to prevent some of the nasty bugs I've enjoyed introducing
	_push(node_info) {
		this.data.push(node_info);
		this.data.shift();
	}

	at(i) {
		return this.data[i];
	}

	exists(node_info) {
		for (let i = 0; i < this.data.length; i += 1) {
			if (this.data[i] && this.data[i].node_id.equals(node_info.node_id)) {
				return i;
			}
		}

		return null;
	}

	move_to_tail(i) {
		const popped = this.data.splice(i, 1)[0];
		this.data.push(popped);
	}

	is_full() {
		const res = this.data.every((node_info) => {
			return node_info !== undefined;
		});

		return res;
	}

	length() {
		return this.data.length;
	}

	print() {
		console.log(this.data);
	}

	// This is a gross hack, let's rethink the entire kbucket implementation to avoid this
	// Also, it's not even a deep copy -- it's just refs to the node_info objects
	copy_to_arr() {
		const arr = [];

		for (let i = this.data.length - 1; i >= 0; i -= 1) {
			if (this.data[i]) {
				arr.push(this.data[i]);
			}
		}

		return arr;
	}
}

module.exports.Hkad_kbucket = Hkad_kbucket;