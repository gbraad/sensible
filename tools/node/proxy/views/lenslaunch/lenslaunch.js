var LensLaunchView = function ()
{
	console.log ("---LensLaunchView()");
	
	positron.View.call (this);
};

positron.inherits (LensLaunchView, positron.View);



LensLaunchView.prototype.onDOMReady = function ()
{

  positron.View.prototype.onDOMReady.call (this);
  
  console.log ("---LensLaunchView.onDOMReady ()");
  
  
  

};


LensLaunchView.prototype.onVisible = function ()
{
  
  console.log ("---LensLaunchView.onVisible()");
  
};

