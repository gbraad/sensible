
var	fs = require ("fs");

// assume that sensible.js lives in the same directory as our mainline
var	code = fs.readFileSync (require ("path").dirname (process.argv [1]) + "/sensible.js");
eval (code.toString ());

var	arrrgh = fs.readFileSync (process.argv [2]);

// wtf does node not use regular buffers??
var	buffer = new ArrayBuffer (arrrgh.length);
var	view = new Uint8Array (buffer);

for (var i = 0; i < arrrgh.length; i++)
{
	view [i] = arrrgh.readUInt8 (i);
}

var	packet = sensible.DNSPacket.parse (buffer);

console.log ("flags are 0x" + packet.flags.toString (16));

console.log (packet.questions.length + " questions");
console.log (packet.answers.length + " answers");
console.log (packet.authorities.length + " authorities");
console.log (packet.additionals.length + " additionals");

for (var i = 0; i < packet.questions.length; i++)
{
	console.log ("question " + i);

	logRecord (packet.questions [i], true);
}

for (var i = 0; i < packet.answers.length; i++)
{
	console.log ("answer " + i);

	logRecord (packet.answers [i]);
}

for (var i = 0; i < packet.authorities.length; i++)
{
	console.log ("authority " + i);

	logRecord (packet.authorities [i]);
}

for (var i = 0; i < packet.additionals.length; i++)
{
	console.log ("additional " + i);

	logRecord (packet.additionals [i]);
}

function
logRecord (inRecord, inQuestion)
{
	console.log ("name = " + inRecord.name);
	console.log ("type = " + inRecord.type);
	
	if (!inQuestion)
	{
		if (inRecord.type == 1)
		{
			console.log ("A record = " + inRecord.a);
		}
		else if (inRecord.type == 12)
		{
			console.log ("PTR record = " + inRecord.ptr);
		}
		else if (inRecord.type == 16)
		{
			console.log ("TXT record = " + inRecord.txt);
		}
		else if (inRecord.type == 33)
		{
			console.log ("SRV record with port = " + inRecord.port);
		}
	}
}
