const { Fid } = require("../src/fid/fid.js");
const { Fapp } = require("../src/fapp/fapp.js");
const { Fgeo_rect } = require("../src/fgeo/fgeo_rect.js");
const { Fgeo_coord } = require("../src/fgeo/fgeo_coord.js");
const { Fkad_net_sim } = require("../src/fkad/net/fkad_net_sim.js");
const { Fbigint } = require("../src/ftypes/fbigint/fbigint_node.js");

(async function run() {
    const bootstrap_node_fid = new Fid({
        public_key: "debug_bootstrap_node_public_key",
        private_key: "debug_bootstrap_node_private_key",
        name: "",
        address: "",
        phone: "",
        lat: 0,
        long: 0
    });

    const bootstrap_node = new Fapp({lat: 0, long: 0});
    const local_sim = new Fkad_net_sim();
    await bootstrap_node._debug_sim_start({local_sim: local_sim});
    
    for (let i = 0; i < 300; i += 1) {
        const node_fid = new Fid({
            public_key: i.toString(),
            private_key: i.toString(),
            name: "",
            address: "",
            phone: "",
            lat: 0,
            long: 0
        });
        
        const node = new Fapp({fid: node_fid});
        await node._debug_sim_start({bootstrap_node: bootstrap_node, local_sim: local_sim});
    }
    
    const larosa = new Fid({
        public_key: "debug_la_rosa_public_key",
        private_key: "debug_la_rosa_private_key",
        name: "Pizzeria La Rosa",
        address: "12 Russell Ave. New Rochelle NY 10801",
        phone: "914-633-0800",
        lat: 40.9018663,
        long: -73.7912739
    });

    const me = new Fapp({fid: larosa});
    await me._debug_sim_start({bootstrap_node: bootstrap_node, local_sim: local_sim, use_local_sim: true, random_id: false});
    
    for (let i = 0; i < 500; i += 1) {
        await me.fpht.insert(new Fbigint(i), i);
    }

    for (let i = 0; i < 500; i += 1) {
        await me.fpht.delete(new Fbigint(i));
    }

    await me.fpht._debug_print_stats();
    local_sim._debug_dump_network_state();

    me.node._debug_print_routing_table();
    
    /**
    await network.start();
    await network.put("Pizzeria La Rosa MENU DATA");
    
    const westchester = new Fgeo_rect({bottom: 40.86956, left: -73.86881, top: 40.93391, right: -73.70985});
    
    // *** non-API functions -- PUTting menu data not associated with our geolocation...
    const spumoni_gardens = new Fgeo_coord({lat: 40.5947235, long: -73.98131332751743});
    await network.fpht.insert(spumoni_gardens.linearize(), "L&B Spumoni Gardens");

    const pinos = new Fgeo_coord({lat: 40.6713257, long: -73.9776937});
    await network.fpht.insert(pinos.linearize(), "Pino's La Forchetta");

    const modern_pizza = new Fgeo_coord({lat: 40.9089094, long: -73.7842226});
    await network.fpht.insert(modern_pizza.linearize(), "Modern Pizza & Restaurant");
    // ***

    const search_res = await network.geosearch(westchester);
    console.log(search_res);

    **/ 
})();
