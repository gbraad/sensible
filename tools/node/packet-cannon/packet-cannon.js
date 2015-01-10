
// NODE INCLUDES

var	dgram = require ("dgram");
var	fs = require ("fs");
var	os = require ("os");

// REGULAR JS INCLUDES

// assume that sensible.js lives in the same directory as our mainline
var	code = fs.readFileSync (require ("path").dirname (process.argv [1]) + "/sensible.js");
eval (code.toString ());

if (process.argv.length < 4)
{
	console.log ("Usage: node packet-cannon.js host port");
	process.exit (1);
}

var	strategy = new sensible.node.Strategy ();

strategy.open
(
	5000,
	function ()
	{
		var	packet = new sensible.DNSPacket ();
		packet.id = 0;
		packet.flags = 0;
		
		var	question =
		{
			name: "_sensible._tcp.local",
			type: 12,
			clas: 1
		}
		
		packet.questions.push (question);
	
		var	buffer = packet.serialise ();
		
		setInterval
		(
			function ()
			{
				console.log ("sending to " + process.argv [2] + ":" + process.argv [3]);
				strategy.send (buffer, process.argv [2], parseInt (process.argv [3]));
			},
			1000
		);
	}
);

		