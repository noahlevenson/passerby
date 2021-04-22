const { Fgraph } = require("../src/ftypes/fgraph/fgraph.js");

const wot = new Fgraph();

wot.add_edge("john", "brian");
wot.add_edge("brian", "john");
wot.add_edge("brian", "rick");
wot.add_edge("rick", "brian");

wot.add_edge("john", "steve");
wot.add_edge("steve", "mike");
wot.add_edge("steve", "billy");

wot.add_edge("billy", "steve");

console.log(wot.scc());