
window.addEventListener
(
	"load",
	function ()
	{
		sensible.ApplicationFactory.createApplication
		(
			function (inError)
			{
				if (inError)
				{
					console.error ("error during Sensible application startup");
					console.error (inError);
				}
				else
				{
					console.log ("Sensible app startup complete");
					console.log ("finding sensible services");
				}
			}
		);
	}
);
// called just before sensible.Application.start()
sensible.chrome.Application.prototype.onBeforeStart = function (inCallback)
{
	console.log ("chrome.Application.onBeforeStart()");
	
	inCallback ();
}

// called just after sensible.Application.start()
sensible.chrome.Application.prototype.onAfterStart = function (inCallback)
{
	console.log ("chrome.Application.onAfterStart()");
	
	inCallback ();
}

