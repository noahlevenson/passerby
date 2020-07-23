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
// 669800c5cb9858e59f3c8d5ce3f8127c1cc7feab

const readline = require("readline");
const { Happ } = require("../happ/happ.js");
const { Happ_env } = require("../happ/happ_env.js");
const { Hid } = require("../hid/hid.js");
const { Hlog } = require("../hlog/hlog.js");
const { Hgeo_rect } = require("../hgeo/hgeo_rect.js");
const { Hbigint } = Happ_env.BROWSER ? require("../htypes/hbigint/hbigint_browser.js") : require("../htypes/hbigint/hbigint_node.js");

const PROMPT = "hsh > ";

const GRAMMAR = new Map([
	["start", _start],
	["clear", _clear],
	["search", _search],
	["get", _get],
	["sms", _sms]
]);

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	prompt: PROMPT
});

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

async function _search(left, right, top, bottom) {
	const rect = new Hgeo_rect({
		left: parseFloat(left), 
		right: parseFloat(right), 
		top: parseFloat(top), 
		bottom: parseFloat(bottom)
	});
	
	const res = await happ.geosearch(rect);
	
	res.forEach((data) => {
		console.log(`${data[1].name}\t\t${data[1].peer_id.toString()}`);
	});
}

// TODO: write me
async function _get() {

}

async function _sms(peer_id) {
	const text = Array.from(arguments).slice(1).join(" ");
	const node_info = await happ.search_node_info(new Hbigint(peer_id));

	happ.hbuy.sms_req({
		text: text,
		from: happ.hid.public_data(),
		addr: node_info.addr,
		port: node_info.port
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
const id = new Hid({
	public_key: "123456789",
	name: "Noah Levenson",
	address: "31337 Nunya Business Ave. New Rochelle NY 10801",
	phone: "914-666-6666"
});
	
const happ = new Happ({hid: id, keepalive: false}); // Disabling keepalive just bc it's distracting for demos
rl.prompt();