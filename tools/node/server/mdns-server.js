
// NODE INCLUDES

var	dgram = require ("dgram");
var	fs = require ("fs");
var	os = require ("os");

// REGULAR JS INCLUDES

// assume that sensible.js lives in the same directory as our mainline
var	code = fs.readFileSync (require ("path").dirname (process.argv [1]) + "/sensible.js");
eval (code.toString ());

// MAINLINE

if (process.argv.length < 5)
{
	console.log ("Usage: node mdns-server.js name type port [text]");
	console.log ("eg node mdns-server.js BeerFridge _sensible._tcp.local 3000 beer-fridge-yo");
	process.exit (1);
}

var	mdns = new sensible.MDNS (new sensible.node.Strategy ());

mdns.start 
(
	function (inError)
	{
		var	registered = mdns.registerService
			(process.argv [2], process.argv [3], null, parseInt (process.argv [4]), process.argv [5]);

		if (registered)
		{
			console.log ("registered " + process.argv [2] + "." + process.argv [3] + " on port " + process.argv [4] + " ok");
		}
	}
);

// hang out doing packet stuff, quit on return press
var	stdin = process.openStdin ();

stdin.on
(
	"data", 
	function ()
	{
		process.exit (0);
	}
);
