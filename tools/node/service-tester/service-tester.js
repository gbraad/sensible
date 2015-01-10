
// NODE INCLUDES

var	dgram = require ("dgram");
var	fs = require ("fs");
var	os = require ("os");

// REGULAR JS INCLUDES

// assume that sensible.js lives in the same directory as our mainline
var	code = fs.readFileSync (require ("path").dirname (process.argv [1]) + "/sensible.js");
eval (code.toString ());

var	mdns = new sensible.MDNS (new sensible.node.Strategy ());

mdns.start 
(
	function (inError)
	{
		// register service, should work
		var	registered = mdns.registerService ("MDNS Tester", "_test._tcp.local", null, 3500, "text record");
		console.log ("register service, expect object, actual result is " + registered);
		
		// try again, should fail
		registered = mdns.registerService ("MDNS Tester", "_test._tcp.local", null, 3500, "text record");
		console.log ("register service again, expect null, actual result is " + registered);
		
		// unregister, should work
		registered = mdns.unregisterService (null, 3500);
		console.log ("unregister service, expect true, actual result is " + registered);

		// unregister again, should fail
		registered = mdns.unregisterService (null, 3500);
		console.log ("unregister service again, expect false, actual result is " + registered);

		// register service, should work
		registered = mdns.registerService ("MDNS Tester", "_test._tcp.local", null, 3500, "text record");
		console.log ("register service, expect object, actual result is " + registered);
		
		// now try to find ourselves
		var	response = null;
		
		var	resolution = mdns.resolveService
		(
			"_test._tcp.local",
			function (inResolutionInfo)
			{
				console.log ("resolve() calls back with " + inResolutionInfo.name);
				response = inResolutionInfo;
			}
		);

		console.log ("resolve type, expect object, actual result is " + resolution);
		
		// now wait for a few seconds
		setTimeout
		(
			function ()
			{
				if (response == null)
				{
					console.log ("sadly no response was received...");
				}
				else
				{
					console.log ("response received, checking contents");
					console.log ("name check ? " + (response.name == registered.name));
					console.log ("type check ? " + (response.type == registered.type));
					console.log ("host check ? " + (response.host == registered.host));
					console.log ("port check ? " + (response.port == registered.port));
					console.log ("text check ? " + (response.text == registered.text));
				}
			},
			2000
		);
	}
);

