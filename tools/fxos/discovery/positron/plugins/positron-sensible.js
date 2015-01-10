/**
*
* @license
* Copyright © 2014 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.sensible.tag.MdnsTag");

positron.sensible.tag.MdnsTag = function ()
{
	positron.tag.Tag.call (this);
}
positron.inherits (positron.sensible.tag.MdnsTag, positron.tag.Tag);

positron.sensible.tag.MdnsTag.prototype.process =
function (inElement, inContext, inTreeWalker)
{
	var	self = this;
	var	mdns = new sensible.MDNS ();

	mdns.start
	(
		function (inError)
		{
			if (inError)
			{
				console.error ("MdnsTag error calling mdns.start()");
				console.error (inError);
			}
			
			self.walkChildren (inElement, inContext, inTreeWalker, mdns);
		}
	);
	
	// we are always async
	return false;
}

/**
*
* @license
* Copyright © 2014 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.sensible.trigger.MdnsTag");

positron.sensible.trigger.ServiceDiscoveredTrigger = function ()
{
	positron.trigger.Trigger.call (this);
}
positron.inherits (positron.sensible.trigger.ServiceDiscoveredTrigger, positron.trigger.Trigger);

positron.sensible.trigger.ServiceDiscoveredTrigger.prototype.cancel =
function ()
{
	if (this.resolution)
	{
		this.mdns.unresolveService (this.resolution);
		this.resolution = null;
	}
}

positron.sensible.trigger.ServiceDiscoveredTrigger.prototype.preRegister =
function (inAction, inContext)
{
	var	self = this;

	console.error ("ServiceDiscoveredTrigger.preRegister()");
	
	if (inAction.triggerArgs.length > 1 && inAction.triggerArgs [0].length && inAction.triggerArgs [1].length)
	{
		var	mdnsKey = inAction.triggerArgs [0];
		
		this.mdns = gApplication.getContextReference (mdnsKey, inContext);
		
		if (!this.mdns)
		{
			console.error ("ServiceDiscoveredTrigger can't find mdns with key " + mdnsKey);
		}
	}
}

positron.sensible.trigger.ServiceDiscoveredTrigger.prototype.register =
function (inAction, inContext)
{
	console.error ("ServiceDiscoveredTrigger.register()");

	if (this.mdns)
	{
		var	type = inAction.triggerArgs [1];
		
		if (type)
		{
			console.log ("resolving service " + type);
			
			this.resolution = this.mdns.resolveService
			(
				type,
				function (inService)
				{
					console.log ("found service");
					console.log (inService);
					
					inAction.setParam ("service", inService);
					inAction.fire ();
				}
			);
		}
		else
		{
			console.error ("ServiceDiscoveredTrigger with no type argument");
		}
	}
}

positron.sensible.trigger.ServiceDiscoveredTrigger.prototype.requiresCancel =
function ()
{
	return true;
}
/**
*
* @license
* Copyright © 2014 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.sensible.trigger.MdnsTag");

positron.sensible.trigger.ServiceExpiredTrigger = function ()
{
	positron.trigger.Trigger.call (this);
}
positron.inherits (positron.sensible.trigger.ServiceExpiredTrigger, positron.trigger.Trigger);

positron.sensible.trigger.ServiceExpiredTrigger.prototype.cancel =
function ()
{
	if (this.resolution)
	{
		this.mdns.unresolveService (this.resolution);
		this.resolution = null;
	}
}

positron.sensible.trigger.ServiceExpiredTrigger.prototype.preRegister =
function (inAction, inContext)
{
	var	self = this;

	console.error ("ServiceExpiredTrigger.preRegister()");
	
	if (inAction.triggerArgs.length > 1 && inAction.triggerArgs [0].length && inAction.triggerArgs [1].length)
	{
		var	mdnsKey = inAction.triggerArgs [0];
		
		this.mdns = gApplication.getContextReference (mdnsKey, inContext);
		
		if (!this.mdns)
		{
			console.error ("ServiceExpiredTrigger can't find mdns with key " + mdnsKey);
		}
	}
}

positron.sensible.trigger.ServiceExpiredTrigger.prototype.register =
function (inAction, inContext)
{
	console.error ("ServiceExpiredTrigger.register()");

	if (this.mdns)
	{
		var	type = inAction.triggerArgs [1];
		
		if (type)
		{
			console.log ("resolving service " + type);
			
			this.resolution = this.mdns.resolveService
			(
				type,
				function (inService)
				{
					// we ignore the found callback
					// we just want the expired one :-)
				},
				function (inService)
				{
					console.log ("expired service");
					console.log (inService);
					
					inAction.setParam ("service", inService);
					inAction.fire ();
				}
			);
		}
		else
		{
			console.error ("ServiceExpiredTrigger with no type argument");
		}
	}
}

positron.sensible.trigger.ServiceExpiredTrigger.prototype.requiresCancel =
function ()
{
	return true;
}
/**
*
* @license
* Copyright © 2014 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.sensible.Plugin");

positron.sensible.Plugin = function ()
{
}

positron.sensible.Plugin.prototype.install = function ()
{
	console.log ("positron.sensible.Plugin.install()");

	gApplication.loadConfig ("positron/plugins/positron-sensible.json");
}

// queue us up to get run by the Application constructor later on...
gApplicationPlugins.push (new positron.sensible.Plugin ());

