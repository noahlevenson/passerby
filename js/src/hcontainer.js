
// Priority queue
class Hpriority_queue {
	#data;
	#length;
	#heap_size;

	constructor(arr) {
		// TODO: validate the input array
		this.#data = arr;
		this.#length = arr.length;
		this.#heap_size = arr.length;
		this._build_max_heap();
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

	_max_heapify(i) {
		while (Hpriority_queue._left(i) < this.#heap_size && Hpriority_queue._right(i) < this.#heap_size) {
			const left = Hpriority_queue._left(i);
			const right = Hpriority_queue._right(i);	
			let largest = i;

			if (this.#data[left] > this.#data[i]) {
				largest = left;
			}

			if (this.#data[right] > this.#data[largest]) {
				largest = right;
			}

			if (largest === i) {
				break;
			}

			const temp = this.#data[i];
			this.#data[i] = this.#data[largest];
			this.#data[largest] = temp;
			i = largest;
		}
	}

	_build_max_heap() {
		for (i = Math.floor(this.#length / 2); i >= 0; i -= 1) {
			this._max_heapify(i);
		}
	}

	_increase_key(i, key) {
		// TODO: catch key value error
		this.#data[i] = key;

		while (i > 0 && this.#data[Hpriority_queue._parent(i)] < this.#data[i]) {
			const temp = this.#data[Hpriority_queue._parent(i)];
			this.#data[Hpriority_queue._parent(i)] = this.#data[i];
			this.#data[i] = temp;
			i = Hpriority_queue._parent(i);
		}
	}

	max() {
		return this.#data[0];
	}

	extract_max() {
		// TODO: catch heap underflow
		const max = this.#data[0];
		this.#data[0] = this.#data[this.#heap_size - 1];
		this.#heap_size -= 1;
		this._max_heapify(0);
	}

	insert(key) {
		this.#data.push(Number.NEGATIVE_INFINITY);
		this.#heap_size += 1;
		this._increase_key(this.#heap_size - 1, key);
	}
}