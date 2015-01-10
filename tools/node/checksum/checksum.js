// ok so this is an in-memory (so far) TCP proxy for mDNS

// call /dns/registerservice to register your service
// with name (eg My Gadget), type (eg _ssh._tcp), and port
// call /dns/resolveservice to find things
// with type (eg _ssh._tcp)

// NODE INCLUDES

// standard stuff
var	dgram = require ("dgram");
var	fs = require ("fs");
var	http = require ("http");
var	os = require ("os");
var	url = require ("url");

// REGULAR JS INCLUDES

// save away the dirname here as we reuse it for the config load
var	directory = require ("path").dirname (process.argv [1]);

// assume that sensible.js lives in the same directory as our mainline
var	code = fs.readFileSync (directory + "/sensible.js");
eval (code.toString ());

// MAINLINE

var	mdns = new MDNS (new sensible.node.Strategy ());

var	packet = new DNSPacket ();
packet.id = 0;
packet.flags = 0x8400;

var	service =
{
	name: "Jason's Arduino",
	type: "_arduino._tcp.local",
	host: "10.0.1.11"
};

packet.answers.push (mdns.makePTRRecord (service));

var	buffer = packet.serialise ();

console.log ("packet is length " + buffer.byteLength);

var	view = new Uint8Array (buffer);
var	checksum = 0;

for (var i = 0; i < buffer.byteLength; i++)
{
	console.log ("packet [" + i + "] = " + buffer [i]);
	checksum += buffer [i];
}

console.log ("checksum is " + checksum);
