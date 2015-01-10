var LenslistView = function ()
{
	console.log ("---LenslistView()");
	
	positron.View.call (this);
};

positron.inherits (LenslistView, positron.View);



LenslistView.prototype.onDOMReady = function ()
{

  positron.View.prototype.onDOMReady.call (this);
  screen.mozLockOrientation(['portrait-primary']);
  
};


LenslistView.prototype.onVisible = function ()
{
  
  console.log ("---LenslistView.onVisible()");
  
};




