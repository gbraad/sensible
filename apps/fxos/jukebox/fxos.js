
// called just before sensible.Application.start()
sensible.fxos.Application.prototype.onBeforeStart = function (inCallback)
{
	console.log ("fxos.Application.onBeforeStart()");
	
	inCallback ();
}

// called just after sensible.Application.start()
sensible.fxos.Application.prototype.onAfterStart = function (inCallback)
{
	console.log ("fxos.Application.onAfterStart()");

	this.playlist = new Array ();
	
	this.createMediaElement ();
	
	var	self = this;
	
	this.cache 
	(
		function (inError)
		{
			if (inError)
			{
				console.error ("initial media scan error");
				console.error (inError);
			}
			else
			{
				console.log ("initial media scan succeeds");
				console.log (self.media.length + " media files tracked");
			}
			
			inCallback (inError);
		}
	);
}

sensible.fxos.Application.prototype.onMediaEvent = function (inEvent)
{
	console.log ("onMediaEvent(" + inEvent.type + ")");
	
	if (inEvent.type == "error")
	{
		console.error ("error event");
		console.error (inEvent);
		
		this.skip ();
	}
	else
	if (inEvent.type == "ended")
	{
		this.skip ();
	}
}

// PRIVATE

sensible.fxos.Application.prototype.cache = function (inCallback)
{
	console.log ("Application.cache()");
	
	var	self = this;
	
	this.media = new Array ();
	
	var	music = navigator.getDeviceStorage ("music");
	var	cursor = music.enumerate ();
	
	cursor.onsuccess = function ()
	{
		if (cursor.result)
		{
			// filter a path with any element that starts with "." (ie hidden)
			// this removes .Trashes etc
			var	elements = this.result.name.split ("/");
			
			var	include = true;
			
			for (var i = 0; i < elements.length; i++)
			{
				if (elements [i].charAt (0) == ".")
				{
					include = false;
					break;
				}
			}
			
			if (include)
			{
				// console.log ("including " + cursor.result.name);

				// can't serialise the actual objects
				// so clone the bits we use
				var	title = cursor.result.name.split ("/").pop ();
				
				var	track = 
				{
					name: cursor.result.name,
					size: cursor.result.size,
					title: title,
					album: "Unknown Album",
					artist: "Unknown Artist"
				};

				self.media.push (track);
				
				// console.log ("parseAudioMetadata() for " + title);
				
				// BRAVE get some metadata
				parseAudioMetadata
				(
					cursor.result,
					function (inMetadata)
					{
						if (inMetadata)
						{
							if (inMetadata.title)
							{
								track.title = inMetadata.title;
							}
							if (inMetadata.artist)
							{
								track.artist = inMetadata.artist;
							}
							if (inMetadata.album)
							{
								track.album = inMetadata.album;
							}
							
							// have to put this here in order to sort on it! :-S
							track.tracknum = inMetadata.tracknum;
						}

						self.onStoreIteration (cursor, inCallback);
					},
					function (inErrorString)
					{
						console.log ("metadata fail for " + title);
						// console.log (inErrorString);

						self.onStoreIteration (cursor, inCallback);
					}
				);
			}
			else
			{
				// console.log ("excluding " + this.result.name);
				self.onStoreIteration (cursor, inCallback);
			}
		}
		else
		{
			self.onStoreIteration (cursor, inCallback);
		}
	}

	cursor.onerror = function ()
	{
		console.error ("error getting cursor");
		console.error (this.error);
		
		inCallback (this.error);
	}
}

// i hate javascript
sensible.fxos.Application.prototype.onStoreIteration = function (inCursor, inCallback)
{
	if (inCursor.done)
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
	else
	{
		inCursor.continue ();
	}
}

sensible.fxos.Application.prototype.createMediaElement = function ()
{
	this.mediaElement = document.createElement ("audio");
	this.mediaElement.setAttribute ("controls", "true");
	
	// this, together with the audio-channel-content manifest permission
	// allows background audio - baphling
	this.mediaElement.mozAudioChannelType = "content";
	
	document.body.appendChild (this.mediaElement);

	var	events = 
	[
		"ended",
		"pause",
		"play"
	];

	var	self = this;
	
	for (var i = 0; i < events.length; i++)
	{
		this.mediaElement.addEventListener
		(
			events [i],
			function (inEvent)
			{
				self.onMediaEvent (inEvent);
			},
			false
		);
	}
}

// pop the next one off the playlist and play it
sensible.fxos.Application.prototype.play = function ()
{
	console.log ("Application.play()");
	
	if (this.playlist.length == 0)
	{
		this.playlist.push (this.media [Math.floor (Math.random () * this.media.length)]);
	}
	
	var	track = this.playlist.splice (0, 1) [0];

	if (this.mediaElement)
	{
		if (! this.mediaElement.paused)
		{
			this.mediaElement.pause ();
		}

		this.mediaElement.parentNode.removeChild (this.mediaElement);
	}

	this.createMediaElement ();
	
	var	self = this;
	
	setTimeout
	(
		function ()
		{
			document.getElementById("status").innerHTML = "playing: " + track.title + " by " + track.artist;

			self.mediaElement.src = track.url;
	
			self.playing = true;
			
			setTimeout
			(
				function ()
				{
					self.mediaElement.play ();
				},
				10
			);
		},
		10
	);
}

sensible.fxos.Application.prototype.skip = function ()
{
	this.play ();
}

// NON-STANDARD REST HANDLERS

sensible.fxos.Application.prototype.music_get = function (inRequest, inCallback)
{
	// console.log ("fxos.Application.music_get()");
	
	var	response = new Object ();

	var	indexString = inRequest.parameters.index;
	
	if (indexString && indexString.length)
	{
		var	index = parseInt (indexString);
		
		if (index >= 0 && index < this.media.length)
		{
			var	name = this.media [index].name;
			var	music = navigator.getDeviceStorage ("music");
			var	getRequest = music.get (name);
			
			getRequest.onsuccess = function ()
			{
				response.type = "blob";
				response.object = this.result;
				response.contentType = sensible.Util.mapExtensionToContentType (name);
				
				inCallback (response);
			}
			
			getRequest.onerror = function ()
			{
				console.log ("music.get.onerror()");
				console.log (this.error.name);
		
				response.type = "error";
				response.error = this.error.name;
				
				inCallback (response);
			}
		}
		else
		{
			response.type = "error";
			response.object = new Error ("index parameter out of range");
			
			inCallback (response);
		}
	}
	else
	{
		response.type = "error";
		response.object = new Error ("index parameter not found");
		
		inCallback (response);
	}
}

sensible.fxos.Application.prototype.music_list = function (inRequest, inCallback)
{
	var	response = new Object ();

	if (this.media)
	{
		response.type = "json";
		response.object = this.media;
	}
	else
	{
		response.type = "error";
		response.error = "no music list yet";
	}
	
	inCallback (response);
}

sensible.fxos.Application.prototype.playlist_add = function (inRequest, inCallback)
{
	var	response = new Object ();

	var	url = inRequest.parameters.url;
	
	if (inRequest.parameters.index)
	{
		var	index = parseInt (indexString);
		
		if (index >= 0 || index < this.media.length)
		{
			var	track = this.media [index];
			
			if (! this.playlist)
			{
				console.log ("playlist_add() making playlist");
				this.playlist = new Array ();
			}
			
			this.playlist.push (track);

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
	if (inRequest.parameters.url)
	{
		var	defaultTitle = inRequest.parameters.url.split ("/").pop ();
		
		var	track = 
		{
			url: inRequest.parameters.url,
			artist: inRequest.parameters.artist ? inRequest.parameters.artist : "Unknown Artist",
			album: inRequest.parameters.album ? inRequest.parameters.album : "Unknown Album",
			title: inRequest.parameters.title ? inRequest.parameters.title : defaultTitle
		};
		
		this.playlist.push (track);
		
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
		response.error = new Error ("playlist_add with no url parameter");
	}

	inCallback (response);
}

sensible.fxos.Application.prototype.playlist_get = function (inRequest, inCallback)
{
	var	response = new Object ();

	if (this.playlist)
	{
		response.type = "json";
		response.object = this.playlist;
	}
	else
	{
		response.type = "error";
		response.error = "no play list yet";
	}
	
	inCallback (response);
}


