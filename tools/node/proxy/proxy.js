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

// installed stuff, we hardcode paths to get around all kinds of node stupidity
var	websocket = require ("websocket");

// REGULAR JS INCLUDES

// save away the dirname here as we reuse it for the config load
var	directory = require ("path").dirname (process.argv [1]);

// chdir as we're a web server
process.chdir (directory);

// assume that sensible.js lives in the same directory as our mainline
var	code = fs.readFileSync ("sensible.js");
eval (code.toString ());

// MAINLINE

var	gHTTPServer = null;
var	gWebSocketServer = null;

var	gServices = new Object ();
var	gServiceResolutionsByType = new Object ();

var	gHosts = new Object ();
var	gHostResolutionsByName = new Object ();

var	gWebSockets = new Object ();

var	config = null;

if (fs.existsSync ("proxy-config.json"))
{
	config = JSON.parse (fs.readFileSync ("proxy-config.json"));
}
else
{
	config = new Object ();
}

var	gMDNS = new sensible.MDNS (new sensible.node.Strategy ());

gMDNS.start
(
	function ()
	{
		var	serviceResolutions = config ["service-resolutions"];
		
		if (serviceResolutions)
		{
			for (var i = 0; i < serviceResolutions.length; i++)
			{
				console.log ("found init resolution: " + serviceResolutions [i]);
				
				// essentially ask the MDNS service to request for
				// and start caching responses for this type
				// ASSUME callback is optional
				resolveService (serviceResolutions [i]);
			}
		}

		if (typeof (config.port) != "number" || config.port < 0)
		{
			console.log ("no port in config, defaulting to 8000");
			config.port = 8000;
		}
		
		console.log ("listening on port " + config.port);
		
		// note this is our HTTP server that actually does POST correctly...
		gHTTPServer = new sensible.node.Server (config.port, global);
	}
);

// private

// ASSUME type is lowercased
function
resolveService (inType)
{
	var	cachedServices = null;
	
	var	resolution = gServiceResolutionsByType [inType];
	
	if (resolution)
	{
		resolution.count++;
	}
	else
	{
		resolution = new Object ();
		resolution.count = 1;
		resolution.resolution = gMDNS.resolveService (inType, onServiceFound, onServiceExpired);
		
		gServiceResolutionsByType [inType] = resolution;
	}
}

function
updateWebSocketHosts (inWebSocket)
{
	var	name = null;
	var	host = null;
	
	var	webSocketEntry = gWebSockets [inWebSocket];
	
	for (name in webSocketEntry.hosts)
	{
		if (gHosts [name])
		{
			host = gHosts [name];
			break;
		}
	}
	
	// console.log ("sending " + services.length + " services back");
	
	if (host)
	{
		var	responseObject = 
		{
			controller: "mdns",
			action: "resolvehost",
			data: 
			{
				name: name,
				host: host
			}
		};
		
		// we have to use the socket in the entry itself
		// as the "key" socket doesn't actually work as a socket
		// wtf?
		console.log ("send back");
		console.log (JSON.stringify (responseObject));
		webSocketEntry.socket.sendUTF (JSON.stringify (responseObject));
	}
}

function
updateWebSocketServices (inWebSocket)
{
	var	services = new Array ();
	
	var	webSocketEntry = gWebSockets [inWebSocket];
	
	for (var type in webSocketEntry.services)
	{
		if (gServices [type])
		{
			for (var service in gServices [type])
			{
				services.push (gServices [type][service]);
			}
		}
	}
	
	// console.log ("sending " + services.length + " services back");
	
	if (services.length > 0)
	{
		var	responseObject = 
		{
			controller: "mdns",
			action: "resolveservice",
			data: services
		};
		
		// we have to use the socket in the entry itself
		// as the "key" socket doesn't actually work as a socket
		// wtf?
		console.log ("send back");
		console.log (JSON.stringify (responseObject));
		webSocketEntry.socket.sendUTF (JSON.stringify (responseObject));
	}
}

// called when we get a resolution callback from MDNS
function
onServiceExpired (inServiceInfo)
{
	// console.log ("onServiceExpired() for " + inName + "." + inType);

	var	lowerCaseType = inServiceInfo.type.toLowerCase ();
	var	key = inServiceInfo.host + ":" + inServiceInfo.port;

	delete gServices [lowerCaseType][key];
}

// called when we get a resolution callback from MDNS
function
onServiceFound (inServiceInfo)
{
	console.log ("onServiceFound() for " + inServiceInfo.name + "." + inServiceInfo.type);
	
	var	lowerCaseType = inServiceInfo.type.toLowerCase ();
  
    console.log ("after lower case: " + lowerCaseType);
	
	if (!gServices [lowerCaseType])
	{
		gServices [lowerCaseType] = new Object ();
	}
	
	// if this record matches the one we have, we don't update anyone
	var	update = true;

	var	key = inServiceInfo.host + ":" + inServiceInfo.port;
	var	service = gServices [lowerCaseType][key];
  
    console.log ("key is: " + key);
    console.log ("service is: " + service)
	
	if (service)
	{
		if (service.name == inServiceInfo.name && service.text == inServiceInfo.text)
		{
			// console.log ("response for " + inName + " is duplicate, ignoring");
			update = false;
		}
	}
	
	if (update)
	{
		var	serviceObject = 
		{
			name: inServiceInfo.name,
			type: lowerCaseType,
			host: inServiceInfo.host,
			port: inServiceInfo.port,
			text: inServiceInfo.text,
			ttl: inServiceInfo.ttl
		};
		
		gServices [lowerCaseType][key] = serviceObject;
	
		if (typeof (serviceObject.ttl) != "number" || serviceObject.ttl <= 0)
		{
			// 4500 seems to be the default TTL
			// == 75 minutes
			serviceObject.ttl = 4500;
		}
		
		// update all our WS clients
		// we want to send a full set to each one
		for (var webSocket in gWebSockets)
		{
			if (gWebSockets [webSocket].services [lowerCaseType])
			{
				// console.log ("sending async updates for clients of " + lowerCaseType);
				updateWebSocketServices (webSocket);
			}
		}
	}
}

// callbacks from NodeServer

global.onWebSocketOpen = function
onWebSocketOpen (inWebSocket)
{
	if (!gWebSockets [inWebSocket])
	{
		console.log ("adding websocket");
		
		var	ws = new Object ();
		ws.services = new Object ();
		ws.hosts = new Object ();
	
		// for some reason this never works as a key?!?
		ws.socket = inWebSocket;
		
		gWebSockets [inWebSocket] = ws;
	}
}

global.onWebSocketClose = function
onWebSocketClose (inWebSocket)
{
	console.log ("removing websocket");
	delete gWebSockets [inWebSocket];
}

// REST handlers

global.mdns_get = function
mdns_get (inRequestParams)
{
	return gServices;
}

// essentially, start caching host responses for this type
global.mdns_listenhost = function
mdns_listenhost (inRequestParams)
{
	var	name = inRequestParams.name;

	if (name == null || name.length == 0)
	{
		throw new Error ("listenhost request without name");
	}
	
	var	lowerCaseName = name.toLowerCase ();
	var	resolution = gHostResolutionsByName [lowerCaseName];
	
	if (resolution)
	{
		resolution.count++;
	}
	else
	{
		resolution = new Object ();
		resolution.count = 1;
		
		resolution.resolution = gMDNS.resolveHost 
		(
			name,
			function (inName, inHost)
			{
				// console.log ("MDNS.resolveHost() calls back with " + inName + " at " + inHost);
				
				var	lowerCaseName = inName.toLowerCase ();
				gHosts [lowerCaseName] = inHost;
				
				// update all our WS clients
				for (var webSocket in gWebSockets)
				{
					if (gWebSockets [webSocket].hosts [lowerCaseName])
					{
						// console.log ("sending async updates for clients of " + lowerCaseType);
						updateWebSocketHosts (webSocket);
					}
				}
			}
		);
		
		gHostResolutionsByName [lowerCaseName] = resolution;
	}	
	
	var	responseObject = null;
	
	if (inRequestParams.webSocket)
	{
		gWebSockets [inRequestParams.webSocket].hosts [lowerCaseName] = lowerCaseName;
	}
	else
	{
		responseObject = {name: name};
	}
	
	return responseObject;
}

// essentially, start caching service responses for this type
global.mdns_listenservice = function
mdns_listenservice (inRequestParams)
{
	// console.log ("mdns_listenservice()");
	
	var	type = inRequestParams.type;

	if (type == null || type.length == 0)
	{
		throw new Error ("listen request without type");
	}
	
	type = type.toLowerCase ();

	resolveService (type);
	
	var	responseObject = null;

	if (inRequestParams.webSocket)
	{
		// console.log ("adding type " + type + " to websocket");
		gWebSockets [inRequestParams.webSocket].services [type] = type;
		
		// if we have stuff cached for this type
		// schedule an update for this socket
		// rather than wait for the next MDNS poll
		if (gServices [type])
		{
			// console.log ("sending cached updates to websocket");
			updateWebSocketServices (inRequestParams.webSocket);
		}
	}
	else
	{
		responseObject = {type: type};
	}
	
	return responseObject;
}

global.mdns_registerhost = function
mdns_registerhost (inRequestParams)
{
	var	name = inRequestParams.name;
	var	host = inRequestParams.host;
	
	if (name == null || name.length == 0)
	{
		throw new Error ("register request without name");
	}
	
	if (host == null || host.length == 0)
	{
		throw new Error ("register request without host");
	}
	
	console.log ("registering " + name + "." + type + " at " + host + ":" + port);
	
	var	responseObject = gMDNS.registerHost (name, host);
	
	if (inRequestParams.webSocket)
	{
		responseObject = null;
	}
	
	return responseObject;
}

global.mdns_registerservice = function
mdns_registerservice (inRequestParams)
{
	var	register = true;
	var	name = inRequestParams.name;
	var	type = inRequestParams.type;
	var	host = inRequestParams.host;
	var	port = inRequestParams.port;
	
	if (name == null || name.length == 0)
	{
		throw new Error ("register request without name");
	}

	if (type == null || type.length == 0)
	{
		throw new Error ("register request without type");
	}
	
	if (host == null || host.length == 0)
	{
		throw new Error ("unregister request without host");
	}
	
	if (port == null || port.length == 0)
	{
		throw new Error ("register request without port");
	}
	
	port = parseInt (port);
	
	if (port <= 0 || isNaN (port))
	{
		throw new Error ("register request with bad port: " + portString);
	}

	console.log ("registering " + name + "." + type + " at " + host + ":" + port);
	
	var	responseObject = gMDNS.registerService (name, type, host, port, inRequestParams.text);
	
	if (inRequestParams.webSocket)
	{
		responseObject = null;
	}
	
	return responseObject;
}

// retrieve cached host resolutions for this name
global.mdns_resolvehost = function
mdns_resolvehost (inRequestParams)
{
	var	name = inRequestParams.name;

	if (name == null || name.length == 0)
	{
		throw new Error ("resolvehost request without name");
	}

	var	responseObject = new Object ();
	
	var	host = gHosts [name.toLowerCase ()];
	
	if (host)
	{
		responseObject.name = name.toLowerCase ();
		responseObject.host = host;
	}
	
	return responseObject;
}

// retrieve cached service resolutions of this type
global.mdns_resolveservice = function
mdns_resolveservice (inRequestParams)
{
	var	type = inRequestParams.type;

	if (type == null || type.length == 0)
	{
		throw new Error ("listen request without type");
	}

	var	resolutions = new Array ();
	
	var	lowerCaseType = type.toLowerCase ();
	
	if (gServices [lowerCaseType])
	{
		for (var key in gServices [lowerCaseType])
		{
			resolutions.push (gServices [lowerCaseType][key]);
		}
	}
	
	return resolutions;
}

// stop caching responses for this type
global.mdns_unlistenservice = function
mdns_unlistenservice (inRequestParams)
{
	var	type = inRequestParams.type;

	if (type == null || type.length == 0)
	{
		throw new Error ("listen request without type");
	}
	
	var	lowerCaseType = type.toLowerCase ();
	var	resolution = gServiceResolutionsByType [lowerCaseType];
	
	if (resolution)
	{
		if (resolution.count == 0)
		{
			console.log ("mdns_unlistenservice(" + lowerCaseType + ") with resolution count of zero");
		}
		else
		{
			resolution.count--;
		}
		
		// the last one out cancels the resolve
		if (resolution.count == 0)
		{
			gMDNS.cancelResolveService (resolution.resolution);
			delete gServiceResolutionsByType [lowerCaseType]
		}
	}
	
	var	responseObject = null;
	
	if (inRequestParams.webSocket)
	{
		var	ws = gWebSockets [inRequestParams.webSocket];
		
		if (ws)
		{
			if (ws.services [lowerCaseType])
			{
				console.log ("removing type " + lowerCaseType + " from websocket");
				delete services [lowerCaseType];
			}
		}
		else
		{
			console.log ("can't find request websocket in websocket table!");
		}
	}
	else
	{
		responseObject = {type: type};
	}
	
	return responseObject;
}

global.mdns_unregisterservice = function
mdns_unregisterservice (inRequestParams)
{
	var	host = inRequestParams.host;
	var	port = inRequestParams.port;
	
	if (host == null || host.length == 0)
	{
		throw new Error ("unregister request without host");
	}
	
	if (port == null || port.length == 0)
	{
		throw new Error ("unregister request without port");
	}
	
	port = parseInt (port);
	
	if (port <= 0 || isNaN (port))
	{
		throw new Error ("unregister request with bad port: " + portString);
	}

	console.log ("unregister " + name + "." + type + " at " + host + ":" + port);
	return gMDNS.unregisterService (host, port);
}

