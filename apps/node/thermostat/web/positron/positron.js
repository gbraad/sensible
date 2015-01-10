/*
Copyright (c) 2014 Monohm, Inc

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/
/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

var	positron = positron || new Object ();

positron.provide = function (inProvided)
{
	// ensure that the "packages" are there
	var	packageElements = inProvided.split (".");
	
	var	pkg = window;
	
	// don't make the last element, it's the class name
	for (var i = 0; i < packageElements.length - 1; i++)
	{
		if (typeof (pkg [packageElements [i]]) == "undefined")
		{
			pkg [packageElements [i]] = new Object ();
		}
		
		pkg = pkg [packageElements [i]];
	}
};

/**
 * @param {string} inRequired
 */
positron.require = function (inRequired)
{
	// currently Positron does not support dependency management
};

positron.inherits = function (inSubClass, inSuperClass)
{
	function
	tempCtor()
	{
	};

	tempCtor.prototype = inSuperClass.prototype;
	inSubClass.superClass_ = inSuperClass.prototype;
	inSubClass.prototype = new tempCtor();
	inSubClass.prototype.constructor = inSubClass;
  
  // handy notation for "blind" superclass reference
  // as the superClass_ above won't work (needs to be off prototype)
  inSubClass.prototype.superClass = inSuperClass.prototype;
};


/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.AsyncListHelper");

// help for traversing a list of async obtained stuff

positron.AsyncListHelper = function (inConfig)
{
	this.config = inConfig;
	
	if (!this.config.this)
	{
		this.config.this = this;
	}
	
	if (this.config.list && Array.isArray (this.config.list))
	{
		this.index = 0;
		this.iterate ();
	}
	else
	{
		console.error ("no list passed to AsyncListHelper");
		this.complete ();
	}
}

positron.AsyncListHelper.prototype.complete = function ()
{		
	if (this.config.complete)
	{
		this.config.complete.call (this.config.this);
	}
	else
	{
		console.error ("no complete function passed to AsyncListHelper");
	}
}

positron.AsyncListHelper.prototype.iterate = function ()
{
	if (this.index < this.config.list.length)
	{
		if (this.config.iterate)
		{
			// pass our "this" first so the client always has a reliable handle on us
			this.config.iterate.call (this.config.this, this, this.config.list [this.index]);
		}
		else
		{
			console.error ("no iterate function passed to AsyncListHelper");
			this.complete ();
		}
	}
	else
	{
		this.complete ();
	}
}

positron.AsyncListHelper.prototype.onIteration = function ()
{
	this.index++;
	this.iterate ();
}

/**
*
* @license
* Copyright � 2011, 2012 Subatomic Systems, Inc.	All rights reserved.
*
**/

// analytics.js
// dummy & default implementations of the analytics interface

positron.provide ("positron.Analytics");
positron.provide ("positron.DummyAnalytics");

/**
 * @constructor
 */
positron.Analytics =
function positron_Analytics ()
{
	if (this.appID)
	{
		console.error ("Analytics constructed twice?!?");
	}
	else
	{
		this.appID = gApplication.getConfigEntry ("analytics.appID");
		this.url = gApplication.getConfigEntry ("analytics.captureURL");
		this.batchSize = gApplication.getConfigEntryWithDefault ("analytics.batchSize", 5);
		this.maxErrorCount = gApplication.getConfigEntryWithDefault ("analytics.maxErrorCount", 5);
		
		this.batch = new Array ();
		
		// if the upload error count reaches the maximum
		// then basically the queue shuts down
		this.errorCount = 0;
	
		// determine the app instance ID from the name and a timestamp
		// there is no way of making this really unique, btw
		var	now = new Date ();
		
		// hopefully this is pretty unique :-)
		this.instanceID = "" + this.appID + "-" + now.getTime () + "-" + Math.floor (Math.random () * 100);
		
		this.fire
		({
			timestamp: new Date ().getTime (),
			domain: "analytics",
			name: "startup"
		});
	}
};

positron.Analytics.prototype.checkBatch =
function Analytics_checkBatch ()
{
	if (!this.sending && (this.batch.length >= this.batchSize))
	{
		this.flushBatch ();
	}
};

positron.Analytics.prototype.flushBatch =
function Analytics_flushBatch ()
{
	if (gApplication.isLogging (gApplication.kLogAnalytics)) console.log ("Analytics.flushBatch()");
	if (gApplication.isLogging (gApplication.kLogAnalytics)) console.log (this.batch.length + " records in batch");

	var	query = "app_id=" + this.appID + "&instance_id=" + this.instanceID + "&";
	
	for (var i = 0; i < this.batch.length; i++)
	{
		var	event = this.batch [i];
		
		for (var property in event)
		{
			if (event.hasOwnProperty (property))
			{
				var	value = event [property];
				
				if (typeof (value) == "string")
				{
					if (value && value.length)
					{
						// TODO should we escape here?
						query += property + "_" + i + "=" + event [property] + "&";
					}
				}
				else
				if (typeof (value) == "number")
				{
					query += property + "_" + i + "=" + event [property] + "&";
				}
			}
		}
	}
	
	if (gApplication.isLogging (gApplication.kLogAnalytics)) console.log (this.url);
	if (gApplication.isLogging (gApplication.kLogAnalytics)) console.log (query);
	
	this.sending = true;
	
	var	self = this;
	
	positron.Util.ajax
	({
		url: this.url,
		data: query,
		dataType: "json",
		async: true,
		type: "POST",
		success: function (inData, inTextStatus, inXHR)
		{
			if (gApplication.isLogging (gApplication.kLogAnalytics)) console.log ("analytics capture successful");
			
			self.sending = false;
			self.errorCount = 0;
			self.batch.length = 0;
		},
		error: function (inXHR, inTextStatus, inError)
		{
			console.error ("analytics report error");
			console.error (inTextStatus);
			
			self.sending = false;
			self.errorCount++;
			
			if (self.errorCount >= self.maxErrorCount)
			{
				// reporting is hosed, shut down
				if (gApplication.isLogging (gApplication.kLogAnalytics))
				{
					console.error ("max analytics upload error count reached, shutting down");
				}
				
				self.batch.length = 0;
			}
		}
	});


};

positron.Analytics.prototype.fire =
function Analytics_fire (inEvent)
{
	if (this.errorCount < this.maxErrorCount)
	{
		if (gApplication.isLogging (gApplication.kLogAnalytics))
			console.log ("Analytics.report() " + inEvent.domain + "/" + inEvent.page + "/" + inEvent.view + "/" + inEvent.name + "/" + inEvent.detail);

		if (inEvent.domain && inEvent.timestamp && inEvent.name)
		{
			var	event = new Object ();
			
			// fyi, these property names are the http post parameter name stems
			// note we only send appID and instanceID once (good)
			event.timestamp = inEvent.timestamp;
			event.domain = inEvent.domain;
			event.page = inEvent.page;
			event.view = inEvent.view;
			event.name = inEvent.name;
			event.detail = inEvent.detail;
			
			this.batch.push (event);
			
			this.checkBatch ();
		}
		else
		{
			console.error ("malformed event");
			console.error ("domain = " + inEvent.domain);
			console.error ("name = " + inEvent.name);
			console.error ("timestamp = " + inEvent.timestamp);
		}
	}
	else
	{
		// if we log here, then we will log a *lot*
	}
};

// DummyAnalytics
// the analytics handler installed by default, does nothing

/**
 * @constructor
 */
positron.DummyAnalytics =
function positron_DummyAnalytics ()
{
	positron.Analytics.call (this);
	
	if (gApplication.isLogging (gApplication.kLogAnalytics)) console.log ("DummyAnalytics() with app name " + this.appName);
};
positron.inherits (positron.DummyAnalytics, positron.Analytics);

positron.DummyAnalytics.prototype.fire =
function DummyAnalytics_fire (inEvent)
{
	if (gApplication.isLogging (gApplication.kLogAnalytics))
	{
		console.log ("Analytics.fire() " + inEvent.domain + "/" + inEvent.page + "/"
			+ inEvent.view + "/" + inEvent.name + "/" + inEvent.detail);
	}
};

// GoogleAnalytics


/*

GA init code, put in index.html etc

<script type="text/javascript">

	var	account = 'UA-XXXXXXXX-X';
	
  var _gaq = _gaq || [];
  _gaq.push(['_setAccount', testAccount]);
  _gaq.push(['_trackPageview']);

  (function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
  })();

</script>


*/

// assume that the ga stuff has been initialised
// and that _setAccount has been called
// and that _trackPageview has been called for the root page
positron.GoogleAnalytics =
function positron_GoogleAnalytics ()
{
}

positron.GoogleAnalytics.prototype.fire =
function GoogleAnalytics_fire (inEvent)
{
	// for now only report actual page visible transitions
	// maybe we will do more in future!
	if (inEvent.name == "visible" && inEvent.view == null)
	{
		console.log ("GoogleAnalytics.fire() page url: " + document.location.href);
		
		if (typeof (_gaq) == "object")
		{
			// log with a url override
			// as GA might well decide that Positron apps are always on the index page (sigh)
			_gaq.push (["_trackPageview", document.location.href]);
		}
		else
		{
			if (! this.reportedError)
			{
				console.error ("GA unavailable, can't fire event");
				this.reportedError = true;
			}
		}
	}
};

/**
*
* @license
* Copyright � 2013 Jason Proctor. All rights reserved.
*
**/

// positron.Cache.js

/**
 * @constructor
 */
positron.Cache = function (inWindow)
{
if (gApplication.isLogging (gApplication.kLogCache)) console.log ("Cache()");

  this.cache = new Object ();
  this.lifeTimes = new Object ();
  this.accessTimes = new Object ();
  
  // for callbacks
  var self = this;
  
  // gc once a minute
  this.purgeTask = setInterval
  (
    function ()
    {
      self.garbageCollect ();
    },
    60000
  );
};

positron.Cache.prototype.get = function (inKey)
{
  var value = this.cache [inKey];
  
  if (value)
  {
    this.accessTimes [inKey] = new Date ().getTime ();
  }

  return value;
};

positron.Cache.prototype.put = function (inKey, inValue, inLifeTime)
{
  this.cache [inKey] = inValue;
  
  if (! inLifeTime)
  {
    // default lifetime = 30s
    inLifeTime = 30000;
  }

  if (gApplication.isLogging (gApplication.kLogCache))
  	console.log ("Cache.put() with key " + inKey + " and lifetime " + inLifeTime);
  
  this.lifeTimes [inKey] = inLifeTime;
  this.accessTimes [inKey] = new Date ().getTime ();
};

positron.Cache.prototype.garbageCollect = function ()
{
  var collected = 0;
  
  var now = new Date ().getTime ();
  
  for (var key in this.cache)
  {
    var lifeTime = this.lifeTimes [key];
    
    if (typeof (lifeTime) == "number")
    {
      // OK we have a good "key", can proceed
      
      var accessTime = this.accessTimes [key];
      
      if ((now - accessTime) > lifeTime)
      {
        delete this.cache [key];
        delete this.lifeTimes [key];
        delete this.accessTimes [key];
        
        collected++;
      }
    }
  }
  
  if (collected > 0)
  {
    if (gApplication.isLogging (gApplication.kLogCache))
    	console.log ("Cache garbage collected " + collected + " entries");
  }
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.CSS");

positron.CSS = new Object ();

// this isn't necessarily prefixed, as we map the other way, too...
positron.CSS.getBrowserEntity = function (inPropertyName, inEntityTable)
{
	var	prefixedPropertyName = inPropertyName;
	
	if (gApplication.browser.type && gApplication.browser.type.length)
	{
		var	browser = inEntityTable [gApplication.browser.type];
		
		if (!browser)
		{
			console.error ("CSS.getBrowserEntity() does not support browser type: " + gApplication.browser.type);
			browser = inEntityTable ["default"];
		}
		
		prefixedPropertyName = browser [inPropertyName];
		
		if (!prefixedPropertyName || !prefixedPropertyName.length)
		{
			console.error ("CSS.getBrowserEntity() has no property map for : " + inPropertyName);
			prefixedPropertyName = inPropertyName;
		}
	}
	else
	{
		console.error ("CSS.getBrowserEntity() can't determine browser type");
	}
	
	// console.log ("return " + prefixedPropertyName);

	return prefixedPropertyName;
}

positron.CSS.getPrefixedEvent = function (inEventName)
{
	// console.log ("CSS.getPrefixedEvent(" + inEventName + ")");
	
	return positron.CSS.getBrowserEntity (inEventName, gApplication.getConfigEntry ("prefixed-events"));
}

positron.CSS.getPrefixedProperty = function (inPropertyName)
{
	// console.log ("CSS.getPrefixedProperty(" + inPropertyName + ")");
	
	return positron.CSS.getBrowserEntity (inPropertyName, gApplication.getConfigEntry ("prefixed-properties"));
}

positron.CSS.getRatifiedProperty = function (inPropertyName)
{
	// console.log ("CSS.getRatifiedProperty(" + inPropertyName + ")");
	
	return positron.CSS.getBrowserEntity (inPropertyName, gApplication.getConfigEntry ("ratified-properties"));
}

// parses ONE property, but may end up with several values
// eg for transform stuffz
positron.CSS.parsePropertyValue = function (inText)
{
	// console.log ("CSS.parsePropertyValue() on " + inText);
	
	var	values = new Object ();
	
	// HACK ensure we don't fall over constructs like (0px, 0px) etc in the split below
	// this is stupid and we should do it right
	inText = inText.split (", ").join (",");
	
	var	valueElements = inText.split (" ");
	
	for (var i = 0; i < valueElements.length; i++)
	{
		var	valueElement = valueElements [i];

		var	value = new Object ();
		value.parameters = new Array ();

		var	openParenIndex = valueElement.indexOf ("(");
		
		if (openParenIndex > 0)
		{
			value.value = valueElement.substring (0, openParenIndex);
			
			var	closeParenIndex = valueElement.indexOf (")", openParenIndex);
			
			// thankfully we can assume that the browser's CSS parser will reject
			// any badly formed style
			var	parameterString = valueElement.substring (openParenIndex + 1, closeParenIndex);
			var	parameterStringElements = parameterString.split (",");
			
			for (var j = 0; j < parameterStringElements.length; j++)
			{
				var	parameterStringElement = parameterStringElements [j];
				var	parameterValueAndUnits = positron.Util.parseValueAndUnits (parameterStringElement, 0, "");
				
				value.parameters.push (parameterValueAndUnits);
			}
		}
		else
		{
			value.value = valueElement;
		}
		
		values [value.value] = value;
	}

	return values;	
}

positron.CSS.parseStyle = function (inElement)
{
	var	styles = new Object ();
	
	var	style = inElement.getAttribute ("style");

	if (style && style.length)
	{
		var	declarations = style.split (";");
	
		for (var i = 0; i < declarations.length; i++)
		{
			var	declaration = positron.Util.stripSpaces (declarations [i]);

			if (declaration && declaration.length)
			{
				var	colonIndex = declaration.indexOf (":");
				
				if (colonIndex > 0)
				{
					var	property = positron.Util.stripSpaces (declaration.substring (0, colonIndex));

					if (property && property.length)
					{
						var	value = positron.Util.stripSpaces (declaration.substring (colonIndex + 1));
						var	values = positron.CSS.parsePropertyValue (value);
						
						styles [property] = values;
					}
					else
					{
						console.error ("rejecting blank property from: " + declaration);
					}
				}
				else
				{
					console.error ("rejecting declaration: " + declaration);
				}
			}
			else
			{
				// this happens all the time if the style has a ; at the end
				// so don't bother logging it
				// console.error ("empty declaration in style");
			}
		}
	}
	else
	{
		// this will happen all the time, too
		// console.error ("parseStyle() with empty style attribute");
	}

	return styles;
}

positron.CSS.unparsePropertySubvalue = function (inValue)
{
	var	valueString = inValue.value;
	
	if (value.parameters.length > 0)
	{
		valueString += "(";

		for (var i = 0; i < value.parameters.length; i++)
		{
			if (i > 0)
			{
				valueString += ",";
			}
			
			valueString += value.parameters [i].value;
			valueString += value.parameters [i].units;
		}
		
		valueString += ")";
	}

	return valueString;		
}

positron.CSS.unparsePropertyValue = function (inValues)
{
	var	valueStrings = new Array ();
	
	for (var value in inValues)
	{
		valueStrings.push (positron.CSS.unparsePropertySubvalue (inValues [value]));
	}
	
	return valueStrings.join (" ");
}

positron.CSS.unparseStyle = function (inStyles)
{
	var	styleStrings = new Array ();
	
	for (var property in inStyles)
	{
		var	style = inStyles [property];
		
		styleStrings.push (positron.CSS.unparsePropertyValue (style));
	}
	
	return styleStrings.join ("; ");
}


/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.DOM");

positron.DOM = new Object ();

// hopefully we won't need too much here
// on account of adopting jQuery an' all
// however, jQuery only selects *elements*
// so sometimes we need the regular DOM API

positron.DOM.addClass = function (inElement, inClassName)
{
	inElement.classList.add (inClassName);
};

positron.DOM.addPrefixedClass = function (inElement, inClassName)
{
	positron.DOM.addClass (inElement, gApplication.getCSSClassPrefix () + inClassName);
}

// inParent: old parent node
// inNewParent: new parent node
positron.DOM.copyChildren = function (inParent, inNewParent)
{
	for (var i = 0; i < inParent.childNodes.length; i++)
	{
		inNewParent.appendChild (inParent.childNodes [i].cloneNode (true));
	}
};

positron.DOM.createEvent = function (inType, inDetail)
{
	var	event = null;
	
	if (typeof (CustomEvent) == "undefined")
	{
		event = document.createEvent ("Event");
		event.initEvent (inType, true, true);
		event.detail = inDetail;
	}
	else
	{
		event = new CustomEvent
		(
			inType,
			{
				detail: inDetail
			}
		);
	}
	
	return event;
}

positron.DOM.dispatchEvent = function (inElement, inType, inDetail)
{
	inElement.dispatchEvent (positron.DOM.createEvent (inType, inDetail));
}

// after much back and forth, decided to trust getAttribute()
// i think the problem is that if (value) fails if value is a zero length string
// i blamed getAttribute() for so long, but Js is to blame really

// inElement: DOM element
// inParam: attribute name
// return: string
positron.DOM.getAttributeValue = function (inElement, inAttributeName)
{
	return inElement.getAttribute (inAttributeName);
};

// inElement: DOM element
// inParam: attribute name
// inDefault: default value
// return: string
positron.DOM.getAttributeValueWithDefault = function (inElement, inParam, inDefault)
{
	var	result = positron.DOM.getAttributeValue (inElement, inParam);
	
	// careful here as if (result) will fail for a zero length string
	if (result == null)
	{
		result = inDefault;
	}
	
	return result;
};

// inElement: DOM element
// inParam: attribute name
// return: boolean
// default is false
positron.DOM.getBooleanAttributeValue = function (inElement, inParam)
{
	return positron.DOM.getBooleanAttributeValueWithDefault (inElement, inParam, false);
};

// inElement: DOM element
// inParam: attribute name
// inDefault: default value
// return: boolean
positron.DOM.getBooleanAttributeValueWithDefault = function (inElement, inParam, inDefault)
{
	var	value = positron.DOM.getAttributeValue (inElement, inParam);
	
	if (value && value.length)
	{
		value = value.toLowerCase () == "true";
	}
	else
	{
		value = inDefault;
	}
	
	return value;
};

positron.DOM.getCompositeElements = function (inElement, inViewKeyAttributeName, inSelectorAttributeName)
{
	var	viewKey = inElement.getAttribute (inViewKeyAttributeName);
	var	selector = inElement.getAttribute (inSelectorAttributeName);

	return positron.DOM.resolveCompositeElements (inElement, viewKey, selector);
}

positron.DOM.getData = function (inElement, inKey)
{
	var	data = null;
	
	if (inElement && inElement.data)
	{
		if (inKey && inKey.length)
		{
			data = inElement.data [inKey];
		}
		else
		{
			// no key - pass entire map back
			data = inElement.data;
		}
	}
	
	return data;
};

// inElement: DOM element
// inParam: attribute name
// return: int
positron.DOM.getIntAttributeValue = function (inElement, inParam)
{
	return positron.DOM.getIntAttributeValueWithDefault (inElement, inParam, 0);
};

// inElement: DOM element
// inParam: attribute name
// inDefault: default value
// return: int
positron.DOM.getIntAttributeValueWithDefault = function (inElement, inParam, inDefault)
{
	var	value = positron.DOM.getAttributeValue (inElement, inParam);
	
	if (value && value.length)
	{
		value = parseInt (value, 10);
		
		if (isNaN (value))
		{
			value = inDefault;
		}
	}
	else
	{
		value = inDefault;
	}
	
	return value;
};

// inElement: DOM element
// inParam: attribute name
// return: int
positron.DOM.getFloatAttributeValue = function (inElement, inParam)
{
	return positron.DOM.getFloatAttributeValueWithDefault (inElement, inParam, 0);
};

// inElement: DOM element
// inParam: attribute name
// inDefault: default value
// return: int
positron.DOM.getFloatAttributeValueWithDefault = function (inElement, inParam, inDefault)
{
	var	value = positron.DOM.getAttributeValue (inElement, inParam);
	
	if (value && value.length)
	{
		value = parseFloat (value);
		
		if (isNaN (value))
		{
			value = inDefault;
		}
	}
	else
	{
		value = inDefault;
	}
	
	return value;
};

positron.DOM.getParentView = function (inNode)
{
	var	view = null;
	
	// start with the current node
	// it may have a view, after all
	for (var parentNode = inNode; parentNode; parentNode = parentNode.parentNode)
	{
		view = positron.DOM.getData (parentNode, "view");
		
		if (view)
		{
			break;
		}
	}
	
	// this is an error
	// every node should at least have Window as a view
	if (!view)
	{
		console.error ("could not find parent view for node...");
		console.error (inNode);
		console.error ("likely due to overlapping refreshes?");

		/*
		console.error (new Error ().stack);
		
		console.error ("dumping parents...");
		for (var parentNode = inNode; parentNode; parentNode = parentNode.parentNode)
		{
			console.log (parentNode);
		}
		*/
		
		view = gApplication.window;
	}
	
	return view;
}

positron.DOM.getPrefixedAttribute = function (inElement, inAttributeName)
{
	return inElement.getAttribute (gApplication.getAttributePrefix () + inAttributeName);
}

positron.DOM.getPrefixedAttributeName = function (inAttributeName)
{
	return gApplication.getAttributePrefix () + inAttributeName;
}

// returns the parent view that is in the process of refreshing
// used by view.refresh() to disallow subviews refreshing while their parent is at it
positron.DOM.getRefreshingParentView = function (inNode)
{
	var	view = null;
	
	for (var parentNode = inNode.parentNode; parentNode; parentNode = parentNode.parentNode)
	{
		view = positron.DOM.getData (parentNode, "view");
		
		if (view && view.isRefreshing ())
		{
			break;
		}
	}
	
	return view;
}

// inElement: DOM element
// inParam: attribute name
// return: int
positron.DOM.getTimeAttributeValue = function (inElement, inParam)
{
	var	value = positron.DOM.getAttributeValue (inElement, inParam);
	
	if (value && value.length)
	{
		value = positron.Util.parseTime (value);
	}
	else
	{
		value = 0;
	}
	
	return value;
};

// inElement: DOM element
// inParam: attribute name
// inDefault: default value
// return: int
positron.DOM.getTimeAttributeValueWithDefault = function (inElement, inParam, inDefault)
{
	var	value = positron.DOM.getAttributeValue (inElement, inParam);
	
	if (value && value.length)
	{
		value = positron.Util.parseTime (value);
		
		if (value == 0)
		{
			value = inDefault;
		}
	}
	else
	{
		value = inDefault;
	}
	
	return value;
};

positron.DOM.hasChildren = function (inElement)
{
	var	hasChildren = false;
	
	if (inElement.hasChildNodes ())
	{
		for (var i = 0; i < inElement.childNodes.length; i++)
		{
			var	child = inElement.childNodes [i];
			
			if (child.nodeType == child.ELEMENT_NODE)
			{
				hasChildren = true;
				break;
			}
			
			if (child.nodeType == child.TEXT_NODE)
			{
				var	text = positron.Util.stripSpaces (child.nodeValue);
				
				if (text.length > 0)
				{
					hasChildren = true;
					break;
				}
			}
			else
			{
				// any other kind of node is considered a child
				hasChildren = true;
				break;
			}
		}
	}
	
	return hasChildren;
}

positron.DOM.hasClass = function (inElement, inClassName)
{
	var	has = false;
	
	// i've seen this... don't know how
	if (inElement.classList)
	{
		has = inElement.classList.contains (inClassName);
	}
	else
	{
		console.log ("null class list for ");
		console.log (inElement);
	}

	return has;
};

positron.DOM.hasPrefixedClass = function (inElement, inClassName)
{
	return positron.DOM.hasClass (inElement, gApplication.getCSSClassPrefix () + inClassName);
}

positron.DOM.insertChildrenBefore = function (inParentElement, inBeforeElement)
{
	// console.log ("DOM.insertChildrenBefore()");
	// console.log (inParentElement);
	// console.log (inBeforeElement);

  if (inParentElement && inBeforeElement && inBeforeElement.parentNode)
  {
    if (inParentElement.childNodes && inParentElement.childNodes.length)
    {
      while (inParentElement.childNodes.length > 0)
      {
        inBeforeElement.parentNode.insertBefore (inParentElement.firstChild, inBeforeElement);
      }
    }
  }
  else
  {
  	if (!inParentElement)
  	{
	    console.error ("DOM.insertChildrenBefore() passed bad parent element");
	  }
  	if (!inBeforeElement)
  	{
	    console.error ("DOM.insertChildrenBefore() passed bad before element");
	  }
	  else
  	if (!inBeforeElement.parentNode)
  	{
	    console.error ("DOM.insertChildrenBefore() passed orphan before element");
	    console.error (inBeforeElement);
	  }
  }
};

// is this node in the DOM, still?
positron.DOM.isValidNode = function (inNode)
{
	var	valid = false;
	
	for (var parentNode = inNode.parentNode; parentNode; parentNode = parentNode.parentNode)
	{
		if (parentNode.nodeType == parentNode.ELEMENT_NODE
			&& parentNode.tagName.toLowerCase () == "body")
		{
			valid = true;
			break;
		}
	}
	
	return valid;
}

positron.DOM.moveChildren = function (inParent, inNewParent)
{
	var	child = null;
	
	do
	{
		child = inParent.firstChild;
		
		if (child)
		{
			inParent.removeChild (child);
			inNewParent.appendChild (child);
		}
	}
	while (child);
};

positron.DOM.queryPrefixedAttribute = function (inElement, inAttributeName)
{
	return inElement.querySelectorAll ("[" + gApplication.getAttributePrefix () + inAttributeName + "]");
}

positron.DOM.removeChildren = function (inElement)
{
	while (inElement.hasChildNodes ())
	{
		inElement.removeChild (inElement.firstChild);
	}
}

positron.DOM.removeClass = function (inElement, inClassName)
{
	inElement.classList.remove (inClassName);
};

positron.DOM.removeNode = function (inNode)
{
	if (inNode.parentNode)
	{
		inNode.parentNode.removeChild (inNode);
	}
	else
	{
		console.error ("removeNode() cannot remove orphan");
		console.error (inNode);
	}
}

positron.DOM.removePrefixedAttribute = function (inElement, inAttributeName)
{
	inElement.removeAttribute (gApplication.getAttributePrefix () + inAttributeName);
}

positron.DOM.removePrefixedClass = function (inElement, inClassName)
{
	positron.DOM.removeClass (inElement, gApplication.getCSSClassPrefix () + inClassName);
}

positron.DOM.replaceWithChildren = function (inElement)
{
	// console.log ("DOM.replaceWithChildren()");
	// console.log (inElement);
	// console.log (inElement.parentNode);
	
	positron.DOM.insertChildrenBefore (inElement, inElement);
  
  if (inElement.parentNode)
  {
    inElement.parentNode.removeChild (inElement);
  }
};

positron.DOM.requestAnimationFrame = function (inCallback)
{
	if (!window.requestAnimationFrame)
	{
		window.requestAnimationFrame = window.mozRequestAnimationFrame ||
																	 window.webkitRequestAnimationFrame ||
																	 window.msRequestAnimationFrame; // if we... still care
	}
	
	window.requestAnimationFrame (inCallback);
};

positron.DOM.resolveCompositeElements = function (inElement, inViewKey, inSelector)
{
	var	viewElement = null;

	if (inViewKey && inViewKey.length)
	{
		var	view = null;
		
		if (inViewKey == gApplication.getCSSClassPrefix () + "this-view-key")
		{
			view = positron.DOM.getParentView (inElement);
		}
		else
		{
			view = gApplication.getView (inViewKey);
		}
		
		if (view)
		{
			viewElement = view.element;
		}
		else
		{
			console.error ("resolveCompositeElements() cannot find view with key " + inViewKey);
		}
	}

	var	elements = null;

	if (inSelector && inSelector.length)
	{
		if (inSelector == "this-element")
		{
			console.log
				("this-element is deprecated, please use " + gApplication.getCSSClassPrefix () + "this-element instead");
			
			elements = [inElement];
		}
		else
		if (inSelector == gApplication.getCSSClassPrefix () + "this-element")
		{
			elements = [inElement];
		}
		else
		{
			if (!viewElement)
			{
				viewElement = document;
			}
			
			elements = viewElement.querySelectorAll (inSelector);
		}
	}
	else
	{
		if (viewElement)
		{
			elements = [viewElement];
		}
		else
		{
			elements = new Array ();
		}
	}
	
	return elements;
}

positron.DOM.setData = function (inElement, inKey, inValue)
{
	if (! inElement.data)
	{
		inElement.data = new Object ();
	}
	
	inElement.data [inKey] = inValue;
};

positron.DOM.setPrefixedAttribute = function (inElement, inAttributeName, inAttributeValue)
{
	inElement.setAttribute (gApplication.getAttributePrefix () + inAttributeName, inAttributeValue);
}

positron.DOM.toggleClass = function (inElement, inClassName)
{
	inElement.classList.toggle (inClassName);
}

positron.DOM.togglePrefixedClass = function (inElement, inClassName)
{
	positron.DOM.toggleClass (inElement, gApplication.getCSSClassPrefix () + inClassName);
}

// Loader.js

positron.provide ("positron.Loader");

/**
 * @constructor
 */
positron.Loader = function (inCallbackObject, inLoaderCount)
{
if (gApplication.isLogging (gApplication.kLogLoader)) console.log ("Loader().add()");

  this.callbackObject = inCallbackObject;
  
  if (typeof (inLoaderCount) == "number" && inLoaderCount > 0)
  {
  	this.loaderCount = inLoaderCount;
  }
  else
  {
  	this.loaderCount = 2;
  }
  
if (gApplication.isLogging (gApplication.kLogLoader)) console.log ("loader count is " + this.loaderCount);

  // the number of active loads
  this.loadCount = 0;
  
  // this advances with each asset load until the queue is exhausted
  // at which point it is reset
  this.assetIndex = 0;
  
  // this advances with each asset addition until the queue is exhausted
  // at which point it is reset
  this.assetCount = 0;

  this.queue = new Array ();
  
};

positron.Loader.prototype.add = function (inOneOrMany, inRunOnAdd)
{
if (gApplication.isLogging (gApplication.kLogLoader)) console.log ("Loader.add()");

  var running = this.queue.length > 0;
  
  if (typeof (inOneOrMany) == "object" && typeof (inOneOrMany.length) == "number"
    && inOneOrMany.length > 0)
  {
    for (var i = 0; i < inOneOrMany.length; i++)
    {
      this.add (inOneOrMany [i], false);
    }
    
    if (! running)
    {
      this.fireStartCallback ();

      for (var i = 0; i < this.loaderCount; i++)
      {
	      this.run ();
			}
    }
  }
  else
  if (typeof (inOneOrMany) == "string")
  {
    this.queue.push (inOneOrMany);
    
    this.assetCount++;
    
    // if the loader is already running, don't start it
    if (! running)
    {
      var run = true;
      
      if (typeof (inRunOnAdd) != "undefined")
      {
        run = inRunOnAdd;
      }
      
      if (run)
      {
        this.fireStartCallback ();

				for (var i = 0; i < this.loaderCount; i++)
				{
					this.run ();
				}
      }
    }
  }
};

positron.Loader.prototype.run = function ()
{
if (gApplication.isLogging (gApplication.kLogLoader)) console.log ("Loader.run() with queue length of " + this.queue.length);

  if (this.queue.length > 0)
  {
    var url = this.queue.shift ();

		if (gApplication.isLogging (gApplication.kLogLoader)) console.log ("Loader.run() loading url: " + url);
    
    // i'd make these callbacks methods, but js won't let me
    var self = this;
      
    if (this.isImageURL (url))
    {
      var image = new Image ();
      
      image.onload = function ()
      {
        self.onLoad (url);
      }
      
      image.onerror = function ()
      {
        self.onLoadError (url);
      }

			this.loadCount++;
      image.src = url;
    }
    else
    {
      var xhr = new XMLHttpRequest ();
      
      xhr.onreadystatechange = function ()
      {
        if (this.readyState == 4)
        {
          // status is 0 for success if loading off the filesystem
          // status is 200 for success if loading off the network
          if (this.status == 0 || this.status == 200)
          {
            self.onLoad (url);
          }
          else
          {
            self.onLoadError (url);
          }
        }
      };
      
      this.loadCount++;
      
      xhr.open ("GET", url, true);
      xhr.send ();
    }
  }
};

positron.Loader.prototype.isRunning = function ()
{
	return this.loadCount > 0;
};

// PRIVATE

positron.Loader.prototype.onLoad = function (inURL)
{
if (gApplication.isLogging (gApplication.kLogLoader)) console.log ("Loader.onLoad() with " + inURL);

	this.loadCount--;
  this.assetIndex++;
  
  this.fireProgressCallback ();
  this.run ();
};

positron.Loader.prototype.onLoadError = function (inURL)
{
console.error ("Loader.onLoadError() with " + inURL);

	this.loadCount--;
  this.assetIndex++;

  this.fireProgressCallback ();
  this.run ();
};

positron.Loader.prototype.isImageURL = function (inURL)
{
  var lowerCaseURL = inURL.toLowerCase ();
  
  // handle the situation where there are arguments on t'end of the URL
  var	urlElements = lowerCaseURL.split ("?");
  var	urlStem = urlElements [0];
  
  return this.stringEndsWith (urlStem, ".jpg") || this.stringEndsWith (urlStem, ".jpeg")
    || this.stringEndsWith (urlStem, ".png") || this.stringEndsWith (urlStem, ".gif");
};

positron.Loader.prototype.stringEndsWith = function (inString, inSuffix)
{
  return inString.length > inSuffix.length && inString.substr (0 - inSuffix.length) == inSuffix;
};

positron.Loader.prototype.fireStartCallback = function ()
{
  if (this.callbackObject && (typeof (this.callbackObject.onLoadStart) == "function"))
  {
    this.callbackObject.onLoadStart (this);
  }
}

positron.Loader.prototype.fireFinishCallback = function ()
{
  if (this.callbackObject && (typeof (this.callbackObject.onLoadFinish) == "function"))
  {
    this.callbackObject.onLoadFinish (this);
  }
}

positron.Loader.prototype.fireProgressCallback = function ()
{
	var percentage = (this.assetIndex / this.assetCount) * 100;
    
  if (this.callbackObject && (typeof (this.callbackObject.onLoadProgress) == "function"))
  {
    this.callbackObject.onLoadProgress (this, this.assetIndex, this.assetCount, percentage);
  }
  
	if (percentage == 100)
	{
		this.fireFinishCallback ();

		// essentially reset the progress callbacks
		// until something else is added
		this.assetIndex = 0;
		this.assetCount = 0;
	}
}

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.Util");

positron.Util = function ()
{
}

// pretends to be jquery $.ajax
positron.Util.ajax = function (inRequest)
{
  var fullURL = inRequest.url;
  
  var	data = "";
  
  // if data is an object, then serialise it, to be nice
  if (typeof (inRequest.data) == "object")
  {
  	data = positron.Util.objectToURIData (inRequest.data);
  }
  else
  {
  	data = inRequest.data;
  }
  
  if (data && data.length)
  {
    fullURL += "?" + data;
  }

	var	type = inRequest.type && inRequest.type.length ? inRequest.type : "GET";

	// ensure we upper case for later
	// seems like something above the submit event lowercases the method :-S
	type = type.toUpperCase ();

	var	async = inRequest.async ? true : false;

	inRequest.dataType = inRequest.dataType.toLowerCase ();

	var	jsonp = positron.Util.isJSONPRequest (inRequest);
	
	if (jsonp)
	{
		// console.log ("using jsonp for url: " + inRequest.url);
		positron.Util.jsonp (inRequest);
	}
	else
	{
		var	xhr = new XMLHttpRequest ();
	
		xhr.onreadystatechange = function ()
		{
			if (this.readyState == 4)
			{
				var	textStatus = "OK";
				
				// otherwise we check EVERYWHERE
				if (!inRequest.success)
				{
					inRequest.success = function ()
					{
					}
				}

				if (!inRequest.error)
				{
					inRequest.error = function ()
					{
					}
				}
				
				if (inRequest.dataType == "blob")
				{
					console.log ("data type is blob");
					console.log ("response length is " + this.response.length);

					if (this.response)
					{
						inRequest.success (this.response, textStatus, this);
					}
					else
					{
						textStatus = "error";
						inRequest.error (this, textStatus, "Not Found");
					}
				}
				else
				if (inRequest.dataType == "json")
				{
					// if loading off the filesystem, can"t tell the difference
					// between a file not found and an empty file
					// so if status = 0 and data is empty, call the error callback
					if ((this.responseText && this.responseText.length) || this.status == 200)
					{
						try
						{
							inRequest.success (JSON.parse (this.responseText), textStatus, this);
						}
						catch (inError)
						{
							textStatus = "parsererror";
							inRequest.error (this, textStatus, inError);
						}
					}
					else
					{
						textStatus = "error";
						inRequest.error (this, textStatus, "Not Found");
					}
				}
				else
				{
					// if loading off the filesystem, can"t tell the difference
					// between a file not found and an empty file
					// so if status = 0 and data is empty, call the error callback
					if ((this.responseText && this.responseText.length) || this.status == 200)
					{
						inRequest.success (this.responseText, textStatus, this);
					}
					else
					{
						textStatus = "error";
						inRequest.error (this, textStatus, "Not Found");
					}
				}
	
				if (typeof (inRequest.complete) == "function")
				{
					inRequest.complete (this, textStatus);
				}
			}
		}

		// the order of open(), setRequestHeader(), and send() is important
		
		var	url = inRequest.url;
		
		// also have to do this with GET urls
		if (type == "GET" || type == "HEAD")
		{
			if (data && data.length)
			{
				url += "?" + data;
			}
		}
	
		xhr.open (type, url, async);
	
		if (inRequest.dataType == "blob")
		{
			console.log ("setting response type to blob");
			xhr.responseType = "blob";
		}
		
		if (typeof (inRequest.headers) == "object")
		{
			for (var key in inRequest.headers)
			{
				var	value = inRequest.headers [key];
				
				if (typeof (value) != "function")
				{
					xhr.setRequestHeader (key, value);
				}
			}
		}
		
		// some browsers throw on send() instead of doing a state change, sigh
		try
		{
			if (inRequest.type == "POST")
			{
				xhr.send (data);
			}
			else
			{
				xhr.send (null);
			}
		}
		catch (inError)
		{
			if (typeof (inRequest.error) == "function")
			{
				inRequest.error (inRequest, "error", inError.name);
			}
		}
	}
};

// note this does *not* lowercase the remainder of the string
positron.Util.capitalise = function (inString)
{
	return inString.charAt (0).toUpperCase () + inString.substring (1);
}

positron.Util.clone = function (inObject)
{
	var	copy = inObject;
	
	if (inObject)
	{
		if (typeof inObject == "object")
		{
			if (Array.isArray (inObject))
			{
				copy = new Array ();
				
				for (var i = 0; i < inObject.length; i++)
				{
					copy [i] = positron.Util.clone (inObject [i]);
				}
			}
			else
			{
				copy = new Object ();
				
				for (var key in inObject)
				{
					copy [key] = positron.Util.clone (inObject [key]);
				}
			}
		}
	}
	
	return copy;
}

// returns whatever the last nonzero compare was
// or -1 for type mismatches, etc
positron.Util.compare = function (inOne, inTwo)
{
	var	result = 0;
	
	if (typeof inOne == typeof inTwo)
	{
		if (typeof inOne == "object")
		{
			// could be null, watch out
			if (inOne == null && inTwo == null)
			{
				result = 0;
			}
			else
			{
				if (Array.isArray (inOne))
				{
					if (inOne.length == inTwo.length)
					{
						for (var i = 0; i < inOne.length && result == 0; i++)
						{
							result = positron.Util.compare (inOne [i], inTwo [i]);
						}
					}
					else
					{
						result = -1;
					}
				}
				else
				{
					copy = new Object ();
					
					var	keys = new Object ();
					
					for (var key in inOne)
					{
						result = positron.Util.compare (inOne [key], inTwo [key]);
						
						if (result == 0)
						{
							keys [key] = true;
						}
						else
						{
							break;
						}
					}
					
					if (result == 0)
					{
						// ensure we don't have extra keys in inTwo
						for (var key in inTwo)
						{
							if (! keys [key])
							{
								result = -1;
								break;
							}
						}
					}
				}
			}
		}
		else
		{
			result = inOne === inTwo ? 0 : -1;
		}
	}
	else
	{
		result = -1;
	}
	
	return result;
}

positron.Util.convertClassNameToFileName = function (inClassName)
{
	var	fileName = "";
	
	for (var i = 0; i < inClassName.length; i++)
	{
		var	ch = inClassName.charAt (i);
		
		if (ch >= 'A' && ch <= 'Z')
		{
			if (fileName.length > 0)
			{
				fileName += '-';
			}
			
			fileName += ch.toLowerCase ();
		}
		else
		{
			fileName += ch;
		}
	}
	
	return fileName;
}

// note, no operator precedence is supported
positron.Util.evaluateArithmeticExpression = function (inString)
{
	var	sum = 0;
	var	term = 0;
	var	operand = '+';
	
	// sorry, you have to order your expression properly
	var	elements = inString.split (' ');
	
	for (var i = 0; i < elements.length; i++)
	{
		if (elements [i].length)
		{
			if (i % 2)
			{
				operand = elements [i];
			}
			else
			{
				var	number = elements [i];
				
				if (number.toLowerCase () == "random")
				{
					term = Math.random ();
				}
				else
				{
					term = parseFloat (number);
				}
				
				if (isNaN (term))
				{
					console.error ("term " + i + " evaluates to NaN in " + inString);
				}
				else
				{
					switch (operand)
					{
						case '+':
							sum += term;
							break;
						case '-':
							sum -= term;
							break;
						case '/':
							sum /= term;
							break;
						case '*':
							sum *= term;
							break;
						case '%':
							sum %= term;
							break;
						default:
							console.error ("unrecognised operand: " + operand);
							break;
					}
				}
			}
		}
	}
	
	return sum;
}

positron.Util.evaluateExpressionChain = function (inExpressionChain)
{
	// console.log ("positron.Util.evaluateExpressionChain()");
	// console.log (inExpressionChain);

	var	expressions = positron.Util.parseTokens (inExpressionChain);
	var	expression = new Array ();
	var	success = false;
	var	logical = false;
	
	for (var i = 0; i < expressions.length; i++)
	{
		if (logical)
		{
			var	compare = expressions [i].toLowerCase ();
			
			if (compare == "or" || compare == "||")
			{
				if (success)
				{
					break;
				}
			}
			else
			if (compare == "and" || compare == "&&")
			{
				if (!success)
				{
					break;
				}
			}
			else
			{
				// should we support more logical stuff here?
				console.error ("unsupported logical operator: " + compare);
				success = false;
				break;
			}
			
			logical = false;
		}
		else
		{
			expression.push (expressions [i]);
			
			if (expression.length == 3)
			{
				success = this.evaluateExpression (expression);
				expression.length = 0;
				
				// grab the logical expression next time
				logical = true;
			}
		}
	}
	
	return success;
};

// this is only intended to be called from evaluateExpressionChain() above
positron.Util.evaluateExpression = function (inExpression)
{
	// console.log ("evaluateExpression() on " + inExpression);
	
	var	success = false;
	var	first = null;
	var	second = null;
	
	if (positron.Util.isNumericTerm (inExpression [0]) && positron.Util.isNumericTerm (inExpression [2]))
	{
		first = parseFloat (inExpression [0]);
		second = parseFloat (inExpression [2]);
	}
	else
	{
		first = inExpression [0];
		second = inExpression [2];
	}

	switch (inExpression [1])
	{
		case "==":
		case "equals":
			success = first == second;
			break;
		case "!=":
		case "doesnotequal":
		case "notequals":
			success = first != second;
			break;
		case ">":
		case "greaterthan":
			success = first > second;
			break;
		case ">=":
		case "greaterthanorequal":
			success = first >= second;
			break;
		case "<":
		case "lessthan":
			success = first < second;
			break;
		case "<=":
		case "lessthanorequal":
			success = first <= second;
			break;
		case "contains":
			if (typeof (first) == "string")
			{
				success = first.indexOf (second) >= 0;
			}
			else
			{
				console.error ("contains operand used on numeric expression (skip)");
				success = true;
			}
			break;
		case "containsignorecase":
			if (typeof (first) == "string")
			{
				success = first.toLowerCase ().indexOf (second.toLowerCase ()) >= 0;
			}
			else
			{
				console.error ("containsignorecase operand used on numeric expression (skip)");
				success = true;
			}
			break;
		case "doesnotcontain":
			if (typeof (first) == "string")
			{
				success = first.indexOf (second) < 0;
			}
			else
			{
				console.error ("doesnotcontain operand used on numeric expression (skip)");
				success = true;
			}
			break;
		case "doesnotcontainignorecase":
			if (typeof (first) == "string")
			{
				success = first.toLowerCase ().indexOf (second.toLowerCase ()) < 0;
			}
			else
			{
				console.error ("doesnotcontainignorecase operand used on numeric expression (skip)");
				success = true;
			}
			break;
		default:
			console.error ("unknown operand: " + inExpression [1]);
			break;
	}
	
	// console.log ("return " + success);
	
	return success;
}

positron.Util.get2DDistance = function (inX1, inY1, inX2, inY2)
{
	return Math.sqrt (Math.pow ((inX1 - inX2), 2) + Math.pow ((inY1 - inY2), 2))
}

// remove any last number-only element from the attribute name
// so that "action-1" matches the attributelet for "action"
positron.Util.getAttributeSpec =
function Util_getAttributeSpec (inAttributeName)
{
	var	numberedAttribute = true;
	var	nameElements = inAttributeName.split ('-');
	
	if (nameElements.length > 1)
	{
		var	lastElement = nameElements [nameElements.length - 1];
		
		for (var i = 0; i < lastElement.length; i++)
		{
			if ("0123456789".indexOf (lastElement.charAt (i)) == -1)
			{
				// ok so the last element is not a number
				// bail
				numberedAttribute = false;
				break;
			}
		}
	}
	else
	{
		numberedAttribute = false;
	}
	
	var	attributeSpec = new Object ();
	
	if (numberedAttribute)
	{
		attributeSpec.number = parseInt (nameElements.pop ());
		attributeSpec.name = nameElements.join ('-');
	}
	else
	{
		attributeSpec.number = -1;
		attributeSpec.name = inAttributeName;
	}
	
	return attributeSpec;
}

positron.Util.getEventTimestamp = function (inEvent)
{
	var	timestamp = 0;
	
	if (inEvent.changedTouches)
	{
		timestamp = inEvent.changedTouches [0].timeStamp;
	}
	else
	{
		timestamp = inEvent.timeStamp;
	}
	
	return timestamp;
}

// because everyone will get it wrong
positron.Util.getEventTimeStamp = positron.Util.getEventTimestamp;

positron.Util.getEventX = function (inEvent)
{
	var	x = 0;
	
	if (inEvent.changedTouches)
	{
		x = inEvent.changedTouches [0].pageX;
	}
	else
	{
		if (inEvent.pageX || inEvent.pageY)
		{
			x = inEvent.pageX;
		}
		else
		if (inEvent.clientX || inEvent.clientY)
		{
			x = inEvent.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
		}
	}

	return x;
}

positron.Util.getEventY = function (inEvent)
{
	var	y = 0;
	
	if (inEvent.changedTouches)
	{
		y = inEvent.changedTouches [0].pageY;
	}
	else
	{
		if (inEvent.pageX || inEvent.pageY)
		{
			y = inEvent.pageY;
		}
		else
		if (inEvent.clientX || inEvent.clientY)
		{
			y = inEvent.clientY + document.body.scrollTop + document.documentElement.scrollTop;
		}
	}
	
	return y;
}

positron.Util.getJSON = function (inURL)
{
	var	json = null;
	var	urlElements = inURL.split ("?");
	
	positron.Util.ajax
	({
		url: urlElements [0],
		data: urlElements [1],
		dataType: "json",
		async: false,
		type: "GET",
		success: function (inData, inTextStatus, inXHR)
		{
			json = inData;
		},
		error: function (inXHR, inTextStatus, inError)
		{
			console.error ("load of " + inURL + " failed");
			
			// wtf do we get undefined errors?
			if (inError)
			{
				// ajax errors are useless anyway
				// console.error (inError);
			}
		}
	});
	
	return json;
}

positron.Util.getTextSync = function (inURL, inParams)
{
	if (gApplication.isLogging (gApplication.kLogLoader))
		console.log ("Loader.getTextSync(" + inURL + ")");
		
	var	text = positron.Util.getURLContents (inURL, inParams, "GET", "text", false);
	
	if (gApplication.isLogging (gApplication.kLogLoader))
	{
		if (text)
		{
			if (gApplication.isLogging (gApplication.kLogLoader))
				console.log ("received text of length: " + text.length);
		}
		else
		{
			if (gApplication.isLogging (gApplication.kLogLoader))
				console.log ("no text received");
		}
	}
	
	return text;
}

// can be used without gApplication
positron.Util.getURLContents = function (inURL, inParams, inMethod, inDataType, inAsync)
{
	if (gApplication && gApplication.isLogging (gApplication.kLogLoader))
		console.log ("Loader.load(" + inURL + ")");
		
	var	payload = null;
	
	var	data = "";
	
	if (inParams)
	{
		for (var key in inParams)
		{
			var	value = inParams [key];
			
			if (typeof (value) == "string")
			{
				data += key + "=" + encodeURIComponent (value) + "&";
			}
		}
	}
	
	positron.Util.ajax
	({
		url: inURL,
		data: data,
		type: inMethod,
		dataType: inDataType,
		async: inAsync,
		success: function (inData, inTextStatus, inXHR)
		{
			if (gApplication && gApplication.isLogging (gApplication.kLogLoader))
				console.log ("success");

			payload = inData;
		},
		error: function (inXHR, inTextStatus, inError)
		{
			if (gApplication && gApplication.isLogging (gApplication.kLogLoader))
			{
				console.error ("load of " + inURL + " failed");
				
				if (inError)
				{
					console.error (inError);
				}
			}
		}
	});
	
	return payload;
}

positron.Util.globalEval = function (inCode)
{
	(
		window.execScript ||
		function (inCode)
		{
			window ["eval"].call (window, inCode);
		}
	)(inCode);
}

// note this MUST throw on error
// lots of code above it depends on this
positron.Util.instantiate = function (inFullClassName)
{
	// console.log ("Util.instantiate(" + inFullClassName + ")");
	
	var	object = window;
	
	var	packageElements = inFullClassName.split ('.');
	
	for (var i = 0; i < packageElements.length; i++)
	{
		object = object [packageElements [i]];
		
		if (!object)
		{
			break;
		}
	}
	
	if (object)
	{
		return new object;
	}
	else
	{
		throw new Error ("unable to instantiate class " + inFullClassName);
	}
}

// ok so a little clarification --
// if the URL includes a port number, but the port is the default one
// then it is excluded from "port" and "host"
// i think i'd rather have it default when it *isn't* there
// but either way comparing is easier without it
// colour me baphled (again)
positron.Util.isCrossDomainRequest = function (inURL)
{
	var	here = document.createElement ("a");
	here.href = document.location.href.toLowerCase ();
	
	var	there = document.createElement ("a");
	there.href = inURL.toLowerCase ();
	
	// host includes the port, if any
	return here.protocol != there.protocol || here.host != there.host;
}

positron.Util.isEmpty = function (inObject)
{
	var	empty = true;
	
	for (var key in inObject)
	{
		empty = false;
		break;
	}
	
	return empty;
}

positron.Util.isJSONPRequest = function (inRequest)
{
	var	jsonp = true;
	
	if (positron.Util.isCrossDomainRequest (inRequest.url))
	{
		if (gApplication.config.crossDomainStrategy)
		{
			var	browserName = gApplication.browser.name;
			
			if (browserName && browserName.length)
			{
				var	strategy = gApplication.config.crossDomainStrategy [browserName];
				// console.log ("browser cross-domain strategy is " + strategy);
				
				if (strategy && strategy.length)
				{
					jsonp = strategy == "jsonp";
				}
			}
		}
	}
	else
	{
		// safe request, leave alone
		jsonp = false;
	}

	return jsonp;	
}

positron.Util.isNumericTerm = function (inTerm)
{
	var	numeric = inTerm.length > 0;
	var	hadE = false;
	var	hadPlusMinus = false;
	var	hadDecimal = false;
	
	for (var i = 0; i < inTerm.length; i++)
	{
		var	ch = inTerm.charAt (i);
		
		if (ch >= "0" && ch <= "9")
		{
			// ok
		}
		else
		if (ch == ".")
		{
			if (hadDecimal)
			{
				numeric = false;
				break;
			}

			hadDecimal = true;			
		}
		else
		if (ch == "E" || ch == "e")
		{
			if (hadE)
			{
				numeric = false;
				break;
			}

			hadE = true;
		}
		else
		if (ch == "+" || ch == "-")
		{
			if (hadPlusMinus)
			{
				numeric = false;
				break;
			}

			hadPlusMinus = true;
		}
		else
		{
			numeric = false;
			break;
		}
	}
	
	return numeric;
}

positron.Util.jsonpSequence = 0;

positron.Util.jsonp = function (inRequest)
{
	var	jsonpCallbackName = "positron_json_callback_" + positron.Util.jsonpSequence;
	positron.Util.jsonpSequence++;
	
	var	url = inRequest.url;
	url += "?";
	
  var	data = "";
  
  // if data is an object, then serialise it, to be nice
  if (typeof (inRequest.data) == "object")
  {
  	data = positron.Util.objectToURIData (inRequest.data);
  }
  else
  {
  	data = inRequest.data;
  }

	if (data && data.length)
	{
		url += data;
	}
	
	url += "&callback=" + jsonpCallbackName;
	
	var	jsonTag = document.createElement ("script");
	jsonTag.setAttribute ("type", "text/javascript");
	jsonTag.setAttribute ("src", url);
	
	jsonTag.onload = function ()
	{
		// i hear that setTimeout()ing this is safer...
		setTimeout
		(
			function ()
			{
				window [jsonpCallbackName] = null;
				document.querySelector ("head").removeChild (jsonTag);
			},
			1
		);
	}
	
	// i am so grateful this exists
	jsonTag.onerror = function ()
	{
		if (inRequest.error)
		{
			inRequest.error (null, "ERROR", null);
		}
	}
	
	document.querySelector ("head").appendChild (jsonTag);
	
	window [jsonpCallbackName] = function (inJSONObject)
	{
		if (inJSONObject)
		{
			if (typeof (inRequest.success) == "function")
			{
				inRequest.success (inJSONObject, "OK", null);
			}
		}
		else
		{
			if (typeof (inRequest.error) == "function")
			{
				inRequest.error (null, "ERROR", null);
			}
		}
	}
}

positron.Util.loadActionlet = function (inClassName)
{
	return positron.Util.loadCodelet (inClassName, "actions");
}

// codelet is a new name for actionlet, taglet, etc :-)
positron.Util.loadCodelet = function (inClassName, inDirectory)
{
	var	path = inDirectory + "/" + positron.Util.convertClassNameToFileName (inClassName) + ".js";
	var	code = positron.Util.getTextSync (path);
	
	var	loaded = false;
	
	if (code && code.length)
	{
		try
		{
			positron.Util.globalEval (code);
			loaded = true;
		}
		catch (inError)
		{
		}
	}
	
	return loaded;
}

positron.Util.loadAttributelet = function (inClassName)
{
	return positron.Util.loadCodelet (inClassName, "attributes");
}

positron.Util.loadEventlet = function (inClassName)
{
	return positron.Util.loadCodelet (inClassName, "events");
}

positron.Util.loadTaglet = function (inClassName)
{
	return positron.Util.loadCodelet (inClassName, "tags");
}

positron.Util.loadTriggerlet = function (inClassName)
{
	return positron.Util.loadCodelet (inClassName, "triggers");
}

positron.Util.logArray = function (inObject)
{
	console.log ("[");
	
	for (var i = 0; i < inObject.length; i++)
	{
		var	member = inObject [i];
		var	memberType = typeof (member);
		
		if (memberType == "function")
		{
			console.log ("(function)");
		}
		else
		{
			console.log (member);
		}
	}

	console.log ("]");
}

positron.Util.logObject = function (inObject, inObjectName)
{
	if (typeof (inObjectName) == "string")
	{
		console.log (inObjectName);
	}
	
	for (var key in inObject)
	{
		console.log (key + " (" + typeof (key) + ")");
		
		var	value = inObject [key];
		var	valueType = typeof (value);
		
		if (Array.isArray (value))
		{
			positron.Util.logArray (value);
		}
		else
		if (valueType == null)
		{
			console.log ("(null)");
		}
		else
		if (valueType == "object")
		{
			console.log (value);
		}
		else
		if (valueType == "function")
		{
			console.log ("(function)");
		}
		else
		{
			console.log (value);
		}
	}
}

positron.Util.kExtensionToContentType = 
{
	"css" : "text/css",
	"gif" : "image/gif",
	"htm" : "application/html",
	"html" : "application/html",
	"jpg" : "image/jpeg",
	"jpeg" : "image/jpeg",
	"json" : "application/json",
	"js" : "application/javascript",
	"mp3" : "audio/mpeg3",
	"mpg" : "video/mpeg",
	"png" : "image/png",
	"rtf" : "application/rtf",
	"xml" : "application/xml"
};

// pass any string in here
positron.Util.mapExtensionToContentType = function (inString)
{
	var	extension = inString;
	var	periodIndex = inString.lastIndexOf (".");
	
	if (periodIndex >= 0)
	{
		extension = inString.substring (periodIndex + 1);
	}
	
	extension = extension.toLowerCase ();

	var	contentType = positron.Util.kExtensionToContentType [extension];
	
	if (!contentType)
	{
		console.error ("no content type for extension (" + extension + ")");
		contentType = "application/octet-stream";
	}
	
	return contentType;
}

positron.Util.merge = function (inObject, outObject)
{
	for (var key in inObject)
	{
		var	value = inObject [key];
		var	valueType = typeof (value);
		
		if (valueType == "string" || valueType == "number" || valueType == "boolean")
		{
			var	outValue = outObject [key];
			
			if (typeof (outValue) == "undefined" || typeof (outValue) == valueType)
			{
				outObject [key] = value;
			}
			else
			{
				console.error ("type mismatch on key: " + key);
				console.error ("type of existing is " + typeof (outValue));
				console.error ("type of incoming is " + typeof (valueType));
			}
		}
		else
		if (Array.isArray (value))
		{
			var	outValue = outObject [key];
			
			if (typeof (outValue) == "undefined")
			{
				outObject [key] = value;
			}
			else
			if (Array.isArray (outValue))
			{
				for (var i = 0; i < value.length; i++)
				{
					// don't push duplicates? is this reliable for object members?
					if (outValue.indexOf (value [i]) < 0)
					{
						outValue.push (value [i]);
					}
				}
			}
			else
			{
				console.error ("type mismatch on key: " + key);
				console.error ("type of existing is " + typeof (outValue));
				console.error ("type of incoming is " + typeof (valueType));
			}
		}
		else
		if (valueType == "object")
		{
			var	outValue = outObject [key];
			
			if (outValue)
			{
				if (typeof (outValue) == "object")
				{
					if (Array.isArray (outValue))
					{
						console.error ("type mismatch on key: " + key);
					}
					else
					{
						positron.Util.merge (value, outValue);
					}
				}
				else
				{
					console.error ("type mismatch on key: " + key);
				}
			}
			else
			{
				outObject [key] = value;
			}
		}
		else
		{
			console.error ("fell off the typeof chain for key: " + key);
		}
		
	}
}

positron.Util.objectToURIData = function (inObject)
{
	var	data = "";
	
	for (var key in inObject)
	{
		if (typeof (key) == "string")
		{
			var	value = inObject [key];
			
			if (typeof (value) == "string" || typeof (value) == "number" || typeof (value) == "boolean")
			{
				if (data.length > 0)
				{
					data += "&";
				}
				
				data += key;
				data += "=";
				data += encodeURIComponent ("" + value);
			}
		}
	}
	
	return data;
}

positron.Util.parseFloat = function (inString, inDefault)
{
	var	value = inDefault;
	
	if (inString && inString.length)
	{
		value = parseFloat (inString);
	
		if (isNaN (value))
		{
			value = inDefault;
		}
	}
	
	return value;
}

positron.Util.parseInt = function (inString, inDefault)
{
	var	value = inDefault;
	
	if (inString && inString.length)
	{
		value = parseInt (inString);
	
		if (isNaN (value))
		{
			value = inDefault;
		}
	}
	
	return value;
}

positron.Util.parseParams = function (inParamString)
{
	// console.log ("parseParams(" + inParamString + ")");
	
	var	params = new Object ();
	
	var	inKey = true;
	var	key = "";
	var	quoteCharacter = null;
	var	value = "";
	
	if (inParamString)
	{
		for (var i = 0; i < inParamString.length; i++)
		{
			var	ch = inParamString.charAt (i);
			
			if (ch == quoteCharacter)
			{
				quoteCharacter = null;
			}
			else
			if (quoteCharacter)
			{
				if (inKey)
				{
					key += ch;
				}
				else
				{
					value += ch;
				}
			}
			else
			if (ch == '\\')
			{
				var	add = null;
				
				if (i < (inParamString.length - 1))
				{
					i++;
					add = inParamString.charAt (i);
				}
				else
				{
					add = ch;
				}
				
				if (inKey)
				{
					key += add;
				}
				else
				{
					value += add;
				}
			}
			else
			if (ch == '\'' || ch == '"')
			{
				quoteCharacter = ch;
			}
			else
			if (ch == ':')
			{
				if (inKey)
				{
					inKey = false;
				}
				else
				{
					value += ch;
				}
			}
			else
			if (ch == ';')
			{
				key = positron.Util.stripSpaces (key);
				value = positron.Util.stripSpaces (value);
				
				if (key.length)
				{
					params [key] = value;
				}
				else
				{
					console.error ("zero length key...");
				}
				
				inKey = true;
				key = "";
				value = "";
			}
			else
			{
				if (inKey)
				{
					key += ch;	
				}
				else
				{
					value += ch;
				}
			}
		}
		
		if (!inKey && key.length)
		{
			key = positron.Util.stripSpaces (key);
			value = positron.Util.stripSpaces (value);

			if (key.length)
			{
				params [key] = value;
			}
			else
			{
				console.error ("zero length key...");
			}
		}
	}
	
	return params;
}

positron.Util.kTimeUnits =
[
	"ms",
	"s",
	"m",
	"h",
	"d"
];

positron.Util.kTimeMultipliers =
[
	1,
	1000,
	60,
	60,
	24
];

// parses 1000ms, 50s, 35m etc into milliseconds
positron.Util.parseTime = function (inTimeString, inDefault)
{
	var	timeAndUnits = positron.Util.parseValueAndUnits (inTimeString, inDefault, "ms");
	
	var	unitIndex = positron.Util.kTimeUnits.indexOf (timeAndUnits.units);
	
	if (unitIndex >= 0)
	{
		for (var j = 0; j <= unitIndex; j++)
		{
			timeAndUnits.value *= positron.Util.kTimeMultipliers [j];
		}
	}

	// we guarantee an integer value
	return Math.round (timeAndUnits.value);
}

positron.Util.parseTokens = function (inString)
{
	var	elements = new Array ();
	var	element = "";
	var	quoteCharacter = null;
	var	quotedElement = false;
	
	for (var i = 0; i < inString.length; i++)
	{
		var	ch = inString.charAt (i);

		if (ch == quoteCharacter)
		{
			quoteCharacter = null;
			
			// have to ensure we don't refuse a zero length quoted element here
			// but we can't take it yet
			if (element.length == 0)
			{
				quotedElement = true;
			}
		}
		else
		if (ch == '\\')
		{
			if (i < (inCondition.length - 1))
			{
				i++;
				element += inCondition.charAt (i);
			}
			else
			{
				element += ch;
			}
		}
		else
		if (ch == '\'' || ch == '"')
		{
			quoteCharacter = ch;
		}
		else
		if (ch == ' ')
		{
			if (quoteCharacter)
			{
				element += ch;
			}
			else
			{
				if (quotedElement || element.length)
				{
					elements.push (element);
					element = "";
					quotedElement = false;
				}
			}
		}
		else
		{
			element += ch;
		}
	}
	
	if (quotedElement || element.length)
	{
		elements.push (element);
	}

	return elements;
}

positron.Util.replaceAll = function (inString, inReplace, inWith)
{
	return inString.split (inReplace).join (inWith);
}

positron.Util.parseValueAndUnits = function (inString, inDefaultValue, inDefaultUnits)
{
	var	valueAndUnits = new Object ();
	valueAndUnits.value = 0;
	valueAndUnits.units = inDefaultUnits ? inDefaultUnits : "";
	
	if (inString && inString.length)
	{
		var	multiplier = 1;
		var	decimalDigits = 0;

		inString = positron.Util.stripSpaces (inString);
		
		for (var i = 0; i < inString.length; i++)
		{
			var	ch = inString.charAt (i);
			
			if (ch == '.')
			{
				if (decimalDigits > 0)
				{
					console.error ("Util.parseValueAndUnits() found multiple decimals in : " + inString);
				}
				else
				{
					decimalDigits++;
				}
			}
			else
			if (ch == '-')
			{
				multiplier = -1;
			}
			else
			{
				var	timeDigit = parseInt (ch);
				
				if (isNaN (timeDigit))
				{
					if (i == 0)
					{
						// we never got a numeric digit, use the default
						valueAndUnits.value = inDefaultValue;
					}
					else
					{
						// negate if necessary
						valueAndUnits.value *= multiplier;
					}
					
					valueAndUnits.units = inString.substring (i);
					break;
				}
				else
				{
					if (decimalDigits == 0)
					{
						valueAndUnits.value *= 10;
						valueAndUnits.value += timeDigit;
					}
					else
					{
						valueAndUnits.value += (ch - '0') * (1 / (Math.pow (10, decimalDigits)));
						decimalDigits++;
					}
				}
			}
		}
	}
	else
	{
		valueAndUnits.value = inDefaultValue;
	}
		
	return valueAndUnits;
}

positron.Util.smartJoin = function (inArray, inDelimiter)
{
	var	joined = "";
	
	for (var i = 0; i < inArray.length; i++)
	{
		var	element = inArray [i];
		
		if (element && element.length)
		{
			if (joined.length > 0)
			{
				joined += inDelimiter;
			}
			
			joined += element;
		}
	}
	
	return joined;
}

positron.Util.stripSpaces = function (inString)
{
	return inString.replace (positron.Util.kStripSpacesRegEx, "");
}

positron.Util.unparseParams = function (inParams)
{
	var unparsed = "";
	
	if (inParams)
	{
		for (var key in inParams)
		{
			var value = inParams [key];
			
			if (typeof (key) == "string")
			{
				var	valueType = typeof (value);
				
				if (valueType == "string" || valueType == "number" || valueType == "boolean")
				{
					unparsed += key + ": " + value + ";";
				}
			}
		}
	}
	
	return unparsed;
}

positron.Util.validateEmailAddress = function (inAddress)
{
	var	valid = inAddress.length > 0;
	
	var	hadAt = false;
	var	local = "";
	var	domainElements = [];

	var	buffer = "";
	
	for (var i = 0; i < inAddress.length; i++)
	{
		var	ch = inAddress.charAt (i);
		
		if (ch == "@")
		{
			if (hadAt)
			{
				// console.error ("rejecting email address " + inAddress + " due to extra @ symbols");
				valid = false;
				break;
			}

			if (buffer.length === 0)
			{
				// console.error ("rejecting email address " + inAddress + " due to zero length local element");
				valid = false;
				break;
			}
			
			local = buffer;
			buffer = "";
			
			hadAt = true;
		}
		else
		if (ch == ".")
		{
			if (hadAt)
			{
				if (buffer.length === 0)
				{
					// console.error ("rejecting email address " + inAddress + " due to empty domain element");
					valid = false;
					break;
				}
				
				domainElements [domainElements.length] = buffer;
				buffer = "";
			}
			else
			{
				buffer += ch;
			}
		}
		else
		if ((ch >= "a" && ch <= "z") ||
			(ch >= "A" && ch <= "Z") ||
			(ch >= "0" && ch <= "9") ||
			("!#$%&'*+-/=?^_`{|}~".indexOf (ch) >= 0))
		{
			buffer += ch;
		}
		else
		{
			// console.error ("rejecting email address " + inAddress + " due to bad character " + ch);
			valid = false;
			break;
		}
	}

	if (valid && (buffer.length > 0))
	{
		if (hadAt)
		{
			domainElements [domainElements.length] = buffer;
		}
		else
		{
			local = buffer;
		}
	}
	
	// ASSUME already checked:
	// local length
	// individual domain element length
	// 
	
	if (valid && (! hadAt))
	{
		// console.error ("rejecting email address " + inAddress + " due to no @ character");
		valid = false;
	}
	
	if (valid && (domainElements.length < 2))
	{
		// console.error ("rejecting email address " + inAddress + " due to insufficient domain elements");
		valid = false;
	}
	
	if (valid && (domainElements [domainElements.length - 1].length < 2))
	{
		// console.error ("rejecting email address " + inAddress + " due to short final domain element");
		valid = false;
	}
	
	return valid;
};

positron.Util.kStripSpacesRegEx = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.View");

positron.View = function positron_View ()
{
	this.deferredActions = new Array ();
	this.deferredTasks = new Array ();
	this.cancellableActions = new Array ();
}

positron.View.prototype.addCancellableAction =
function View_addCancellableAction (inAction)
{
	if (gApplication.isLogging (gApplication.kLogViews))
		console.log ("View(" + this.key + ").addCancellableAction(" + inAction.toString () + ")");
	
	this.cancellableActions.push (inAction);
}

positron.View.prototype.addDeferredAction =
function View_addDeferredAction (inAction)
{
	if (gApplication.isLogging (gApplication.kLogViews))
		console.log ("View(" + this.key + ").addDeferredAction(" + inAction.toString () + ")");
	
	this.deferredActions.push (inAction);
}

// this is for generic tasks
positron.View.prototype.addDeferredTask =
function View_addDeferredTask (inTask)
{
	if (gApplication.isLogging (gApplication.kLogViews))
		console.log ("View(" + this.key + ").addDeferredTask()");
	
	this.deferredTasks.push (inTask);
}

// caution, this just cancels the walker
// for use in specific appropriate circumstances only
// like a superview is refreshing
positron.View.prototype.cancelRefresh =
function View_cancelRefresh ()
{
	if (this.treeWalker)
	{
		this.treeWalker.cancel ();
		this.treeWalker = null;
	}
}

positron.View.prototype.cancelSubviewRefreshes =
function View_cancelSubviewRefreshes ()
{
	var	subviewElements = this.element.querySelectorAll ("[" + gApplication.getAttributePrefix () + "view]");
	
	if (subviewElements)
	{
		for (var i = 0; i < subviewElements.length; i++)
		{
			var	view = positron.DOM.getData (subviewElements [i], "view");
			
			if (view)
			{
				view.cancelRefresh ();
			}
		}
	}
}

positron.View.prototype.cancelTransitions =
function View_cancelTransitions ()
{
	if (this.isTransitioningIn ())
	{
		positron.removeClass (this.element, this.transitionInClass);
		this.transitionInClass = null;
	}

	if (this.isTransitioningOut ())
	{
		positron.removeClass (this.element, this.transitionOutClass);
		this.transitionOutClass = null;
	}
}

positron.View.prototype.configure =
function View_configure (inKey, inElement, inPage)
{
	if (gApplication.isLogging (gApplication.kLogViews))
		console.log ("View.configure(" + inKey + ")");

	this.key = inKey;
	this.element = inElement;
	this.html = this.element.innerHTML;
	this.page = inPage;
	
	this.params = new Object ();
	
	// if we're initially invisible
	// then refresh on the next show()
	this.showing = false;
	this.refreshing = !this.isVisible ();
	
	// HACK check to see whether we're a view or page here
	// the alternative is a completely separate Page.configure()
	// which might have side effects as View matures
	if (this.page)
	{
		this.context = gApplication.makeContext (this.page.context);
	}
	else
	{
		this.context = gApplication.makeContext (gApplication.context);
	}

	var	animationEndEventName = positron.CSS.getPrefixedEvent ("animationend");
	
	// for callbacks
	var	self = this;
	
	this.element.addEventListener
	(
		animationEndEventName,
		function (inEvent)
		{
			var	view = positron.DOM.getData (inEvent.target, "view");
			
			if (view)
			{
				self.onAnimationEnd (view);
				inEvent.stopPropagation ();
			}
		},
		false
	);
}

positron.View.prototype.fireAnalyticsEvent =
function View_fireAnalyticsEvent (inEventName, inDetail)
{
	gApplication.fireAnalyticsEvent
	({
		timestamp: new Date ().getTime (),
		domain: this.page ? "view" : "page",
		page: this.page ? this.page.key : this.key,
		view: this.page ? this.key : null,
		name: inEventName,
		detail: inDetail
	});
}

positron.View.prototype.hide =
function View_hide (inTransitionOutClass)
{
	if (gApplication.isLogging (gApplication.kLogViews)) console.log ("View.hide(" + this.key + ")");
	
	if (this.isTransitioningIn ())
	{
		positron.DOM.removeClass (this.element, this.transitionInClass);
		this.transitionInClass = null;
		positron.DOM.addPrefixedClass (this.element, "invisible");
	}
	else
	if (this.isTransitioningOut ())
	{
		// we are transitioning out, leave alone
	}
	else
	if (this.isVisible ())
	{
		positron.DOM.removePrefixedClass (this.element, "visible");
		
		if (inTransitionOutClass && inTransitionOutClass.length)
		{
			this.transitionOutClass = inTransitionOutClass;
		}
		else
		{
			this.transitionOutClass = gApplication.getCSSClassPrefix () + "transition-invisible";
		}
		
		this.onBeforeInvisible ();
		new positron.BeforeInvisibleTreeWalker ().startWalkChildren (this.element);

		positron.DOM.addClass (this.element, this.transitionOutClass);
	}
	else
	{
		// we are already invisible
		console.log ("view is already invisible");
	}
}

positron.View.prototype.isRefreshing =
function View_isRefreshing ()
{
	return this.refreshing;
}

positron.View.prototype.isTransitioning =
function View_isTransitioning ()
{
	return this.isTransitioningIn () || this.isTransitioningOut ();
}

positron.View.prototype.isTransitioningIn =
function View_isTransitioningIn ()
{
	return this.transitionInClass && this.transitionInClass.length
		&& positron.DOM.hasClass (this.element, this.transitionInClass);
}

positron.View.prototype.isTransitioningOut =
function View_isTransitioningOut ()
{
	return this.transitionOutClass && this.transitionOutClass.length
		&& positron.DOM.hasClass (this.element, this.transitionOutClass);
}

positron.View.prototype.isVisible =
function View_isVisible ()
{
	return ! positron.DOM.hasPrefixedClass (this.element, "invisible");
}

positron.View.prototype.refresh =
function View_refresh (inTransitionInClass)
{
	if (gApplication.isLogging (gApplication.kLogViews)) console.log ("View.refresh(" + this.key + ")");

	this.refreshing = true;
	this.wasRefreshing = false;
	
	// if any of our subviews are refreshing, cancel them
	this.cancelSubviewRefreshes ();
	
	this.show (inTransitionInClass);
}

positron.View.prototype.run =
function View_run ()
{
	if (gApplication.isLogging (gApplication.kLogViews)) console.log ("View.run(" + this.key + ")");

	this.refreshing = true;
	this.running = true;
	
	// if any of our subviews are refreshing, cancel them
	this.cancelSubviewRefreshes ();
	
	// strongarm us invisible
	this.cancelTransitions ();
	positron.DOM.addClass (this.element, gApplication.getCSSClassPrefix () + "invisible");
	
	this.show ();
}

// NOTE put params into context discretely
// putting the params object into context may seem convenient
// BUT it masks ALL params from inherited contexts like Page and Application
positron.View.prototype.setParams =
function View_setParams (inParams)
{
	if (inParams)
	{
		for (var key in inParams)
		{
			this.setParam (key, inParams [key]);
		}
	}
}

// ALWAYS go through here to set params
// as it updates context, too
positron.View.prototype.setParam =
function View_setParam (inKey, inValue)
{
	this.params [inKey] = inValue;
	this.context.put ("params." + inKey, inValue);
}

positron.View.prototype.show =
function View_show (inTransitionInClass)
{
	if (gApplication.isLogging (gApplication.kLogViews)) console.log ("View.show(" + this.key + ")");

	var	refreshingSuperview = positron.DOM.getRefreshingParentView (this.element);
	
	if (refreshingSuperview)
	{
		console.error ("View.show(" + this.key + ") rejected due to refreshing superview (" + refreshingSuperview.key + ")");
		return;
	}
	
	// assume that we are NOT doing a visibility transition
	// if the view is invisible and not transitioning, then we do one
	this.showing = false;
	this.wasRefreshing = false;
	
	if (this.isTransitioningIn ())
	{
		if (gApplication.isLogging (gApplication.kLogViews)) console.log ("view is transitioning in, refreshing it...");
		
		// only cancel the treewalker if another refresh is pending
		if (this.treeWalker && this.refreshing)
		{
			this.treeWalker.cancel ();
			this.treeWalker = null;
		}
	}
	else
	if (this.isTransitioningOut ())
	{
		if (gApplication.isLogging (gApplication.kLogViews)) console.log ("view is transitioning out, stopping it...");
		
		positron.DOM.removeClass (this.element, this.transitionOutClass);
		this.transitionOutClass = null;
		positron.DOM.addPrefixedClass (this.element, "visible");
	}
	else
	if (this.isVisible ())
	{
		if (gApplication.isLogging (gApplication.kLogViews)) console.log ("view is visible...");

		// only cancel the treewalker if another refresh is pending
		if (this.treeWalker && this.refreshing)
		{
			this.treeWalker.cancel ();
			this.treeWalker = null;
		}
	}
	else
	{
		if (!this.running)
		{
			// the view is currently invisible and not transitioning
			// so show it
			this.showing = true;
		}
	}

	// console.log ("showing? " + this.showing);
	// console.log ("refreshing? " + this.refreshing);
	
	if (this.showing)
	{
		// do this before the plumbing so the code sees its own structure
		this.onBeforeVisible ();
	}

	if (this.refreshing)
	{
		// we're dumping the current markup
		// so cancel any existing cancellable actions
		this.cancelActions ();
		
		// make the refresh & progress elements, etc
		this.prepareForDynamics ();
	}
	
	if (this.showing)
	{
		this.fireAnalyticsEvent ("show");
	}
	
	if (this.refreshing)
	{
		this.fireAnalyticsEvent ("refresh");
	}

	// cancel any scheduled refresh
	this.refreshScheduled = false;
	
	if (this.showing)
	{
		positron.DOM.removePrefixedClass (this.element, "invisible");

		if (inTransitionInClass && inTransitionInClass.length)
		{
			this.transitionInClass = inTransitionInClass;
		}
		else
		{
			this.transitionInClass = gApplication.getCSSClassPrefix () + "transition-visible";
		}
		
		positron.DOM.addClass (this.element, this.transitionInClass);

		if (this.refreshing)
		{
			// showing AND refreshing
			
			// keep track of the fact that we're in a refresh timeout
			this.refreshScheduled = true;
			
			// give the browser time to process the class changes
			// so hopefully we don't get a FOTC
			var	self = this;
	
			setTimeout
			(
				function ()
				{
					// if nobody has unscheduled us...
					if (self.refreshScheduled)
					{
						self.refreshScheduled = false;
						
						// this is extra arse protect
						// as the refreshScheduled flag should prevent us from arriving here
						// when another refresh happened between scheduling and firing
						if (self.refreshElement)
						{
							// run the refresh walker in OBV mode
							self.treeWalker = new positron.RefreshTreeWalker (self, true);
							self.treeWalker.startWalkChildren (self.refreshElement, self.context);
						}
						else
						{
							console.error ("refresh with no refresh element, scheduled flag is not enough");
						}
					}
				},
				1
			);
		}
		else
		{
			// showing and NOT refreshing
			
			// these are guaranteed to be synchronous
			new positron.BeforeVisibleTreeWalker ().walkChildren (this.element);
			new positron.VisibleTreeWalker ().walkChildren (this.element);
			
			this.showing = false;
		}
	}
	else
	{
		if (this.refreshing)
		{
			// refreshing and NOT showing
			
			this.fireAnalyticsEvent ("refresh");
			
			// refreshes don't need a setTimeout()
			// as we're not doing any visibility changes
			this.treeWalker = new positron.RefreshTreeWalker (this, false);
			this.treeWalker.startWalkChildren (this.refreshElement, this.context);
		}
		else
		{
			// show with no refresh on already visible view, do nothing
		}
	}
}

// PRIVATE

positron.View.prototype.cancelActions =
function View_cancelActions ()
{
	// console.log ("View(" + this.key + ").cancelActions()");

	this.cancelPrivateActions ();
	
	var	subviewElements = this.element.querySelectorAll ("[" + gApplication.getAttributePrefix () + "view]");
	
	if (subviewElements)
	{
		for (var i = 0; i < subviewElements.length; i++)
		{
			var	subview = positron.DOM.getData (subviewElements [i], "view");
			
			if (subview)
			{
				subview.cancelPrivateActions ();
			}
		}
	}
}

// cancel *our* cancellable actions, as opposed to the subviews'
positron.View.prototype.cancelPrivateActions =
function View_cancelPrivateActions ()
{
	// console.log ("View(" + this.key + ").cancelPrivateActions(" + this.cancellableActions.length + ")");

	for (var i = 0; i < this.cancellableActions.length; i++)
	{
		var	action = this.cancellableActions [i];
		
		try
		{
			action.cancel ();
		}
		catch (inError)
		{
			console.error ("error trying to cancel action: " + action.toString ());
			console.error (inError.message);
		}
	}
	
	this.cancellableActions.length = 0;
}

positron.View.prototype.prepareForDynamics =
function View_prepareForDynamics ()
{
	this.refreshElement = document.createElement ("div");
	positron.DOM.addPrefixedClass (this.refreshElement, "invisible");
	positron.DOM.addPrefixedClass (this.refreshElement, "view-refresh");
	positron.DOM.removeChildren (this.element);
	this.refreshElement.innerHTML = this.html;
	this.element.appendChild (this.refreshElement);

	// note we make this regardless
	// so that even if there is no progress selector specified
	// devs can style it
	this.progressElement = document.createElement ("div");
	positron.DOM.addPrefixedClass (this.progressElement, "view-progress");
	
	var	progressElements = positron.DOM.getCompositeElements
		(this.element, positron.DOM.getPrefixedAttributeName ("progress-view"),
			positron.DOM.getPrefixedAttributeName ("progress-selector"));
	
	if (progressElements.length)
	{
		this.progressElement.innerHTML = progressElements [0].innerHTML;
	}
	
	this.element.appendChild (this.progressElement);
}

positron.View.prototype.registerDeferredActions =
function View_registerDeferredActions ()
{
	// console.log ("View(" + this.key + ").registerDeferredActions()");
	
	this.registerPrivateDeferredActions ();
	
	var	subviewElements = this.element.querySelectorAll ("[" + gApplication.getAttributePrefix () + "view]");
	
	if (subviewElements)
	{
		for (var i = 0; i < subviewElements.length; i++)
		{
			var	subview = positron.DOM.getData (subviewElements [i], "view");
			
			if (subview)
			{
				subview.registerPrivateDeferredActions ();
			}
		}
	}
}

positron.View.prototype.registerPrivateDeferredActions =
function View_registerPrivateDeferredActions ()
{
	// console.log ("View(" + this.key + ").registerPrivateDeferredActions(" + this.deferredActions.length + ")");

	for (var i = 0; i < this.deferredActions.length; i++)
	{
		var	action = this.deferredActions [i];
		
		try
		{
			if (gApplication.isLogging (gApplication.kLogViews))
				console.log ("View(" + this.key + ") registering deferred action (" + action.toString () + ")");

			if (action.trigger)
			{
				action.trigger.register (action);
				
				// we registered ok, see if we need to schedule a cancel
				if (action.trigger.requiresCancel ())
				{
					this.addCancellableAction (action);
				}
			}
			else
			{
				console.error ("deferred action has no trigger: " + action.toString ());
			}
		}
		catch (inError)
		{
			console.error ("error trying to register action: " + action.toString ());
			console.error (inError.message);
		}
	}
	
	this.deferredActions.length = 0;
}

positron.View.prototype.runDeferredTasks =
function View_runDeferredTasks ()
{
	// console.log ("View(" + this.key + ").runDeferredTasks()");
	
	this.runPrivateDeferredTasks ();
	
	var	subviewElements = this.element.querySelectorAll ("[" + gApplication.getAttributePrefix () + "view]");
	
	if (subviewElements)
	{
		for (var i = 0; i < subviewElements.length; i++)
		{
			var	subview = positron.DOM.getData (subviewElements [i], "view");
			
			if (subview)
			{
				subview.runPrivateDeferredTasks ();
			}
		}
	}
}

positron.View.prototype.runPrivateDeferredTasks =
function View_runPrivateDeferredTasks ()
{
	// console.log ("View(" + this.key + ").runPrivateDeferredTasks(" + this.deferredTasks.length + ")");

	for (var i = 0; i < this.deferredTasks.length; i++)
	{
		var	task = this.deferredTasks [i];
		
		try
		{
			if (gApplication.isLogging (gApplication.kLogViews))
				console.log ("View(" + this.key + ") running deferred task ()");

			if (task.run)
			{
				task.run ();
			}
			else
			{
				console.error ("deferred task as no run() function");
			}
		}
		catch (inError)
		{
			console.error ("error trying to run task");
			console.error (inError.message);
		}
	}
	
	this.deferredTasks.length = 0;
}

// CALLBACKS

positron.View.prototype.onWalkComplete =
function View_onWalkComplete (inTreeWalker)
{
	// if the completing treewalker is different to the one we have
	// then do nothing -- it's a cancelled walker finishing in a setTimeout() gap
	// and we're already about to start a new one
	if (inTreeWalker == this.treeWalker)
	{
		this.treeWalker = null;
		
		if (gApplication.isLogging (gApplication.kLogViews)) console.log ("View.onWalkComplete(" + this.key + ")");
		
		positron.DOM.replaceWithChildren (this.refreshElement);
		this.refreshElement = null;
	
		positron.DOM.removeNode (this.progressElement);
		this.progressElement = null;
	
		// give the browser a chance to react to DOM changes
		// as onDOMReady() may ask for size, etc
		var	self = this;
	
		setTimeout
		(
			function ()
			{
				self.onDOMReady ();
			},
			1
		);
	}
	else
	{
		console.log ("treewalkers don't match, ignoring onWalkComplete");
	}
}

// VIEW LIFECYCLE EVENTS

positron.View.prototype.onAnimationEnd =
function View_onAnimationEnd (inEvent)
{
	if (gApplication.isLogging (gApplication.kLogViews)) console.log ("View.onAnimationEnd(" + this.key + ")");
	
	if (this.transitionInClass && positron.DOM.hasClass (this.element, this.transitionInClass))
	{
		positron.DOM.removeClass (this.element, this.transitionInClass);
		this.transitionInClass = undefined;
		positron.DOM.addPrefixedClass (this.element, "visible");
		
		this.onVisible ();
	}
	else
	if (this.transitionOutClass && positron.DOM.hasClass (this.element, this.transitionOutClass))
	{
		positron.DOM.removeClass (this.element, this.transitionOutClass);
		this.transitionOutClass = undefined;
		positron.DOM.addPrefixedClass (this.element, "invisible");
		
		this.onInvisible ();
	}
}

positron.View.prototype.onLoaded =
function View_onLoaded ()
{
	if (gApplication.isLogging (gApplication.kLogViews)) console.log ("View.onLoaded(" + this.key + ")");

	this.fireAnalyticsEvent ("loaded");
}

positron.View.prototype.onBeforeVisible =
function View_onBeforeVisible ()
{
	if (gApplication.isLogging (gApplication.kLogViews)) console.log ("View.onBeforeVisible(" + this.key + ")");
}

positron.View.prototype.onVisible =
function View_onVisible ()
{
	if (gApplication.isLogging (gApplication.kLogViews)) console.log ("View.onVisible(" + this.key + ")");

	// if we're doing a dynamic show
	if (this.showing)
	{
		// are we still in the dynamics run?
		if (this.treeWalker)
		{
			// must be some async calls outstanding, etc
			// console.log ("treewalker extant, waiting for completion...");
		}
		else
		{
			// we're done
			this.showing = false;
			this.refreshing = false;
			this.running = false;
			
			new positron.VisibleTreeWalker ().startWalkChildren (this.element);
			
			if (this.wasRefreshing)
			{
				this.wasRefreshing = false;
				
				// console.log ("view was refreshing, calling onRefreshComplete() from onVisible()");
				this.onRefreshComplete ();
			}
			
			var	event = positron.DOM.createEvent
			(
				gApplication.getEventPrefix () + "showview",
				{
					viewKey: this.key
				}
			);
			
			window.dispatchEvent (event);
			
			// HACK if we're a page, notify application
			// can't do this in the subclass
			if (!this.page)
			{
				gApplication.onPageVisible (this.key);
			}
		}
	}

	this.fireAnalyticsEvent ("visible");
}

positron.View.prototype.onDOMReady =
function View_onDOMReady ()
{
	if (gApplication.isLogging (gApplication.kLogViews)) console.log ("View.onDOMReady(" + this.key + ")");

	// console.log ("showing? " + this.showing);
	// console.log ("refreshing? " + this.refreshing);
	
	if (this.refreshing)
	{
		this.refreshing = false;
		this.running = false;
		
		if (this.showing)
		{
			// in order for the on-visible treewalker to run
			// the DOM must be ready *and* the animation must have finished
			if (this.isVisible () && !this.isTransitioning ())
			{
				// we're done
				this.showing = false;

				new positron.VisibleTreeWalker ().walkChildren (this.element);
				
				this.onRefreshComplete ();

				// HACK if we're a page, notify application
				// can't do this in the subclass
				if (!this.page)
				{
					gApplication.onPageVisible (this.key);
				}
			}
			else
			{
				// wait for onVisible()
				this.wasRefreshing = true;
			}
		}
		else
		{
			this.onRefreshComplete ();
		}

	}
}

// this is called once all refresh-related activity is done
// DOM is ready, view is visible, all that
positron.View.prototype.onRefreshComplete =
function View_onRefreshComplete ()
{
	if (gApplication.isLogging (gApplication.kLogViews)) console.log ("View.onRefreshComplete(" + this.key + ")");
	
	this.runDeferredTasks ();
	this.registerDeferredActions ();

	var	event = positron.DOM.createEvent
	(
		gApplication.getEventPrefix () + "refreshview",
		{
			viewKey: this.key
		}
	);
	
	window.dispatchEvent (event);
}

positron.View.prototype.onBeforeInvisible =
function View_onBeforeInvisible ()
{
	if (gApplication.isLogging (gApplication.kLogViews)) console.log ("View.onBeforeInvisible(" + this.key + ")");
}

positron.View.prototype.onInvisible =
function View_onInvisible ()
{
	if (gApplication.isLogging (gApplication.kLogViews)) console.log ("View.onInvisible(" + this.key + ")");

	this.fireAnalyticsEvent ("invisible");
}

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.Page");

// there is almost nothing to Page
// in most apps, Page will contain 99% app-specific code, likely

positron.Page =
function positron_Page ()
{
	positron.View.call (this);
	
	this.views = new Object ();
}
positron.inherits (positron.Page, positron.View);

// PUBLIC APIS

positron.Page.prototype.addView =
function Page_addView (inViewKey, inView)
{
	// console.log ("Page(" + this.key + ").addView(" + inViewKey + ")");
	this.views [inViewKey] = inView;
}

positron.Page.prototype.getView =
function Page_getView (inViewKey)
{
	return this.views [inViewKey];
}

positron.Page.prototype.hasView =
function Page_hasView (inViewKey)
{
	return this.views [inViewKey] != null;
}

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.ActionFactory");

// STATIC

positron.ActionFactory =
function ActionFactory ()
{
}

// note this now passes back an action which is *created* but not *registered*
positron.ActionFactory.createAction =
function ActionFactory_createAction
	(inElement, inContext, inActionAttributeName, inParamAttributeName, inParamKeysAttributeName, inParamFireKeysAttributeName)
{
	var	action = null;
	
	var	actionString = inElement.getAttribute (inActionAttributeName);
	
	if (actionString && actionString.length)
	{
		var	actionSpec = positron.ActionFactory.parseAction (actionString);
		
		action = gApplication.getActionlet (actionSpec.actionName);
		
		if (action)
		{
			actionSpec.element = inElement;
			actionSpec.params = this.parseParams (inElement, inParamAttributeName);

			// HACK also keep track of the explicit as opposed to implicit params
			// as some actions definitely do NOT want the implicit ones
			// inserted by default triggers, etc
			actionSpec.explicitParams = this.parseParams (inElement, inParamAttributeName);
			
			// also keep track of parameter keys
			// which are substituted by key at walk time
			actionSpec.paramKeys = this.parseParams (inElement, inParamKeysAttributeName);

			for (var paramKey in actionSpec.paramKeys)
			{
				var	param = actionSpec.paramKeys [paramKey];
				var	value = gApplication.getContextReference (param, inContext);
				
				if (value)
				{
					actionSpec.params [paramKey] = value;
					actionSpec.explicitParams [paramKey] = value;
				}
			}
			
			// also keep track of parameter keys
			// which are substituted at action time, not walk time
			actionSpec.paramFireKeys = this.parseParams (inElement, inParamFireKeysAttributeName);
			
			action.configure (actionSpec);
		}
		else
		{
			console.error ("no actionlet for action name " + actionSpec.actionName);
		}
	}
	
	return action;
}

// intended for use by Js clients
positron.ActionFactory.fireAction =
function ActionFactory_fireAction (inActionString, inActionParams)
{
	var	response = null;
	var	action = null;
	var	actionSpec = positron.ActionFactory.parseAction (inActionString);
	
	if (actionSpec.actionName)
	{
		action = gApplication.getActionlet (actionSpec.actionName);
		
		if (action)
		{
			// there's no associated element with a manually fired action
			actionSpec.element = document.body;
			
			// we don't support param-keys or fire-param-keys
			// as the params come in as Js
			// and this is fire time, not walk time
			actionSpec.params = inActionParams;
			actionSpec.explicitParams = inActionParams;
			
			action.configure (actionSpec);
			response = action.fire ();
		}
		else
		{
			console.error ("no actionlet for action name " + actionSpec.actionName);
		}
	}
	else
	{
		console.error ("no action name in action " + inActionString);
	}
	
	return response;
}

positron.ActionFactory.parseAction =
function ActionFactory_parseAction (inActionString)
{
	// console.log ("ActionFactory.parseAction(" + inActionString + ")");

	inActionString = positron.Util.stripSpaces (inActionString);
	
	var	actionString = "";
	var	triggerString = "";
	var	hadTriggerString = false;
	var	inTriggerString = false;
	
	for (var i = 0; i < inActionString.length; i++)
	{
		var	ch = inActionString.charAt (i);
		
		if (inTriggerString)
		{
			if (ch == ')')
			{
				inTriggerString = false;
				hadTriggerString = true;
			}
			else
			{
				triggerString += ch;
			}
		}
		else
		if (hadTriggerString)
		{
			actionString += ch;
		}
		else
		{
			if (ch == '(')
			{
				inTriggerString = true;
			}
			else
			{
				hadTriggerString = true;
				actionString += ch;
			}
		}
	}

	var	action = new Object ();
	
	var	triggerSpec = this.parseSpec (triggerString);
	action.triggerName = triggerSpec.name;
	action.triggerArgs = triggerSpec.args;
	action.triggerArgString = triggerSpec.argString;
	
	action.preventDefault = false;
	action.stopPropagation = false;
	
	// check for our special last argument
	if (action.triggerArgs.length > 0)
	{
		var	lastEventArg = action.triggerArgs [action.triggerArgs.length - 1];
		
		if (lastEventArg.length < 3)
		{
			for (var i = 0; i < lastEventArg.length; i++)
			{
				var	ch = lastEventArg.charAt (i);
				
				if (ch == 'p')
				{
					action.preventDefault = true;
				}
				else
				if (ch == 's')
				{
					action.stopPropagation = true;
				}
				else
				{
					// oops we misinterpreted another argument!
					action.preventDefault = false;
					action.stopPropagation = false;
					break;
				}
			}
			
			if (action.preventDefault || action.stopPropagation)
			{
				// remove the arg so the trigger doesn't see it
				action.triggerArgs.pop ();
			}
		}
	}
		
	// event name is allowed a default of "click"
	if (!action.triggerName || !action.triggerName.length)
	{
		action.triggerName = "click";
	}

	var	actionSpec = this.parseSpec (actionString);
	action.actionName = actionSpec.name;
	action.actionArgs = actionSpec.args;
	action.actionArgString = actionSpec.argString;

	return action;	
};

positron.ActionFactory.parseParams = function (inElement, inAttributeName)
{
	var	params = null;
	var	paramString = inElement.getAttribute (inAttributeName);
	
	if (paramString)
	{
		params = positron.Util.parseParams (paramString);
	}
	else
	{
		params = new Object ();
	}
	
	return params;
}

// anyone suggest a better name?
positron.ActionFactory.parseSpec = function (inSpecString)
{
	var	spec = new Object ();
	
	var	colonIndex = inSpecString.indexOf (':');
	
	if (colonIndex > 0)
	{
		spec.name = positron.Util.stripSpaces (inSpecString.substring (0, colonIndex));
		
		var	argString = inSpecString.substring (colonIndex + 1);
		
		// save the entire arg string so that some triggers/actions can use it all
		spec.argString = positron.Util.stripSpaces (argString);

		spec.args = argString.split ('/');
		
		for (var i = 0; i < spec.args.length; i++)
		{
			spec.args [i] = positron.Util.stripSpaces (spec.args [i]);
		}
	}
	else
	{
		spec.name = positron.Util.stripSpaces (inSpecString);
		spec.args = new Array ();
		spec.argString = "";
	}

	return spec;
}

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.Action");

positron.action.Action = function ()
{
}

positron.action.Action.prototype.cancel = function ()
{
	if (this.trigger)
	{
		this.trigger.cancel ();
	}
}

positron.action.Action.prototype.configure = function (inActionSpec)
{
	this.element = inActionSpec.element;
	
	this.triggerName = inActionSpec.triggerName;
	this.triggerArgs = inActionSpec.triggerArgs;
	this.triggerArgString = inActionSpec.triggerArgString;

	this.actionName = inActionSpec.actionName;
	this.actionArgs = inActionSpec.actionArgs;
	this.actionArgString = inActionSpec.actionArgString;
	
	// should rename these?
	this.params = inActionSpec.params;
	this.explicitParams = inActionSpec.explicitParams;

	this.paramKeys = inActionSpec.paramKeys;
	this.paramFireKeys = inActionSpec.paramFireKeys;
	
	this.preventDefault = inActionSpec.preventDefault;
	this.stopPropagation = inActionSpec.stopPropagation;
}

positron.action.Action.prototype.register = function (inContext)
{
	var	context = null;
	
	this.trigger = gApplication.getTriggerlet (this.triggerName);

	if (this.trigger)
	{
		if (gApplication.isLogging (gApplication.kLogTrigger)) console.log ("found trigger (" + this.triggerName + ")");
		
		// move the deferral decision to config
		if (gApplication.config.deferredTriggers && gApplication.config.deferredTriggers [this.triggerName])
		{
			if (gApplication.isLogging (gApplication.kLogTrigger)) console.log ("deferring trigger (" + this.triggerName + ")");
			
			// let the trigger find things in context
			this.trigger.preRegister (this, inContext);
			
			// defer this registration until after the treewalk is finished
			positron.DOM.getParentView (this.element).addDeferredAction (this);
		}
		else
		{
			try
			{
				// for some triggers, like "now"
				// meaningful things can be returned
				// like more context, for example
				context = this.trigger.register (this, inContext);
				
				// we registered ok, see if we need to schedule a cancel
				if (this.trigger.requiresCancel ())
				{
					positron.DOM.getParentView (this.element).addCancellableAction (this);
				}
			}
			catch (inError)
			{
				console.error ("error while running trigger (" + this.triggerName + ")");
				console.error (inError.message);
			}
		}
	}
	else
	{
		// always whine if the trigger name has a prefix and we can't find it
		if (this.triggerName.indexOf ("-") > 0)
		{
			if (gApplication.isLogging (gApplication.kLogTrigger)) console.error ("no triggerlet found for prefixed name " + this.triggerName);
		}
		else
		{
			if (gApplication.isLogging (gApplication.kLogTrigger)) console.log ("no triggerlet, registering listener for " + this.triggerName);
		}
		
		// the default triggerlet just listens for the event
		// and fires off the action superclass
		var	self = this;
	
		if (gApplication.isLogging (gApplication.kLogTrigger)) console.log ("adding default listener for " + this.triggerName);
		
		// HACK some events have to be off window
		// thanks, rubbish web
		var	element = this.element;
		
		// false = don't whine if we can't find it
		if (gApplication.getConfigEntry ("window-events." + this.triggerName.toLowerCase (), false))
		{
			console.log ("using window as target for event: " + this.triggerName);
			
			element = window;
		}
		
		element.addEventListener
		(
			this.triggerName,
			function (inEvent)
			{
				if (gApplication.isLogging (gApplication.kLogTrigger)) console.log ("caught " + self.triggerName);
				if (gApplication.isLogging (gApplication.kLogTrigger)) console.log ("firing action " + self.actionName);

				self.fire (inEvent);
			}
		);
	}
	
	return context;
};

positron.action.Action.prototype.fire = function (inEvent)
{
	this.fireAnalyticsEvent ();
	
	if (inEvent)
	{
		this.event = inEvent;
		
		var	eventlet = gApplication.getEventlet (inEvent.type);
		
		if (eventlet)
		{
			if (gApplication.isLogging (gApplication.kLogTrigger)) console.log ("found eventlet for " + inEvent.type);

			try
			{
				eventlet.process (this);
			}
			catch (inError)
			{
				console.error ("error while running event (" + inEvent.type + ")");
				console.error (inError.message);
			}
		}
		else
		{
			// console.log ("no eventlet found for " + inEvent.type);

			// the default eventlet... puts the event into context
			// TODO should it do more? or less, haha
			this.params.event = inEvent;
		}
		
		if (this.preventDefault)
		{
			if (gApplication.isLogging (gApplication.kLogTrigger)) console.log ("preventing default on event");
			inEvent.preventDefault ();
		}
		
		if (this.stopPropagation)
		{
			if (gApplication.isLogging (gApplication.kLogTrigger)) console.log ("stop propagation on event");
			inEvent.stopPropagation ();
		}
	}

	// delay this until the params are updated by any eventlet
	for (var fireKey in this.paramFireKeys)
	{
		var	paramFireKeyValue = this.paramFireKeys [fireKey];

		if (paramFireKeyValue && paramFireKeyValue.length)
		{
			// strip any extraneous "params." at the start, which is forgiveable
			paramFireKeyValue = paramFireKeyValue.replace (/^params\./, "");

			// can only reference off params in param keys
			var	object = this.params;
	
			var	fireKeyValueElements = paramFireKeyValue.split (".");
			
			for (var i = 0; (i < fireKeyValueElements.length) && object; i++)
			{
				object = object [fireKeyValueElements [i]];
			}
			
			if (object)
			{
				this.params [fireKey] = object;
				this.explicitParams [fireKey] = object;
			}
			else
			{
				console.error ("failed to traverse param fire key at element " + fireKeyValueElements [i]);
			}
		}
	}
};

// this happens on action.fire()
// so fire the trigger event
// then the action one
// for some nice cause and effect
positron.action.Action.prototype.fireAnalyticsEvent = function ()
{
	var	view = null;
	
	if (this.element)
	{
		view = positron.DOM.getParentView (this.element);
	}
	
	var	page = null;
	
	if (view)
	{
		// caution, the enclosing view might *be* a page
		if (view.page)
		{
			page = view.page;
		}
		else
		{
			// view.page is null, therefore view is a page
			page = view;
			view = null;
		}
	}
	else
	{
		page = gApplication.page;
	}
	
	// ensure that the action event goes after the trigger one
	var	timestamp = new Date ().getTime ();
	
	// if the trigger fires its own events, don't do it here
	if (!this.trigger || !this.trigger.firesAnalyticsEvents ())
	{
		gApplication.fireAnalyticsEvent
		({
			domain: "trigger",
			timestamp: timestamp,
			page: page.key,
			view: view ? view.key : null,
			name: this.triggerName,
			detail: "args=" + this.triggerArgString
		});
	}
	
	gApplication.fireAnalyticsEvent
	({
		timestamp: timestamp + 1,
		domain: "action",
		page: page.key,
		view: view ? view.key : null,
		name: this.actionName,
		detail: "args=" + this.actionArgString + "&params=" + positron.Util.unparseParams (this.params)
	});
}

// a little nicer for triggers than setting in params directly
positron.action.Action.prototype.setParam = function (inKey, inValue)
{
	this.params [inKey] = inValue;
}

// a little nicer for triggers than setting in params directly
positron.action.Action.prototype.setParams = function (inParams)
{
	for (var key in inParams)
	{
		this.setParam (key, inParams [key]);
	}
}


/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.ValidateFormAction");

// validates forms according to the HTML5 standard
// unlike most browsers
// must be registered on the <form> tag

positron.action.ValidateFormAction = function ()
{
	positron.action.Action.call (this);

	this.formValidators = new Object ();
	this.formValidators.email = this.validateEmail;
	this.formValidators.number = this.validateNumber;
	this.formValidators.url = this.validateURL;

}
positron.inherits (positron.action.ValidateFormAction, positron.action.Action);

positron.action.ValidateFormAction.prototype.fire = function (inEvent)
{
	// run eventlets
	positron.action.Action.prototype.fire.call (this, inEvent);

	try
	{
		var formValid = true;
		var	firstInvalidInput = null;
		
		var	form = inEvent.target;
		
		for (var i = 0; i < form.elements.length; i++)
		{
			var	element = form.elements [i];
			var	tagName = element.tagName.toLowerCase ();
			
			var	valid = true;
			
			if (tagName == "button")
			{
				// nothing to be validated for a button
			}
			else
			if (tagName == "input")
			{
				valid = this.validateInput (element);
			}
			else
			if (tagName == "select")
			{
				valid = this.validateSelect (element);
			}
			else
			if (tagName == "textarea")
			{
				valid = this.validateTextArea (element);
			}
			else
			{
				console.error ("unknown tag name in form validator (" + tagName + ")");
			}
			
			if (valid)
			{
				positron.DOM.removeClass (element, "error");
			}
			else
			{
				positron.DOM.addClass (element, "error");
				
				formValid = false;
				
				if (firstInvalidInput == null)
				{
					firstInvalidInput = element;
				}
			}
		}
		
		if (! formValid)
		{
			firstInvalidInput.focus ();
		}
	}
	catch (inError)
	{
		console.error (inError);
	}
	
	// if the form failed validation, stop it submitting
	// otherwise, leave for subclass to handle
	if (! formValid)
	{
  	inEvent.preventDefault ();
	}
	
	return formValid;
};

// element tag type validators

positron.action.ValidateFormAction.prototype.validateInput = function (inInput)
{
	var	valid = true;
	var	value = inInput.value;

	if (value == null)
	{
		value = "";
	}
	
	var	required = inInput.getAttribute ("required");
	
	// sadly we have to let the zero length attribute mean "true"
	// thanks, DOM designers!
	if (required && (required.toLowerCase () != "false"))
	{
		valid = value != null && value.length > 0;
	}
	else
	{
		// if the field is empty and not required, skip it
		if (value == "")
		{
			return;
		}
	}
	
	if (valid)
	{
		var	pattern = inInput.getAttribute ("pattern");
		
		if (pattern && pattern.length)
		{
			valid = this.validatePattern (value, pattern);
		}
	}

	if (valid)
	{
		var	type = inInput.getAttribute ("type");
		
		if (type && type.length)
		{
			type = type.toLowerCase ();
		}
		else
		{
			type = "text";
		}
		
		var	validator = this.formValidators [type];
		
		if (validator)
		{
			valid = validator.call (this, inInput);
		}
	}
	
	return valid;
}

positron.action.ValidateFormAction.prototype.validateSelect = function (inSelect)
{
	var	valid = true;
	
	if (inSelect.selectedIndex == -1)
	{
		valid = false;
	}
	else
	{
		var	option = inSelect.options [inSelect.selectedIndex];
		valid = option.value && option.value.length;
	}
	
	return valid;
}

positron.action.ValidateFormAction.prototype.validateTextArea = function (inTextArea)
{
	var	valid = true;
	var	value = inTextArea.value;

	if (value == null)
	{
		value = "";
	}
	
	var	required = inTextArea.getAttribute ("required");
	
	// sadly we have to let the zero length attribute mean "true"
	// thanks, DOM designers!
	if (required && (required.toLowerCase () != "false"))
	{
		valid = value != null && value.length > 0;
	}

	// looks like "required" is the only validator allowed on <textarea>
	return valid;
}

// input type validators

positron.action.ValidateFormAction.prototype.validateEmail = function (inInput)
{
	var	valid = false;
	
	var	value = inInput.value;
	
	if (value && value.length)
	{
		valid = positron.Util.validateEmailAddress (value);
	}
	
	return valid;
}

positron.action.ValidateFormAction.prototype.validateNumber = function (inInput)
{
	var	valid = true;
	
	var	value = inInput.value;
	value = parseInt (value);
	
	if (isNaN (value))
	{
		valid = false;
	}
	else
	{
		var	min = inInput.getAttribute ("min");
		
		if (min && min.length)
		{
			min = parseInt (min);
			
			if (isNaN (min))
			{
				min = null;
			}
		}

		var	max = inInput.getAttribute ("max");
		
		if (max && max.length)
		{
			max = parseInt (max);
			
			if (isNaN (max))
			{
				max = null;
			}
		}
		
		if (typeof (min) == "number")
		{
			valid = value >= min;
		}
		
		if (valid)
		{
			if (typeof (max) == "number")
			{
				valid = value <= max;
			}
		}
	}
	
	return valid;
}

positron.action.ValidateFormAction.prototype.validateURL = function (inInput)
{
	var	valid = false;
	
	var	value = inInput.value;
	
	if (value && value.length)
	{
		valid = value.match (new RegExp ("[a-zA-Z]+:")) != null;
	}
	
	return valid;
}

// not an input type validator, this responds to the "pattern" attribute

positron.action.ValidateFormAction.prototype.validatePattern = function (inValue, inPattern)
{
	return inValue.match (new RegExp (inPattern)) != null;
}




/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.AddClassAction");

positron.action.AddClassAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.AddClassAction, positron.action.Action);

positron.action.AddClassAction.prototype.fire = function (inEvent)
{
	positron.action.Action.prototype.fire.call (this, inEvent);
	
	var	argument0 = this.actionArgs.length > 0 ? this.actionArgs [0] : undefined;
	var	argument1 = this.actionArgs.length > 1 ? this.actionArgs [1] : undefined;
	var	argument2 = this.actionArgs.length > 2 ? this.actionArgs [2] : undefined;

	if (argument0 && argument0.length && argument1 && argument1.length)
	{
		var	receivers = null;
		
		// if there is only one action argument, assume just the selector
		if (this.actionArgs.length > 1)
		{
			if (this.actionArgs.length > 2)
			{
				receivers = positron.DOM.resolveCompositeElements (this.element, argument1, argument2);
			}
			else
			{
				receivers = positron.DOM.resolveCompositeElements (this.element, null, argument1);
			}
		}
		
		if (receivers)
		{
			for (var i = 0; i < receivers.length; i++)
			{
				positron.DOM.addClass (receivers [i], argument0);
			}
		}
	}
	else
	{
		console.error ("bad arguments to AddClassAction:");
		console.error (this.actionArgString);
	}

	this.element.dispatchEvent
		(positron.DOM.createEvent (gApplication.getEventPrefix () + "addclass"));
};


/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.AddToListAction");

positron.action.AddToListAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.AddToListAction, positron.action.Action);

positron.action.AddToListAction.prototype.fire = function (inEvent, inContext)
{
	positron.action.Action.prototype.fire.call (this, inEvent);
	
	if (this.actionArgs.length > 0 && this.actionArgs [0].length > 0)
	{
		var	listKey = this.actionArgs [0];

		var	list = gApplication.getContextReference (listKey, gApplication.context);
		
		if (list && Array.isArray (list))
		{
			var	compareObject = null;
			
			// check to see whether we have explicit keys to compare
			for (var i = 1; i < this.actionArgs.length; i++)
			{
				var	compareKey = this.actionArgs [i];
				
				if (compareKey.length)
				{
					var	compareValue = this.explicitParams [compareKey];
					
					if (compareValue)
					{
						if (compareObject == null)
						{
							compareObject = new Object ();
						}

						compareObject [compareKey] = compareValue;
					}
					else
					{
						console.error ("AddToListAction: found empty compare value for key " + compareKey);
					}
				}
				else
				{
					console.error ("AddToListAction: found empty compare key at index " + i);
				}
			}
			
			if (compareObject == null)
			{
				compareObject = this.explicitParams;
			}
			
			var	found = false;
			
			for (var i = 0; i < list.length; i++)
			{
				var	listEntry = list [i];
				
				found = true;
				
				for (var paramKey in compareObject)
				{
					if (positron.Util.compare (listEntry [paramKey], compareObject [paramKey]) != 0)
					{
						found = false;
						break;
					}
				}
				
				// now we have proper key support
				// update when found
				if (found)
				{
					list [i] = positron.Util.clone (this.explicitParams);

					if (this.element)
					{
						this.element.dispatchEvent
							(positron.DOM.createEvent (gApplication.getEventPrefix () + "addtolist"));
					}
					
					break;
				}
			}
			
			if (!found)
			{
				list.push (positron.Util.clone (this.explicitParams));

				this.element.dispatchEvent
					(positron.DOM.createEvent (gApplication.getEventPrefix () + "addtolist"));
			}
		}
		else
		{
			if (list)
			{
				console.error ("AddToListAction finds non-list context entry with key " + listKey);
			}
			else
			{
				list = new Array ();
				list.push (positron.Util.clone (this.explicitParams));

				gApplication.context.put (listKey, list);

				if (this.element)
				{
					this.element.dispatchEvent
						(positron.DOM.createEvent (gApplication.getEventPrefix () + "addtolist"));
				}
			}
		}
	}
	else
	{
		console.error ("AddToListAction with no list key in arguments");
	}
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.AddToMapAction");

positron.action.AddToMapAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.AddToMapAction, positron.action.Action);

positron.action.AddToMapAction.prototype.fire = function (inEvent, inContext)
{
	positron.action.Action.prototype.fire.call (this, inEvent);
	
	if (this.actionArgs.length > 1 && this.actionArgs [0].length > 0 && this.actionArgs [1].length > 0)
	{
		var	key = this.actionArgs [0];
		var	mapKey = this.actionArgs [1];

		if (this.explicitParams [key])
		{
			var	map = gApplication.getContextReference (mapKey, gApplication.context);
			
			if (!map)
			{
				map = new Object ();
				gApplication.context.put (mapKey, map);
			}

			map [this.explicitParams [key]] = positron.Util.clone (this.explicitParams);

			if (this.element)
			{
				this.element.dispatchEvent
					(positron.DOM.createEvent (gApplication.getEventPrefix () + "addtomap"));
			}
		}
		else
		{
			console.error ("AddToMapAction with bad key parameter " + key);
		}
	}
	else
	{
		console.error ("AddToMapAction with no map key and/or key in arguments");
	}
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.AjaxFormAction");

// submit the form as an Ajax request
// dispatch events when the request returns
// must be registered on the <form> tag

positron.action.AjaxFormAction = function ()
{
	positron.action.ValidateFormAction.call (this);
}
positron.inherits (positron.action.AjaxFormAction, positron.action.ValidateFormAction);

positron.action.AjaxFormAction.prototype.fire = function (inEvent)
{
	if (! positron.action.ValidateFormAction.prototype.fire.call (this, inEvent))
	{
		return;
	}
	
	// we never let the form submit
	inEvent.preventDefault ();

	// ASSUME that we're registered on the form tag
	var	form = inEvent.target;

	// start with the action from the form tag, as it might have some parameters in it
	var	action = form.action;
	
	if (!action || !action.length)
	{
		console.error ("form has no action, not proceeding");
		return;
	}
	
	var	sendRequest = true;
	
	var	parameters = null;
	var	actionElements = action.split ('?');
	action = actionElements [0];
	
	if (actionElements.length > 1)
	{
		parameters = actionElements [1];
	}
	else
	{
		parameters = "";
	}
	
	for (var i = 0; i < form.elements.length; i++)
	{
		var	element = form.elements [i];
		var	tagName = element.tagName.toLowerCase ();
		
		if (tagName == "input" || tagName == "textarea")
		{
			if (element.type == "file")
			{
				console.error ("input type file not supported");
				sendRequest = false;
				break;
			}
			
			if (parameters.length > 0)
			{
				parameters += "&";
			}
			
			parameters += element.name + '=' + element.value;
		}
		else
		if (tagName == "select")
		{
			var	selectedOption = element.options [element.selectedIndex];

			if (parameters.length > 0)
			{
				parameters += "&";
			}
			
			parameters += element.name + '=' + selectedOption.value;
		}
		else
		{
			console.error ("unknown tag name in form validator (" + tagName + ")");
		}
	}
	
	if (sendRequest)
	{
		var	method = null;
		
		if (form.method && form.method.length)
		{
			method = form.method;
		}
		else
		{
			method = "GET";
		}
		
		// for callbacks
		var	self = this;
		
		positron.Util.ajax
		({
			url: action,
			data: parameters,
			type: method,
			dataType: "json",
			async: true,
			success: function (inData, inTextStatus, inXHR)
			{
				if (gApplication && gApplication.isLogging (gApplication.kLogLoader))
					console.log ("success");
	
				if (self.element)
				{
					var	event = positron.DOM.createEvent
					(
						gApplication.getEventPrefix () + "ajaxform",
						{
							data: inData
						}
					);
					
					self.element.dispatchEvent (event);
				}
			},
			error: function (inXHR, inTextStatus, inError)
			{
				if (gApplication && gApplication.isLogging (gApplication.kLogLoader))
				{
					console.error ("load of " + action + " failed");
					console.error (inError);
				}

				if (self.element)
				{
					var	event = positron.DOM.createEvent
					(
						gApplication.getEventPrefix () + "ajaxform-error",
						{
							error: inError
						}
					);
					
					self.element.dispatchEvent (event);
				}
			}
		});
	}
	
};


/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.AjaxAction");

positron.action.AjaxAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.AjaxAction, positron.action.Action);

positron.action.AjaxAction.prototype.fire = function (inEvent)
{
	positron.action.Action.prototype.fire.call (this, inEvent);

	var	self = this;
	var	url = this.actionArgString;
	
	if (url == null || url.length == 0)
	{
		console.error ("AjaxAction with no URL in arguments");
	}
	else
	{
		positron.Util.ajax
		({
			url: url,
			data: this.explicitParams,
			dataType: "json",
			async: true,
			type: this.actionName == "ajaxget" ? "GET" : "POST",
			success: function (inData, inTextStatus, inXHR)
			{
				if (self.element)
				{
					var	event = positron.DOM.createEvent
					(
						gApplication.getEventPrefix () + "ajax",
						{
							data: inData
						}
					);
					
					self.element.dispatchEvent (event);
				}
			},
			error: function (inXHR, inTextStatus, inError)
			{
				if (gApplication && gApplication.isLogging (gApplication.kLogLoader))
				{
					console.error ("load of " + url + " failed");
					console.error (inError.message);
				}

				if (self.element)
				{
					var	event = positron.DOM.createEvent
					(
						gApplication.getEventPrefix () + "ajax-error",
						{
							error: inError
						}
					);
					
					self.element.dispatchEvent (event);
				}
			}
		});
	}
};

/**
*
* @license
* Copyright © 2014 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.AlertAction");

positron.action.AlertAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.AlertAction, positron.action.Action);

positron.action.AlertAction.prototype.fire = function (inEvent)
{
	positron.action.Action.prototype.fire.call (this, inEvent);
	
	if (this.actionArgString && this.actionArgString.length)
	{
		alert (this.actionArgString);
	}
	else
	{
		alert (positron.Util.unparseParams (this.params));
	}
};


/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.CallAction");

positron.action.CallAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.CallAction, positron.action.Action);

positron.action.CallAction.prototype.fire = function (inEvent)
{
	positron.action.Action.prototype.fire.call (this, inEvent);

	var	argument1 = this.actionArgs.length > 0 ? this.actionArgs [0] : undefined;
	var	argument2 = this.actionArgs.length > 1 ? this.actionArgs [1] : undefined;

	if (argument1 && argument1.length)
	{
		var	view = null;
		
		if (argument2 && argument2.length)
		{
			view = gApplication.getView (argument2);
			
			if (!view)
			{
				console.error ("cannot find view (" + argument2 + ")");
				return;
			}
		}
		
		if (view)
		{
			if (typeof (view [argument1]) == "function")
			{
				view.setParams (this.params);
				
				try
				{
					view [argument1].call (view, inEvent);
				}
				catch (inError)
				{
					console.log ("error invoking " + view.key + "." + argument1 + "()");
					console.error (inError.message);
				}
			}
			else
			{
				console.error ("cannot find method " + view.key + "." + argument1);
			}
		}
		else
		{
			var	found = false;
			var	parent = this.element;
			
			do
			{
				var	view = positron.DOM.getData (parent, "view");
	
				if (view)
				{
					if (typeof (view [argument1]) == "function")
					{
						found = true;
	
						view.setParams (this.params);
					
						try
						{
							view [argument1].call (view, inEvent);
						}
						catch (inError)
						{
							console.log ("error invoking " + view.key + "." + argument1 + "()");
							console.error (inError.message);
						}
						
						break;
					}
				}
			}
			while (parent = parent.parentNode);
			
			if (!found)
			{
				if (typeof (gApplication [argument1]) == "function")
				{
					gApplication.setParams (this.params);
					gApplication [argument1].call (gApplication, inEvent);
				}
				else
				{
					if (typeof (window [argument1]) == "function")
					{
						argument.call (argument1, inEvent, this.params);
					}
					else
					{
						console.error ("CallAction cannot find function (" + argument1 + ")");
					}
				}
			}
		}
	}
	else
	{
		console.error ("CallAction.process() called with insufficient arguments");
		console.error (this.element);
	}

	this.element.dispatchEvent
		(positron.DOM.createEvent (gApplication.getEventPrefix () + "call"));
};


/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.ClearListAction");

positron.action.ClearListAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.ClearListAction, positron.action.Action);

positron.action.ClearListAction.prototype.fire = function (inEvent, inContext)
{
	positron.action.Action.prototype.fire.call (this, inEvent);
	
	if (this.actionArgs.length > 0 && this.actionArgs [0].length > 0)
	{
		var	listKey = this.actionArgs [0];

		var	list = gApplication.getContextReference (listKey, gApplication.context);
		
		if (list && Array.isArray (list))
		{
			list.length = 0;

			if (this.element)
			{
				this.element.dispatchEvent
					(positron.DOM.createEvent (gApplication.getEventPrefix () + "clearlist"));
			}
		}
		else
		{
			console.error ("ClearListAction can't find list with key " + mapKey);
		}
	}
	else
	{
		console.error ("ClearListAction with no list key in arguments");
	}
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.ClearMapAction");

positron.action.ClearMapAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.ClearMapAction, positron.action.Action);

positron.action.ClearMapAction.prototype.fire = function (inEvent, inContext)
{
	positron.action.Action.prototype.fire.call (this, inEvent);
	
	if (this.actionArgs.length > 0 && this.actionArgs [0].length > 0)
	{
		var	mapKey = this.actionArgs [0];
		
		var	map = gApplication.getContextReference (mapKey, gApplication.context);
		
		if (map)
		{
			for (var key in map)
			{
				if (map.hasOwnProperty (key))
				{
					delete map [key];
				}
			}

			if (this.element)
			{
				this.element.dispatchEvent
					(positron.DOM.createEvent (gApplication.getEventPrefix () + "clearmap"));
			}
		}
		else
		{
			console.error ("ClearMapAction can't find map with key " + mapKey);
		}
	}
	else
	{
		console.error ("ClearMapAction with no map key arguments");
	}
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.CloseWebSocketAction");

positron.action.CloseWebSocketAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.CloseWebSocketAction, positron.action.Action);

positron.action.CloseWebSocketAction.prototype.fire = function (inEvent)
{
	positron.action.Action.prototype.fire.call (this, inEvent);

	if (this.actionArgs.length > 0 && this.actionArgs [0].length > 0)
	{
		var	webSocketName = this.actionArgs [0];
		var	webSocket = gApplication.getWebSocket (webSocketName);
		
		if (webSocket)
		{
			gApplication.removeWebSocket (webSocketName);
		}
		else
		{
			console.log ("CloseWebSocketAction can't find websocket with name: " + webSocketName);
		}
	}
	else
	{
		console.error ("CloseWebSocketAction with no socket name argument");
	}
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.DispatchFormAction");

// validate the form
// then copy its elements into an event
// and dispatch
// so that the receiving action is isolated from the form

positron.action.DispatchFormAction = function ()
{
	positron.action.ValidateFormAction.call (this);
}
positron.inherits (positron.action.DispatchFormAction, positron.action.ValidateFormAction);

positron.action.DispatchFormAction.prototype.fire = function (inEvent)
{
	if (! positron.action.ValidateFormAction.prototype.fire.call (this, inEvent))
	{
		return;
	}
	
	// we never let the form submit
	inEvent.preventDefault ();

	var	dispatch = true;
	
	// form values
	var	eventDetail = new Object ();
	
	// ASSUME that we're registered on the form tag
	var	form = inEvent.target;

	for (var i = 0; i < form.elements.length; i++)
	{
		var	element = form.elements [i];
		var	tagName = element.tagName.toLowerCase ();
		
		if (tagName == "input")
		{
			if (element.type == "file")
			{
				console.error ("input type file not supported");
				dispatch = false;
				break;
			}
			
			eventDetail [element.name] = element.value;
		}
		else
		if (tagName == "select")
		{
			var	selectedOption = element.options [element.selectedIndex];
			eventDetail [element.name] = selectedOption.value;
		}
		else
		if (tagName == "button")
		{
			// nothing to be copied for buttons
		}
		else
		{
			console.error ("unknown tag name in form dispatch (" + tagName + ")");
		}
	}
	
	if (dispatch)
	{
		if (this.element)
		{
			var	event = positron.DOM.createEvent
				(gApplication.getEventPrefix () + "dispatchform", eventDetail);
			
			this.element.dispatchEvent (event);
		}
	}
	else
	{
		console.error ("form dispatch defeated");
	}
};


/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.GotoURLAction");

positron.action.GotoURLAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.GotoURLAction, positron.action.Action);

positron.action.GotoURLAction.prototype.fire = function (inEvent)
{
	positron.action.Action.prototype.fire.call (this, inEvent);

	var	url = this.actionArgString;
	
	if (url == null || url.length == 0)
	{
		url = this.params.url;
	}
	
	if (url && url.length)
	{
		console.log ("GotoURLAction going to " + url);
		document.location.href = url;
	}
	else
	{
		console.error ("GotoURLAction with no URL in first argument or url parameter");
	}
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.HideViewAction");

positron.action.HideViewAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.HideViewAction, positron.action.Action);

positron.action.HideViewAction.prototype.fire = function (inEvent)
{
	positron.action.Action.prototype.fire.call (this, inEvent);
	
	var	argument1 = this.actionArgs.length > 0 ? this.actionArgs [0] : undefined;
	var	argument2 = this.actionArgs.length > 1 ? this.actionArgs [1] : undefined;

	if (argument1 && argument1.length)
	{
		gApplication.hideView (argument1, argument2);
	}
	else
	{
		console.error ("HideViewAction: no view key argument");
	}
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.IndexedInsertAction");

positron.action.IndexedInsertAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.IndexedInsertAction, positron.action.Action);

positron.action.IndexedInsertAction.prototype.fire = function (inEvent)
{
	positron.action.Action.prototype.fire.call (this, inEvent);

	// for callbacks
	var	self = this;
	
	if (this.actionArgs.length < 2)
	{
		console.error ("IndexedInsertAction requires database & store arguments");
		return;
	}
	
	var	databaseName = this.actionArgs [0];
	var	openRequest = indexedDB.open (databaseName);
	
	openRequest.onupgradeneeded = function (inUpgradeEvent)
	{
		// not something that the query tag can handle
		console.error ("database " + databaseName + " requires upgrade");
	};
	
	openRequest.onsuccess = function (inOpenEvent)
	{
		// console.log ("open.onsuccess()");

		var	database = inOpenEvent.target.result;
		var	storeName = self.actionArgs [1];
		var	transaction = database.transaction ([storeName], "readwrite");
		var	store = transaction.objectStore (storeName);

		// sanitise the parameters going to the db
		// primarily get rid of the DOM event in the params
		// inserted by eventlet, etc
		var	record = new Object ();
		
		for (var key in self.params)
		{
			var	value = self.params [key];
			var	valueType = typeof (value);
			
			if (valueType == "string" || valueType == "number" || valueType == "boolean")
			{
				record [key] = value;
			}
		}
		
		var	putRequest = store.put (record);
		
		putRequest.onsuccess = function (inPutEvent)
		{
			if (inEvent && self.element)
			{
				var	event = positron.DOM.createEvent
				(
					gApplication.getEventPrefix () + "indexedinsert",
					{
						result: inPutEvent.target.result
					}
				);

				self.element.dispatchEvent (event);
			}
		};
		
		putRequest.onerror = function (inPutEvent)
		{
			console.error ("store.put.onerror()");
			console.error (inPutEvent.target.result);

			if (inEvent && self.element)
			{
				var	event = positron.DOM.createEvent
				(
					gApplication.getEventPrefix () + "error",
					{
						error: inPutEvent.target.result
					}
				);
				
				self.element.dispatchEvent (event);
			}
		};
	};
};

/**
*
* @license
* Copyright © 2014 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.LogAction");

positron.action.LogAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.LogAction, positron.action.Action);

positron.action.LogAction.prototype.fire = function (inEvent)
{
	positron.action.Action.prototype.fire.call (this, inEvent);

	if (typeof (console) != "undefined" && typeof (console.log) == "function")
	{
		if (this.actionArgs.length > 0 && this.actionArgs [0].length > 0)
		{
			console.log (this.actionArgs [0]);
		}
		else
		{
			console.log (positron.Util.unparseParams (this.params));
		}
	}
};


/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.RefreshViewAction");

positron.action.RefreshViewAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.RefreshViewAction, positron.action.Action);

positron.action.RefreshViewAction.prototype.fire = function (inEvent)
{
	positron.action.Action.prototype.fire.call (this, inEvent);
	
	var	argument1 = this.actionArgs.length > 0 ? this.actionArgs [0] : undefined;
	var	argument2 = this.actionArgs.length > 1 ? this.actionArgs [1] : undefined;

	if (argument1 && argument1.length)
	{
		gApplication.refreshView (argument1, this.params, argument2);
	}
	else
	{
		console.error ("RefreshViewAction: no view key argument");
	}
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.RemoveClassAction");

positron.action.RemoveClassAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.RemoveClassAction, positron.action.Action);

positron.action.RemoveClassAction.prototype.fire = function (inEvent)
{
	positron.action.Action.prototype.fire.call (this, inEvent);
	
	var	argument0 = this.actionArgs.length > 0 ? this.actionArgs [0] : undefined;
	var	argument1 = this.actionArgs.length > 1 ? this.actionArgs [1] : undefined;
	var	argument2 = this.actionArgs.length > 2 ? this.actionArgs [2] : undefined;

	if (argument0 && argument0.length && argument1 && argument1.length)
	{
		var	receivers = null;
		
		// if there is only one action argument, assume just the selector
		if (this.actionArgs.length > 1)
		{
			if (this.actionArgs.length > 2)
			{
				receivers = positron.DOM.resolveCompositeElements (this.element, argument1, argument2);
			}
			else
			{
				receivers = positron.DOM.resolveCompositeElements (this.element, null, argument1);
			}
		}
		
		if (receivers)
		{
			for (var i = 0; i < receivers.length; i++)
			{
				positron.DOM.removeClass (receivers [i], argument0);
			}
		}
	}
	else
	{
		console.error ("bad arguments to RemoveClassAction:");
		console.error (this.actionArgString);
	}

	this.element.dispatchEvent
		(positron.DOM.createEvent (gApplication.getEventPrefix () + "removeclass"));
};


/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.RemoveFromListAction");

positron.action.RemoveFromListAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.RemoveFromListAction, positron.action.Action);

positron.action.RemoveFromListAction.prototype.fire = function (inEvent, inContext)
{
	positron.action.Action.prototype.fire.call (this, inEvent);
	
	if (this.actionArgs.length > 0 && this.actionArgs [0].length > 0)
	{
		var	listKey = this.actionArgs [0];

		var	list = gApplication.getContextReference (listKey, gApplication.context);
		
		if (list && Array.isArray (list))
		{
			for (var i = 0; i < list.length; i++)
			{
				var	listEntry = list [i];
				
				var	found = true;
				
				for (var paramKey in this.explicitParams)
				{
					if (listEntry [paramKey] != this.explicitParams [paramKey])
					{
						found = false;
						break;
					}
				}
				
				if (found)
				{
					list.splice (i, 1);

					if (this.element)
					{
						this.element.dispatchEvent
							(positron.DOM.createEvent (gApplication.getEventPrefix () + "removefromlist"));
					}
					
					// assume the list doesn't have dupes
					break;
				}
			}
		}
		else
		{
			console.error ("RemoveFromListAction can't find list with key " + listKey);
		}
	}
	else
	{
		console.error ("RemoveFromListAction with no list key in arguments");
	}
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.RemoveFromMapAction");

positron.action.RemoveFromMapAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.RemoveFromMapAction, positron.action.Action);

positron.action.RemoveFromMapAction.prototype.fire = function (inEvent, inContext)
{
	positron.action.Action.prototype.fire.call (this, inEvent);
	
	if (this.actionArgs.length > 1 && this.actionArgs [0].length > 0 && this.actionArgs [1].length > 0)
	{
		var	key = this.actionArgs [0];
		var	mapKey = this.actionArgs [1];
		
		var	map = gApplication.getContextReference (mapKey, gApplication.context);
		
		if (map)
		{
			if (this.explicitParams [key])
			{
				delete map [this.explicitParams [key]];

				if (this.element)
				{
					this.element.dispatchEvent
						(positron.DOM.createEvent (gApplication.getEventPrefix () + "removefrommap"));
				}
			}
			else
			{
				console.error ("RemoveFromMapAction with bad key parameter " + key);
			}
		}
		else
		{
			console.error ("RemoveFromMapAction can't find map with key " + mapKey);
		}
	}
	else
	{
		console.error ("RemoveFromMapAction with no map key and/or key in arguments");
	}
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.RunViewAction");

positron.action.RunViewAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.RunViewAction, positron.action.Action);

positron.action.RunViewAction.prototype.fire = function (inEvent)
{
	positron.action.Action.prototype.fire.call (this, inEvent);
	
	var	argument1 = this.actionArgs.length > 0 ? this.actionArgs [0] : undefined;

	if (argument1 && argument1.length)
	{
		gApplication.runView (argument1, this.params);
	}
	else
	{
		console.error ("RunViewAction: no view key argument");
	}
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.ScrollAction");

positron.action.ScrollAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.ScrollAction, positron.action.Action);

positron.action.ScrollAction.prototype.fire = function (inEvent)
{
	positron.action.Action.prototype.fire.call (this, inEvent);
	
	if (this.actionArgs.length > 0 && this.actionArgs [0].length > 0)
	{
		var	arg = this.actionArgs [0];
		var	position = parseInt (arg);
		
		if (isNaN (position))
		{
			if (arg.charAt (0) == '#')
			{
				arg = arg.substring (1);
				
				var	element = document.getElementById (arg);
				
				if (!element)
				{
					element = document.querySelector ("a[name=" + arg + "]");
				}
				
				if (element)
				{
					element.scrollIntoView ();
				}
				else
				{
					console.error ("ScrollAction: can't find anchor #" + arg);
				}
			}
			else
			{
				console.error ("ScrollAction: argument is neither position nor anchor");
			}
		}
		else
		{
			documentElement.scrollTop (0, position);
		}
	}
	else
	{
		console.error ("ScrollAction: no position or anchor argument");
	}
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.SendWebSocketAction");

positron.action.SendWebSocketAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.SendWebSocketAction, positron.action.Action);

positron.action.SendWebSocketAction.prototype.fire = function (inEvent)
{
	positron.action.Action.prototype.fire.call (this, inEvent);

	if (this.actionArgs.length > 0 && this.actionArgs [0].length > 0)
	{
		var	webSocketName = this.actionArgs [0];
		var	webSocket = gApplication.getWebSocket (webSocketName);
		
		if (webSocket)
		{
			// console.log ("sending to web socket: " + webSocketName);
			// console.log (JSON.stringify (this.explicitParams));
			
			webSocket.send (JSON.stringify (this.explicitParams));
		}
		else
		{
			console.error ("SendWebSocketAction can't find websocket with name: " + webSocketName);
		}
	}
	else
	{
		console.error ("SendWebSocketAction with no socket name argument");
	}
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.SelectClassAction");

positron.action.SelectClassAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.SelectClassAction, positron.action.Action);

positron.action.SelectClassAction.prototype.fire = function (inEvent)
{
	positron.action.Action.prototype.fire.call (this, inEvent);

	var	deselectors = null;
	var	selectors = null;
	
	// action args are view/selector/class
	// view & selector specify the element to be selected
	// class specifies the other elements to be deselected
	
	if (this.actionArgs.length > 1)
	{
		var	deselector = null;

		if (this.actionArgs.length > 2)
		{
			deselector = this.actionArgs [2];
			
			if (deselector.length)
			{
				selectors = positron.DOM.resolveCompositeElements (this.element, this.actionArgs [0], this.actionArgs [1]);
				deselectors = positron.DOM.resolveCompositeElements (this.element, this.actionArgs [0], this.actionArgs [2]);
			}
		}
		else
		{
			deselector = this.actionArgs [1];
			
			if (deselector.length)
			{
				selectors = positron.DOM.resolveCompositeElements (this.element, null, this.actionArgs [0]);
				deselectors = positron.DOM.resolveCompositeElements (this.element, null, this.actionArgs [1]);
			}
		}
	}
	
	if (deselectors)
	{
		for (var i = 0; i < deselectors.length; i++)
		{
			positron.DOM.removeClass (deselectors [i], "selected");
		}

		for (var i = 0; i < selectors.length; i++)
		{
			positron.DOM.addClass (selectors [i], "selected");
		}
	}
	else
	{
		console.error ("SelectClassAction with bad action arguments");
		console.error (this.actionArgs);
	}
	
	this.element.dispatchEvent
		(positron.DOM.createEvent (gApplication.getEventPrefix () + "selectclass"));
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.SetAttributeAction");

positron.action.SetAttributeAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.SetAttributeAction, positron.action.Action);

positron.action.SetAttributeAction.prototype.fire = function (inEvent)
{
	positron.action.Action.prototype.fire.call (this, inEvent);

	var	receivers = null;

	// if there is only one action argument, assume just the selector
	if (this.actionArgs.length > 0)
	{
		if (this.actionArgs.length > 1)
		{
			receivers = positron.DOM.resolveCompositeElements (this.element, this.actionArgs [0], this.actionArgs [1]);
		}
		else
		{
			receivers = positron.DOM.resolveCompositeElements (this.element, null, this.actionArgs [0]);
		}
	}
	
	if (receivers)
	{
		for (var i = 0; i < receivers.length; i++)
		{
			for (var key in this.params)
			{
				var	value = this.params [key];
				var	type = typeof (value);
				
				if (type == "string")
				{
					receivers [i].setAttribute (key, value);
				}
				else
				if (type == "number")
				{
					receivers [i].setAttribute (key, "" + value);
				}
			}
		}
	}
	else
	{
		// this will likely happen a lot
		console.error ("SetAttributeAction could not resolve receiving element");
	}

	this.element.dispatchEvent
		(positron.DOM.createEvent (gApplication.getEventPrefix () + "setattribute"));
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.SetLocalStorageAction");

positron.action.SetLocalStorageAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.SetLocalStorageAction, positron.action.Action);

positron.action.SetLocalStorageAction.prototype.fire = function (inEvent)
{
	positron.action.Action.prototype.fire.call (this, inEvent);

	if (gApplication.isLogging (gApplication.kLogTrigger)) console.log ("SetLocalStorageAction.fire()");
	
	if (localStorage)
	{
		// ensure we take the explicit params
		// and not any cruft inserted by triggers, etc
		for (var key in this.explicitParams)
		{
			var	value = this.explicitParams [key];
			
			if (gApplication.isLogging (gApplication.kLogTrigger)) console.log ("setting localStorage." + key + " to " + value);

			localStorage [key] = value;
		}
	}
	else
	{
		console.error ("SetLocalStorage with no localStorage functionality");
	}

	this.element.dispatchEvent
		(positron.DOM.createEvent (gApplication.getEventPrefix () + "setlocalstorage"));
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.SetPageAction");

positron.action.SetPageAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.SetPageAction, positron.action.Action);

positron.action.SetPageAction.prototype.fire = function (inEvent)
{
	positron.action.Action.prototype.fire.call (this, inEvent);

	var	argument1 = this.actionArgs.length > 0 ? this.actionArgs [0] : undefined;
	var	argument2 = this.actionArgs.length > 1 ? this.actionArgs [1] : undefined;
	var	argument3 = this.actionArgs.length > 2 ? this.actionArgs [2] : undefined;

	gApplication.setPage (argument1, this.params, argument2, argument3);
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.SetParamsAction");

positron.action.SetParamsAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.SetParamsAction, positron.action.Action);

positron.action.SetParamsAction.prototype.fire = function (inEvent)
{
	positron.action.Action.prototype.fire.call (this, inEvent);

	var	argument1 = this.actionArgs.length > 0 ? this.actionArgs [0] : undefined;
	var	argument2 = this.actionArgs.length > 1 ? this.actionArgs [1] : undefined;

	var	receiver = null;
		
	if (argument1)
	{
		if (argument1 == "application")
		{
			receiver = gApplication;
		}
		else
		if (argument1 == "page")
		{
			var	page = null;
			
			// second arg is page key
			if (argument2 && argument2.length)
			{
				page = gApplication.getPage (argument2);
				
				if (page)
				{
					receiver = page;
				}
				else
				{
					console.error ("setparams could not find page: " + argument2);
				}
			}
			else
			{
				receiver = gApplication.getPage ();
			}
		}
		else
		if (argument1 == "view")
		{
			var	view = null;
			
			// second arg is view key
			if (argument2 && argument2.length)
			{
				view = gApplication.getView (argument2);
				
				if (view)
				{
					receiver = view;
				}
				else
				{
					console.error ("setparams could not find view: " + argument2);
				}
			}
			else
			{
				console.error ("setparams with no view key specified");
			}
		}

		if (receiver)
		{
			receiver.setParams (this.params);
		}
	}
	else
	{
		console.error ("setparams with no first argument");
	}

	this.element.dispatchEvent
		(positron.DOM.createEvent (gApplication.getEventPrefix () + "setparams"));
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.SetStyleAction");

positron.action.SetStyleAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.SetStyleAction, positron.action.Action);

positron.action.SetStyleAction.prototype.fire = function (inEvent)
{
	positron.action.Action.prototype.fire.call (this, inEvent);

	var	receivers = null;

	// if there is only one action argument, assume just the selector
	if (this.actionArgs.length > 0)
	{
		if (this.actionArgs.length > 1)
		{
			receivers = positron.DOM.resolveCompositeElements (this.element, this.actionArgs [0], this.actionArgs [1]);
		}
		else
		{
			receivers = positron.DOM.resolveCompositeElements (this.element, null, this.actionArgs [0]);
		}
	}
	
	if (receivers)
	{
		for (var i = 0; i < receivers.length; i++)
		{
			for (var key in this.params)
			{
				receivers [i].style [key] = this.params [key];
			}
		}
	}
	else
	{
		// this will likely happen a lot
		console.error ("SetStyleAction could not resolve receiving element");
	}

	this.element.dispatchEvent
		(positron.DOM.createEvent (gApplication.getEventPrefix () + "setstyle"));
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.SetTransformAction");

positron.action.SetTransformAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.SetTransformAction, positron.action.Action);

positron.action.SetTransformAction.prototype.fire = function (inEvent)
{
	positron.action.Action.prototype.fire.call (this, inEvent);

	var	receivers = null;

	// if there is only one action argument, assume just the selector
	if (this.actionArgs.length > 0)
	{
		if (this.actionArgs.length > 1)
		{
			receivers = positron.DOM.resolveCompositeElements (this.element, this.actionArgs [0], this.actionArgs [1]);
		}
		else
		{
			receivers = positron.DOM.resolveCompositeElements (this.element, null, this.actionArgs [0]);
		}
	}

	if (receivers)
	{
		for (var i = 0; i < receivers.length; i++)
		{
			var	styles = positron.CSS.parseStyle (receivers [i]);
			var	prefixedTransform = positron.CSS.getPrefixedProperty ("transform");

			transform = styles [prefixedTransform];
	
			var	valueStrings = new Array ();
			
			if (transform)
			{
				for (var name in transform)
				{
					var	newValue = this.params [name];
					
					if (newValue)
					{
						delete transform [name];
					}
					else
					{
						valueStrings.push (positron.CSS.unparsePropertySubvalue (transform [name]));
					}
				}
			}
			
			for (var key in this.params)
			{
				var	value = this.params [key];
				
				if (typeof (value) == "string")
				{
					valueStrings.push (key + value);
				}
			}
			
			var	newValueString = valueStrings.join (" ");
			console.log (prefixedTransform + ": " + newValueString);

			receivers [i].style [prefixedTransform] = newValueString;
		}
	}
	else
	{
		// this will likely happen a lot
		console.error ("SetTransformAction could not resolve receiving element");
	}

	this.element.dispatchEvent
		(positron.DOM.createEvent (gApplication.getEventPrefix () + "settransform"));
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.SubmitFormAction");

// submit the first enclosing form we find
// handy for onchange handlers on form elements

positron.action.SubmitFormAction = function ()
{
	positron.action.ValidateFormAction.call (this);
}
positron.inherits (positron.action.SubmitFormAction, positron.action.ValidateFormAction);

positron.action.SubmitFormAction.prototype.fire = function (inEvent)
{
	var	formElement = null;
	
	if (this.actionArgs.length > 0 && this.actionArgs [0].length)
	{
		formElement = document.forms [this.actionArgs [0]];
	}
	else
	if (this.element.form)
	{
		formElement = this.element;
	}
	else
	{
		for (var element = this.element; element; element = element.parentNode)
		{
			if (element.tagName.toLowerCase () == "form")
			{
				formElement = element;
				break;
			}
		}
	}
	
	if (formElement)
	{
		// we can't call submit() off the form
		// because that will bypass any onsubmit handlers
		// which is a huge bug IMHO
		// so instead we fake up a submit event
		// rubbish web
		formElement.dispatchEvent (positron.DOM.createEvent ("submitform", {}));
	}
	else
	{
		console.error ("SubmitFormAction cannot find form to submit");
	}
};


/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.ShowViewAction");

positron.action.ShowViewAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.ShowViewAction, positron.action.Action);

positron.action.ShowViewAction.prototype.fire = function (inEvent)
{
	positron.action.Action.prototype.fire.call (this, inEvent);
	
	var	argument1 = this.actionArgs.length > 0 ? this.actionArgs [0] : undefined;
	var	argument2 = this.actionArgs.length > 1 ? this.actionArgs [1] : undefined;

	if (argument1 && argument1.length)
	{
		gApplication.showView (argument1, this.params, argument2);
	}
	else
	{
		console.error ("ShowViewAction: no view key argument");
	}
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.ToggleClassAction");

positron.action.ToggleClassAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.ToggleClassAction, positron.action.Action);

positron.action.ToggleClassAction.prototype.fire = function (inEvent)
{
	positron.action.Action.prototype.fire.call (this, inEvent);
	
	var	argument0 = this.actionArgs.length > 0 ? this.actionArgs [0] : undefined;
	var	argument1 = this.actionArgs.length > 1 ? this.actionArgs [1] : undefined;
	var	argument2 = this.actionArgs.length > 2 ? this.actionArgs [2] : undefined;

	if (argument0 && argument0.length && argument1 && argument1.length)
	{
		var	receivers = null;
		
		// if there is only one action argument, assume just the selector
		if (this.actionArgs.length > 1)
		{
			if (this.actionArgs.length > 2)
			{
				receivers = positron.DOM.resolveCompositeElements (this.element, argument1, argument2);
			}
			else
			{
				receivers = positron.DOM.resolveCompositeElements (this.element, null, argument1);
			}
		}
		
		if (receivers)
		{
			for (var i = 0; i < receivers.length; i++)
			{
				positron.DOM.toggleClass (receivers [i], argument0);
			}
		}
	}
	else
	{
		console.error ("bad arguments to ToggleClassAction:");
		console.error (this.actionArgString);
	}

	this.element.dispatchEvent
		(positron.DOM.createEvent (gApplication.getEventPrefix () + "toggleclass"));
};


/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.action.ToggleViewAction");

positron.action.ToggleViewAction = function ()
{
	positron.action.Action.call (this);
}
positron.inherits (positron.action.ToggleViewAction, positron.action.Action);

positron.action.ToggleViewAction.prototype.fire = function (inEvent)
{
	positron.action.Action.prototype.fire.call (this, inEvent);
	
	var	argument1 = this.actionArgs.length > 0 ? this.actionArgs [0] : undefined;
	var	argument2 = this.actionArgs.length > 1 ? this.actionArgs [1] : undefined;
	var	argument3 = this.actionArgs.length > 1 ? this.actionArgs [2] : undefined;

	if (argument1 && argument1.length)
	{
		gApplication.toggleView (argument1, this.params, argument2, argument3);
	}
	else
	{
		console.error ("ToggleViewAction: no view key argument");
	}
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.attribute.Attribute");

positron.attribute.Attribute = function ()
{
}

// COMING
// take context as an argument
// return an indication of whether to do nothing, add to context, remove subtree, etc

positron.attribute.Attribute.prototype.process = function (inElement, inContext, inAttributeName, inAttributeNumber)
{
	console.error ("Attribute.process() called (abstract)");
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.attribute.ActionAttribute");

positron.attribute.ActionAttribute = function ()
{
	positron.attribute.Attribute.call (this);
}
positron.inherits (positron.attribute.ActionAttribute, positron.attribute.Attribute);

positron.attribute.ActionAttribute.prototype.process =
function (inElement, inContext, inAttributeName, inAttributeNumber)
{
	var	context = null;
	var	prefix = gApplication.getAttributePrefix ();

	var	actionAttributeName = null;

	if (inAttributeNumber >= 0)
	{
		actionAttributeName = prefix + "action-" + inAttributeNumber;
	}
	else
	{
		actionAttributeName = prefix + "action";
	}
	
	var	actionString = inElement.getAttribute (actionAttributeName);
	
	if (actionString && actionString.length)
	{
		// params are evaluated as values at walk time
		var	paramAttributeName = prefix + "action-";
		
		if (inAttributeNumber >= 0)
		{
			paramAttributeName += inAttributeNumber + "-";
		}

		paramAttributeName += "params";

		// param keys are evaluated as keys at walk time
		var	paramKeysAttributeName = prefix + "action-";
		
		if (inAttributeNumber >= 0)
		{
			paramKeysAttributeName += inAttributeNumber + "-";
		}

		paramKeysAttributeName += "param-keys";

		// param fire keys are evaluated as keys at fire time
		var	fireParamKeysAttributeName = prefix + "action-";
		
		if (inAttributeNumber >= 0)
		{
			fireParamKeysAttributeName += inAttributeNumber + "-";
		}

		fireParamKeysAttributeName += "fire-param-keys";

		var	action = positron.ActionFactory.createAction
			(inElement, inContext, actionAttributeName, paramAttributeName, paramKeysAttributeName, fireParamKeysAttributeName);
		
		if (action)
		{
			context = action.register (inContext);
		}
	}
	else
	{
		console.error ("no value for attribute " + actionAttributeName);
	}
	
	return context;
}
/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.attribute.LocaliseAttribute");

positron.attribute.LocaliseAttribute =
function LocaliseAttribute ()
{
	positron.attribute.Attribute.call (this);
}
positron.inherits (positron.attribute.LocaliseAttribute, positron.attribute.Attribute);

positron.attribute.LocaliseAttribute.prototype.process =
function LocaliseAttribute_process (inElement, inContext, inAttributeName, inAttributeNumber)
{
	var	string = null;
	
	var	stringKey = inElement.getAttribute (inAttributeName);
	
	if (stringKey && stringKey.length)
	{
		if (stringKey.length > 8 && stringKey.substr (0, 8) == "strings.")
		{
			// developer thoughtfully included the "strings." prefix...
		}
		else
		{
			stringKey = "strings." + stringKey;
		}
		
		string = gApplication.getContextReference (stringKey, inContext);
	
		if (string && string.length)
		{
			var	newContext = inContext;
			
			// ok now we see if there are any context key remappings
			var	localisationParamString = positron.DOM.getPrefixedAttribute (inElement, "localise-params");
			
			if (localisationParamString)
			{
				var	localisationParams = positron.Util.parseParams (localisationParamString);
				
				newContext = gApplication.makeContext (inContext);
				
				for (var key in localisationParams)
				{
					newContext.put (key, localisationParams [key]);
				}
			}
			
			inElement.innerText = gApplication.expandText (string, newContext, false);
		}
		else
		{
			console.error ("could not find localisation string with key " + stringKey);
		}
	}
	else
	{
		// huh? the treewalker guarantees we don't get called unless the attribute is here
		console.error ("LocaliseAttribute with empty attribute");
	}
}
/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.attribute.ViewAttribute");

positron.attribute.ViewAttribute = function ()
{
	positron.attribute.Attribute.call (this);
}
positron.inherits (positron.attribute.ViewAttribute, positron.attribute.Attribute);

positron.attribute.ViewAttribute.prototype.process = function (inElement, inContext, inAttributeName, inAttributeNumber)
{
	var	viewAttribute = inElement.getAttribute (inAttributeName);

	// console.log ("ViewAttribute.process() on " + viewAttribute);
	
	if (viewAttribute == null || viewAttribute.length == 0)
	{
		console.error ("blank view attribute");
		console.error (inElement);
		return;
	}
	
	var	viewAttributeElements = viewAttribute.split (':');
	var	loadFlags = "chj";
	
	if (viewAttributeElements.length > 1)
	{
		// zero length load flags means don't load anything
		// (apart from inline markup)
		loadFlags = viewAttributeElements [1];
	}
	
	var	viewName = viewAttributeElements [0];
	
	if (loadFlags.indexOf ("h") >= 0)
	{
		if (positron.DOM.hasChildren (inElement))
		{
			// console.log ("view element has inline markup, not loading");
		}
		else
		{
			var	htmlPath = gApplication.getViewHTMLPath (viewName);
			var	html = positron.Util.getTextSync (htmlPath);
			
			if (html)
			{
				inElement.innerHTML = html;
			}
		}
	}

	if (loadFlags.indexOf ("c") >= 0)
	{
		// careful here, if the view name is a fully qualified class name
		// we won't be able to dynamically load CSS for it
		// which is fine, because component CSS should be manually included anyway
		if (viewName.indexOf ('.') == -1)
		{
			// console.log ("loading " + cssPath);
			var viewCSSAttribute = gApplication.getAttributePrefix () + "view";
			
			// catch potential jquery issues here with bad or odd view names
			try
			{
				var	viewCSSInclude = document.querySelector ("head [" + viewCSSAttribute + "=" + viewName + "]");
				
				if (!viewCSSInclude)
				{
					var	cssPath = gApplication.getViewCSSPath (viewName);
					var	css = positron.Util.getTextSync (cssPath);
					
					if (css)
					{
						var	style = document.createElement ("style");
						style.setAttribute ("type", "text/css");
						style.setAttribute (viewCSSAttribute, viewName);
						style.innerHTML = css;
						
						document.querySelector ("head").appendChild (style);
					}
				}
			}
			catch (inError)
			{
				console.error ("error adding style tag for view (" + viewName + ")");
				console.error (inError);
			}
		}
	}

	var view = null;
	
	var	className = positron.DOM.getPrefixedAttribute (inElement, "view-class");
	
	if (className && className.length)
	{
		view = positron.Util.instantiate (className);
		
		if (view == null)
		{
			console.error ("ViewAttribute cannot instantiate specified view class " + className);
		}
	}
	else
	{
		if (loadFlags.indexOf ("j") >= 0)
		{
			view = gApplication.getViewlet (viewName, loadFlags);
		}
	}
	
	if (view == null)
	{
		className = gApplication.getConfigEntry ("viewClassName");
		
		view = positron.Util.instantiate (className);

		if (view == null)
		{
			console.error ("ViewAttribute cannot instantiate configured default view class " + className);
			
			view = new positron.View ();
		}
	}
	
	var	viewKey = viewName;
	
	var	viewKeyAttribute = positron.DOM.getPrefixedAttribute (inElement, "view-key");
	
	if (viewKeyAttribute && viewKeyAttribute.length)
	{
		viewKey = viewKeyAttribute;
	}
	
	view.configure (viewKey, inElement, gApplication.getPage ());
	
	// have to do parameter stuff after configure()

	var	viewParamsAttribute = positron.DOM.getPrefixedAttribute (inElement, "view-params");
	
	if (viewParamsAttribute && viewParamsAttribute.length)
	{
		view.setParams (positron.Util.parseParams (viewParamsAttribute));
	}

	var	viewParamKeysAttribute = positron.DOM.getPrefixedAttribute (inElement, "view-param-keys");
	
	if (viewParamKeysAttribute && viewParamKeysAttribute.length)
	{
		var	paramKeys = positron.Util.parseParams (viewParamsAttribute);
		
		for (var paramKey in paramKeys)
		{
			var	param = paramKeys [paramKey];
			var	value = gApplication.getContextReference (param, inContext);
			
			if (value)
			{
				view.setParam (paramKey, value);
			}
		}
	}

	positron.DOM.setData (inElement, "view", view);
	gApplication.getPage ().addView (viewKey, view);
	view.onLoaded ();
};
/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.event.Event");

positron.event.Event = function ()
{
}

positron.event.Event.prototype.process = function (inAction)
{
	console.error ("Attribute.process() called (abstract)");
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.event.Event");

positron.event.AjaxEvent = function ()
{
	positron.event.Event.call (this);
}
positron.inherits (positron.event.AjaxEvent, positron.event.Event);

positron.event.AjaxEvent.prototype.process = function (inAction)
{
	// console.log ("AjaxEvent.process()");

	inAction.params.data = inAction.event.detail.data;
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.event.Event");

// this is an example only

positron.event.ChangeEvent = function ()
{
	positron.event.Event.call (this);
}
positron.inherits (positron.event.ChangeEvent, positron.event.Event);

positron.event.ChangeEvent.prototype.process = function (inAction)
{
	// console.log ("ChangeEvent.process()");
	// console.log (inAction.event);

	var	value = null;
	var	target = inAction.event.target;
	var	tag = target.tagName;
	
	if (tag)
	{
		tag = tag.toLowerCase ();
		
		if (tag == "select")
		{
			var	selectedOption = target.options [target.selectedIndex];
			
			if (selectedOption)
			{
				value = selectedOption.value;
			}
		}
		else
		if (tag == "input")
		{
			value = target.value;
		}
		
		inAction.params.value = value;
	}
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.event.Event");

// this is an example only

positron.event.ClickEvent = function ()
{
	positron.event.Event.call (this);
}
positron.inherits (positron.event.ClickEvent, positron.event.Event);

positron.event.ClickEvent.prototype.process = function (inAction)
{
	// console.log ("ClickEvent.process()");

	inAction.params.type = inAction.event.type;
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.event.Event");

// this is an example only

positron.event.DeviceMotionEvent = function ()
{
	positron.event.Event.call (this);
}
positron.inherits (positron.event.DeviceMotionEvent, positron.event.Event);

positron.event.DeviceMotionEvent.prototype.process = function (inAction)
{
	// console.log ("DeviceMotionEvent.process()");
	
	inAction.params.acceleration = new Object ();
	inAction.params.acceleration.x = inAction.event.acceleration.x;
	inAction.params.acceleration.y = inAction.event.acceleration.y;
	inAction.params.acceleration.z = inAction.event.acceleration.z;

	inAction.params.accelerationIncludingGravity = new Object ();
	inAction.params.accelerationIncludingGravity.x = inAction.event.accelerationIncludingGravity.x;
	inAction.params.accelerationIncludingGravity.y = inAction.event.accelerationIncludingGravity.y;
	inAction.params.accelerationIncludingGravity.z = inAction.event.accelerationIncludingGravity.z;

	inAction.params.rotationRate = new Object ();
	inAction.params.rotationRate.alpha = inAction.event.rotationRate.alpha;
	inAction.params.rotationRate.beta = inAction.event.rotationRate.beta;
	inAction.params.rotationRate.gamma = inAction.event.rotationRate.gamma;

};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.event.Event");

// this is an example only

positron.event.DeviceOrientationEvent = function ()
{
	positron.event.Event.call (this);
}
positron.inherits (positron.event.DeviceOrientationEvent, positron.event.Event);

positron.event.DeviceOrientationEvent.prototype.process = function (inAction)
{
	// console.log ("DeviceOrientationEvent.process()");

	inAction.params.absolute = inAction.event.absolute;
	inAction.params.alpha = inAction.event.alpha;
	inAction.params.beta = inAction.event.beta;
	inAction.params.gamma = inAction.event.gamma;
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.event.Event");

// this is an example only

positron.event.DeviceProximityEvent = function ()
{
	positron.event.Event.call (this);
}
positron.inherits (positron.event.DeviceProximityEvent, positron.event.Event);

positron.event.DeviceProximityEvent.prototype.process = function (inAction)
{
	// console.log ("DeviceProximityEvent.process()");

	inAction.params.max = inAction.event.max;
	inAction.params.min = inAction.event.min;
	inAction.params.value = inAction.event.value;

};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.event.ErrorEvent");

// a catch-call for error events which just puts error from the detail into params
// matches most if not all custom error events...
// associate with the error type for fine service :-)

positron.event.ErrorEvent = function ()
{
	positron.event.Event.call (this);
}
positron.inherits (positron.event.ErrorEvent, positron.event.Event);

positron.event.ErrorEvent.prototype.process = function (inAction)
{
	// console.log ("ErrorEvent.process()");

	inAction.params.error = inAction.event.detail.error;
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.event.Event");

positron.event.FormDispatchEvent = function ()
{
	positron.event.Event.call (this);
}
positron.inherits (positron.event.FormDispatchEvent, positron.event.Event);

positron.event.FormDispatchEvent.prototype.process = function (inAction)
{
	// console.log ("FormDispatchEvent.process()");

	for (var key in inAction.event.detail)
	{
		inAction.params [key] = inAction.event.detail [key];
	}
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.event.Event");

// this is an example only

positron.event.UserProximityEvent = function ()
{
	positron.event.Event.call (this);
}
positron.inherits (positron.event.UserProximityEvent, positron.event.Event);

positron.event.UserProximityEvent.prototype.process = function (inAction)
{
	// console.log ("UserProximityEvent.process()");
	
	inAction.params.near = inAction.event.near;

};

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.DelegateHashMap");

/**
 * @constructor
 * @param {Object=} inDelegate
 */
positron.DelegateHashMap = function (inDelegate)
{
	// instance member setup
	this.map = new Object ();
	this.delegate = inDelegate;
};

positron.DelegateHashMap.prototype.get = function (inKey)
{
	var	result = this.map [inKey];

	// don't test if(result) here, it will fail for zero integers
	if (typeof (result) == "undefined" || (typeof (result) == "object" && result == null))
	{
		if (this.delegate)
		{
			result = this.delegate.get (inKey);
		}
	}
	
	return result;
};

positron.DelegateHashMap.prototype.getDelegate = function ()
{
	return this.delegate;
};

positron.DelegateHashMap.prototype.put = function (inKey, inValue)
{
	this.map [inKey] = inValue;
};

positron.DelegateHashMap.prototype.remove = function (inKey)
{
	delete this.map [inKey];
};

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.tag.Tag");

// CONSTRUCTOR

/**
 * @constructor
 */
positron.tag.Tag = function ()
{
	this.requiredAttributes = new Array ();
};

// inElement: DOM element
// return: true/false
positron.tag.Tag.prototype.checkRequiredAttributes = function (inElement)
{
	var	valid = true;

	for (var i = 0; i < this.requiredAttributes.length; i++)
	{
		var attribute = inElement.getAttribute (this.requiredAttributes [i]);

		if (attribute == null || attribute.length == 0)
		{
			console.error ("<" + inElement.tagName + "> requires attribute (" + this.requiredAttributes [i] + ")");
			
			valid = false;
			break;
		}
	}
	
	return valid;
};

// METHODS

// inElement: DOM element
// inContext: DelegateHashMap
// inTreeWalker: JanxTreeWalker
// return: true if the element is still in the tree
// the Tag is expected to manage its own tree
positron.tag.Tag.prototype.process = function (inElement, inContext, inTreeWalker)
{
console.error ("Tag.process() called, should be overridden");

	return this.walkChildren (inElement, inContext, inTreeWalker);
};

// no subwalker = complete our treewalker
positron.tag.Tag.prototype.dontWalkChildren = function (inElement)
{
	positron.DOM.removeNode (inElement);
	inTreeWalker.onWalkComplete ();
	
	// so you can assign "sync" to this
	return true;
}

// inNewContextEntry is optional
// if provided, a new context is made with it as the named entry
// shorthand for all those tags that otherwise have to make their own context
positron.tag.Tag.prototype.walkChildren = function (inElement, inContext, inTreeWalker, inNewContextEntry)
{
	var	context = inContext;
	
	if (typeof (inNewContextEntry) != "undefined")
	{
		context = gApplication.makeContext (inContext);
		context.put (this.getName (inElement), inNewContextEntry);
	}
	
	var	treeWalker = inTreeWalker.makeSubTreeWalker (this);
	return treeWalker.startWalkChildren (inElement, context);
}

positron.tag.Tag.prototype.onWalkComplete = function (inTreeWalker)
{
	positron.DOM.replaceWithChildren (inTreeWalker.rootNode);
	inTreeWalker.superTreeWalker.onWalkComplete (inTreeWalker);
}

// inElement: DOM element
// return: string
positron.tag.Tag.prototype.getDefaultName = function (inElement)
{
  // note we do NOT support namespaces any more
  var	name = inElement.tagName.toLowerCase ();
	
	// ignore the first hyphen-delimited prefix
	var	elements = name.split ("-");
	
	if (elements.length > 1)
	{
		name = elements.slice (1).join ("-");
	}
	
	return name;
};

// inElement: DOM element
// return: string
positron.tag.Tag.prototype.getName = function (inElement)
{
	var	name = positron.DOM.getAttributeValue (inElement, "name");
	
	if (!name || !name.length)
	{
		name = this.getDefaultName (inElement);
	}
	
	return name;
};

// inElement: DOM element
// return: string
positron.tag.Tag.prototype.getNameDot = function (inElement)
{
	var	name = positron.DOM.getAttributeValue (inElement, "name");
	
	if (!name || !name.length)
	{
		name = this.getDefaultName (inElement);
	}

	if (name.length > 0)
	{
		name += '.';
	}
	else
	{
		// leave as blank
	}
	
	return name;
};


/**
*
* @license
* Copyright � 2013 Jason Proctor. All rights reserved.
*
**/

positron.provide ("positron.tag.AjaxTag");

positron.require ("positron.tag.Tag");
positron.require ("positron.DelegateHashMap");

// CONSTRUCTOR

/**
 * @constructor
 */
positron.tag.AjaxTag = function ()
{
	positron.tag.Tag.call (this);
};
positron.inherits (positron.tag.AjaxTag, positron.tag.Tag);

// INTERFACE

// HACK should the default be json?
positron.tag.AjaxTag.prototype.getDataType = function (inElement)
{
	console.error ("AjaxTag.getDataType() called! #abstract");
	return "ajax";
};

positron.tag.AjaxTag.prototype.onContentReceived = function (inElement, inContext, inData)
{
	console.error ("AjaxTag.onContentReceived() called! #abstract");
	return inContext;
};

// ITag IMPLEMENTATION

// inElement: DOM element
// return: true/false
positron.tag.AjaxTag.prototype.checkRequiredAttributes = function (inElement)
{
	return positron.DOM.getAttributeValue (inElement, "url");
};

// inElement: DOM element
// inContext: map<string,string>
// inTreeWalker: tree walker
// return: true if the tag remains in the tree (in this case, mostly false)
positron.tag.AjaxTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
	var	sync = true;
	var	cacheKey = inElement.getAttribute ("cachekey");
	
	if (cacheKey && cacheKey.length)
	{
		var	cacheEntry = gApplication.cache.get (cacheKey);
	
		if (cacheEntry)
		{
			if (gApplication.isLogging (gApplication.kLogCache))
				console.log ("AjaxTag: cache hit on " + cacheKey);
	
			var newContext = this.onContentReceived (inElement, inContext, cacheEntry);
			sync = this.walkChildren (inElement, newContext, inTreeWalker);
		}
		else
		{
			if (gApplication.isLogging (gApplication.kLogCache)) console.log
				("AjaxTag: cache miss on " + cacheKey);
		}
	}
	
	if (cacheEntry == null)
	{
		// we stash the data in the cache in the treewalker's completor
		this.doProcess (inElement, inContext, inTreeWalker);
		
		sync = false;
	}
	
	return sync;
};


// inElement: DOM element
// inContext: DelegateHashMap
// inTreeWalker: JanxTreeWalker
// return: true if the tag remains in the tree (in this case, mostly false)
positron.tag.AjaxTag.prototype.doProcess = function (inElement, inContext, inTreeWalker)
{
  var tagNameElements = inElement.tagName.toLowerCase ().split (":");
  var tagName = tagNameElements [tagNameElements.length - 1];  

	var	url = positron.DOM.getAttributeValue (inElement, "url");

  var	dataType = this.getDataType (inElement);
  var	method = positron.DOM.getAttributeValue (inElement, "method");

  if (method == null || method.length == 0)
  {
  	method = "GET";
  }
  
	var	data = "";
	
	var	queryIndex = url.indexOf ("?");
	
	if (queryIndex >= 0 && (queryIndex < (url.length - 2)))
	{
	  var fullURL = url;
		url = fullURL.substring (0, queryIndex);
		data = fullURL.substring (queryIndex + 1);
	}

  // for callbacks
  var self = this;
  
	positron.Util.ajax
	({
		url: url,
		data: data,
		dataType: dataType,
		async: true,
		type: method,
		success: function (inData, inTextStatus, inXHR)
		{
			var	context = self.onContentReceived (inElement, inContext, inData);
			
			self.cacheResponse (inElement, inData);
			self.walkChildren (inElement, context, inTreeWalker);
		},
		error: function (inXHR, inTextStatus, inError)
		{
			console.error ("load of " + url + " failed");
			console.error (inError);
			
			self.walkChildren (inElement, inContext, inTreeWalker);
		}
	});
};

// note that this depends on the new-style async Tags which don"t use temporary fragments
// the element passed in here *must* be the element passed to expand()
positron.tag.AjaxTag.prototype.cacheResponse = function (inElement, inData)
{
  var cacheKey = inElement.getAttribute ("cachekey");
  
  if (cacheKey && cacheKey.length)
  {
		var cacheLifeTime = inElement.getAttribute ("cachelifetime");
		
		if (cacheLifeTime && cacheLifeTime.length)
		{
			cacheLifeTime = parseInt (cacheLifeTime);
		}
		else
		{
			// if you're using cache with a Tag
			// and don"t specify a lifetime
			// your record sits there for a while! :-)
			if (gApplication.isLogging (gApplication.kLogCache))
				console.log ("AjaxTag: using default lifetime on " + cacheKey);
	
			cacheLifeTime = 15 * 60 * 1000;
		}
		
		gApplication.cache.put (cacheKey, inData, cacheLifeTime);
	}
};
/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

/*
	note we *can't* use p-action here because it would go through the regular action stuff
	and the deal with <p-action> is that its actions fire immediately
*/

positron.provide ("positron.tag.ActionTag");
positron.require ("positron.DelegateHashMap");
positron.require ("positron.tag");

/**
 * @constructor
 */
positron.tag.ActionTag = function ()
{
	positron.tag.Tag.call (this);
};
positron.inherits (positron.tag.ActionTag, positron.tag.Tag);

positron.tag.ActionTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
	var	foundAction = false;
	
	for (var i = -1; true; i++)
	{
		var	actionAttributeName = null;
		
		if (i >= 0)
		{
			actionAttributeName = "action-" + i;
		}
		else
		{
			actionAttributeName = "action";
		}
		
		var	actionString = inElement.getAttribute (actionAttributeName);
		
		if (actionString && actionString.length)
		{
			foundAction = true;

			var	paramAttributeName = null;
			
			if (i >= 0)
			{
				paramAttributeName = "action-" + i + "-params";
			}
			else
			{
				paramAttributeName = "action-params";
			}

			var	paramKeysAttributeName = null;
			
			if (i >= 0)
			{
				paramKeysAttributeName = "action-" + i + "-param-keys";
			}
			else
			{
				paramKeysAttributeName = "action-param-keys";
			}

			var	fireParamKeysAttributeName = null;
			
			if (i >= 0)
			{
				fireParamKeysAttributeName = "action-" + i + "-fire-param-keys";
			}
			else
			{
				fireParamKeysAttributeName = "action-fire-param-keys";
			}

			var	action = positron.ActionFactory.createAction (inElement, inContext,
				actionAttributeName, paramAttributeName, paramKeysAttributeName, fireParamKeysAttributeName);
			
			if (action)
			{
				action.fire (null, inContext);
			}
		}
		else
		{
			if (i > 0)
			{
				break;
			}
		}
	}
	
	if (!foundAction)
	{
		console.error ("ActionTag found no actions on element");
		console.error (inElement);
	}

	// TODO fired actions should be able to contribute to context
	return this.walkChildren (inElement, inContext, inTreeWalker);	
}

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

/*
  this Tag does basic string casing
  usage: <uppercase> <lowercase> <changecase case="lower|upper">
*/

positron.provide ("positron.tag.ChangeCaseTag");
positron.require ("positron.DelegateHashMap");
positron.require ("positron.tag");

/**
 * @constructor
 */
positron.tag.ChangeCaseTag = function ()
{
	positron.tag.Tag.call (this);

	this.requiredAttributes.push ("string");
};
positron.inherits (positron.tag.ChangeCaseTag, positron.tag.Tag);


positron.tag.ChangeCaseTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
  var string = inElement.getAttribute ("string");
  
  // this strips the first hyphen prefix
  // giving us (in theory) the actual tag name
  var tagName = this.getDefaultName (inElement);

  var newString = null;
  
  var mode = null;
  
  if (tagName == "uppercase")
  {
    mode = "upper";
  }
  else
  if (tagName == "lowercase")
  {
    mode = "lower";
  }
  else
  if (tagName == "capitalcase")
  {
    mode = "capital";
  }
  else
  {
    mode = inElement.getAttribute ("mode");
  }
  
  if (mode == "upper")
  {
    newString = string.toUpperCase ();
  }
  else
  if (mode == "lower")
  {
    newString = string.toLowerCase ();
  }
  else
  if (mode == "capital")
  {
    newString = string.substring (0, 1).toUpperCase () + string.substring (1).toLowerCase ();
  }
  else
  {
    console.error ("<" + tagName + "> supplied with bad mode parameter: " + mode);
  }
  
	return this.walkChildren (inElement, inContext, inTreeWalker, newString);
}

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

/*
  a comment that doesn't appear in the final DOM
*/

positron.provide ("positron.tag.CommentTag");
positron.require ("positron.DelegateHashMap");
positron.require ("positron.tag");

/**
 * @constructor
 */
positron.tag.CommentTag = function ()
{
	positron.tag.Tag.call (this);
};
positron.inherits (positron.tag.CommentTag, positron.tag.Tag);

positron.tag.CommentTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
	positron.DOM.removeNode (inElement);
	return true;
}

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.tag.ConditionTag");
positron.require ("positron.tag");

/**
 * @constructor
 */
positron.tag.ConditionTag = function ()
{
	positron.tag.Tag.call (this);
};
positron.inherits (positron.tag.ConditionTag, positron.tag.Tag);

// inElement: DOM element
// inContext: map<string,string>
// return: true/false
positron.tag.ConditionTag.prototype.matches = function (inElement, inContext)
{
	return false;
},

// Tag 

// inElement: DOM element
// inContext: map<string,string>
// inTreeWalker: tree walker
positron.tag.ConditionTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
	var	sync = true;
	
	if (this.matches (inElement, inContext))
	{
		sync = this.walkChildren (inElement, inContext, inTreeWalker);
	}
	else
	{
		positron.DOM.removeNode (inElement);
		inTreeWalker.onWalkComplete ();
	}
	
	return sync;
};

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

// dateTag.js

positron.provide ("positron.tag.DateTag");
positron.require ("positron.tag");

/**
 * @constructor
 */
positron.tag.DateTag = function ()
{
	positron.tag.Tag.call (this);
};
positron.inherits (positron.tag.DateTag, positron.tag.Tag);

positron.tag.DateTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
	var	date = null;

  var msAttribute = inElement.getAttribute ("ms");
  
  if (msAttribute && msAttribute.length)
  {
		var	ms = parseInt (msAttribute);
		
		if (isNaN (ms))
		{
			console.error ("error parsing ms attribute: " + msAttribute);
		}
		else
		{
			date = new Date (ms);
		}
	}
	
	if (!date)
	{
		var	stringAttribute = inElement.getAttribute ("string");
		
		if (stringAttribute && stringAttribute.length)
		{
			date = new Date (stringAttribute);
		}
	}
	
	if (!date)
	{
		date = new Date ();
	}
	
	var	hours24 = date.getHours ();
	var	hours12 = hours24 > 12 ? hours24 - 12 : hours24;
	
	var newContext = gApplication.makeContext (inContext);
	newContext.put (this.getName (inElement), date);
	newContext.put (this.getNameDot (inElement) + "year", date.getFullYear ());
	newContext.put (this.getNameDot (inElement) + "month", date.getMonth () + 1);
	newContext.put (this.getNameDot (inElement) + "month0", date.getMonth ());
	newContext.put (this.getNameDot (inElement) + "day", date.getDate ());
	newContext.put (this.getNameDot (inElement) + "hours", hours24);
	newContext.put (this.getNameDot (inElement) + "hours24", hours24);
	newContext.put (this.getNameDot (inElement) + "hours12", hours12);
	newContext.put (this.getNameDot (inElement) + "minutes", date.getMinutes ());
	newContext.put (this.getNameDot (inElement) + "seconds", date.getSeconds ());
	newContext.put (this.getNameDot (inElement) + "milliseconds", date.getMilliseconds ());
	newContext.put (this.getNameDot (inElement) + "ms", date.getTime ());
	newContext.put (this.getNameDot (inElement) + "string", date.toString ());

  return this.walkChildren (inElement, newContext, inTreeWalker);
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.tag.DelayTag");
positron.require ("positron.tag.Tag");

/**
 * @constructor
 */
positron.tag.DelayTag = function ()
{
	positron.tag.Tag.call (this);
};
positron.inherits (positron.tag.DelayTag, positron.tag.Tag);

positron.tag.DelayTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
	var	time = positron.Util.parseTime (positron.DOM.getIntAttributeValueWithDefault (inElement, "time", 1000));

	var	self = this;
	
	setTimeout
	(
		function ()
		{
			self.walkChildren (inElement, inContext, inTreeWalker);
		},
		time
	);

	return false;
};

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

// CONSTRUCTOR

positron.tag.DistanceTag = function ()
{
	positron.tag.Tag.call (this);

	this.requiredAttributes.push ("lat1");
	this.requiredAttributes.push ("lon1");
	this.requiredAttributes.push ("lat2");
	this.requiredAttributes.push ("lon2");
};
positron.inherits (positron.tag.DistanceTag, positron.tag.Tag);

positron.tag.DistanceTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
	var	lat1 = positron.DOM.getFloatAttributeValue (inElement, "lat1") * (Math.PI / 180);
	var	lon1 = positron.DOM.getFloatAttributeValue (inElement, "lon1") * (Math.PI / 180);
	var	lat2 = positron.DOM.getFloatAttributeValue (inElement, "lat2") * (Math.PI / 180);
	var	lon2 = positron.DOM.getFloatAttributeValue (inElement, "lon2") * (Math.PI / 180);

	var	distance = new Object ();

	distance.m = Math.acos (Math.sin (lat1) * Math.sin (lat2) + 
		Math.cos (lat1) * Math.cos (lat2) *
		Math.cos (lon2 - lon1)) * 6371000;

	distance.km = distance.m / 1000;
	distance.mi = (distance.km * 5) / 8;
	distance.yards = distance.mi * 1760;
	distance.feet = distance.mi * 5280;

  return this.walkChildren (inElement, inContext, inTreeWalker, distance);
}

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

/*
  this Tag does get from context, permitting computed keys
*/

positron.provide ("positron.tag.GetTag");

/**
 * @constructor
 */
positron.tag.GetTag = function ()
{
	positron.tag.Tag.call (this);

	this.requiredAttributes.push ("key");
};
positron.inherits (positron.tag.GetTag, positron.tag.Tag);


positron.tag.GetTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
  var key = inElement.getAttribute ("key");
  var	value = gApplication.getContextReference (key, inContext);
  
  return this.walkChildren (inElement, inContext, inTreeWalker, value);
}

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

// if_Tag.js

positron.provide ("positron.tag.IfTag");
positron.require ("positron.tag.ConditionTag");

/**
 * @constructor
 */
positron.tag.IfTag = function ()
{
	positron.tag.ConditionTag.call (this);
};
positron.inherits (positron.tag.IfTag, positron.tag.ConditionTag);

// inElement: DOM element
// inContext: map<string,string>
// return: true/false
positron.tag.IfTag.prototype.matches = function (inElement, inContext)
{
	var	matches = false;
	var	trueAttribute = positron.DOM.getAttributeValue (inElement, "true");
	var	falseAttribute = positron.DOM.getAttributeValue (inElement, "false");
	var	emptyAttribute = positron.DOM.getAttributeValue (inElement, "empty");
	var	notEmptyAttribute = positron.DOM.getAttributeValue (inElement, "notempty");
	
	if (trueAttribute && trueAttribute.length)
	{
		matches = positron.Util.evaluateExpressionChain (trueAttribute);
	}
	else
	if (falseAttribute && falseAttribute.length)
	{
		matches = !positron.Util.evaluateExpressionChain (falseAttribute);
	}
	else
	if (emptyAttribute != null)
	{
		matches = emptyAttribute.length == 0;
	}
	else
	if (notEmptyAttribute != null)
	{
		matches = notEmptyAttribute.length > 0;
	}
	else
	{
		console.error ("<if> requires true, false, empty, or notempty attribute");
	}
	
	return matches;
}

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.tag.IndexedDBQueryTag");
positron.require ("positron.tag.Tag");

// this doesn't work yet

/**
 * @constructor
 */
positron.tag.IndexedDBQueryTag = function ()
{
	positron.tag.Tag.call (this);
	
	this.requiredAttributes.push ("database");
	this.requiredAttributes.push ("store");
};
positron.inherits (positron.tag.IndexedDBQueryTag, positron.tag.Tag);

positron.tag.IndexedDBQueryTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
	console.log ("IndexedDBQueryTag.process()");

	// for callbacks
	var	self = this;

	var	databaseName = inElement.getAttribute ("database");
	var	openRequest = indexedDB.open (databaseName);
	
	openRequest.onupgradeneeded = function (inUpgradeEvent)
	{
		// not something that the query tag can handle
		console.error ("database " + databaseName + " requires upgrade");

		self.walkChildren (inElement, inContext, inTreeWalker, new Array ());
	};
	
	openRequest.onsuccess = function (inOpenEvent)
	{
		var	database = inOpenEvent.target.result;
		var	storeName = inElement.getAttribute ("store");
		var	transaction = database.transaction ([storeName], "readonly");
		var	store = transaction.objectStore (storeName);

		var	cursor = null;
		var	records = new Array ();

		var	indexName = inElement.getAttribute ("index");
		
		if (indexName && indexName.length)
		{
			var	index = store.index (indexName);
			cursor = index.openCursor (IDBKeyRange.only (inElement.getAttribute ("search")));
		}
		else
		{
			cursor = store.openCursor (IDBKeyRange.lowerBound (0));
		}
		
		cursor.onsuccess = function (inCursorEvent)
		{
			var	record = inCursorEvent.target.result;
			
			if (record)
			{
				records.push (record.value);
				record.continue ();
			}
			else
			{
				self.walkChildren (inElement, inContext, inTreeWalker, records);
			}
		}

		cursor.onerror = function (inCursorEvent)
		{
			console.error ("store.openCursor.onerror()");
			console.error (inCursorEvent.target.result);
			
			self.walkChildren (inElement, inContext, inTreeWalker, new Array ());
		}
	};
	
	// we are async, no matter what
	return false;
}


/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

/*
this Tag provides a solution for the situation where the browser
sees tags with templated attribute values in markup, which results in errors.
examples would be <img>, <movie>, etc

simply point nu:img, nu:movie, etc at this Tag and it will transform to img, movie, etc
*/

positron.provide ("positron.tag.IsolatorTag");
positron.require ("positron.tag");

/**
 * @constructor
 */
positron.tag.IsolatorTag = function ()
{
	positron.tag.Tag.call (this);
};
positron.inherits (positron.tag.IsolatorTag, positron.tag.Tag);

positron.tag.IsolatorTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
	var	sync = true;
	
	var	newTagName = this.getDefaultName (inElement);
	var	newTag = document.createElement (newTagName);
	
	if (inElement.hasAttributes)
	{
		for (var i = 0; i < inElement.attributes.length; i++)
		{
			newTag.setAttribute (inElement.attributes [i].name, inElement.attributes [i].value);
		}
	}

	positron.DOM.moveChildren (inElement, newTag);
	inElement.parentNode.replaceChild (newTag, inElement);

	inTreeWalker.runAttributelets (newTag);
	
	return this.walkChildren (newTag, inContext, inTreeWalker);
}

// override as the base class will remove the tag from the tree
positron.tag.IsolatorTag.prototype.onWalkComplete = function (inTreeWalker)
{
	inTreeWalker.superTreeWalker.onWalkComplete (inTreeWalker);
}

/**
*
* @license
* Copyright � 2014 Jason Proctor.  All rights reserved.
*
**/

/*
  this Tag joins a list according to a delimiter and puts the string into context
*/

positron.provide ("positron.tag.JoinTag");

/**
 * @constructor
 */
positron.tag.JoinTag = function ()
{
	positron.tag.Tag.call (this);

	this.requiredAttributes.push ("key");
};
positron.inherits (positron.tag.JoinTag, positron.tag.Tag);

positron.tag.JoinTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
	var key = inElement.getAttribute ("key");
	var delimiter = positron.DOM.getAttributeValueWithDefault (inElement, "delimiter", " ");
	var smart = positron.DOM.getBooleanAttributeValueWithDefault (inElement, "smart", false);
	var	elements = gApplication.getContextReference (key, inContext);

	var	joined = null;
	
	if (Array.isArray (elements))
	{
		if (smart)
		{
			joined = positron.Util.smartJoin (elements, delimiter);
		}
		else
		{
			joined = elements.join (delimiter);
		}
	}
	else
	{
		console.error ("JoinTag could not find elements for key " + key);
	}

	return this.walkChildren (inElement, inContext, inTreeWalker, joined);
}

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.tag.JSONTag");

positron.require ("positron.tag.Tag");
positron.require ("positron.DelegateHashMap");

// CONSTRUCTOR

/**
 * @constructor
 */
positron.tag.JSONTag = function ()
{
	positron.tag.AjaxTag.call (this);
};
positron.inherits (positron.tag.JSONTag, positron.tag.AjaxTag);

// AJAXTag OVERRIDES

positron.tag.JSONTag.prototype.getDataType = function (inElement)
{
  var jsonp = positron.DOM.getAttributeValue (inElement, "jsonp");
  jsonp = jsonp && jsonp.toLowerCase () == "true";
  
  return jsonp ? "jsonp" : "json";
};

positron.tag.JSONTag.prototype.onContentReceived = function (inElement, inContext, inData)
{
	var	context = gApplication.makeContext (inContext);
	context.put (this.getName (inElement), inData);
	
	return context;
};
/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.tag.ListTag");

positron.require ("positron.tag");
positron.require ("positron.DelegateHashMap");

// CONSTRUCTOR

/**
 * @constructor
 */
positron.tag.ListTag = function ()
{
	positron.tag.Tag.call (this);

	this.requiredAttributes.push ("key");
};
positron.inherits (positron.tag.ListTag, positron.tag.Tag);

// inElement: DOM element
// inContext: map<string,string>
// inTreeWalker: tree walker
// return: node to replace inElement
positron.tag.ListTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
	var	sync = true;
	
	var	name = this.getName (inElement);
	
	var	listPlaceholder = document.createElement ("div");
	listPlaceholder.setAttribute ("class", gApplication.getCSSClassPrefix () + "list-place-holder");
	positron.DOM.addPrefixedClass (listPlaceholder, "list-place-holder");
	inElement.parentNode.replaceChild (listPlaceholder, inElement);

	var	elements = this.getElements (inElement, inContext, inTreeWalker);

	if (Array.isArray (elements))
	{
		var	offset = 0;
	  var limit = elements.length;
	  var	pageSize = 0;
	  
	  var offsetAttribute = inElement.getAttribute ("offset");
	  
	  if (offsetAttribute && offsetAttribute.length)
	  {
	    offset = parseInt (offsetAttribute);
	    
	    if (isNaN (offset))
	    {
	    	offset = 0;
	    }
	    else
	    {
		    offset = Math.max (offset, 0);
		  }
	  }
	  
	  var limitAttribute = inElement.getAttribute ("limit");
	  
	  if (limitAttribute && limitAttribute.length)
	  {
	    limit = parseInt (limitAttribute);
	    
	    if (isNaN (limit))
	    {
	    	limit = elements.length;
	    }
	    else
	    {
		    limit = Math.min (limit, elements.length);
		  }
	  }
	  
	  var pageSizeAttribute = inElement.getAttribute ("pagesize");
	  
	  if (pageSizeAttribute && pageSizeAttribute.length)
	  {
	    pageSize = parseInt (pageSizeAttribute);
	    
	    if (isNaN (pageSize))
	    {
	    	pageSize = 0;
	    }
	  }
	  
	  var	searchKey = inElement.getAttribute ("searchkey");
	  
	  if (searchKey && (searchKey.length == 0))
	  {
	  	searchKey = null;
	  }
	  
	  var	searchValue = inElement.getAttribute ("searchvalue");
	  
	  if (searchValue && (searchValue.length == 0))
	  {
	  	searchValue = null;
	  }
	  
	  var	callbackData = new Object ();
	  callbackData.element = listPlaceholder;
	  callbackData.index = 0;
	  callbackData.count = 0;
	  
	  // zip through finding out how many matching items we have, sigh
		for (var i = offset; (i < offset + limit) && (i < elements.length); i++)
		{
			var	include = true;
			
			if (searchKey != null && searchValue != null)
			{
				var	element = elements [i];
				
				include = typeof (element) == "object" && element [searchKey] == searchValue;
			}
			
			if (include)
			{
				callbackData.count++;
			}
		}

	  if (callbackData.count > 0)
	  {
			for (var i = offset; (i < offset + limit) && (i < elements.length); i++)
			{
				var	include = true;
				
				if (searchKey != null && searchValue != null)
				{
					var	element = elements [i];
					
					include = typeof (element) == "object" && element [searchKey] == searchValue;
				}
				
				if (include)
				{
					var	elementPlaceholder = document.createElement ("div");
					positron.DOM.addPrefixedClass (elementPlaceholder, "list-element-place-holder");
					listPlaceholder.appendChild (elementPlaceholder);
					
					var	elementContext = gApplication.makeContext (inContext);
					elementContext.put (name, elements [i]);
		
					// stick some meta in there, ooo
					var	index = i - offset;
		
					// global stuff, pertaining into the entire collection
					elementContext.put (name + ".meta.globalindex", i);
					elementContext.put (name + ".meta.globalcount", elements.length);
					
					// local stuff, pertaining to the elements we are including
					elementContext.put (name + ".meta.index", index);
					elementContext.put (name + ".meta.count", limit);
					elementContext.put (name + ".meta.isfirst", index == 0);
					elementContext.put (name + ".meta.islast", index == (limit - 1));
					
					// local page-oriented stuff
					var	pageIndex = 0;
					var	pageCount = 1;
					
					if (pageSize > 0)
					{
						pageIndex = Math.floor (index / pageSize);
						pageCount = Math.ceil (limit / pageSize);
					}
					
					elementContext.put (name + ".meta.pageindex", pageIndex);
					elementContext.put (name + ".meta.pagecount", pageCount);
					elementContext.put (name + ".meta.isfirstpage", pageIndex == 0);
					elementContext.put (name + ".meta.islastpage", pageIndex == (pageCount - 1));
					
					positron.DOM.copyChildren (inElement, elementPlaceholder);

					var	tempSync = this.walkChildren (elementPlaceholder, elementContext, inTreeWalker, callbackData);
					
					// if ANY of the subwalks is async, we return async
					if (tempSync)
					{
						sync = tempSync;
					}
				}
			}
		}
		else
		{
			// no qualifying list elements
			positron.DOM.removeNode (listPlaceholder);
			inTreeWalker.onWalkComplete ();
		}
	}
	else
	{
		// couldn't find list in context
		positron.DOM.removeNode (listPlaceholder);
		inTreeWalker.onWalkComplete ();
	}
	
	return sync;
};

// TAG OVERRIDE

positron.tag.ListTag.prototype.walkChildren = function (inElement, inContext, inTreeWalker, inCallbackData)
{
	var	treeWalker = inTreeWalker.makeSubTreeWalker (this);
	treeWalker.callbackData = inCallbackData;

	return treeWalker.startWalkChildren (inElement, inContext);
}

// we set callbackData.count of these going at once
// and when they're all done, we call the supertreewalker back
positron.tag.ListTag.prototype.onWalkComplete = function (inTreeWalker)
{
	positron.DOM.replaceWithChildren (inTreeWalker.rootNode);
	
	inTreeWalker.callbackData.index++;
	
	if (inTreeWalker.callbackData.index == inTreeWalker.callbackData.count)
	{
		positron.DOM.replaceWithChildren (inTreeWalker.callbackData.element);
		inTreeWalker.superTreeWalker.onWalkComplete (inTreeWalker);
	}
}


// DEFAULT IMPLEMENTATION

// inElement: DOM element
// inContext: map<string,string>
// inTreeWalker: tree walker
// return: array
positron.tag.ListTag.prototype.getElements = function (inElement, inContext, inTreeWalker)
{
	var	elements = null;
	
	// check for a Js array
	var	elementsRefAttribute = positron.DOM.getAttributeValue (inElement, "key");

	if (elementsRefAttribute)
	{
		var	elementsArray = gApplication.getContextReference (elementsRefAttribute, inContext);

		if (typeof (elementsArray) == 'object')
		{
			if (elementsArray && (typeof (elementsArray.length) == "number"))
			{
				elements = elementsArray;
			}
		}
	}

	if (!elements || !Array.isArray (elements))
	{
		console.error ("ListTag could not find elements for key " + positron.DOM.getAttributeValue (inElement, "key"));
	}
	
	return elements;
};

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

/*
  this Tag does get from context, permitting computed keys
*/

positron.provide ("positron.tag.LocalStorageTag");

/**
 * @constructor
 */
positron.tag.LocalStorageTag = function ()
{
	positron.tag.Tag.call (this);
};
positron.inherits (positron.tag.LocalStorageTag, positron.tag.Tag);

positron.tag.LocalStorageTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
	var	newContext = null;
	
	for (var i = -1; true; i++)
	{
		var	keyAttribute = "key";
		
		if (i >= 0)
		{
			keyAttribute += "-" + i;
		}
		
		var	key = inElement.getAttribute (keyAttribute);
		
		if (key && key.length)
		{
			var	value = localStorage [key];
			
			if (value)
			{
				if (newContext == null)
				{
					newContext = gApplication.makeContext (inContext);
				}
				
				newContext.put (this.getNameDot (inElement) + key, value);
			}
		}
		else
		{
			// if no regular key, stay on for numbered ones
			if (i >= 0)
			{
				break;
			}
		}
	}
	
	if (newContext == null)
	{
		console.error ("LocalStorageTag with no valid keys");
		
		newContext = inContext;
	}
	
  return this.walkChildren (inElement, newContext, inTreeWalker);
}

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.tag.LocationTag");
positron.require ("positron.tag.Tag");

/**
 * @constructor
 */
positron.tag.LocationTag = function ()
{
	positron.tag.Tag.call (this);
};
positron.inherits (positron.tag.LocationTag, positron.tag.Tag);

positron.tag.LocationTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
	var	sync = false;
	
	if (navigator.geolocation)
	{
		var	self = this;
		
		navigator.geolocation.getCurrentPosition
		(
			function (inPosition)
			{
				self.walkChildren (inElement, inContext, inTreeWalker, inPosition);
			},
			function (inError)
			{
				console.error ("error getting position");
				console.error (inError.message);
				
				self.walkChildren (inElement, inContext, inTreeWalker);
			}
		);
	}
	else
	{
		console.error ("browser does not support geolocation API");
		
		sync = this.walkChildren (inElement, inContext, inTreeWalker);
	}

	return sync;
};

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

/*
  this Tag logs stuff
  values, values from keys, or the current context
  
  <nu:log
    value="value" OR valuekey="valuekey" OR nothing
    >
  </nu:log>
  
  this element pulls itself after logging
*/

positron.provide ("positron.tag.LogTag");
positron.require ("positron.DelegateHashMap");
positron.require ("positron.tag");

/**
 * @constructor
 */
positron.tag.LogTag = function ()
{
	positron.tag.Tag.call (this);
};
positron.inherits (positron.tag.LogTag, positron.tag.Tag);

positron.tag.LogTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
  var value = inElement.getAttribute ("value");
  var valueKey = inElement.getAttribute ("valuekey");

	console.log ("LogTag logging");
  
  if (value && value.length)
  {
    // value is the direct value
  }
  else
  if (valueKey && valueKey.length)
  {
		console.log (valueKey);

    // can't use inContext.get() because the key may be compound
    // requiring walking, etc
    value = gApplication.getContextReference (valueKey, inContext);
  }
  else
  {
    value = inContext;
  }
  
	console.log (value);
	console.log ("(type = " + typeof (value) + ")");

	return this.walkChildren (inElement, inContext, inTreeWalker);
}

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.tag.MapTag");

positron.require ("positron.tag");
positron.require ("positron.DelegateHashMap");

// CONSTRUCTOR

// i have to say, how the ListTag interoperates with other list-generators is nice

positron.tag.MapTag = function ()
{
	positron.tag.ListTag.call (this);
};
positron.inherits (positron.tag.MapTag, positron.tag.ListTag);

// LISTTAG OVERRIDES

positron.tag.MapTag.prototype.getElements = function (inElement, inContext, inTreeWalker)
{
	var	map = null;
	var	mapKeyAttribute = positron.DOM.getAttributeValue (inElement, "key");

	if (mapKeyAttribute)
	{
		map = gApplication.getContextReference (mapKeyAttribute, inContext);

		if (Array.isArray (map) || typeof (map) != 'object')
		{
			map = null;
		}
	}
	
	var	list = null;
	
	if (map)
	{
		list = new Array ();
		
	  for (var key in map)
	  {
	  	if (map.hasOwnProperty (key))
	  	{
				var	element = new Object ();
				element.key = key;
				element.value = map [key];
				
				list.push (element);
			}
	  }
	}
	else
	{
		console.error ("MapTag could not find elements for key " + positron.DOM.getAttributeValue (inElement, "key"));
	}

	return list;
}


/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.tag.MoveTag");
positron.require ("positron.tag");

/**
 * @constructor
 */
positron.tag.MoveTag = function ()
{
	positron.tag.Tag.call (this);
};
positron.inherits (positron.tag.MoveTag, positron.tag.Tag);

positron.tag.MoveTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
	// schedule us to show any deferred views
	positron.DOM.getParentView (inElement).addDeferredTask (this);
	
	return this.walkChildren (inElement, inContext, inTreeWalker);
}

// runs when the parent refresh is complete
// to show any views which are marked deferred
positron.tag.MoveTag.prototype.run = function ()
{
	// console.log ("MoveTag.run()");
	
	if (this.destinationElement)
	{
		var	deferredViewElements = positron.DOM.queryPrefixedAttribute (this.destinationElement, "defer-show");

		for (var i = 0; i < deferredViewElements.length; i++)
		{
			var	deferredViewElement = deferredViewElements [i];
			
			var	deferredView = positron.DOM.getData (deferredViewElement, "view");
			
			if (deferredView && !deferredView.isVisible ())
			{
				deferredView.show ();
			}
			else
			{
				console.error ("element with defer-show attribute has no view");
				console.error (deferredViewElement);
			}
			
			// ensure we only do this once
			positron.DOM.removePrefixedAttribute (deferredViewElement, "defer-show");
		}
	}
}

positron.tag.MoveTag.prototype.onWalkComplete = function (inTreeWalker)
{
	var	element = inTreeWalker.rootNode;
	var	condemned = new Array ();
	
	var	unique = positron.DOM.getBooleanAttributeValueWithDefault (element, "unique", false);
	var	update = positron.DOM.getBooleanAttributeValueWithDefault (element, "update", true);
	
	var	destinationElements = positron.DOM.getCompositeElements (element, "view", "selector");
	
	if (destinationElements && destinationElements.length)
	{
		// HACK we only honour the first found destination element
		this.destinationElement = destinationElements [0];

		if (unique)
		{
			for (var i = 0; i < this.destinationElement.childNodes.length; i++)
			{
				var	destinationChild = this.destinationElement.childNodes [i];
				
				if (destinationChild.nodeType == destinationChild.ELEMENT_NODE)
				{
					var	id = destinationChild.getAttribute ("id");
					
					if (id && id.length)
					{
						var	newChild = element.querySelector ("#" + id);
						
						if (newChild)
						{
							if (update)
							{
								for (var j = 0; j < newChild.attributes.length; j++)
								{
									var	name = newChild.attributes.item (j).nodeName;
									var	newValue = newChild.attributes.item (j).nodeValue;
									
									var	oldValue = destinationChild.getAttribute (name);
									
									if (newValue != oldValue)
									{
										destinationChild.setAttribute (name, newValue);
									}
								}
							}
							
							// update the element's contents, too
							positron.DOM.removeChildren (destinationChild);
							positron.DOM.moveChildren (newChild, destinationChild);
	
							condemned.push (newChild);
						}
						else
						{
							condemned.push (destinationChild);
						}
					}
				}
			}
			
			if (condemned)
			{
				for (var i = 0; i < condemned.length; i++)
				{
					positron.DOM.removeNode (condemned [i]);
				}
			}
			
			// we've already updated existing ones
			// and removed old ones
			// so just add the new ones
			for (var i = 0; i < element.childNodes.length; i++)
			{
				var	newChild = element.childNodes [i];
				
				if (newChild.nodeType == newChild.ELEMENT_NODE)
				{
					this.destinationElement.appendChild (newChild);
				}
			}
		}
		else
		{
			// not tracking uniques, so just bung the new ones on the end of the destination
			while (element.childNodes.length > 0)
			{
				this.destinationElement.appendChild (element.childNodes [0]);
			}
		}
	}
	else
	{
		console.error ("MoveTag has no destination element");
		console.error (element);
	}

	positron.tag.Tag.prototype.onWalkComplete.call (this, inTreeWalker);
}

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

/*
  this Tag does basic string substitution
*/

positron.provide ("positron.tag.NumberFormatTag");
positron.require ("positron.DelegateHashMap");
positron.require ("positron.tag");

/**
 * @constructor
 */
positron.tag.NumberFormatTag = function ()
{
	positron.tag.Tag.call (this);

	this.requiredAttributes.push ("number");
	this.requiredAttributes.push ("type");
};
positron.inherits (positron.tag.NumberFormatTag, positron.tag.Tag);

positron.tag.NumberFormatTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
	var number = parseFloat (inElement.getAttribute ("number"));
	var type = inElement.getAttribute ("type");
	var digits = positron.Util.parseInt (inElement.getAttribute ("digits"), 2);

  var newValue = null;
  
  if (type == "fixed")
  {
    newValue = number.toFixed (digits);
  }
  else
  if (type == "precision")
  {
    newValue = number.toPrecision (digits);
  }
  else
  if (type == "frontpad")
  {
  	newValue = number;

  	while (newValue.toString ().length < digits)
  	{
  		newValue = "0" + newValue;
  	}
  }
  else
  if (type == "floor")
  {
    newValue = Math.floor (number);
  }
  else
  if (type == "ceil")
  {
    newValue = Math.ceil (number);
  }
  else
  if (type == "round")
  {
    newValue = Math.round (number);
  }
  else
  {
    console.error ("bad type (" + type + ") passed to <numberformat>");
  }
  
  return this.walkChildren (inElement, inContext, inTreeWalker, newValue);
}

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

/*
  this Tag does basic string substitution
*/

positron.provide ("positron.tag.NumbersTag");
positron.require ("positron.DelegateHashMap");
positron.require ("positron.tag");

/**
 * @constructor
 */
positron.tag.NumbersTag = function ()
{
	positron.tag.Tag.call (this);

	this.requiredAttributes.push ("start");
	this.requiredAttributes.push ("stop");
};
positron.inherits (positron.tag.NumbersTag, positron.tag.Tag);

positron.tag.NumbersTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
	var	start = positron.DOM.getIntAttributeValueWithDefault (inElement, "start", 1);
	var	stop = positron.DOM.getIntAttributeValueWithDefault (inElement, "stop", 10);
	var	step = positron.DOM.getIntAttributeValueWithDefault (inElement, "step", 1);
	
	if (step == 0)
	{
		step = 1;
	}
	else
	if (step < 0)
	{
		step *= -1;
	}
	
	var	numbers = new Array ();
	
	if (start < stop)
	{
		for (var i = start; i <= stop; i += step)
		{
			numbers.push (i);
		}
	}
	else
	if (start > stop)
	{
		for (var i = start; i >= stop; i -= step)
		{
			numbers.push (i);
		}
	}
	
  return this.walkChildren (inElement, inContext, inTreeWalker, numbers);
}

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

/*
  this Tag does basic string substitution
*/

positron.provide ("positron.tag.PrefixedPropertyTag");

/**
 * @constructor
 */
positron.tag.PrefixedPropertyTag = function ()
{
	positron.tag.Tag.call (this);

	this.requiredAttributes.push ("property");
};
positron.inherits (positron.tag.PrefixedPropertyTag, positron.tag.Tag);

positron.tag.PrefixedPropertyTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
	var neutralProperty = inElement.getAttribute ("property");
  var	prefixedProperty = positron.CSS.getPrefixedProperty (neutralProperty);
  
  return this.walkChildren (inElement, inContext, inTreeWalker, prefixedProperty);
}

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

/*
  this Tag does basic string substitution
*/

positron.provide ("positron.tag.QuerySelectorTag");
positron.require ("positron.DelegateHashMap");
positron.require ("positron.tag");

/**
 * @constructor
 */
positron.tag.QuerySelectorTag = function ()
{
	positron.tag.Tag.call (this);
};
positron.inherits (positron.tag.QuerySelectorTag, positron.tag.Tag);

positron.tag.QuerySelectorTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
	this.walkChildren (inElement, inContext, inTreeWalker,
		positron.DOM.getCompositeElements (element, "view", "selector"));
}

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

/*
  this Tag does basic string substitution
*/

positron.provide ("positron.tag.ReplaceTag");
positron.require ("positron.DelegateHashMap");
positron.require ("positron.tag");

/**
 * @constructor
 */
positron.tag.ReplaceTag = function ()
{
	positron.tag.Tag.call (this);

	this.requiredAttributes.push ("string");
	this.requiredAttributes.push ("replace");
};
positron.inherits (positron.tag.ReplaceTag, positron.tag.Tag);

positron.tag.ReplaceTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
	var string = inElement.getAttribute ("string");
	var replace = inElement.getAttribute ("replace");
	var withString = inElement.getAttribute ("with");
	var	regexp = positron.DOM.getBooleanAttributeValueWithDefault (inElement, "regexp", false);
	var	all = positron.DOM.getBooleanAttributeValueWithDefault (inElement, "all", false);
	
	// should be possible to have a blank string for "with"
	if (!withString)
	{
		withString = "";
	}
	
	var	newString = null;
	
	if (regexp)
	{
		replace = new RegExp (replace);
	}
	
	if (all)
	{
		newString = string.split (replace).join (withString);
	}
	else
	{
		newString = string.replace (replace, withString);
	}
	
  return this.walkChildren (inElement, inContext, inTreeWalker, newString);
}


positron.provide ("positron.tag.SelectOptionTag");

positron.tag.SelectOptionTag =
function SelectOptionTag ()
{
	positron.tag.Tag.call (this);
	
	this.requiredAttributes.push ("value");
};
positron.inherits (positron.tag.SelectOptionTag, positron.tag.Tag);

positron.tag.SelectOptionTag.prototype.process =
function SelectOptionTag_process (inElement, inContext, inTreeWalker)
{
	this.element = inElement;
	this.value = inElement.getAttribute ("value").toLowerCase ();
	
	return this.walkChildren (inElement, inContext, inTreeWalker);
};

positron.tag.SelectOptionTag.prototype.onWalkComplete =
function SelectOptionTag_onWalkComplete (inTreeWalker)
{
	var	options = this.element.querySelectorAll ("option");

	for (var i = 0; i < options.length; i++)
	{
		var	value = options [i].getAttribute ("value").toLowerCase ();
		
		options [i].selected = (value == this.value);
	}
	
	return positron.tag.Tag.prototype.onWalkComplete.call (this, inTreeWalker);
}

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

/*
  this Tag does copying of values from one key to another
  AND MORE IMPORTANTLY AND USEFULLY
  promotion of context values in scope
  
  <nu:set
    key="somekey"
    value="value" OR valuekey="valuekey"
    context="application,window,page"
    >
  </nu:set>

  value OR valuekey
  context is optional
*/

positron.provide ("positron.tag.SetTag");
positron.require ("positron.DelegateHashMap");
positron.require ("positron.tag");

/**
 * @constructor
 */
positron.tag.SetTag = function ()
{
	positron.tag.Tag.call (this);
};
positron.inherits (positron.tag.SetTag, positron.tag.Tag);

positron.tag.SetTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
  var value = inElement.getAttribute ("value");
  var valueKey = inElement.getAttribute ("valuekey");
  var expression = inElement.getAttribute ("expression");
  var scope = inElement.getAttribute ("context");
  
  if (value && value.length)
  {
    // value is the direct value
  }
  else
  if (valueKey && valueKey.length)
  {
    // can't use inContext.get() because the key may be compound
    // requiring walking, etc
    value = gApplication.getContextReference (valueKey, inContext);
  }
  else
  if (expression && expression.length)
  {
  	value = positron.Util.evaluateArithmeticExpression (expression);
  }
  else
  {
    console.error ("SetTag called with neither value, valuekey, nor expression");
    console.error (inElement);
  }
  
  // the context we use for walking the subtree
  var walkContext = inContext;
  
  // the context we are altering
  var putContext = null;
  
  if (scope && scope.length)
  {
    if (scope == "application")
    {
      putContext = gApplication.context;
    }
    else
    if (scope == "page")
    {
      putContext = gApplication.getPage ().context;
    }
    else
    if (scope == "view")
    {
    	var	view = positron.DOM.getParentView (inElement);
    	
    	if (view)
    	{
    		putContext = view.context;
    	}
    	else
    	{
    		console.error ("could not find parent view for element");
    		console.error (inElement);
    	}
    }
    else
    {
      console.error ("SetTag called with bad context: " + scope);
    }
  }
  else
  {
    // assume immediate scope, so make a new context
    putContext = gApplication.makeContext (inContext);
    
    // and walk with this context, too
    walkContext = putContext;
  }
  
  if (putContext)
  {
    putContext.put (this.getName (inElement), value);
  }

  return this.walkChildren (inElement, walkContext, inTreeWalker);
}

/**
*
* @license
* Copyright � 2014 Jason Proctor.  All rights reserved.
*
**/

/*
  this Tag splits a string according to a delimiter and puts the list of elements into context
*/

positron.provide ("positron.tag.SplitTag");
positron.require ("positron.DelegateHashMap");
positron.require ("positron.tag");

/**
 * @constructor
 */
positron.tag.SplitTag = function ()
{
	positron.tag.Tag.call (this);

	this.requiredAttributes.push ("string");
};
positron.inherits (positron.tag.SplitTag, positron.tag.Tag);

positron.tag.SplitTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
	var string = inElement.getAttribute ("string");
	var delimiter = positron.DOM.getAttributeValueWithDefault (inElement, "delimiter", " ");
	var	regexp = positron.DOM.getBooleanAttributeValueWithDefault (inElement, "regexp", false);
	
	if (regexp)
	{
		delimiter = new RegExp (delimiter);
	}

  return this.walkChildren (inElement, inContext, inTreeWalker, string.split (delimiter));
}

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.tag.SQLQueryTag");
positron.require ("positron.tag.Tag");

/**
 * @constructor
 */
positron.tag.SQLQueryTag = function ()
{
	positron.tag.Tag.call (this);
	
	this.requiredAttributes.push ("database");
	this.requiredAttributes.push ("query");
};
positron.inherits (positron.tag.SQLQueryTag, positron.tag.Tag);

positron.tag.SQLQueryTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
	var	databaseName = inElement.getAttribute ("database");
	var	query = inElement.getAttribute ("query");

	var	version = inElement.getAttribute ("version");
	
	if (version == null || version.length == 0)
	{
		version = "1.0";
	}

	var	size = inElement.getAttribute ("size");
	
	if (size == null || size.length == 0)
	{
		size = 5 * 1024 * 1024;
	}
	else
	{
		size = parseInt (size);
	}

	var	parameters = inElement.getAttribute ("parameters");
	
	if (parameters != null && parameters.length > 0)
	{
		parameters = parameters.split (",");
	}
	else
	{
		parameters = new Array ();
	}
	
	var	sync = false;
	
	var	database = openDatabase (databaseName, version, "", size);
	
	if (database)
	{
		// for callbacks
		var	self = this;
		
		database.transaction
		(
			function (inTransaction)
			{
				inTransaction.executeSql
				(
					query,
					parameters,
					function (inTransaction, inResultSet)
					{
						var	results = [];
						
						if (inResultSet.rows && inResultSet.rows.length)
						{
							// sadly the result set structure isn't standard js
							// so can't traverse it with context syntax
							// have to convert to regular list :-(
							for (var i = 0; i < inResultSet.rows.length; i++)
							{
								var	item = inResultSet.rows.item (i);
								var	result = new Object ();
								
								for (var key in item)
								{
									result [key] = item [key];
								}
								
								results.push (result);
							}
						}
						
						self.walkChildren (inElement, inContext, inTreeWalker, results);
					},
					function (inTransaction, inError)
					{
						console.error (inError);

						self.walkChildren (inElement, inContext, inTreeWalker);
					}
				);
			}
		);
	}
	else
	{
		console.error ("can't open database: " + databaseName);
		
		sync = this.walkChildren (inElement, inContext, inTreeWalker);
	}
	
	return sync;
}


/**
*
* @license
* Copyright � 2014 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.tag.ThrowTag");

/**
 * @constructor
 */
positron.tag.ThrowTag = function ()
{
	positron.tag.Tag.call (this);
};
positron.inherits (positron.tag.ThrowTag, positron.tag.Tag);

positron.tag.ThrowTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
	throw new Error ("error intentionally thrown by ThrowTag");
}

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.tag.TimeAgoTag");

// CONSTRUCTOR

positron.tag.TimeAgoTag = function ()
{
	positron.tag.Tag.call (this);
};
positron.inherits (positron.tag.TimeAgoTag, positron.tag.Tag);

positron.tag.TimeAgoTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
  var ms = inElement.getAttribute ("ms");
  
  if (ms && ms.length)
  {
  	ms = parseInt (ms);
  	
  	if (isNaN (ms))
  	{
  		ms = 0;
  	}
  }
  else
	{
		var	seconds = inElement.getAttribute ("s");
		
		if (seconds && seconds.length)
		{
			seconds = parseInt (seconds);
			
			if (isNaN (seconds))
			{
				seconds = 0;
			}
		}
		else
		{
			seconds = 0;
		}
		
		ms = seconds * 1000;
	}
	
	if (ms == 0)
	{
		console.error ("TimeAgoTaglet: error parsing ms/s attributes, defaulting to zero ms");
	}

	var	timeago = new Object ();
	
	var	then = new Date (ms);
	var	now = new Date ();

	var	milliseconds = now.getTime () - then.getTime ();
	var	seconds = milliseconds / 1000;
	
	var	firstNonZeroName = null;
	var	firstNonZeroValue = 0;
	
	for (var i = 0; i < this.kTimeUnits.length; i++)
	{
		var	unit = this.kTimeUnits [i];
		
		var	value = Math.floor (seconds / unit.divisor);
		
		if (value > 0 && firstNonZeroName == null)
		{
			firstNonZeroName = unit.name;
			firstNonZeroValue = value;
		}
		
		seconds -= (value * unit.divisor);
		
		timeago [unit.name] = value;
	}
	
	if (firstNonZeroName == null)
	{
		timeago.units = "ms";
		timeago.value = milliseconds;
	}
	else
	{
		timeago.units = firstNonZeroName;
		timeago.value = firstNonZeroValue;
	}
	
  return this.walkChildren (inElement, inContext, inTreeWalker, timeago);
};

positron.tag.TimeAgoTag.prototype.kTimeUnits = 
[	
	{
		name: "years",
		divisor: 31536000
	},
	{
		name: "months",
		divisor: 2529000
	},
	{
		name: "weeks",
		divisor: 604800
	},
	{
		name: "days",
		divisor: 86400
	},
	{
		name: "hours",
		divisor: 3600
	},
	{
		name: "minutes",
		divisor: 60
	},
	{
		name: "seconds",
		divisor: 1
	},
]

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.tag.WebSocketTag");
positron.require ("positron.tag.Tag");

/**
 * @constructor
 */
positron.tag.WebSocketTag = function ()
{
	positron.tag.Tag.call (this);
	
	this.requiredAttributes.push ("url");
};
positron.inherits (positron.tag.WebSocketTag, positron.tag.Tag);

positron.tag.WebSocketTag.prototype.process = function (inElement, inContext, inTreeWalker)
{
	var	sync = false;
	
	var	url = inElement.getAttribute ("url");
	var	protocol = inElement.getAttribute ("protocol");
	
	var	self = this;
	
	// console.log ("WebSocketTag opening WebSocket to " + url);

	// keep track of who walks, it's a shitshow down there
	var	walked = false;
	
	try
	{
		var	webSocket = new WebSocket (url, protocol);
		var	webSocketName = this.getName (inElement);
		
		// keeping them in context is not good enough
		// all kinds of things need to find them
		gApplication.addWebSocket (webSocketName, webSocket);
		
		// ok now this is really hosed
		// new WebSocket() will throw internally if it fails
		// without calling any handlers
		// get this - it just console.error()s!
		// we are screwed in that case
		// so if we haven't been called back in 5 seconds
		// we close the socket and resume treewalking
		// #crap
		
		var	rescueTimeout = setTimeout
		(
			function ()
			{
				console.log ("websocket rescue timeout fires, closing socket");
				
				rescueTimeout = null;
				
				try
				{
					webSocket.close ();
				}
				catch (inError)
				{
					console.error (inError.message);
				}
				
				// arse protect mode
				if (!walked)
				{
					walked = true;
					
					var	newContext = gApplication.makeContext (inContext);
					newContext.put ("error", "WebSocket connection failed (rescue callback fired)");
					self.walkChildren (inElement, newContext, inTreeWalker);
				}
			},
			5000
		);
		
		webSocket.onopen = function ()
		{
			if (rescueTimeout)
			{
				clearTimeout (rescueTimeout);
				rescueTimeout = null;
			}
			
			if (!walked)
			{
				walked = true;
				self.walkChildren (inElement, inContext, inTreeWalker);
			}
		}

		webSocket.onerror = function ()
		{
			console.error ("websocket onerror called (ignored)...");
		}
		
		webSocket.onclose = function ()
		{
			// console.error ("websocket onclose called...");
		}
	}
	catch (inError)
	{
		console.error ("error opening WebSocket...");
		console.error (inError);
		
		// if we catch here, we're sync
		sync = true;
		
		walked = true;
		
		var	newContext = gApplication.makeContext (inContext);
		newContext.put ("error", inError.message);
		this.walkChildren (inElement, newContext, inTreeWalker);
	}
	
	return sync;
};
/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.trigger.Trigger");

positron.trigger.Trigger = function ()
{
}

positron.trigger.Trigger.prototype.cancel = function ()
{
};

// override this to take control of trigger events (away from action)
positron.trigger.Trigger.prototype.firesAnalyticsEvents = function ()
{
	return false;
}

// this is for deferred triggers to get a look at context before it goes away
positron.trigger.Trigger.prototype.preRegister = function (inAction, inContext)
{
};

positron.trigger.Trigger.prototype.register = function (inAction, inContext)
{
	console.error ("Trigger.register() called (abstract)");
};

positron.trigger.Trigger.prototype.requiresCancel = function ()
{
	return false;
}

positron.provide ("positron.trigger.AnimationFrameTrigger");

positron.trigger.AnimationFrameTrigger = function ()
{
	positron.trigger.Trigger.call (this);
}

positron.inherits (positron.trigger.AnimationFrameTrigger, positron.trigger.Trigger);

positron.trigger.AnimationFrameTrigger.prototype.cancel = function (inAction)
{
	console.log ("AnimationFrameTrigger.cancel()");

	this.canContinue = false;
}

positron.trigger.AnimationFrameTrigger.prototype.register = function (inAction)
{
  console.log ("AnimationFrameTrigger.register()");
	
  this.time = positron.Util.parseTime (inAction.triggerArgs [0], 33);  
  
  if (this.time == 0)
  {
  	// this can happen if the HTML guy *quotes* zero in the markup
    console.log ("AnimationFrameTrigger defaulting frame rate to 30fps");
    this.time = 33;
  }

	this.action = inAction;
	this.canContinue = true;
	this.steps = 0;
	this.lastDrawTime = 0;

  var self = this;

  function animationStep (inTimestamp) 
  {
    var progress = inTimestamp - self.lastDrawTime;

    if (progress > self.time)
    {
      console.log ("AnimationFrameTrigger firing animation step " + self.steps);
			
			self.lastDrawTime = inTimestamp;
      self.action.params.step = self.steps;
      self.steps ++;
			
			self.action.fire ();
    }

    if (self.canContinue) 
    {      
      positron.DOM.requestAnimationFrame(animationStep);
    }
  }
    
  positron.DOM.requestAnimationFrame(animationStep);
};

positron.trigger.AnimationFrameTrigger.prototype.requiresCancel = function ()
{
	return true;
}
/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.trigger.CircleTrigger");

positron.trigger.CircleTrigger = function ()
{
	positron.trigger.Trigger.call (this);
}
positron.inherits (positron.trigger.CircleTrigger, positron.trigger.Trigger);

positron.trigger.CircleTrigger.prototype.cancel = function (inAction)
{
	console.log ("CircleTrigger.cancel()");

	if (this.interval)
	{
		clearInterval (this.interval);
		this.interval = null;
	}
}

positron.trigger.CircleTrigger.prototype.register = function (inAction)
{
	var	degreeBump = positron.Util.parseInt (inAction.triggerArgs [0], 5);
	var	interval = positron.Util.parseTime (inAction.triggerArgs [1], 100);

	console.log ("CircleTrigger: degree is " + degreeBump);
	console.log ("CircleTrigger: interval is " + interval);
	
	var	degree = 0;
	var	radian = Math.PI / 180;
	var	inCircle = false;
	
	this.interval = setInterval
	(
		function ()
		{
			// the radius is always 1
			var	x = Math.cos (degree * radian);
			var	y = Math.sin (degree * radian);

			inAction.params.degrees = degree;
			inAction.params.radians = degree * radian;
			inAction.params.x = x;
			inAction.params.y = y;
			
			inAction.fire ();
			
			degree += degreeBump;
			
			if (degree >= 360)
			{
				degree = 0;
			}
		},
		interval
	);
	
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.trigger.ClickTrigger");

positron.trigger.ClickTrigger = function ()
{
	positron.trigger.Trigger.call (this);
}
positron.inherits (positron.trigger.ClickTrigger, positron.trigger.Trigger);

positron.trigger.ClickTrigger.prototype.register = function (inAction)
{
	var	slop = 10;
	
	if (inAction.triggerArgs.length)
	{
		var	tempSlop = parseInt (inAction.triggerArgs [0]);
		
		if (! isNaN (tempSlop))
		{
			slop = tempSlop;
		}
	}
	
	var	downEventName = null;
	var	upEventName = null;
	var	moveEventName = null;
	var	cancelEventName = null;
	
	if (gApplication.browser.isMobile)
	{
		downEventName = "touchstart";
		upEventName = "touchend";
		moveEventName = "touchmove";
		cancelEventName = "touchcancel";
	}
	else
	{
		downEventName = "mousedown";
		upEventName = "mouseup";
		moveEventName = "mousemove";
		cancelEventName = null;
	}

	// should these really be instance variables, now taglets are no longer flyweights?
	var	timestamp = 0;
	var	x = 0;
	var	y = 0;
	var	active = false;
	
	inAction.element.addEventListener
	(
		downEventName,
		function (inEvent)
		{
			active = true;

			x = positron.Util.getEventX (inEvent);
			y = positron.Util.getEventY (inEvent);
		},
		false
	);

	inAction.element.addEventListener
	(
		upEventName,
		function (inEvent)
		{
			if (active)
			{
				var	eventX = positron.Util.getEventX (inEvent);
				var	eventY = positron.Util.getEventY (inEvent);

				var	distance = positron.Util.get2DDistance (eventX, eventY, x, y);
				
				if (distance <= slop)
				{
					// which event should we pass here?
					inAction.fire (inEvent);
				}
				else
				{
					console.log ("rejecting click due to slop of " + distance);
				}

				active = false;
			}
		},
		false
	);

	inAction.element.addEventListener
	(
		moveEventName,
		function (inEvent)
		{
			if (active)
			{
				var	eventX = positron.Util.getEventX (inEvent);
				var	eventY = positron.Util.getEventY (inEvent);

				var	distance = positron.Util.get2DDistance (eventX, eventY, x, y);
				
				if (distance > slop)
				{
					console.log ("rejecting click due to slop of " + distance);
					active = false;
				}
			}
		},
		false
	);

	if (gApplication.browser.isMobile)
	{
		inAction.element.addEventListener
		(
			"touchcancel",
			function (inEvent)
			{
				console.log ("cancel touch event, cancelling longtap");
				active = false;
			},
			false
		);
	}
	
};

/**
*
* @license
* Copyright © 2014 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.trigger.DeferTrigger");

positron.trigger.DeferTrigger = function ()
{
	positron.trigger.Trigger.call (this);
}
positron.inherits (positron.trigger.DeferTrigger, positron.trigger.Trigger);

positron.trigger.DeferTrigger.prototype.register = function (inAction, inContext)
{
	if (gApplication.isLogging (gApplication.kLogTrigger)) console.log ("DeferTrigger.register/fire(" + inAction.toString () + ")");
	
	return inAction.fire ();
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.trigger.DelayTrigger");

positron.trigger.DelayTrigger = function ()
{
	positron.trigger.Trigger.call (this);
}
positron.inherits (positron.trigger.DelayTrigger, positron.trigger.Trigger);

positron.trigger.DelayTrigger.prototype.cancel = function ()
{
	if (this.timeout)
	{
		clearTimeout (this.timeout);
		this.timeout = null;
	}
}

positron.trigger.DelayTrigger.prototype.register = function (inAction)
{
	console.log ("positron.trigger.DelayTrigger.register()");

	var	time = positron.Util.parseTime (inAction.triggerArgs [0], 1000);

	this.timeout = setTimeout
	(
		function ()
		{
			inAction.fire ();
		},
		time
	);
};

positron.trigger.DelayTrigger.prototype.requiresCancel = function ()
{
	return true;
}
/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.trigger.DoubleClickTrigger");

positron.trigger.DoubleClickTrigger = function ()
{
	positron.trigger.Trigger.call (this);
}
positron.inherits (positron.trigger.DoubleClickTrigger, positron.trigger.Trigger);

positron.trigger.DoubleClickTrigger.prototype.register = function (inAction)
{
	var	time = positron.Util.parseTime (inAction.triggerArgs [0], 500);
	var	slop = positron.Util.parseTime (inAction.triggerArgs [1], 10);
	
	var	downEventName = null;
	
	if (gApplication.browser.isMobile)
	{
		downEventName = "touchstart";
	}
	else
	{
		downEventName = "mousedown";
	}

	// should these really be instance variables, now taglets are no longer flyweights?
	var	timestamp = 0;
	var	x = 0;
	var	y = 0;
	var	active = false;

	inAction.element.addEventListener
	(
		downEventName,
		function (inEvent)
		{
			var	eventX = positron.Util.getEventX (inEvent);
			var	eventY = positron.Util.getEventY (inEvent);
			var	eventTimestamp = positron.Util.getEventTimestamp (inEvent);
			
			if (active)
			{
				// already had one down event
				var	delta = eventTimestamp - timestamp;

				if (delta < time)
				{
					var	distance = positron.Util.get2DDistance (eventX, eventY, x, y);
					
					if (distance <= slop)
					{
						inAction.fire (inEvent);
					}
					else
					{
						console.error ("rejecting double click due to slop");
					}
				}
				else
				{
					console.error ("rejecting double click due to timestamp");
				}
				
				active = false;
			}
			else
			{
				active = true;
				x = positron.Util.getEventX (inEvent);
				y = positron.Util.getEventY (inEvent);
				timestamp = positron.Util.getEventTimestamp (inEvent);
			}
		},
		false
	);
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.trigger.IntervalTrigger");

positron.trigger.IntervalTrigger = function ()
{
	positron.trigger.Trigger.call (this);
}
positron.inherits (positron.trigger.IntervalTrigger, positron.trigger.Trigger);

positron.trigger.IntervalTrigger.prototype.cancel = function (inAction)
{
	// console.log ("IntervalTrigger.cancel()");

	if (this.interval)
	{
		// console.log ("clearing interval " + this.interval);
		
		clearInterval (this.interval);
		this.interval = null;
	}
}

positron.trigger.IntervalTrigger.prototype.register = function (inAction)
{
	// console.log ("IntervalTrigger.register()");
	
	var	time = positron.Util.parseTime (inAction.triggerArgs [0], 1000);

	var	self = this;
	
	this.interval = setInterval
	(
		function ()
		{
			inAction.fire ();
		},
		time
	);
	
	// console.log ("registered interval " + this.interval);
};

positron.trigger.IntervalTrigger.prototype.requiresCancel = function ()
{
	return true;
}
/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.trigger.KeyDownTrigger");

positron.trigger.KeyDownTrigger = function ()
{
	positron.trigger.Trigger.call (this);
}
positron.inherits (positron.trigger.KeyDownTrigger, positron.trigger.Trigger);

positron.trigger.KeyDownTrigger.prototype.cancel = function ()
{
	window.removeEventListener ("keydown", this.onKeyDownBound);
}

positron.trigger.KeyDownTrigger.prototype.onKeyDown = function (inEvent)
{
	if (this.keyCode == 0 || this.keyCode == inEvent.keyCode || this.keyCode == inEvent.keyIdentifier.toLowerCase ())
	{
		this.action.fire (inEvent);
	}
}

positron.trigger.KeyDownTrigger.prototype.register = function (inAction)
{
	console.log ("KeyDownTrigger.register()");
	
	this.action = inAction;
	this.keyCode = 0;
	
	if (inAction.triggerArgs.length > 0)
	{
		var	keyName = inAction.triggerArgs [0];
		
		this.keyCode = parseInt (keyName);
		
		if (isNaN (keyCode))
		{
			// could be a key identifier
			this.keyCode = keyName;
		}
	}
	
	this.onKeyDownBound = this.onKeyDown.bind (this);
	
	window.addEventListener ("keydown", this.onKeyDownBound, false);
}

positron.trigger.KeyDownTrigger.prototype.requiresCancel = function ()
{
	return true;
}
/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.trigger.KeyPressTrigger");

positron.trigger.KeyPressTrigger = function ()
{
	positron.trigger.Trigger.call (this);
}
positron.inherits (positron.trigger.KeyPressTrigger, positron.trigger.Trigger);

positron.trigger.KeyPressTrigger.prototype.cancel = function ()
{
	window.removeEventListener ("keydown", this.onKeyPressBound);
}

positron.trigger.KeyPressTrigger.prototype.onKeyPress = function (inEvent)
{
	if (this.keyCode == 0 || this.keyCode == inEvent.keyCode || this.keyCode == inEvent.keyIdentifier.toLowerCase ())
	{
		this.action.fire (inEvent);
	}
}

positron.trigger.KeyPressTrigger.prototype.register = function (inAction)
{
	console.log ("KeyPressTrigger.register()");
	
	this.action = inAction;
	this.keyCode = 0;
	
	if (inAction.triggerArgs.length > 0)
	{
		var	keyName = inAction.triggerArgs [0];
		
		this.keyCode = parseInt (keyName);
		
		if (isNaN (keyCode))
		{
			// could be a key identifier
			this.keyCode = keyName;
		}
	}
	
	this.onKeyPressBound = this.onKeyPress.bind (this);
	
	window.addEventListener ("keypress", this.onKeyPressBound, false);
}

positron.trigger.KeyPressTrigger.prototype.requiresCancel = function ()
{
	return true;
}
/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.trigger.LocationTrigger");

positron.trigger.LocationTrigger = function ()
{
	positron.trigger.Trigger.call (this);
}
positron.inherits (positron.trigger.LocationTrigger, positron.trigger.Trigger);

positron.trigger.LocationTrigger.prototype.cancel = function ()
{
	if (this.watch)
	{
		clearWatch (this.watch);
		this.watch = null;
	}
}

positron.trigger.LocationTrigger.prototype.register = function (inAction)
{
	console.log ("LocationTrigger.register()");

	if (navigator.geolocation)
	{
		var	self = this;
		
		this.watch = navigator.geolocation.watchPosition
		(
			function (inPosition)
			{
				if (positron.DOM.isValidNode (inAction.element))
				{
					inAction.setParam ("position", inPosition);
					inAction.fire ();
				}
				else
				{
					if (self.watch)
					{
						clearWatch (self.watch);
						self.watch = null;
					}
				}
			},
			function (inError)
			{
				if (positron.DOM.isValidNode (inAction.element))
				{
					inAction.params.error = inError;
					inAction.fire ();
				}
				else
				{
					if (self.watch)
					{
						clearWatch (self.watch);
						self.watch = null;
					}
				}
			}
		);
	}
	else
	{
		console.error ("browser does not support geolocation API");
	}
};

positron.trigger.LocationTrigger.prototype.requiresCancel = function ()
{
	return true;
}

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.trigger.LongClickTrigger");

positron.trigger.LongClickTrigger = function ()
{
	positron.trigger.Trigger.call (this);
}
positron.inherits (positron.trigger.LongClickTrigger, positron.trigger.Trigger);

positron.trigger.LongClickTrigger.prototype.register = function (inAction)
{
	var	time = positron.Util.parseTime (inAction.triggerArgs [0], 2000);
	
	var	downEventName = null;
	var	upEventName = null;
	var	moveEventName = null;
	var	cancelEventName = null;
	
	if (gApplication.browser.isMobile)
	{
		downEventName = "touchstart";
		upEventName = "touchend";
		moveEventName = "touchmove";
		cancelEventName = "touchcancel";
	}
	else
	{
		downEventName = "mousedown";
		upEventName = "mouseup";
		moveEventName = "mousemove";
		cancelEventName = null;
	}

	// should these really be instance variables, now taglets are no longer flyweights?
	var	timestamp = 0;
	var	timeout = null;
	var	active = false;
	
	inAction.element.addEventListener
	(
		downEventName,
		function (inEvent)
		{
			active = true;
			timestamp = positron.Util.getEventTimestamp (inEvent);

			timeout = setTimeout
			(
				function ()
				{
					if (active)
					{
						inAction.fire (inEvent);
					}
				},
				time
			);
		},
		false
	);

	inAction.element.addEventListener
	(
		upEventName,
		function (inEvent)
		{
			if (active)
			{
				active = false;
				
				if (timeout)
				{
					clearTimeout (timeout);
				}
			}
		},
		false
	);

	inAction.element.addEventListener
	(
		moveEventName,
		function (inEvent)
		{
			if (active)
			{
				console.log ("move event, cancelling long click (needs tuning)");
				active = false;
	
				if (timeout)
				{
					clearTimeout (timeout);
				}
			}
		},
		false
	);

	if (gApplication.browser.isMobile)
	{
		inAction.element.addEventListener
		(
			"touchcancel",
			function (inEvent)
			{
				console.log ("cancel touch event, cancelling long tap");
				active = false;

				if (timeout)
				{
					clearTimeout (timeout);
				}
			},
			false
		);
	}
	
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.trigger.MouseDownTrigger");

positron.trigger.MouseDownTrigger = function ()
{
	positron.trigger.Trigger.call (this);
}
positron.inherits (positron.trigger.MouseDownTrigger, positron.trigger.Trigger);

positron.trigger.MouseDownTrigger.prototype.register = function (inAction)
{
	var	eventName = null;
	
	if (gApplication.browser.isMobile)
	{
		eventName = "touchstart";
	}
	else
	{
		eventName = "mousedown";
	}

	inAction.element.addEventListener
	(
		eventName,
		function (inEvent)
		{
			inAction.fire (inEvent);
		},
		false
	);

};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.trigger.MouseMoveTrigger");

positron.trigger.MouseMoveTrigger = function ()
{
	positron.trigger.Trigger.call (this);
}
positron.inherits (positron.trigger.MouseMoveTrigger, positron.trigger.Trigger);

positron.trigger.MouseMoveTrigger.prototype.register = function (inAction)
{
	var	eventName = null;
	
	if (gApplication.browser.isMobile)
	{
		eventName = "touchmove";
	}
	else
	{
		eventName = "mousemove";
	}

	inAction.element.addEventListener
	(
		eventName,
		function (inEvent)
		{
			inAction.fire (inEvent);
		},
		false
	);

};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.trigger.MouseUpTrigger");

positron.trigger.MouseUpTrigger = function ()
{
	positron.trigger.Trigger.call (this);
}
positron.inherits (positron.trigger.MouseUpTrigger, positron.trigger.Trigger);

positron.trigger.MouseUpTrigger.prototype.register = function (inAction)
{
	var	eventName = null;
	
	if (gApplication.browser.isMobile)
	{
		eventName = "touchend";
	}
	else
	{
		eventName = "mouseup";
	}

	inAction.element.addEventListener
	(
		eventName,
		function (inEvent)
		{
			inAction.fire (inEvent);
		},
		false
	);

};

/**
*
* @license
* Copyright © 2014 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.trigger.NowTrigger");

positron.trigger.NowTrigger = function ()
{
	positron.trigger.Trigger.call (this);
}
positron.inherits (positron.trigger.NowTrigger, positron.trigger.Trigger);

positron.trigger.NowTrigger.prototype.register = function (inAction, inContext)
{
	if (gApplication.isLogging (gApplication.kLogTrigger)) console.log ("NowTrigger.register/fire(" + inAction.toString () + ")");
	
	return inAction.fire (null, inContext);
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.trigger.PrefixedEventTrigger");

positron.trigger.PrefixedEventTrigger = function ()
{
	positron.trigger.Trigger.call (this);
}
positron.inherits (positron.trigger.PrefixedEventTrigger, positron.trigger.Trigger);

positron.trigger.PrefixedEventTrigger.prototype.register = function (inAction)
{
	console.log ("PrefixedEventTrigger.register()");
	
	if (inAction.triggerArgs.length)
	{
		var	neutralEventName = inAction.triggerArgs [0];
		var	prefixedEventName = positron.CSS.getPrefixedEvent (neutralEventName);
		
		if (!prefixedEventName)
		{
			console.error ("no event mapping for " + neutralEventName + ", using default");
			
			prefixedEventName = neutralEventName;
		}

		inAction.element.addEventListener
		(
			prefixedEventName,
			function (inEvent)
			{
				inAction.fire (inEvent);
			},
			false
		);
	}
	else
	{
		console.error ("PrefixedEventTrigger: no event argument supplied");
	}
};

/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.trigger.RefreshViewTrigger");

positron.trigger.RefreshViewTrigger = function ()
{
	positron.trigger.Trigger.call (this);
}
positron.inherits (positron.trigger.RefreshViewTrigger, positron.trigger.Trigger);

positron.trigger.RefreshViewTrigger.prototype.cancel = function ()
{
	window.removeEventListener (gApplication.getEventPrefix () + "refreshview", this.onRefreshViewBound);
}

positron.trigger.RefreshViewTrigger.prototype.onRefreshView = function (inEvent)
{
	if (inEvent.detail && (inEvent.detail.viewKey == this.viewKey))
	{
		this.action.fire (inEvent);
	}
}

positron.trigger.RefreshViewTrigger.prototype.register = function (inAction)
{
	// console.log ("RefreshViewTrigger.register()");
	
	if (inAction.triggerArgs.length > 0 && inAction.triggerArgs [0].length > 0)
	{
		this.action = inAction;
		this.viewKey = inAction.triggerArgs [0];
		
		this.onRefreshViewBound = this.onRefreshView.bind (this);

		window.addEventListener (gApplication.getEventPrefix () + "refreshview", this.onRefreshViewBound, false);
	}
	else
	{
		console.error ("RefreshViewTrigger with no view key");
	}
	
}

positron.trigger.RefreshViewTrigger.prototype.requiresCancel = function ()
{
	return this.action != null;
}
/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.trigger.ShowViewTrigger");

positron.trigger.ShowViewTrigger = function ()
{
	positron.trigger.Trigger.call (this);
}
positron.inherits (positron.trigger.ShowViewTrigger, positron.trigger.Trigger);

positron.trigger.ShowViewTrigger.prototype.cancel = function ()
{
	window.removeEventListener (gApplication.getEventPrefix () + "showview", this.onShowViewBound);
}

positron.trigger.ShowViewTrigger.prototype.onShowView = function (inEvent)
{
	if (inEvent.detail && (inEvent.detail.viewKey == this.viewKey))
	{
		this.action.fire (inEvent);
	}
}

positron.trigger.ShowViewTrigger.prototype.register = function (inAction)
{
	// console.log ("ShowViewTrigger.register()");
	
	if (inAction.triggerArgs.length > 0 && inAction.triggerArgs [0].length > 0)
	{
		this.action = inAction;
		this.viewKey = inAction.triggerArgs [0];
		
		this.onShowViewBound = this.onShowView.bind (this);

		window.addEventListener (gApplication.getEventPrefix () + "showview", this.onShowViewBound, false);
	}
	else
	{
		console.error ("ShowViewTrigger with no view key");
	}
	
}

positron.trigger.ShowViewTrigger.prototype.requiresCancel = function ()
{
	return this.action != null;
}
/**
*
* @license
* Copyright © 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.trigger.WebSocketMessageTrigger");

positron.trigger.WebSocketMessageTrigger = function ()
{
	positron.trigger.Trigger.call (this);
}
positron.inherits (positron.trigger.WebSocketMessageTrigger, positron.trigger.Trigger);

positron.trigger.WebSocketMessageTrigger.prototype.cancel = function ()
{
	if (this.webSocket)
	{
		this.webSocket.onmessage = null;
		this.webSocket = null;
	}
}

positron.trigger.WebSocketMessageTrigger.prototype.register = function (inAction, inContext)
{
	// console.log ("positron.trigger.WebSocketMessageTrigger.register()");

	if (inAction.triggerArgs.length > 0 && inAction.triggerArgs [0].length > 0)
	{
		var	webSocketName = inAction.triggerArgs [0];
		this.webSocket = gApplication.getWebSocket (webSocketName);
		
		if (this.webSocket)
		{
			this.webSocket.onmessage = function (inMessage)
			{
				if (gApplication.isLogging (gApplication.kLogTrigger))
				{
					console.log ("received message on websocket: " + webSocketName);
					console.log (inMessage.data);
				}
				
				var	data = inMessage.data;
				
				// wanted to use instanceof here for more resolution
				// but strings are not guaranteed to be strings, seems like
				// #fail
				if (typeof (data) == "string")
				{
					try
					{
						inAction.params.message = JSON.parse (inMessage.data);
						
						// JSON parsing worked
						inAction.params.type = "json";
					}
					catch (inError)
					{
						inAction.params.message = inMessage.data;
						inAction.params.type = "string";
					}
				}
				else
				{
					inAction.params.message = inMessage.data;
					inAction.params.type = "arraybuffer";
				}
				
				inAction.fire ();
			}
		}
		else
		{
			console.error ("WebSocketMessageTrigger can't find websocket with name: " + webSocketName);
		}
	}
	else
	{
		console.error ("WebSocketMessageTrigger with no socket name argument");
	}
}


positron.trigger.WebSocketMessageTrigger.prototype.requiresCancel = function ()
{
	return true;
}

positron.provide ("positron.view.MediaClientView");

positron.view.MediaClientView = function ()
{
	positron.View.call (this);
};
positron.inherits (positron.view.MediaClientView, positron.View);

// VIEW OVERRIDES

// EVENT HANDLERS

positron.view.MediaClientView.prototype.onMouseDown = function (inEvent)
{
	this.mouseDown = true;

	var	width = parseInt (window.getComputedStyle (this.element).width);
	
	if (inEvent.changedTouches)
	{
		this.setPositionFromFraction ((inEvent.changedTouches [0].pageX - inEvent.target.offsetLeft) / width);
	}
	else
	{
		this.setPositionFromFraction (inEvent.offsetX / width);
	}
}

positron.view.MediaClientView.prototype.onMouseMove = function (inEvent)
{
	if (this.mouseDown)
	{
		var	width = parseInt (window.getComputedStyle (this.element).width);
	
		if (inEvent.changedTouches)
		{
			this.setPositionFromFraction ((inEvent.changedTouches [0].pageX - inEvent.target.offsetLeft) / width);
		}
		else
		{
			this.setPositionFromFraction (inEvent.offsetX / width);
		}
	}
}

positron.view.MediaClientView.prototype.onMouseUp = function (inEvent)
{
	this.mouseDown = false;
}

// API

positron.view.MediaClientView.prototype.play = function ()
{
	// console.log ("positron.view.MediaClientView.play()");

	var	mediaView = gApplication.getView (positron.DOM.getPrefixedAttribute (this.element, "media-view"));
	
	if (mediaView)
	{
		mediaView.play ();
	}
	else
	{
		console.error ("play() called with no media server view");
	}
}

positron.view.MediaClientView.prototype.pause = function ()
{
	// console.log ("positron.view.MediaClientView.pause()");

	var	mediaView = gApplication.getView (positron.DOM.getPrefixedAttribute (this.element, "media-view"));
	
	if (mediaView)
	{
		mediaView.pause ();
	}
	else
	{
		console.error ("pause() called with no media server view");
	}
}

// fraction runs 0..1
positron.view.MediaClientView.prototype.setPositionFromFraction = function (inFraction)
{
	// console.log ("positron.view.MediaClientView.setPositionFromFraction() " + inFraction);

	var	mediaView = gApplication.getView (positron.DOM.getPrefixedAttribute (this.element, "media-view"));
	
	if (mediaView)
	{
		mediaView.setPositionFromFraction (inFraction);
	}
	else
	{
		console.error ("positron.view.MediaClientView.setPositionFromFraction() called with no media server view");
	}
}

// percent runs 0..100
positron.view.MediaClientView.prototype.setPositionFromPercent = function (inPercent)
{
	// console.log ("positron.view.MediaClientView.setPositionFromPercent() " + inPercent);

	var	mediaView = gApplication.getView (positron.DOM.getPrefixedAttribute (this.element, "media-view"));
	
	if (mediaView)
	{
		mediaView.setPositionFromPercent (inPercent);
	}
	else
	{
		console.error ("positron.view.MediaClientView.setPositionFromPercent() called with no media server view");
	}
}


positron.provide ("positron.view.MediaServerView");

positron.view.MediaServerView = function ()
{
	positron.View.call (this);
	
	this.events = 
	[
		"canplay",
		"canplaythrough",
		"ended",
		"loadedmetadata",
		"pause",
		"play",
		"progress",
		"timeupdate"
	];
	
};

positron.inherits (positron.view.MediaServerView, positron.View);

// VIEW OVERRIDES

positron.view.MediaServerView.prototype.onDOMReady = function ()
{
	positron.View.prototype.onDOMReady.call (this);
	
	this.mediaElement = this.element.querySelector ("video,audio");
	
	if (this.mediaElement)
	{
		// can't cleanly decide whether to add autoplay attribute in markup, so...
		if (this.params.autoplay && (this.params.autoplay == "true"))
		{
			this.mediaElement.setAttribute ("autoplay", "true");
		}
		
		var	self = this;
		
		// we COULD do this in markup, but since there are 7 of them...
		for (var i = 0; i < this.events.length; i++)
		{
			this.mediaElement.addEventListener
			(
				this.events [i],
				function (inEvent)
				{
					self.onMediaEvent (inEvent);
				},
				false
			);
		}
	}
	
	// first init, or new source, results in reset status
	this.mediaState = new Object ();
	this.mediaState.loadedmetadata = false;
	this.mediaState.playing = false;
	this.mediaState.ended = false;
	this.mediaState.canplay = false;
	this.mediaState.canplaythrough = false;
	
	this.mediaState.progress = new Object ();
	this.mediaState.progress.percent = 0;
	this.mediaState.progress.ratio = 0;
	this.mediaState.progress.hours = 0;
	this.mediaState.progress.minutes = 0;
	this.mediaState.progress.seconds = 0;
	this.mediaState.progress.milliseconds = 0;

	this.mediaState.play = new Object ();
	this.mediaState.play.percent = 0;
	this.mediaState.play.ratio = 0;
	this.mediaState.play.hours = 0;
	this.mediaState.play.minutes = 0;
	this.mediaState.play.seconds = 0;
	this.mediaState.play.milliseconds = 0;

	this.mediaState.remaining = new Object ();
	this.mediaState.remaining.hours = 0;
	this.mediaState.remaining.minutes = 0;
	this.mediaState.remaining.seconds = 0;
	this.mediaState.remaining.milliseconds = 0;

	this.mediaState.duration = new Object ();
	this.mediaState.duration.hours = 0;
	this.mediaState.duration.minutes = 0;
	this.mediaState.duration.seconds = 0;
	this.mediaState.duration.milliseconds = 0;

}

// API

positron.view.MediaServerView.prototype.play = function ()
{
	if (this.mediaElement)
	{
		if (! this.mediaState.playing)
		{
			this.mediaElement.play ();
		}
	}
	else
	{
		console.error ("media element is not present");
	}
}

positron.view.MediaServerView.prototype.pause = function ()
{
	if (this.mediaElement)
	{
		this.mediaElement.pause ();
	}
	else
	{
		console.error ("media element is not present");
	}
}

// fraction runs 0..1
positron.view.MediaServerView.prototype.setPositionFromFraction = function (inFraction)
{
	if (this.mediaElement)
	{
		if (typeof (this.mediaElement.duration) == "number")
		{
			if (inFraction >= 0 && inFraction <= 1)
			{
				this.mediaElement.currentTime = inFraction * this.mediaElement.duration;
			}
			else
			{
				console.error ("setPositionFromFraction() called with bad fraction: " + inFraction);
			}
		}
		else
		{
			console.error ("setPositionFromFraction() called before duration known");
		}
	}
	else
	{
		console.error ("setPositionFromFraction() called with no media element");
	}
}

// percent runs 0..100
positron.view.MediaServerView.prototype.setPositionFromPercent = function (inPercent)
{
	if (this.mediaElement)
	{
		if (typeof (this.mediaElement.duration) == "number")
		{
			if (inPercent >= 0 && inPercent <= 100)
			{
				var	fraction = inPercent / 100;
				
				this.mediaElement.currentTime = fraction * this.mediaElement.duration;
			}
			else
			{
				console.error ("setPositionFromPercent() called with bad percent: " + inPercent);
			}
		}
		else
		{
			console.error ("setPositionFromPercent() called before duration known");
		}
	}
	else
	{
		console.error ("setPositionFromPercent() called with no media element");
	}
}

// CALLBACKS

positron.view.MediaServerView.prototype.onMediaEvent = function (inEvent)
{
	// console.log ("positron.view.MediaServerView.onMediaEvent() with type " + inEvent.type);
	// console.log (inEvent);
	
	// we keep our own status around to account for browser irregularities, etc
	// and so clients always have the current state available
	this.updateState (inEvent);
	
	// find the media clients with this view as their server
	// TODO may want to cache this list during playback?
	var	clients = document.querySelectorAll
		("[" + gApplication.getCSSClassPrefix () + "media-view=" + this.key + "]");
	
	for (var i = 0; i < clients.length; i++)
	{
		var	sendEvent = true;
		
		var	listenerEvents = positron.DOM.getPrefixedAttribute (clients [i], "media-events");
		
		if (listenerEvents && listenerEvents.length)
		{
			sendEvent = false;
			
			var	listenerEventElements = listenerEvents.split (',');
			
			for (var j = 0; j < listenerEventElements.length; j++)
			{
				if (inEvent.type == positron.Util.stripSpaces (listenerEventElements [j]))
				{
					sendEvent = true;
					break;
				}
			}
		}
		else
		{
			// the default is "receive all events"
		}
		
		if (sendEvent)
		{
			var	clientView = positron.DOM.getData (clients [i], "view");

			if (clientView)
			{
				// get rid of onMediaEvent()
				// because we're just doing regular Positron mechanics here
				clientView.setParam ("event", inEvent);
				clientView.setParam ("mediastate", this.mediaState);
				clientView.refresh ();
			}
		}
	}
}

// PRIVATE METHODS

positron.view.MediaServerView.prototype.convertTime = function (inTime, outConverted)
{
	var	fullSeconds = Math.floor (inTime);
	
	outConverted.milliseconds = Math.floor ((inTime - fullSeconds) * 1000);
	outConverted.seconds = fullSeconds % 60;
	outConverted.minutes = Math.floor ((fullSeconds / 60) % 60);
	outConverted.hours = Math.floor (fullSeconds / 3600);
}

positron.view.MediaServerView.prototype.updateState = function (inEvent)
{
	if (inEvent.type == "loadedmetadata")
	{
		this.mediaState.loadedmetadata = true;
		
		this.mediaState.duration.value = this.mediaElement.duration;
		this.convertTime (this.mediaElement.duration, this.mediaState.duration);
	}
	else
	if (inEvent.type == "canplay")
	{
		this.mediaState.canplay = true;
	}
	else
	if (inEvent.type == "canplaythrough")
	{
		this.mediaState.canplaythrough = true;
	}
	else
	if (inEvent.type == "progress")
	{
		// careful, some browsers give us progress without duration, sigh
		if (typeof (this.mediaElement.duration) == "number" && !isNaN (this.mediaElement.duration))
		{
			this.mediaState.progress.value = this.mediaElement.currentTime;

			var	bufferedEnd = 0;
			
			// careful again, can get issues with end(0) here :-\
			try
			{
				bufferedEnd = this.mediaElement.buffered.end (0);
			}
			catch (inError)
			{
				this.mediaState.progress.percent = 0;
			}

			// percent is 0..100
			this.mediaState.progress.percent = bufferedEnd / this.mediaElement.duration;
			this.mediaState.progress.percent = Math.round (this.mediaState.progress.percent * 100);
			
			// ratio is 0..1 in 100ths
			this.mediaState.progress.ratio = this.mediaState.progress.percent / 100;
			
			// calculate real time
			this.convertTime (bufferedEnd, this.mediaState.progress);
		}
	}
	else
	if (inEvent.type == "play")
	{
		this.mediaState.playing = true;
		this.mediaState.paused = false;
		this.mediaState.ended = false;
	}
	else
	if (inEvent.type == "pause")
	{
		this.mediaState.playing = false;
		this.mediaState.paused = true;
	}
	else
	if (inEvent.type == "ended")
	{
		this.mediaState.playing = false;
		this.mediaState.ended = true;
		
		if (! this.mediaState.paused)
		{
			// ok so we didn't get a pause event prior to the ended event
			// which means that the next time we call play() we won't get a play event
			// known Safari problem
			// solution is to call pause() ourselves
			this.mediaElement.pause ();
		}
	}
	else
	if (inEvent.type == "timeupdate")
	{
		// careful, some browsers give us progress without duration, sigh
		if (typeof (this.mediaElement.duration) == "number" && !isNaN (this.mediaElement.duration))
		{
			this.mediaState.play.value = this.mediaElement.currentTime;

			// percent is 0..100
			this.mediaState.play.percent = this.mediaElement.currentTime / this.mediaElement.duration;
			this.mediaState.play.percent = Math.round (this.mediaState.play.percent * 100);

			// ratio is 0..1 in 100ths
			this.mediaState.play.ratio = this.mediaState.play.percent / 100;
			
			// calculate real time
			this.convertTime (this.mediaElement.currentTime, this.mediaState.play);
			
			this.mediaState.remaining.value = this.mediaElement.duration - this.mediaElement.currentTime;

			// percent is 0..100
			this.mediaState.remaining.percent = this.mediaState.remaining.value / this.mediaElement.duration;
			this.mediaState.remaining.percent = Math.round (this.mediaState.remaining.percent * 100);
			
			// ratio is 0..1 in 100ths
			this.mediaState.remaining.ratio = this.mediaState.remaining.percent / 100;

			// calculate real time
			this.convertTime (this.mediaState.remaining.value, this.mediaState.remaining);
		}
	}
}

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.TreeWalker");

/**
 * @constructor
 */
positron.TreeWalker = function ()
{
};

// INTERFACE

positron.TreeWalker.prototype.onElement = function (inElement)
{
	console.error ("TreeWalker.onElement() (abstract) called");
};

positron.TreeWalker.prototype.onTextNode = function (inTextNode)
{
	// don't squawk here, some walkers don't care about text
	// console.error ("TreeWalker.onTextNode() (abstract) called");
};

// PUBLIC METHODS

positron.TreeWalker.prototype.startWalk = function (inNode, inContext)
{
	this.mInStart = true;
	this.walk (inNode);
	this.mInStart = false;
};

positron.TreeWalker.prototype.startWalkChildren = function (inNode, inContext)
{
	this.mInStart = true;
	this.walkChildren (inNode, inContext);
	this.mInStart = false;
};

// PRIVATE METHODS

// overrideable for walkers that want to go in no-go zones...
positron.TreeWalker.prototype.canWalk = function (inElement)
{
	var	walk = true;
	
	if (positron.DOM.hasPrefixedClass (inElement, "page-container"))
	{
		walk = false;
	}
	
	return walk;
}

positron.TreeWalker.prototype.walk = function (inNode, inContext)
{
	if (gApplication.isLogging (gApplication.kLogTreeWalker))
	{
		if (inNode.nodeType == inNode.ELEMENT_NODE)
		{
			var	className = inNode.getAttribute ("class");
			console.log ("TreeWalker.walk(" + inNode.nodeName.toLowerCase () + (className ? " " + className : "") + ")");
		}
	}
	
	var	walkChildren = true;

	if (inNode.nodeType == inNode.ELEMENT_NODE) // ELEMENT_NODE
	{
		if (this.canWalk (inNode))
		{
			var	result = this.onElement (inNode, inContext);
			
			if (typeof (result) == "boolean")
			{
				walkChildren = result;
			}
		}
		else
		{
			// sacred area, invisible to walkers
			walkChildren = false;
		}
	}
	else
	if (inNode.nodeType == inNode.TEXT_NODE)
	{
		this.onTextNode (inNode, inContext);
	}
	
	if (walkChildren)
	{
		this.walkChildren (inNode, inContext);
	}
};

positron.TreeWalker.prototype.walkChildren = function (inNode, inContext)
{
	if (inNode.hasChildNodes ())
	{
		var child = null;
		var nextChild = inNode.firstChild;
		
		// walk this way because children can disappear in walk()
		do
		{
			child = nextChild;
			nextChild = null;
			
			if (child)
			{
				nextChild = child.nextSibling;
		
				this.walk (child, inContext);
			}
		}
		while (nextChild);
	}
};
/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.RefreshTreeWalker");

// this should really inherit from an async tree walker class

// CONSTRUCTOR

// HACK before visible means "act like a refreshing before visible tree walker"
// as the OBV walker is now sync and non-refreshing
positron.RefreshTreeWalker =
function positron_RefreshTreeWalker (inListener, inBeforeVisible)
{
	this.listener = inListener;
	this.beforeVisible = inBeforeVisible;
	
	this.cancelled = false;
}

positron.RefreshTreeWalker.prototype.cancel =
function RefreshTreeWalker_cancel ()
{
	// console.log ("RefreshTreeWalker.cancel()");
	
	this.cancelled = true;
	
	if (this.subTreeWalker)
	{
		this.subTreeWalker.cancel ();
	}
}

positron.RefreshTreeWalker.prototype.isCancelled =
function RefreshTreeWalker_isCancelled ()
{
	return this.cancelled;
}

positron.RefreshTreeWalker.prototype.startWalk =
function RefreshTreeWalker_startWalk (inNode, inContext)
{
	this.context = inContext;
	this.rootNode = inNode;
	
	this.findNextNode (inNode);
	return this.onWalkComplete ();
}

positron.RefreshTreeWalker.prototype.startWalkChildren =
function RefreshTreeWalker_startWalkChildren (inNode, inContext)
{
	if (gApplication.isLogging (gApplication.kLogTreeWalker)) console.log ("positron.RefreshTreeWalker.startWalkChildren()");
	if (gApplication.isLogging (gApplication.kLogTreeWalker)) console.log (inNode);
	
	var	done = true;

	if (inNode)
	{
		this.context = inContext;
		this.rootNode = inNode;
		
		if (this.rootNode.hasChildNodes ())
		{
			this.nextNode = this.rootNode.firstChild;
			
			done = this.onWalkComplete (null);
		}
		else
		{
			// console.log ("walk complete, calling listener");
			this.listener.onWalkComplete (this);
		}
	}
	else
	{
		console.error ("RefreshTreeWalker.startWalkChildren() with null parent node");
		var	error = new Error ("RefreshTreeWalker.startWalkChildren() with null parent node");
		console.error (error.stack);
	}
	
	return done;
}

positron.RefreshTreeWalker.prototype.walk =
function RefreshTreeWalker_walk (inNode)
{
	if (gApplication.isLogging (gApplication.kLogTreeWalker)) console.log ("positron.RefreshTreeWalker.walk()");
	if (gApplication.isLogging (gApplication.kLogTreeWalker)) console.log (inNode);
	
	var	done = true;
	
	if (inNode.nodeType == inNode.ELEMENT_NODE)
	{
		done = this.onElement (inNode, this.context);
	}
	else
	if (inNode.nodeType == inNode.TEXT_NODE)
	{
		done = this.onTextNode (inNode, this.context);
	}
	
	return done;
}

positron.RefreshTreeWalker.prototype.findNextNode =
function RefreshTreeWalker_findNextNode (inNode)
{
	this.nextNode = null;
	
	if (inNode.nodeType == inNode.ELEMENT_NODE)
	{
		var	taglet = gApplication.getTaglet (inNode.nodeName.toLowerCase ());
		
		if (taglet)
		{
			// taglets are responsible for walking their subtrees
		}
		else
		if (positron.DOM.getPrefixedAttribute (inNode, "view"))
		{
			// views are responsible for walking their subtrees
		}
		else
		if (positron.DOM.getPrefixedAttribute (inNode, "localise"))
		{
			// localisation is responsible for walking its subtree
		}
		else
		if (inNode.hasChildNodes ())
		{
			this.nextNode = inNode.firstChild;
		}
	}

	if (! this.nextNode)
	{
		if (inNode != this.rootNode)
		{
			this.nextNode = inNode.nextSibling;
			var	parent = inNode;
			
			while (this.nextNode == null)
			{
				parent = parent.parentNode;
				this.nextNode = parent;

				if (this.nextNode == this.rootNode)
				{
					this.nextNode = null;
					break;
				}
				
				this.nextNode = this.nextNode.nextSibling;
			}
		}
	}

}

// this is the arse-protect done pre running attributelets
// as an attributelet might delete the element under consideration
// so find a next node which is *not* inside the provided element
positron.RefreshTreeWalker.prototype.findNextNodeOutside =
function RefreshTreeWalker_findNextNodeOutside (inElement)
{
	var nextNode = null;

	nextNode = inElement.nextSibling;
	
	if (! nextNode)
	{
		nextNode = inElement.parentNode;
		
		if (nextNode == this.rootNode)
		{
			nextNode = null;
		}
		else
		{
			nextNode = nextNode.nextSibling;
		}
	}
	return nextNode;
}

// we virtualise this so that refreshers make more refreshers
// and OBVs make more OBVs, etc
positron.RefreshTreeWalker.prototype.makeSubTreeWalker =
function RefreshTreeWalker_makeSubTreeWalker (inListener)
{
	this.subTreeWalker = new positron.RefreshTreeWalker (inListener, this.beforeVisible);
	this.subTreeWalker.superTreeWalker = this;
	
	return this.subTreeWalker;
}

positron.RefreshTreeWalker.prototype.onWalkComplete =
function RefreshTreeWalker_onWalkComplete (inTreeWalker)
{
	// console.log ("positron.RefreshTreeWalker.onWalkComplete()");
	// console.log (inTreeWalker.rootNode);

	this.subTreeWalker = null;
	
	// this guards against a tag not checking its treewalker has been cancelled
	// prior to calling its completor
	if (this.cancelled)
	{
		return;
	}
	
	if (inTreeWalker)
	{
		var	node = inTreeWalker.rootNode;
		
		if (node && (node.nodeType == node.ELEMENT_NODE))
		{
			// console.log (node);
			
			var	view = positron.DOM.getData (node, "view");
			
			if (view)
			{
				// give the browser a chance to react to DOM changes
				// as onDOMReady() may ask for size, etc
				setTimeout
				(
					function ()
					{
						view.onDOMReady ();
					},
					1
				);
			}
		}
	}
	
	// ok, walk as far as we can, sync
	// if we hit async, wait for completion
	
	var	done = true;
	var	node = null;
	
	if (this.nextNode)
	{
		do
		{
			node = this.nextNode;
			
			if (node)
			{
				this.findNextNode (node);
				done = this.walk (node);
			}
		}
		while (node && done);
	}
	
	if (node)
	{
		// implying that we stopped due to a subwalk
		// wait for onWalkComplete()
	}
	else
	{
		// implying that we stopped due to running out of nodes
		if (this.listener)
		{
			this.listener.onWalkComplete (this);
		}
		else
		{
			console.error ("walk complete with no listener...");
			console.error (this.rootNode);
		}
	}
	
	return done;
}

// TREEWALKER IMPLEMENTATION

// REMEMBER here that findNextNode() special-cases some kinds of element
// that need to do their own subwalk
// SO this.nextNode may be inside the element (normal situation)
// OR this element's sibling, etc (if something on this element does its own subwalk)
// so don't read this thinking that the next node is always one of this element's children
positron.RefreshTreeWalker.prototype.onElement =
function RefreshTreeWalker_onElement (inElement, inContext)
{
	// console.log ("RefreshTreeWalker.onElement(" + inElement.nodeName.toLowerCase () + ")");

	var done = true;
	
	// expand dynamics references in attribute values
	this.walkAttributes (inElement, inContext);
	
	// ok, in case an attributelet deletes the element
	// we have to go off and find the next element to process
	// as the current "next node" may be *inside* the element that got deleted
	var	tempNextNode = this.findNextNodeOutside (inElement);
	
	// run any attributelets associated with attribute names
	var	context = this.runAttributelets (inElement, inContext);
	
	if (inElement.parentNode)
	{
		if (!context)
		{
			context = inContext;
		}
		
		var	tagName = inElement.tagName.toLowerCase ();
		var	taglet = gApplication.getTaglet (tagName);
		
		// post-prefix change, squawk if a tag with a prefix doesn't have a taglet
		if (!taglet && (tagName.indexOf ('-') > 0))
		{
			console.error ("tag with prefix <" + tagName + "> does not have associated taglet");
		}
		
		if (taglet)
		{
			if (taglet.checkRequiredAttributes (inElement))
			{
				try
				{
					// note that the taglet is expected to finalise its subtree
					taglet.process (inElement, context, this);
					
					// the taglet's treewalker will call us back when done
					done = false;
				}
				catch (inError)
				{
					console.error ("error while running tag <" + tagName + ">");
					console.error (inError.message);
					console.error (inElement);
					
					// leave "done" as true here
				}
			}
		}
		else
		if (positron.DOM.getPrefixedAttribute (inElement, "view"))
		{
			var	view = positron.DOM.getData (inElement, "view");
			
			if (view)
			{
				if (view.isVisible ())
				{
					// give the subclasses a chance
					this.onView (view);
					
					var	newContext = gApplication.makeContext (context);
		
					// add the view's initial params to the subwalk context
					for (var key in view.params)
					{
						newContext.put ("params." + key, view.params [key]);
					}
					
					this.subTreeWalker = this.makeSubTreeWalker (this);
					this.subTreeWalker.startWalkChildren (inElement, newContext);
					
					// the subtreewalker will call us back when done
					done = false;
				}
			}
			else
			{
				console.error ("yikes! view parameter with no view instance!");
			}
		}
		else
		if (positron.DOM.getPrefixedAttribute (inElement, "localise"))
		{
			// do nothing here, as the localiser replaced the element's innerHTML
			done = true;
		}
		else
		{
			if (context != inContext)
			{
				// the subtreewalker will call us back when done
				done = false;

				// if an attribute changed context, then we need to run a subwalk
				this.subTreeWalker = this.makeSubTreeWalker (this);
				this.subTreeWalker.startWalkChildren (inElement, context);
			}
		}
	}
	else
	{
		// the element got deleted by an attribute
		
		// use our stashed "outside this element" next-node...
		this.nextNode = tempNextNode;
	}

	return done;
}

positron.RefreshTreeWalker.prototype.onTextNode =
function RefreshTreeWalker_onTextNode (inNode, inContext)
{
	// console.log ("RefreshTreeWalker.onTextNode(" + positron.Util.stripSpaces (inNode.nodeValue) + ")");
	
	var	done = true;
	
	var	expandedText = null;
	
	try
	{
		expandedText = gApplication.expandText (inNode.nodeValue, inContext, false);
	}
	catch (inError)
	{
		console.error ("error expanding text (" + inNode.nodeValue + ")");
		console.error (inError);
		
		// leave the text alone so the dev can see the problem
		expandedText = inNode.nodeValue;
	}
	
	if (expandedText != inNode.nodeValue)
	{
		/*
		console.log ("caution: subwalk of text nodes removed");

		inNode.nodeValue = expandedText;
		*/

		var	span = document.createElement ("span");
		span.innerHTML = expandedText;

		inNode.parentNode.replaceChild (span, inNode);
		
		this.subTreeWalker = this.makeSubTreeWalker (this);
		this.subTreeWalker.startWalkChildren (span, inContext);

		// the subtreewalker will call us back when done
		done = false;
	}
	
	return done;
}

positron.RefreshTreeWalker.prototype.onView =
function RefreshTreeWalker_onView (inView)
{
	if (this.beforeVisible)
	{
		inView.onBeforeVisible ();
	}
}

// PRIVATE

positron.RefreshTreeWalker.prototype.runAttributelets =
function RefreshTreeWalker_runAttributelets (inElement, inContext)
{
	var	context = inContext;
	
	// console.log ("RefreshTreeWalker.runAttributelets()");
	
	if (inElement.attributes && inElement.attributes.length)
	{
		// honour any required order
		// as some have dependencies on others
		var	attributesToCheck = new Array ();
		
		var	configAttributes = gApplication.getConfigEntry ("attributeOrder");
		
		if (Array.isArray (configAttributes))
		{
			for (var i = 0; i < configAttributes.length; i++)
			{
				attributesToCheck.push (configAttributes [i]);
			}
		}

		for (var i = 0; i < inElement.attributes.length; i++)
		{
			var attribute = inElement.attributes.item (i);
			var	attributeName = attribute.name.toLowerCase ();
			
			// leave out ones we already have
			if (configAttributes.indexOf (attributeName) == -1)
			{
				attributesToCheck.push (attributeName);
			}
		}
		
		for (var i = 0; i < attributesToCheck.length; i++)
		{
			var	attributeName = attributesToCheck [i];
			
			if (inElement.getAttribute (attributeName))
			{
				var	attributeSpec = positron.Util.getAttributeSpec (attributeName);
				var	attributelet = gApplication.getAttributelet (attributeSpec.name);
				
				if (attributelet)
				{
					try
					{
						// each successive attribute can add to context
						var	tempContext = attributelet.process
							(inElement, context, attributeSpec.name, attributeSpec.number);
						
						if (tempContext != null)
						{
							context = tempContext;
						}
						
						// if the attribute removed the element from the DOM, stop now
						if (inElement.parentNode == null)
						{
							break;
						}
					}
					catch (inError)
					{
						console.error ("error while running attribute (" + attributeName + ")");
						console.error (inError.message);
					}
				}
			}
		}
	}
	
	return context;
}

positron.RefreshTreeWalker.prototype.walkAttributes =
function RefreshTreeWalker_walkAttributes (inElement, inContext)
{
  if (inElement.attributes && inElement.attributes.length)
  {
    for (var i = 0; i < inElement.attributes.length; i++)
    {
      var attribute = inElement.attributes.item (i);
      
      var expandedValue = gApplication.expandText (attribute.value, inContext, true);
      
      if (expandedValue != attribute.value)
      {
        attribute.value = expandedValue;
      }
    }
  }
};

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.BeforeVisibleTreeWalker");

/**
 * @constructor
 */
positron.BeforeVisibleTreeWalker = function ()
{
	positron.TreeWalker.call (this);
};
positron.inherits (positron.BeforeVisibleTreeWalker, positron.TreeWalker);

// TREEWALKER OVERRIDES

positron.BeforeVisibleTreeWalker.prototype.onElement = function (inElement)
{
	var	walkChildren = true;
	
	var	view = positron.DOM.getData (inElement, "view");
	
	if (view)
	{
		// don't pass visibility events to invisible or transitioning views
		// and don't walk into them
		if (view.isVisible () && !view.isTransitioning ())
		{
			view.onBeforeVisible ();
		}
		else
		{
			walkChildren = false;
		}
	}
	
	return walkChildren;
}

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.BeforeInvisibleTreeWalker");

/**
 * @constructor
 */
positron.BeforeInvisibleTreeWalker = function ()
{
	positron.TreeWalker.call (this);
};
positron.inherits (positron.BeforeInvisibleTreeWalker, positron.TreeWalker);

// TREEWALKER OVERRIDES

positron.BeforeInvisibleTreeWalker.prototype.onElement = function (inElement)
{
	var	walkChildren = true;
	
	var	view = positron.DOM.getData (inElement, "view");
	
	if (view)
	{
		// don't pass visibility events to invisible or transitioning views
		// and don't walk into them
		if (view.isVisible () && !view.isTransitioning ())
		{
			view.onBeforeInvisible ();
		}
		else
		{
			walkChildren = false;
		}
	}
	
	return walkChildren;
}

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.InvisibleTreeWalker");

/**
 * @constructor
 */
positron.InvisibleTreeWalker = function ()
{
	positron.TreeWalker.call (this);
};
positron.inherits (positron.InvisibleTreeWalker, positron.TreeWalker);

// TREEWALKER OVERRIDES

positron.InvisibleTreeWalker.prototype.onElement = function (inElement)
{
	var	walkChildren = true;
	
	var	view = positron.DOM.getData (inElement, "view");
	
	if (view)
	{
		// don't pass visibility events to invisible or transitioning views
		// and don't walk into them
		if (view.isVisible () && !view.isTransitioning ())
		{
			view.onInvisible ();
		}
		else
		{
			walkChildren = false;
		}
	}
	
	return walkChildren;
}

/**
*
* @license
* Copyright � 2013 Jason Proctor.  All rights reserved.
*
**/

positron.provide ("positron.VisibleTreeWalker");

/**
 * @constructor
 */
positron.VisibleTreeWalker = function ()
{
	positron.TreeWalker.call (this);
};
positron.inherits (positron.VisibleTreeWalker, positron.TreeWalker);

// TREEWALKER OVERRIDES

positron.VisibleTreeWalker.prototype.onElement = function (inElement)
{
	var	walkChildren = true;
	
	var	view = positron.DOM.getData (inElement, "view");
	
	if (view)
	{
		// don't pass visibility events to invisible or transitioning views
		// and don't walk into them
		if (view.isVisible () && !view.isTransitioning ())
		{
			view.onVisible ();
		}
		else
		{
			walkChildren = false;
		}
	}
	
	return walkChildren;
}

/**
*
* @license
* Copyright © 2013 Jason Proctor.	 All rights reserved.
*
**/

positron.provide ("positron.Application");

// MAINLINE

var	gApplication = null;
var	gApplicationPlugins = new Array ();

document.addEventListener
(
	"DOMContentLoaded",
	function ()
	{
		gApplication = positron.CreateApplication ();
		gApplication.start ();
	},
	false
);

// STATIC METHODS

positron.CreateApplication = 
function positron_CreateApplication ()
{
	// see if application.js was loaded via a script tag
	if (typeof (Application) == "function")
	{
		try
		{
			gApplication = new Application ();
		}
		catch (inError)
		{
			error = inError;
			gApplication = null;
		}
	}
	else
	{
		// see if there is an application.js waiting for us
		// use getURLContents() as it can be used static
		var	applicationCode = positron.Util.getURLContents ("application.js", null, "GET", "text", false);
		
		if (applicationCode && applicationCode.length)
		{
			try
			{
				positron.Util.globalEval (applicationCode);
			}
			catch (inError)
			{
				console.error ("cannot eval() application.js, please include as script tag?");
			}
		}
		
		// did we load the override application class ok?
		if (typeof (Application) == "function")
		{
			var	error = null;
			
			try
			{
				gApplication = new Application ();
				
				// ensure we have the correct type
				if (typeof (gApplication.start) != "function")
				{
					gApplication = null;
				}
			}
			catch (inError)
			{
				error = inError;
				gApplication = null;
			}
		
			// only moan if we found an Application class
			// that wasn't suitable
			if (!gApplication)
			{
				console.error ("unable to instantiate Application class");
				
				if (error)
				{
					console.error (error.message);
				}
				
				console.error ("please ensure that Application inherits from positron.Application");
				console.error ("and that Application() calls positron.Application.call(this)");
			}
		}
	}

	if (!gApplication)
	{
		gApplication = new positron.Application ();
	}

	return gApplication;
}

// CONSTRUCTOR

positron.Application = 
function positron_Application ()
{
	// so that code inside the constructor can reference the global
	gApplication = this;

	// immediately make body invisible
	var	body = document.querySelector ("body");
	body.style.display = "none";
	
	// load base config
	this.loadConfig ("positron/positron.json");

	// load app overrides
	this.loadConfig ("application.json");
	
	// now we have config, make body invisible the proper way
	// this ensures that showWindow() can use the regular view.show()
	body.style.display = "";
	positron.DOM.addPrefixedClass (body, "invisible");

	this.pages = new Object ();
	this.cache = new positron.Cache ();
	
	this.params = new Object ();

	this.context = gApplication.makeContext ();
	this.context.put ("config", this.config);
	
	this.webSockets = new Object ();
	
	this.setupRequest ();
	this.setupLogging ();
	this.setupBrowserFlags ();
	this.setupDisplayClass ();
	this.setupAnalytics ();
	this.setupWindow ();
	
	if (this.config.localisation.enabled)
	{
if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("localisation enabled");

		this.loadLocalisationStrings ();
	}
	else
	{
if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("localisation disabled");
	}
	
	// plugins may also merge config into this.config
	this.installPlugins ();

  var self = this;
  
  window.addEventListener
  (
    "hashchange",
		function (inEvent)
    {
if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("hashchange event fires!");
if (gApplication.isLogging (gApplication.kLogApplication)) console.log (document.location.hash);
      
      self.setPageFromHash ();
			
			inEvent.preventDefault ();
			inEvent.stopPropagation ();
    },
    false
  );
}

// CONFIG ACCESSORS

positron.Application.prototype.getAttributePrefix = 
function Application_getAttributePrefix ()
{
	return this.config.attributePrefix;
}

positron.Application.prototype.getCSSClassPrefix = 
function Application_getCSSClassPrefix ()
{
	return this.config.cssClassPrefix;
}

positron.Application.prototype.getEventPrefix = 
function Application_getEventPrefix ()
{
	return this.config.eventPrefix;
}

positron.Application.prototype.getTagPrefix = 
function Application_getTagPrefix ()
{
	return this.config.tagPrefix;
}

positron.Application.prototype.getURLParameterPrefix = 
function Application_getURLParameterPrefix ()
{
	return this.config.urlParameterPrefix;
}

positron.Application.prototype.getPageCSSPath = 
function Application_getPageCSSPath (inPageKey)
{
	return this.config.pageCSSPath.split ("$page;").join (inPageKey);
}

positron.Application.prototype.getPageHTMLPath = 
function Application_getPageHTMLPath (inPageKey)
{
	return this.config.pageHTMLPath.split ("$page;").join (inPageKey);
}

positron.Application.prototype.getPageJSPath = 
function Application_getPageJSPath (inPageKey)
{
	return this.config.pageJSPath.split ("$page;").join (inPageKey);
}

positron.Application.prototype.getViewCSSPath = 
function Application_getViewCSSPath (inViewKey)
{
	return this.config.viewCSSPath.split ("$view;").join (inViewKey);
}

positron.Application.prototype.getViewHTMLPath = 
function Application_getViewHTMLPath (inViewKey)
{
	return this.config.viewHTMLPath.split ("$view;").join (inViewKey);
}

positron.Application.prototype.getViewJSPath = 
function Application_getViewJSPath (inViewKey)
{
	return this.config.viewJSPath.split ("$view;").join (inViewKey);
}

positron.Application.prototype.getCodelet = 
function Application_getCodelet (inActionName, inConfigDomain, inDirectoryName)
{
	var	codelet = null;
	var	error = null;
	
	var	codeletClass = inConfigDomain [inActionName];
	
	if (codeletClass && codeletClass.length)
	{
		try
		{
			codelet = positron.Util.instantiate (codeletClass);
		}
		catch (inError)
		{
			error = inError;
			
			if (positron.Util.loadCodelet (codeletClass, inDirectoryName))
			{
				try
				{
					codelet = positron.Util.instantiate (codeletClass);
				}
				catch (inError)
				{
					error = inError;
				}
			}
		}

		if (!codelet)
		{
			console.error ("cannot instantiate codelet (" + codeletClass + ") from " + inDirectoryName);
			console.error (error);
		}
	}
	
	return codelet;
}

positron.Application.prototype.getActionlet = 
function Application_getActionlet (inActionName)
{
	return this.getCodelet (inActionName, this.config.actions, "actions");
}

positron.Application.prototype.getAttributelet = 
function Application_getAttributelet (inAttributeName)
{
	return this.getCodelet (inAttributeName, this.config.attributes, "attributes");
}

positron.Application.prototype.getEventlet = 
function Application_getEventlet (inEventName)
{
	return this.getCodelet (inEventName, this.config.events, "events");
}

positron.Application.prototype.getTaglet = 
function Application_getTaglet (inTagName)
{
	var	taglet = this.getCodelet (inTagName, this.config.tags, "tags");
	
	// a little squawk if we can't find a taglet for a prefixed tag name
	if (gApplication.isLogging (gApplication.kLogApplication))
	{
		if (taglet == null && inTagName.indexOf ("-") > 0)
		{
			console.error ("Application.getTaglet() can't find taglet for tag (" + inTagName + ")");
		}
	}
	
	return taglet;
}

positron.Application.prototype.getTriggerlet = 
function (inTriggerName)
{
	return this.getCodelet (inTriggerName, this.config.triggers, "triggers");
}

positron.Application.prototype.getViewlet = 
function Application_getViewlet (inViewName, inLoadFlags)
{
	var	view = null;
	var	error = null;
	
	// try the view name mapping first
	var	viewClass = this.config.views [inViewName];
	
	if (viewClass && viewClass.length)
	{
		// if there is a view class name mapping, it must be the name of an immediately accessible class
		try
		{
			view = positron.Util.instantiate (viewClass);
		}
		catch (inError)
		{
			error = inError;
		}
	}
	else
	{
		// try the raw value from the attribute first
		// so we can support com.company.ComponentName
		// but ideally you'd map those in the config
		try
		{
			view = positron.Util.instantiate (inViewName);
		}
		catch (inError)
		{
			error = inError;
			
			try
			{
				view = positron.Util.instantiate (positron.Util.capitalise (inViewName) + "View");
			}
			catch (inError)
			{
				var jsPath = gApplication.getViewJSPath (inViewName);
				var	js = positron.Util.getTextSync (jsPath);
				
				if (js)
				{
					try
					{
						positron.Util.globalEval (js);
					}
					catch (inError)
					{
						error = inError;
					}
					
					try
					{
						view = positron.Util.instantiate (positron.Util.capitalise (inViewName) + "View");
					}
					catch (inError)
					{
						error = inError;
					}
				}
			}
		}
	}
	
	if (view == null && error != null)
	{
		console.error ("cannot instantiate view (" + inViewName + ")");
		console.error (error);
	}
	
	return view;
}

// PUBLIC API

positron.Application.prototype.addWebSocket = 
function Application_addWebSocket (inName, inWebSocket)
{
	// console.log ("adding web socket: " + inName);
	
	this.removeWebSocket (inName);
	this.webSockets [inName] = inWebSocket;
}

positron.Application.prototype.getWebSocket = 
function Application_getWebSocket (inName)
{
	return this.webSockets [inName];
}

positron.Application.prototype.readWebSocket = 
function Application_readWebSocket (inName, inCallback)
{
}

positron.Application.prototype.removeWebSocket = 
function Application_removeWebSocket (inName)
{
	var	webSocket = this.webSockets [inName];
	
	if (webSocket)
	{
		// console.log ("removing web socket: " + inName);
	
		// if it's connecting or open, close it
		if (webSocket.readyState == 0 || webSocket.readyState == 1)
		{
			try
			{
				// console.log ("closing web socket: " + inName);
				webSocket.close ();
			}
			catch (inError)
			{
			}
		}
		
		delete this.webSockets [inName];
	}
	else
	{
		// this will happen all the time
		// as a result of the call from add() above
		// so don't log this
	}
}

positron.Application.prototype.fireAction = 
function Application_fireAction (inActionString, inActionParams)
{
	return positron.ActionFactory.fireAction (inActionString, inActionParams);
}

positron.Application.prototype.fireAnalyticsEvent = 
function Application_fireAnalyticsEvent (inEvent)
{
	if (this.analytics)
	{
		this.analytics.fire (inEvent);
	}
}

// SHOULD this walk domains?
positron.Application.prototype.getConfigEntry = 
function Application_getConfigEntry (inConfigKey, inComplain)
{
	var	value = null;
	var	config = this.config;
	
	if (inConfigKey.indexOf ('.') > 0)
	{
		var	keyElements = inConfigKey.split ('.');

		for (var i = 0; i < keyElements.length && config != null; i++)
		{
			var	domain = keyElements [i];
			
			config = config [domain];
		}
		
		value = config;
	}
	else
	{
		value = config [inConfigKey];
	}
	
	// can't test if (value) here, as a zero length string evaluates as false (facepalm)
	if (value == null)
	{
		if (typeof (inComplain) == "undefined" || inComplain)
		{
			console.error ("cannot find config item (" + inConfigKey + ")");
		}
	}
	
	return value;
}

positron.Application.prototype.getConfigEntryWithDefault = 
function Application_getConfigEntryWithDefault (inConfigKey, inDefaultValue)
{
	var	value = this.getConfigEntry (inConfigKey, false);
	
	if (typeof (value) == "undefined")
	{
		value = inDefaultValue;
	}
	
	return value;
}

// escape just quotes
positron.Application.prototype.escapeText = 
function Application_escapeText (inText)
{
	return positron.Util.replaceAll (inText, "'", "&#39;");
}		

// this one does way too much and messes up URLs in params etc
positron.Application.prototype.escapeTextOld = 
function Application_escapeTextOld (inText)
{
	var	escapedText = "";
	var	entity = null;
	var	numericEntity = false;
	
	for (var i = 0; i < inText.length; i++)
	{
		var	ch = inText.charAt (i);
		
		if (entity && entity.length)
		{
			if (ch == "&")
			{
				escapedText += entity;
				entity = "&";
				numericEntity = false;
			}
			else
			if (ch == "#")
			{
				if (entity.length == 1)
				{
					numericEntity = true;
					entity += ch;
				}
				else
				{
					escapedText += entity;
					escapedText += ch;
					
					entity = null;
				}
			}
			else
			if (ch == ';')
			{
				escapedText += entity;
				escapedText += ch;
				entity = null;
				numericEntity = false;
			}
			else
			if (ch >= "0" && ch <= "9")
			{
				if (numericEntity)
				{
					entity += ch;
				}
				else
				{
					if (entity)
					{
						escapedText += entity;
						entity = null;
					}
					
					escapedText += ch;
				}
			}
			else
			if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z"))
			{
				entity += ch;
			}
			else
			{
				escapedText += entity;
				entity = null;
				numericEntity = false;
			}
		}
		else
		{
			if (ch == "&")
			{
				entity = ch;
			}
			else
			if (ch == "'")
			{
				escapedText += "&#39;";
			}
			else
			if (ch == "\"")
			{
				escapedText += "&quot;";
			}
			else
			if (ch == ":")
			{
				escapedText += "&#58;";
			}
			else
			if (ch == ";")
			{
				escapedText += "&#59;";
			}
			else
			{
				escapedText += ch;
			}
		}
	}
	
	return escapedText;
}

// expand context references in text
// Positron syntax is $something.or.other;
// optionally escaping it (for the purposes of parameters in attributes, etc)
positron.Application.prototype.expandText = 
function Application_expandText (inText, inContext, inEscapeText)
{
	var	inEntity = false;
	var	result = "";
	var	textBuffer = "";

	for (var i = 0; i < inText.length; i++)
	{
		var	ch = inText.charAt (i);

		if (ch == '$')
		{
			if (inEntity)
			{
				textBuffer = '$' + textBuffer;
			}
			else
			{
				inEntity = true;
			}
			
			result += textBuffer;
			textBuffer = "";
		}
		else
		if (ch == ';')
		{
			if (inEntity)
			{
				if (textBuffer.length > 0)
				{
					var	value = this.getContextReference (textBuffer, inContext);

					if (typeof (value) == "undefined" || value == null)
					{
						// add nothing to the buffer
						// note here that typeof (null) == "object"
						// therefore this check has to be here
					}
					else
					{
						if (typeof (value) == "string")
						{
							if (inEscapeText)
							{
								result += this.escapeText (value);
							}
							else
							{
								result += value;
							}
						}
						else
						if (typeof (value) == "number")
						{
							result += "" + value;
						}
						else
						if (typeof (value) == "boolean")
						{
							result += value;
						}
						else
						if (typeof (value) == "object")
						{
							// anything but ""
							// as the existence needs to fail against "" in <ifnot>
							result += "OBJECT";
						}
					}
					
					textBuffer = "";
				}
				
				inEntity = false;
			}
			else
			{
				textBuffer += ch;
			}
		}
		else
		if (ch >= 'A' && ch <= 'Z')
		{
			textBuffer += ch;
		}
		else
		if (ch >= 'a' && ch <= 'z')
		{
			textBuffer += ch;
		}
		else
		if (ch >= '0' && ch <= '9')
		{
			textBuffer += ch;
		}
		else
		if (ch == '_' || ch == '.' || ch == ':' || ch == '-' || ch == '#')
		{
			textBuffer += ch;
		}
		else
		{
			textBuffer += ch;
			
			// illegal character for variable reference
			if (inEntity)
			{
				textBuffer = '$' + textBuffer;
				
				inEntity = false;
			}
		}
	}
	
	if (textBuffer.length > 0)
	{
		if (inEntity)
		{
			result += '$';
		}
		
		result += textBuffer;
	}

	return result;
}

// inContextKey: complex key, eg this.that.the.other
// inContext: current context
// return: resolved value, or null
positron.Application.prototype.getContextReference = 
function Application_getContextReference (inContextKey, inContext)
{
// console.log ("TreeWalker.getContextReference() on " + inContextKey);
	
	var	value = null;

	var	validContextIndex = 0;
	var	validContextKey = null;
	var	validContextObject = null;
	
	var	expressionElements = inContextKey.split ('.');

	var	contextKey = "";
	
	for (var i = 0; i < expressionElements.length; i++)
	{
		if (contextKey.length > 0)
		{
			contextKey += '.';
		}
		
		contextKey += expressionElements [i];

		var	contextObject = inContext.get (contextKey);

		// do NOT use if (contextObject) here
		// as it will fail if it's the number zero!
		if (typeof (contextObject) != "undefined")
		{
			validContextObject = contextObject;
			validContextKey = contextKey;
			validContextIndex = i;
		}
	}

	if (validContextKey)
	{
		value = validContextObject;
		
		// remember to update validContextObject
		// so we have the correct object off which to call any functions found
		for (var i = validContextIndex + 1;
			i < expressionElements.length;
			i++, validContextObject = value)
		{
			// careful here, we could be walking a wrapped native object
			// that doesn't like requests for unknown properties
			try
			{
				value = value [expressionElements [i]];
			}
			catch (inError)
			{
				console.error ("error fetching expression element " + expressionElements [i]);
				console.error ("context key is " + inContextKey);
				
				value = null;
				break;
			}
			
			if (typeof (value) == "undefined" || value == null)
			{
				// bzzzt
				break;
			}

			if (typeof (value) == "function")
			{
				value = value.call (validContextObject);
			}
			else
			if (typeof (value) == "object")
			{
				// keep going
			}
			else
			{
				// do nothing, wait till next indirect
				break;
			}
		}
	}
	
	return value;
};

positron.Application.prototype.makeContext = 
function Application_makeContext (inParentContext)
{
	return new positron.DelegateHashMap (inParentContext);
}

// PUBLIC METHODS

positron.Application.prototype.isLogging = 
function Application_isLogging (inMask)
{
	return (this.logMask & inMask) ? true : false;
};

positron.Application.prototype.start = 
function Application_start ()
{
	if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("Application.start()");
	
	this.showWindow ();
}

// PAGE API

positron.Application.prototype.getPage = 
function Application_getPage (inPageKey)
{
	var	page = this.page;
	
	if (inPageKey)
	{
		page = this.pages [inPageKey];
	}
	
	return page;
}

positron.Application.prototype.setPage = 
function Application_setPage (inPageKey, inParams, inTransitionInClass, inTransitionOutClass)
{
	if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("Application.setPage(" + inPageKey + ")");

  var setHash = true;
	var	newHash = null;
	
	if (this.page)
	{
		// ok, so if we set the hash to the same as it was before, we won't get a hashchange event
		// so see whether the hash is the same...
		var	currentHash = this.page.key + "," + positron.Util.unparseParams (this.page.params);
		newHash = inPageKey + "," + positron.Util.unparseParams (inParams);
		
		// HACK is the decasing necessary?
		// not sure whether the browser will do a case insensitive compare for hashchange firing purposes
		if (currentHash.toLowerCase () == newHash.toLowerCase ())
		{
			setHash = false;
		}
	}
	
  if (setHash)
	{
		this.pageTransitionInClass = inTransitionInClass;
		this.pageTransitionOutClass = inTransitionOutClass;
		
		// causes hashchange event to fire and setPageInternal() to be called
		document.location.hash = newHash;
	}
	else
  {
  	// refresh on the current page
  	// the hash won't change, so we won't get the event
  	// so bypass the hashchange mechanism
  	this.setPageInternal (inPageKey, inParams, inTransitionInClass, inTransitionOutClass);
  }
	
  return true;
}

// VIEW API

positron.Application.prototype.getView = 
function Application_getView (inViewKey)
{
	var	view = this.page.getView (inViewKey);
	
	if (!view && (this.page != this.window))
	{
		view = this.window.getView (inViewKey);
	}
	
	return view;
}

positron.Application.prototype.hideView = 
function Application_hideView (inViewKey, inTransitionOutClass)
{
	// console.log ("Application.hideView(" + inViewKey + ")");

	var	view = this.getView (inViewKey);
	
	if (view)
	{
		view.hide (inTransitionOutClass);
	}
	else
	{
		console.error ("view (" + inViewKey + ") not found");
	}
}

positron.Application.prototype.refreshView = 
function Application_refreshView (inViewKey, inParams, inTransitionInClass)
{
	// console.log ("Application.refreshView(" + inViewKey + ")");

	var	view = this.getView (inViewKey);
	
	if (view)
	{
		view.setParams (inParams);
		view.refresh (inTransitionInClass);
	}
	else
	{
		console.error ("view (" + inViewKey + ") not found");
	}
}

positron.Application.prototype.runView = 
function Application_runView (inViewKey, inParams)
{
	// console.log ("Application.runView(" + inViewKey + ")");

	var	view = this.getView (inViewKey);
	
	if (view)
	{
		view.setParams (inParams);
		view.run ();
	}
	else
	{
		console.error ("view (" + inViewKey + ") not found");
	}
}

positron.Application.prototype.showView = 
function Application_showView (inViewKey, inParams, inTransitionInClass)
{
	// console.log ("Application.showView(" + inViewKey + ")");

	var	view = this.getView (inViewKey);
	
	if (view)
	{
		view.setParams (inParams);
		view.show (inTransitionInClass);
	}
	else
	{
		console.error ("view (" + inViewKey + ") not found");
	}
}

positron.Application.prototype.toggleView =
function Application_toggleView (inViewKey, inParams, inTransitionInClass, inTransitionOutClass)
{
	// console.log ("Application.toggleView(" + inViewKey + ")");

	var	view = this.getView (inViewKey);
	
	if (view)
	{
		if (view.isVisible ())
		{
			view.hide (inTransitionOutClass);
		}
		else
		{
			view.setParams (inParams);
			view.show (inTransitionInClass);
		}
	}
	else
	{
		console.error ("view (" + inViewKey + ") not found");
	}
}

// CALLBACKS

positron.Application.prototype.onApplicationStartupComplete = 
function Application_onApplicationStartupComplete (inLoader)
{
if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("Application.onApplicationStartupComplete()");
}

positron.Application.prototype.onLoadStart = 
function Application_onLoadStart (inLoader)
{
if (gApplication.isLogging (gApplication.kLogLoader)) console.log ("Application.onLoadStart()");
}

positron.Application.prototype.onLoadFinish = 
function Application_onLoadFinish (inLoader)
{
if (gApplication.isLogging (gApplication.kLogLoader)) console.log ("Application.onLoadFinish()");
}

positron.Application.prototype.onLoadProgress = 
function Application_onLoadProgress (inLoader)
{
if (gApplication.isLogging (gApplication.kLogLoader)) console.log ("Application.onLoadProgress()");
}

positron.Application.prototype.onPageVisible = 
function Application_onPageVisible (inPageKey)
{
if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("Application.onPageVisible(" + inPageKey + ")");
	
	if (this.loadingInitialPage)
	{
		this.loadingInitialPage = false;
		this.onApplicationStartupComplete ();
	}
	else
	if (inPageKey == "window")
	{
		this.onWindowVisible ();
	}
}

// the walk of the root page completes here
// ASSUME we only walk the root page once
positron.Application.prototype.onWalkComplete = 
function Application_onWalkComplete (inTreeWalker)
{
	// console.log ("Application.onWalkComplete()");

	positron.DOM.removePrefixedClass (this.window.element, "invisible");
	
	var	self = this;
	
	setTimeout
	(
		function ()
		{
			// console.log ("Application.onWalkComplete() calling window.onDOMReady()");
			
			self.window.onDOMReady ();
		},
		1
	);
}

positron.Application.prototype.onBeforeInitialPageVisible = 
function Application_onBeforeInitialPageVisible ()
{
if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("Application.onBeforeInitialPageVisible()");
}

positron.Application.prototype.onInitialPageVisible = 
function Application_onInitialPageVisible ()
{
if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("Application.onInitialPageVisible()");
}

positron.Application.prototype.onBeforeWindowVisible = 
function Application_onBeforeWindowVisible ()
{
if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("Application.onBeforeWindowVisible()");
}

// caution MUST call superclass from overrides
positron.Application.prototype.onWindowVisible = 
function Application_onWindowVisible ()
{
if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("Application.onWindowVisible()");

	this.preloadAssets ();
	this.setInitialPage ();
}

// PRIVATE METHODS

positron.Application.prototype.getPageSpecFromHash = 
function Application_getPageSpecFromHash ()
{
	var	pageSpec = new Object ();
	
  if (document.location.hash && document.location.hash.length)
  {
    var hash = document.location.hash;
    
    // seems like "hash" comes complete with a... hash, sigh
    if (hash.charAt (0) == '#')
    {
      hash = hash.substring (1);
    }
    
    var hashElements = hash.split (",");

    if (hashElements.length > 0 && hashElements [0].length > 0)
    {
      pageSpec.key = hashElements [0];
      
      if (hashElements.length > 1)
      {
        pageSpec.params = positron.Util.parseParams (unescape (hashElements [1]));
      }
    }
  }
  
  return pageSpec;
}

// called from the hashchange event handler
positron.Application.prototype.setInitialPage = 
function Application_setInitialPage ()
{
	// console.log ("Application.setInitialPage()");
	
  var pageSpec = this.getPageSpecFromHash ();
  
  var body = document.querySelector ("body");
  
  if (!pageSpec.key || !pageSpec.key.length)
  {
   	pageSpec.key = positron.DOM.getPrefixedAttribute (body, "start-page");
    
    if (pageSpec.key && pageSpec.key.length)
    {
      if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("found start page of " + pageSpec.key);
    }
  }

  var setPageDelay = positron.DOM.getPrefixedAttribute (body, "start-page-delay");
  
  if (setPageDelay && setPageDelay.length)
  {
    if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("found start page delay of " + setPageDelay);

    setPageDelay = parseInt (setPageDelay);
    
    if (setPageDelay <= 0 || isNaN (setPageDelay))
    {
      setPageDelay = 1;
    }
  }
  else
  {
    setPageDelay = 1;
  }
  
  // if there's still no page key, don't set a page
  if (pageSpec.key && pageSpec.key.length)
  {
    // for callbacks
    var self = this;
    
    setTimeout
    (
			function ()
      {
      	self.loadingInitialPage = true;
      	
        self.setPageInternal (pageSpec.key, 
          self.pageTransitionOutClass, self.pageTransitionInClass, pageSpec.params);

        self.pageTransitionOutClass = undefined;
        self.pageTransitionInClass = undefined;
      },
      setPageDelay
    );
  }
  else
  {
  	this.onApplicationStartupComplete ();
  }
}

positron.Application.prototype.setPageFromHash = 
function Application_setPageFromHash ()
{
  var pageSpec = this.getPageSpecFromHash ();

  if (pageSpec.key && pageSpec.key.length)
  {
		this.setPageInternal (pageSpec.key, pageSpec.params,
			this.pageTransitionInClass, this.pageTransitionOutClass);

		this.pageTransitionOutClass = undefined;
		this.pageTransitionInClass = undefined;
	}
	else
	{
		console.error ("Application.setPageFromHash(): no page key found");
	}
}

positron.Application.prototype.setPageInternal =
function Application_setPageInternal (inPageKey, inParams, inTransitionInClass, inTransitionOutClass)
{
if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("Application.setPageInternal(" + inPageKey + ")");

	var newPage = this.pages [inPageKey];
	
	if (!newPage)
	{
		newPage = this.loadPage (inPageKey);
		
		if (newPage)
		{
			this.pages [inPageKey] = newPage;
		}
	}
	
	if (newPage)
	{
		if (newPage.key == this.page.key)
		{
			if (this.page != this.window)
			{
				this.page.setParams (inParams);
				this.page.show ();
			}
		}
		else
		{
			if (this.page != this.window)
			{
				this.page.hide (inTransitionOutClass);
			}
			
			if (this.loadingInitialPage)
			{
				this.onBeforeInitialPageVisible ();
			}
			
			this.page = newPage;
			this.page.setParams (inParams);
			this.page.refresh (inTransitionInClass);
		}
	}
	else
	{
		console.error ("could not load page (" + inPageKey + ")");

		if (this.loadingInitialPage)
		{
			this.loadingInitialPage = false;
			this.onApplicationStartupComplete ();
		}
	}
}

// ALWAYS go through here to set params
// as it updates context, too
positron.Application.prototype.setParams =  
function Application_setParams (inParams)
{
	for (var key in inParams)
	{
		this.setParam (key, inParams [key]);
	}
}

// ALWAYS go through here to set individual params
// as it updates context, too
positron.Application.prototype.setParam = 
function Application_setParam (inKey, inValue)
{
	this.params [inKey] = inValue;
	this.context.put ("params." + inKey, inValue);
}

// showing the root page is different
// as obviously we can't hide the template markup in the same way...
// and arguably this should only be done once
positron.Application.prototype.showWindow = 
function Application_showWindow ()
{
	this.onBeforeWindowVisible ();
	this.window.show ();
}

positron.Application.prototype.installPlugins = 
function Application_installPlugins ()
{
	if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("Application.installPlugins() has " + gApplicationPlugins.length + " plugins to run");
	
	for (var i = 0; i < gApplicationPlugins.length; i++)
	{
		try
		{
			gApplicationPlugins [i].install ();
		}
		catch (inError)
		{
			console.error (inError);
		}
	}
}

positron.Application.prototype.loadConfig = 
function Application_loadConfig (inPath)
{
	if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("Application.loadConfig(" + inPath + ")");

	if (!this.config)
	{
		this.config = new Object ();
	
		// ensure we have a few basics
	
		this.config.actions = new Object ();
		this.config.attributes = new Object ();
		this.config.events = new Object ();
		this.config.tags = new Object ();
		this.config.triggers = new Object ();
		this.config.views = new Object ();
	}
	
	var	config = positron.Util.getJSON (inPath);
	
	if (config)
	{
		positron.Util.merge (config, this.config);
	}
}

positron.Application.prototype.loadLocalisationStrings = 
function Application_loadLocalisationStrings ()
{
	if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("Application.loadLocalisationStrings()");

	var	strings = null;
	var	language = this.browser.language;
	
	if (language && language.length)
	{
		var	path = "localisation/strings-" + language + ".json";
		strings = positron.Util.getJSON (path);
	}
	
	if (!strings)
	{
		var	path = "localisation/strings.json";
		strings = positron.Util.getJSON (path);
	}

	if (strings)
	{
		gApplication.context.put ("strings", strings);
	}
}

// returns page object
positron.Application.prototype.loadPage = 
function Application_loadPage (inPageKey)
{
	if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("Application.loadPage(" + inPageKey + ")");
	
	// ensure we have a page container
	var pageContainerID = gApplication.getCSSClassPrefix () + "page-container";
	var pageContainer = document.querySelector ("#" + pageContainerID);
	
	if (!pageContainer)
	{
		pageContainer = document.createElement ("div");
		pageContainer.setAttribute ("id", pageContainerID);
		document.querySelector ("body").appendChild (pageContainer);
	}
	
	var tempElement = document.createElement ("div");
	
	var htmlPath = gApplication.getPageHTMLPath (inPageKey);
	var	html = positron.Util.getTextSync (htmlPath);
	
	if (html)
	{
		tempElement.innerHTML = html;
	}
	
	// do we already have this style?
	var pageCSSAttribute = gApplication.getAttributePrefix () + "page";
	
	var	pageCSSInclude = document.querySelector ("head [" + pageCSSAttribute + "=" + inPageKey + "]");
	
	if (!pageCSSInclude)
	{
		var cssPath = gApplication.getPageCSSPath (inPageKey);
		var	css = positron.Util.getTextSync (cssPath);
		
		if (css)
		{
			var style = document.createElement ("style");
			style.setAttribute ("type", "text/css");
			style.setAttribute (pageCSSAttribute, inPageKey);
			style.innerHTML = css;
			document.querySelector ("head").appendChild (style);
		}
	}
	
	var page = null;
	
	try
	{
		page = positron.Util.instantiate (positron.Util.capitalise (inPageKey) + "Page");
	}
	catch (inError)
	{
		var jsPath = gApplication.getPageJSPath (inPageKey);
		var	js = positron.Util.getTextSync (jsPath);
		
		if (js)
		{
			try
			{
				positron.Util.globalEval (js);
			}
			catch (inError)
			{
				console.error ("error evaluating Js for page: " + inPageKey);
				console.error (inError);
			}
			
			try
			{
				page = positron.Util.instantiate (positron.Util.capitalise (inPageKey) + "Page");
			}
			catch (inError)
			{
				console.error (inError);
			}
		}
	}
	
	if (page == null)
	{
		page = positron.Util.instantiate (this.getConfigEntry ("pageClassName"));
	}
	
	// find the page element
	var pageElement = null;
	var pageKeyAttributeName = gApplication.getAttributePrefix () + "page";
	
	if (tempElement.hasChildNodes)
	{
		for (var child = tempElement.firstChild;
			child != null && child.nodeType == child.ELEMENT_NODE;
			child = child.nextSibling)
		{
			var pageKey = positron.DOM.getPrefixedAttribute (child, "page");
			
			if (pageKey && pageKey.length)
			{
				pageElement = child;
				break;
			}
		}
	}
	
	if (pageElement)
	{
		page.configure (inPageKey, pageElement);
		
		var	pageParamsAttribute = positron.DOM.getPrefixedAttribute (pageElement, "page-params");
		
		if (pageParamsAttribute && pageParamsAttribute.length)
		{
			page.setParams (positron.Util.parseParams (pageParamsAttribute));
		}
		
		positron.DOM.setData (pageElement, "page", page);
		positron.DOM.setData (pageElement, "view", page);
		
		positron.DOM.addPrefixedClass (pageElement, "invisible");
		pageContainer.appendChild (pageElement);
	
		page.onLoaded ();
	}
	else
	{
		console.error ("no page element for page (" + inPageKey + ")");
		page = null;
	}
	
	return page;
}

positron.Application.prototype.preloadAssets =
function Application_preloadAssets ()
{
if (gApplication.isLogging (gApplication.kLogLoader)) console.log ("Application.preloadAssets()");

	// for callbacks
	var	self = this;
	
	positron.Util.ajax
	({
		url: "preload.json",
		dataType: "json",
		async: true,
		success: function (inData, inTextStatus, inXHR)
		{
      if (inData && Array.isArray (inData))
      {
if (gApplication.isLogging (gApplication.kLogLoader)) console.log ("preload.json has " + inData.length + " assets");

				if (inData.length > 0)
				{
					self.assetLoader = new positron.Loader (self);
					self.assetLoader.add (inData);
				}
      }
      else
      {
				if (gApplication.isLogging (gApplication.kLogLoader)) console.error ("preload.json empty or bad format");
      }
		},
		error: function (inXHR, inTextStatus, inThing)
		{
			if (gApplication.isLogging (gApplication.kLogLoader)) console.error ("load of preload.json failed");
		}
	});
}

positron.Application.prototype.setupAnalytics = 
function Application_setupAnalytics ()
{
	var	analyticsClassName = this.getConfigEntry ("analytics.className");
	
	if (analyticsClassName && analyticsClassName.length)
	{
		// this will read config for its setup
		this.analytics = positron.Util.instantiate (analyticsClassName);
		
		if (!this.analytics)
		{
			console.error ("cannot instantiate analytics class (" + analyticsClassName + ")");
		}
	}
	else
	{
		this.analytics = new positron.DummyAnalytics ();
	}
}

positron.Application.prototype.setupBrowserFlags = 
function Application_setupBrowserFlags ()
{
  this.browser = new Object ();
  
  var userAgent = navigator.userAgent;

if (gApplication.isLogging (gApplication.kLogApplication)) console.log (userAgent);

	// one might think that navigator.appName and navigator.appVersion would be useful
	// and one would be wrong :-)
	
	// browser's actual name & version
	this.browser.name = "unknown";
	this.browser.versionNumber = 0;
	this.browser.version = "0";
	this.browser.type = "unknown";
	
	// the user agent reporting for the WebKit browsers is farcical
	var	appleWebKitVersion = "";
	var	chromeVersion = "";
	var	safariVersion = "";
	
	var	elements1 = userAgent.split (' ');
	
	for (var i = 0; i < elements1.length; i++)
	{
		var	element = elements1 [i];
		var	elements2 = element.split ('/');

		if (elements2 [0] == "Safari")
		{
			safariVersion = elements2 [1];
		}
		else
		if (elements2 [0] == "AppleWebKit")
		{
			// we save this because the browser you get in the save-to-home-screen on iOS
			// does not advertise itself as Safari, sigh
			appleWebKitVersion = elements2 [1];
		}
		else
		if (elements2 [0] == "Chrome")
		{
			chromeVersion = elements2 [1];
		}
		else
		if (elements2 [0] == "Firefox")
		{
			this.browser.name = "firefox";
			this.browser.type = "gecko";
			this.browser.version = elements2 [1];
			this.browser.isGecko = true;
		}
		else
		if (elements2 [0] == "Version")
		{
			// sigh, opera is nonstandard
			if (elements1 [0].substring (0, 5) == "Opera")
			{
				this.browser.name = "opera";
				this.browser.type = "opera";
				this.browser.version = elements2 [1];
			}
		}
		else
		if (elements2 [0] == "MSIE")
		{
			this.browser.name = "ie";
			this.browser.type = "ie";
			this.browser.isIE = true;
			this.browser.isIE9 = true;
			
			// the version is the next *space* delimited version with the semicolon clipped, sigh
			var	version = elements1 [i + 1];
			this.browser.version = version.substring (0, version.length - 1);
		}
	}

	// sort out the WebKit versioning mess
	if (this.browser.type == "unknown")
	{
		if (chromeVersion.length > 0)
		{
			this.browser.name = "chrome";
			this.browser.type = "webkit";
			this.browser.version = chromeVersion;
			this.browser.isWebKit = true;
		}
		else
		if (safariVersion.length > 0)
		{
			this.browser.name = "safari";
			this.browser.type = "webkit";
			this.browser.version = safariVersion;
			this.browser.isWebKit = true;
		}
		else
		if (appleWebKitVersion.length > 0)
		{
if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("applewebkit only detected, going with safari");

			this.browser.name = "safari";
			this.browser.type = "webkit";
			this.browser.version = appleWebKitVersion;
			this.browser.isWebKit = true;
		}
		else
		{
			console.error ("could not determine browser type");
		}
	}
	
if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("type of browser is " + this.browser.type);

	// fwiw
	this.browser.versionNumber = parseFloat (this.browser.version);

	// mobile or desktop
	if (userAgent.indexOf ("iPhone") >= 0)
	{
if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("iphone browser detected");

		this.browser.isMobile = true;
		this.browser.isIPhone = true;
	}
	else
	if (userAgent.indexOf ("iPad") >= 0)
	{
if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("ipad browser detected");

		this.browser.isMobile = true;
		this.browser.isIPad = true;
	}
	else
	if (userAgent.indexOf ("Android") >= 0)
	{
if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("android browser detected");

		this.browser.isMobile = true;
		this.browser.isAndroid = true;
	}
	else
	if (this.browser.type == "gecko" && userAgent.indexOf ("Mobile") >= 0)
	{
if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("firefox mobile browser detected");

		this.browser.isMobile = true;
		this.browser.isFirefoxMobile = true;
	}
	else
	{
if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("desktop browser detected");

		this.browser.isMobile = false;
	}

	// language
	
	// ASSUME setupURLParameters() has been called
	var	language = this.params [this.getURLParameterPrefix () + "lang"];
	
	if (language && language.length)
	{
if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("setting language from lang parameter - " + language);

		this.browser.language = language;
	}
	else
	{
		if (navigator.userLanguage && navigator.userLanguage.length)
		{
			// IE
if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("setting language from navigator.userLanguage - " + navigator.userLanguage);

			this.browser.language = navigator.userLanguage;
		}
		else
		if (navigator.language && navigator.language.length)
		{
			// WebKit/Gecko/etc
if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("setting language from navigator.language - " + navigator.language);

			this.browser.language = navigator.language;
		}
		else
		{
			// find some other useful stuff
			// HACK depending on the format of the useragent string here
			var	systemInfo = userAgent.substring
				(userAgent.indexOf ('('), userAgent.indexOf (')'));
			
			var	systemInfoElements = systemInfo.split (";");
			
			// the language is the last one, usually
			var	possibleLanguage = systemInfoElements [systemInfoElements.length - 1];
			
			if (possibleLanguage.length == 5 && possibleLanguage.indexOf ('-') == 2)
			{
if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("setting language from user agent - " + navigator.language);

				this.browser.language = possibleLanguage;
			}
			else
			{
if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("defaulting language to en-us");

				this.browser.language = "en-us";
			}
		}
	}
	
	this.browser.language = this.browser.language.toLowerCase ();

  // and... update our janx context so these are accessible in markup
  // could just put this.browser into context, but the cases are not compatible
  this.context.put ("browser.name", this.browser.name);
  this.context.put ("browser.version", this.browser.version);
  this.context.put ("browser.versionnumber", this.browser.versionNumber);
  this.context.put ("browser.type", this.browser.type);
  this.context.put ("browser.iswebkit", this.browser.isWebKit ? "true" : "false");
  this.context.put ("browser.isgecko", this.browser.isGecko ? "true" : "false");
  this.context.put ("browser.isopera", this.browser.isOpera ? "true" : "false");
  this.context.put ("browser.isie9", this.browser.isIE9 ? "true" : "false");
  this.context.put ("browser.ismobile", this.browser.isMobile ? "true" : "false");
  this.context.put ("browser.isiphone", this.browser.isIPhone ? "true" : "false");
  this.context.put ("browser.isipad", this.browser.isIPad ? "true" : "false");
  this.context.put ("browser.isios", (this.browser.isIPhone || this.browser.isIPad) ? "true" : "false");
  this.context.put ("browser.isandroid", this.browser.isAndroid ? "true" : "false");
  this.context.put ("browser.isfirefoxmobile", this.browser.isFirefoxMobile ? "true" : "false");
  this.context.put ("browser.language", this.browser.language);

};

positron.Application.prototype.setupDisplayClass = 
function Application_setupDisplayClass ()
{
	this.displayClass = null;
		
	if (this.config.displayClass)
	{
		for (var key in this.config.displayClass)
		{
			var	criteria = this.config.displayClass [key];
			
			if (criteria && criteria.length)
			{
				criteria = positron.Util.replaceAll
					(criteria, "width", new String (document.documentElement.clientWidth));

				criteria = positron.Util.replaceAll
					(criteria, "height", new String (document.documentElement.clientHeight));

				criteria = positron.Util.replaceAll
					(criteria, "pixelratio", new String (window.devicePixelRatio));

				var	orientation = null;
				
				if (window.orientation)
				{
					orientation = window.orientation;
				}
				else
				if (window.matchMedia)
				{
					if (window.matchMedia ("(orientation: portrait)").matches)
					{
						orientation = "portrait";
					}
					else
					if (window.matchMedia ("(orientation: landscape)").matches)
					{
						orientation = "landscape";
					}
					else
					{
						orientation = "unknown";
					}
				}

				criteria = positron.Util.replaceAll (criteria, "orientation", orientation);
				
				var matches = positron.Util.evaluateExpressionChain (criteria);
				
				if (matches)
				{
					if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("matched display class " + key);
					this.displayClass = key;
					break;
				}
			}
		}
		
		if (this.displayClass)
		{
			for (var key in this.config.displayClass)
			{
				if (key == this.displayClass)
				{
					document.body.classList.add (key);
				}
				else
				{
					document.body.classList.remove (key);
				}
			}
		}
		else
		{
			console.error ("no matching display class found");
		}
		
		var	bound = this.setupDisplayClass.bind (this);
		
		window.onresize = bound;
		window.addEventListener ("orientationchange", bound);
	}
}

// must be called *after* setupRequest()
positron.Application.prototype.setupLogging = 
function Application_setupLogging ()
{
	this.logMask = 0;
	
	this.logKeywords = new Object ();
	
	this.kLogAll = 0xffffff;
	this.logKeywords ["all"] = this.kLogAll;

	this.kLogApplication = 0x1;
	this.logKeywords ["app"] = this.kLogApplication;

	this.kLogViews = 0x2;
	this.logKeywords ["view"] = this.kLogViews;
	
	this.kLogLoader = 0x4;
	this.logKeywords ["loader"] = this.kLogLoader;

	this.kLogTreeWalker = 0x8;
	this.logKeywords ["treewalker"] = this.kLogTreeWalker;

	this.kLogAnalytics = 0x10;
	this.logKeywords ["analytics"] = this.kLogAnalytics;

	this.kLogTrigger = 0x20;
	this.logKeywords ["trigger"] = this.kLogTrigger;

	this.kLogAction = 0x40;
	this.logKeywords ["action"] = this.kLogAction;

	this.kLogCache = 0x80;
	this.logKeywords ["cache"] = this.kLogCache;

	// see if we have any parameters for turning on logging
	var logging = this.request.params [gApplication.getURLParameterPrefix () + "log"];
	
	if (logging && logging.length)
	{
		var logElements = logging.split (',');
		
		for (var i = 0; i < logElements.length; i++)
		{
			var mask = this.logKeywords [logElements [i]];
			
			if (typeof (mask) == "number")
			{
				this.logMask |= mask;

				console.log ("enabling log type (" + logElements [i] + ")");
			}
			else
			{
				console.error ("could not find log mask for keyword (" + logElements [i] + ")");
			}
		}
	}		 

	var keywords = "";
	
	for (var keyword in this.logKeywords)
	{
		if (typeof (keyword) == "string")
		{
			if (keywords.length > 0)
			{
				keywords += ', ';
			}
			
			keywords += keyword;
		}
	}
	
	if (gApplication.isLogging (gApplication.kLogApplication)) console.log ("allowed logging keywords are... " + keywords);
};

positron.Application.prototype.setupRequest = 
function Application_setupRequest ()
{
	var request = new Object ();
	request.location = document.location;
	request.params = new Object ();
	
	var searchElements = document.location.search.split ('?');
	
	if (searchElements.length > 1)
	{
		var urlParams = searchElements [1];
		
		if (urlParams.length > 1)
		{
			var params = urlParams.split ('&');
			
			for (var i = 0; i < params.length; i++)
			{
				var keyValue = params [i].split ('=');
				
				if (keyValue.length > 1)
				{
					if (keyValue [0].length && keyValue [1].length)
					{
						request.params [keyValue [0]] = keyValue [1];
					}
				}
			}
		}
	}

	// i'd leave this out, but other areas need it
	// and i don't want clients of context other than Janx
	this.request = request;
	
	this.context.put ("request", request);
};

positron.Application.prototype.setupWindow = 
function Application_setupWindow ()
{
	var	body = document.querySelector ("body");
	
	this.window = positron.Util.instantiate (this.getConfigEntry ("pageClassName"));
	this.window.configure ("window", body);
	this.window.innerHTML = "";
	
	positron.DOM.setData (body, "page", this.window);
	positron.DOM.setData (body, "view", this.window);
	
	this.page = this.window;
};

