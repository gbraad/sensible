
positron.provide ("Application");

var	Application = function ()
{
	positron.Application.call (this);
};
positron.inherits (Application, positron.Application);

Application.prototype.start = function ()
{
	positron.Application.prototype.start.call (this);

	// note that both wrapper and service applications are Positronic
	// so have to check where we are, here!
	if (typeof sensible == "object")
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
}

Application.prototype.skip = function ()
{
	gSensibleApplication.skip ();
}

