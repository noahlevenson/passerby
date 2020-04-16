// Priority queue node
class Hq_node {
	#obj;
	#key;

	constructor(obj, key) {
		this.#obj = obj;
		this.#key = key;
	}

	get_obj() {
		return this.#obj;
	}

	get_key() {
		return this.#key;
	}

	set_key(key) {
		this.#key = key;
	}
}

// Max priority queue
class Hmin_priority_queue {
	#data;
	#length; // Why is this here?
	#heap_size;

	constructor() {
		// TODO: validate the input array
		this.#data = [];
		this.#length = this.#data.length;
		this.#heap_size = this.#data.length;
		// this._build_max_heap();
	}

	static _left(i) {
		return i * 2;
	}

	static _right(i) {
		return i * 2 + 1;
	}

	static _parent(i) {
		return i >> 1;
	}

	// _max_heapify(i) {
	// 	while (Hpriority_queue._left(i) < this.#heap_size && Hpriority_queue._right(i) < this.#heap_size) {
	// 		const left = Hpriority_queue._left(i);
	// 		const right = Hpriority_queue._right(i);	
	// 		let largest = i;

	// 		if (this.#data[left] > this.#data[i]) {
	// 			largest = left;
	// 		}

	// 		if (this.#data[right] > this.#data[largest]) {
	// 			largest = right;
	// 		}

	// 		if (largest === i) {
	// 			break;
	// 		}

	// 		const temp = this.#data[i];
	// 		this.#data[i] = this.#data[largest];
	// 		this.#data[largest] = temp;
	// 		i = largest;
	// 	}
	// }

	// _build_max_heap() {
	// 	for (i = Math.floor(this.#length / 2); i >= 0; i -= 1) {
	// 		this._max_heapify(i);
	// 	}
	// }

	_decrease_key(i, key) {
		// TODO: catch key value too large error
		this.#data[i].set_key(key);

		while (i > 0 && this.#data[Hmin_priority_queue._parent(i)].get_key() > this.#data[i].get_key()) {
			const temp = this.#data[Hmin_priority_queue._parent(i)];
			this.#data[Hmin_priority_queue._parent(i)] = this.#data[i];
			this.#data[i] = temp;
			i = Hmin_priority_queue._parent(i);
		}
	}

	min() {
		return this.#data[0];
	}

	// extract_max() {
	// 	// TODO: catch heap underflow
	// 	const max = this.#data[0];
	// 	this.#data[0] = this.#data[this.#heap_size - 1];
	// 	this.#heap_size -= 1;
	// 	this._max_heapify(0);
	// 	return max;
	// }

	insert(obj, key) {
		this.#data.push(new Hq_node(obj, Number.POSITIVE_INFINITY));
		this.#heap_size += 1;
		this._decrease_key(this.#heap_size - 1, key);
	}

	print() {
		this.#data.forEach((node) => {
			console.log(`key: ${node.get_key()} =>`, node.get_obj());
		});
	}
}

module.exports = { Hmin_priority_queue };