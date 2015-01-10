
document.addEventListener
(
	"DOMContentLoaded",
	function ()
	{
		sensible.ApplicationFactory.createApplication
		(
			function (inError)
			{
				if (inError)
				{
					console.error ("error during sensible application startup");
					console.error (inError);
				}
				else
				{
					console.log ("sensible application startup");
				}
			}
		);
	}
);

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
	
	navigator.geolocation.watchPosition
	(
		function (inPosition)
		{
			console.log ("position updated to " + inPosition.coords.latitude + "," + inPosition.coords.longitude);
			
			gSensibleApplication.setProperty ("latitude", inPosition.coords.latitude);
			gSensibleApplication.setProperty ("longitude", inPosition.coords.longitude);
		},
		function (inError)
		{
			console.error ("error calling watchPosition()")
			console.error (inError);
		}
	);

	inCallback ();
}

// NON-STANDARD REST HANDLERS HERE

// this will be called if /walrus/get is requested
sensible.fxos.Application.prototype.walrus_get = function (inRequest, inCallback)
{
	var	response = new Object ();
	response.type = "json";
	response.object = {walrus: "triumphant"};
	
	inCallback (response);
}

