
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
	console.log ("Usage: node resolve-service.js type");
	console.log ("type might be something like _ssh._tcp.local");
	process.exit (1);
}

var	mdns = new sensible.MDNS (new sensible.node.Strategy ());

mdns.start 
(
	function (inError)
	{
		mdns.resolveService
		(
			process.argv [2],
			function (inService)
			{
				console.log ("added " + inService.name +
					"." + inService.type +
					" at " + inService.host +
					":" + inService.port +
					" (" + inService.text + ")");
			},
			function (inService)
			{
				console.log ("removed " + inService.name +
					"." + inService.type +
					" at " + inService.host +
					":" + inService.port +
					" (" + inService.text + ")");
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

