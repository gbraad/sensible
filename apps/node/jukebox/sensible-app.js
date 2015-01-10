// sensible server which advertises itself via Bonjour

// NODE INCLUDES

// we need these *before* sensible.js loads
var	fs = require ("fs");
var	path = require ("path");

// CHANGE DIRECTORY TO APP DIR

var	gApplicationDirectory = path.dirname (process.argv [1]);
console.log ("changing directory to " + gApplicationDirectory);
process.chdir (gApplicationDirectory);

// REGULAR JS INCLUDES

var	code = fs.readFileSync ("sensible.js");
eval (code.toString ());

// ADD APPLICATION OVERRIDES HERE

var	gPlayer = null;
var	gExtensions = [".mp3"];

sensible.node.Application.prototype.onBeforeStart = function (inCallback)
{
	inCallback ();
}

sensible.node.Application.prototype.onAfterStart = function (inCallback)
{
	this.media = new Array ();
	this.playlist = new Array ();
	
	console.log ("Jukebox onAfterStart() called");

	// ASSUME we're chdir()ed into the app directory...
	this.loadDirectory
	(
		"music",
		function ()
		{
			// console.log (inContents);
			inCallback ();
		}
	);
}

// PRIVATE

sensible.node.Application.prototype.loadDirectory = function (inPath, inCallback)
{
	console.log ("Application.loadDirectory(" + inPath + ")");

	var	fileNames = fs.readdirSync (inPath);
	
	var	helper = new sensible.AsyncListHelper
	({
		this: this,
		list: fileNames,
		iterate: function (inListHelper, inFileName)
		{
			var	filePath = inPath + "/" + inFileName;
			
			var	stats = fs.statSync (filePath);
			
			if (stats.isFile ())
			{
				var	extension = path.extname (inFileName);
				
				if (gExtensions.indexOf (extension) >= 0)
				{
					if (musicmetadata)
					{
						var	self = this;
						var	parser = musicmetadata (fs.createReadStream (filePath));
						
						parser.on
						(
							"metadata",
							function (inMetadata)
							{
								var	track = 
								{
									name: filePath,
									title: inMetadata.title ? inMetadata.title : inFileName,
									album: inMetadata.album ? inMetadata.album : "Unknown",
									artist: inMetadata.artist.length ? inMetadata.artist [0] : "Unknown",
									tracknum: inMetadata.track ? inMetadata.track.no : 0
								};
								
								self.media.push (track);
								inListHelper.onIteration ();
							}
						);
					}
					else
					{
						var	track = 
						{
							name: filePath,
							title: inFileName,
							album: "Unknown",
							artist: "Unknown",
							tracknum: 0
						};
						
						this.media.push (track);
						inListHelper.onIteration ();
					}
				}
				else
				{
					inListHelper.onIteration ();
				}
			}
			else
			if (stats.isDirectory ())
			{
				this.loadDirectory
				(
					filePath,
					function ()
					{
						// no, don't add directories to the list
						inListHelper.onIteration ();
					}
				);
			}
			else
			{
				inListHelper.onIteration ();
			}
		},
		complete: function ()
		{
			this.media.sort
			(
				function (inOne, inTwo)
				{
					var	compare = 0;
					
					if (inOne.artist == inTwo.artist)
					{
						if (inOne.album == inTwo.album)
						{
							if (typeof inOne.tracknum == "number"
								&& typeof inTwo.tracknum == "number")
							{
								if (inOne.tracknum == inTwo.tracknum)
								{
									compare = 0;
								}
								else
								{
									compare = inOne.tracknum > inTwo.tracknum ? 1 : -1;
								}
							}
							else
							{
								if (inOne.title == inTwo.title)
								{
									compare = 0;
								}
								else
								{
									compare = inOne.title > inTwo.title ? 1 : -1;
								}
							}
						}
						else
						{
							compare = inOne.album > inTwo.album ? 1 : -1;
						}
					}
					else
					{
						compare = inOne.artist > inTwo.artist ? 1 : -1;
					}
					
					return compare;
				}
			);

			// now we've sorted the list, determine the URLs
			for (var i = 0; i < this.media.length; i++)
			{
				this.media [i].url = "http://" + this.mdns.localService.host + ":" + this.config.port + "/music/get?index=" + i;
			}

			inCallback ();
		}
	});
}

sensible.Application.prototype.play = function ()
{
	console.log ("Application.play()");
	
	if (this.playlist.length == 0)
	{
		console.log ("no playlist, shuffling...");
		this.playlist.push (this.media [Math.floor (Math.random () * this.media.length)]);
	}
	
	var	track = this.playlist.splice (0, 1) [0];

	if (this.player)
	{
		this.player.kill ();
	}

	var	command = null;
	
	if (os.platform () == "darwin")
	{
		command = "afplay";
	}
	else
	if (os.platform () == "linux")
	{
		command = "mpg123";
	}
	else
	{
		console.log ("on windows! don't know how to play music...");
	}
	
	if (command)
	{
		console.log ("playing ");
		console.log (track);
		
		this.playing = true;
		
		var	self = this;
		
		this.player = child_process.spawn
		(
			command,
			[track.name]
		);
		
		this.player.on
		(
			"close",
			function (inCode)
			{
				console.log ("track finishes");
				
				self.playing = false;
				self.play ();
			}
		);
	}
}


// REST DISPATCHERS

sensible.Application.prototype.music_list = function (inRequest, inCallback)
{
	console.log ("music_list() called");
	
	var	response = new Object ();
	response.type = "json";
	response.object = this.media;

	inCallback (response);
}

// note that node jukebox doesn't play arbitrary URLs
sensible.Application.prototype.playlist_add = function (inRequest, inCallback)
{
	// console.log ("playlist_add() called");

	var	response = new Object ();

	var	indexString = inRequest.parameters.index;
	
	if (indexString)
	{
		var	index = parseInt (indexString);
		
		if (index >= 0 || index < this.media.length)
		{
			var	track = this.media [index];
			this.playlist.push (track);

			console.log ("playlist now has " + this.playlist.length + " entries");
			
			if (! this.playing)
			{
				this.play ();
			}
			
			response.type = "json";
			response.object = track;
		}
		else
		{
			response.type = "error";
			response.error = new Error ("playlist_add with bad index parameter");
		}
	}
	else
	{
		response.type = "error";
		response.error = new Error ("playlist_add with no index parameter");
	}

	inCallback (response);
}

sensible.Application.prototype.playlist_get = function (inRequest, inCallback)
{
	// console.log ("playlist_get() called");

	// console.log ("sending back playlist with " + this.playlist.length + " entries");
	
	var	response = new Object ();
	response.type = "json";
	response.object = this.playlist;

	inCallback (response);
}

sensible.Application.prototype.music_stop = function (inRequest, inCallback)
{
	if (gPlayer)
	{
		gPlayer.kill ();
		gPlayer = null;
	}
	
	var	response = new Object ();
	response.object = {};
	response.type = "json";
	
	inCallback (response);
}

// MAINLINE

var	application = sensible.ApplicationFactory.createApplication
(
	function (inError)
	{
		if (inError)
		{
			console.error ("error during sensible application startup");
			console.error (inError);
		}
	}
);

