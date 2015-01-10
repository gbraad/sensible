
// NODE INCLUDES

var	dgram = require ("dgram");
var	fs = require ("fs");
var	os = require ("os");

// REGULAR JS INCLUDES

// assume that sensible.js lives in the same directory as our mainline
var	code = fs.readFileSync (require ("path").dirname (process.argv [1]) + "/sensible.js");
eval (code.toString ());

if (process.argv.length < 3)
{
	console.log ("Usage: node resolve-address.js name");
	console.log ("name is something like redfishair2.local");
	process.exit (1);
}

var	mdns = new sensible.MDNS (new sensible.node.Strategy ());

mdns.start 
(
	function (inError)
	{
		mdns.resolveHost
		(
			process.argv [2],
			function (inHost)
			{
				console.log ("found " + inHost.name + " at " + inHost.address);
			}
		);
	}
);

var	stdin = process.openStdin ();

stdin.on
(
	"data", 
	function ()
	{
		process.exit (0);
	}
);

