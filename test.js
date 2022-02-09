const Crypto = require("./src/core/crypto.js");
const { Passerby } = require("./src/protocol/protocol.js");
const { Udp } = require("./src/transport/udp/udp.js");
const { Rinfo } = require("./src/transport/transport.js");
const { Identity } = require("./src/protocol/identity.js");

(async () => {
  await Crypto.Sodium.ready;

  // const my_rinfo = new Rinfo({address: "127.0.0.1", port: 27500, family: "IPv4"});
  const my_identity = new Identity();
  
  const passerby = new Passerby({transport: new Udp()});
  await passerby.start("23.92.31.85", 27500, my_identity.public_key);
})();
