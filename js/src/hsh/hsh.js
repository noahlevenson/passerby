/** 
* HSH
* HSH is an interactive shell for Heaven
*
*
*
*
*/ 

"use strict";

// for testing:
// search -73.86881 -73.70985 40.93391 40.86956

const readline = require("readline");
const util = require("util");
const { Happ } = require("../happ/happ.js");
const { Happ_env } = require("../happ/happ_env.js");
const { Hid_pub } = require("../hid/hid_pub.js");
const { Hbuy_order } = require("../hbuy/hbuy_order.js");
const { Hbuy_payment } = require("../hbuy/hbuy_payment.js");
const { Hbuy_transaction } = require("../hbuy/hbuy_transaction.js");
const { Hbuy_item_ref } = require("../hbuy/hbuy_item_ref.js");
const { Hlog } = require("../hlog/hlog.js");
const { Hgeo_rect } = require("../hgeo/hgeo_rect.js");
const { Hbigint } = Happ_env.ENV === Happ_env.ENV_TYPE.REACT_NATIVE ? require("../htypes/hbigint/hbigint_rn.js") : require("../htypes/hbigint/hbigint_node.js");

const { Larosa_menu } = require("../../test/menu.js");
const { Toms_hot_dogs_menu } = require("../../test/toms_hot_dogs_menu.js");

const PROMPT = "hsh > ";

const GRAMMAR = new Map([
	["bootstrap", _start],
	["clear", _clear],
	["search", _search],
	["getmenu", _get],
	["sms", _sms],
	["order", _order],
	["add", _add],
	["checkout", _checkout],
	["phtstat", _phtstat]
]);

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	prompt: PROMPT
});

let order = null;
let order_menu_id = null;

async function _on_input(input) {
	const tok = input.trim().split(" ");
	const f = GRAMMAR.get(tok[0]);

	if (!f) {
		console.log(`Bad command ${tok[0]}`);
		return;
	}

	try {
		await f(...tok.slice(1));
	} catch (err) {
		console.log(`Fatal error ${err}`);
	}
}

// *** COMMAND HANDLERS
async function _start() {
	if (happ.node !== null) {
		console.log("A connection has already been started. To make a new connection, start a new hsh session.");
		return;
	}

	await happ.start();

	happ.hbuy.on_sms((req, rinfo) => {
		Hlog.log("");
		Hlog.log(`SMS FROM ${req.data.from.name}: "${req.data.text}"`);
		Hlog.log("");
	});
}

function _clear() {
	console.clear();
}

async function _phtstat() {
	await happ.hpht._debug_print_stats();
}

async function _search(left, right, top, bottom) {
	const rect = new Hgeo_rect({
		left: parseFloat(left), 
		right: parseFloat(right), 
		top: parseFloat(top), 
		bottom: parseFloat(bottom)
	});
	
	const res = await happ.geosearch(rect);

	console.log(util.inspect(res, false, 5, true /* enable colors */))
	
	// res.forEach((data) => {
	// 	console.log(`${data[1].name}\t\t${data[1].peer_id.toString()}`);
	// });
}

// TODO: this is all simulated for the August 2020 demo - gotta make this actually work!
async function _get() {
	// console.log(Larosa_menu);
	const peer_id = new Hbigint(parseInt(arguments[0]));

	if (peer_id.equals(new Hbigint(585706839200458884925582279788146498654114938539))) {
		console.log(util.inspect(Larosa_menu.get_full_list(), {showHidden: false, depth: 4, colors: true, compact: 10, breakLength: 200}));
	} else {
		console.log(util.inspect(Toms_hot_dogs_menu.get_full_list(), {showHidden: false, depth: 4, colors: true, compact: 10, breakLength: 200}));
	}

	// const larosa = Larosa_menu.get_full_list();
	// console.log(`Menu ID: ${Larosa_menu.get_form_id()}`)
	// let item_idx = 0;

	// larosa.forEach((elem) => {
	// 	if (typeof elem === "string") {
	// 		console.log(`\n\n\x1b[4m** ${elem} **`);
	// 	} else {
	// 		console.log(`\x1b[0m\n  [${item_idx++}] ${elem.name} ${elem.desc ? "-" : ""} ${elem.desc}`);

	// 		let size_idx = 0;
			
	// 		elem.sizes.forEach((size) => {
	// 			console.log(`  [${size_idx++}]${size.desc ? " " + size.desc : ""} $${size.price.toFixed(2)}`)

	// 			let customization_idx = 0;

	// 			size.cust_cats.forEach((cust_cat) => {
	// 				console.log(`  [${customization_idx++}] CUSTOMIZATION: ${cust_cat.desc} (${cust_cat.custs.length} avail)`)
	// 			});
	// 		});
	// 	}
	// });
}

async function _sms(peer_id) {
	const text = Array.from(arguments).slice(1).join(" ");
	const node_info = await happ.search_node_info(new Hbigint(peer_id));

	happ.hbuy.sms_req({
		text: text,
		from: happ.hid_pub,
		addr: node_info.addr,
		port: node_info.port
	});
}

function _order(menu_id) {
	if (!menu_id) {
		console.log("You must specify a menu ID to start an order.");
		return;
	}

	order = new Hbuy_order({type: Hbuy_order.TYPE.DELIVERY});
	order_menu_id = menu_id;
	console.log(`OK, started a new order from menu ID ${menu_id}`);
}

function _add() {
	const args = Array.from(arguments);

	let comment;

	if (args.indexOf("#") !== -1) {
		comment = args.slice(args.indexOf("#") + 1).join(" ");
	}

	const cust_cats = [];
	let fidx = 0;

	while (args.indexOf("?", fidx) !== -1) {
		let start = args.indexOf("?", fidx) + 1;
		let end = start;

		while (end < args.length && args[end] !== "?" && args[end] !== "#") {
			end += 1;
		}

		cust_cats.push(args.slice(start, end));
		fidx = end;
	}

	const item_ref = new Hbuy_item_ref({
		form_id: order_menu_id,
		item_list_idx: args[0],
		size_idx: args[1],
		cust_cats_idx: cust_cats,
		comment: comment
	});

	order.add(item_ref);
	console.log("Item added!");
}

function _checkout() {
	if (order === null) {
		console.log("You must create an order before checking out.");
		return;
	}

	const transaction = new Hbuy_transaction({
		order: order,
		payment: payment,
		hid_pub: id,
		id: Hbigint.random(Hbuy_transaction.ID_LEN)
	});
}

// *** MAIN ENTRY POINT
Hlog.set_log((msg) => {
	readline.cursorTo(process.stdout, 0);
	console.log(msg);
	rl.prompt();
});

rl.on("line", async (input) => {
	if (input.length > 0) {
		await _on_input(input);
	}
	
	rl.prompt();
});

// TODO: Hid should come from a local .env file or command line args
const id = new Hid_pub({
	public_key: "123456789",
	name: "Noah Levenson",
	address: "31337 Nunya Business Ave. New Rochelle NY 10801",
	phone: "914-666-6666"
});

// TODO: Hbuy_payment should come from a local .env file or command line args
const payment = new Hbuy_payment({
	pan: 370434978532007,
	exp_year: 26,
	exp_month: 11,
	cvv: 7021,
	name: "Noah Levenson",
	zip: 10801
});
	
const happ = new Happ({hid_pub: id, keepalive: false}); // Disabling keepalive just bc it's distracting for demos
rl.prompt();
