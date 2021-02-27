const { Hbintree } = require("../src/htypes/hbintree/hbintree.js");
const { Hutil } = require("../src/hutil/hutil.js");

const data = ["1", "2", "3", "4", "5"];

const mt = Hbintree.build_merkle(data.map(d => Hutil._sha256(d)));

const leafs = mt.dfs((node, data) => {
	if (node.get_left() === null && node.get_right() === null) {
		data.push(node);
	}

	return data;
});

// 5 leafs - seems legit
console.log(leafs);

// 9 total nodes in the tree
console.log(mt.size());

// 4 positive reports + 5 leaf nodes = this merkle tree seems chill
mt.dfs((node, data) => {
	// If this node has no children, its a leaf node and its hash is not a concatenation of anything
	if (node.get_left() === null && node.get_right() === null) {
		return;
	}

	// If this node has both children, then its hash should be a concatenation of them
	// If it only has one child, its hash should be a concatenation of that child with itself
	const left = node.get_left().get_data();
	const right = node.get_right() !== null ? node.get_right().get_data() : left;

	// If this node's hash doesn't equal its child concatenation, this merkle tree is bugged bro
	if (node.get_data() !== Hutil._sha256(`${left}${right}`)) {
		console.log("Error bro");
	} else {
		console.log("Node is good");
	}
});

console.log(mt);