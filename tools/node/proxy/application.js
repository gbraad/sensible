
console.log ("loading...");

var	Application = function ()
{
	positron.Application.call (this);
  
}
positron.inherits (Application, positron.Application);


Application.prototype.onApplicationStartupComplete = function ()
{
	
  
	console.log("STARTING...");
	  
    var socketURL = "ws:";
    var loc = window.location
    if (loc.protocol === 'https:') 
    {
      socketURL = "wss:";
    } 
    socketURL += "//" + loc.host;
   
    this.socketServer = socketURL;	
	this.initSocket();
	
  
    // and... some iOS bullshit
    setTimeout(function() {
      window.scrollTo(0,1);  
    }, 1000);
    
	
	
};

Application.prototype.initSocket = function a_init_socket () 
{
	
  console.log ("Spinnig up web socket connection...");

  var _self = this;

  this.webSocket = new WebSocket(this.socketServer, "sensible-protocol");

  this.webSocket.onopen = function (inEvent) 
  {
    console.log ("Web Socket is open!");

    var msg = {
      controller: "mdns",
      action: "listenservice",
      type: "_sensible._tcp.local"
    };

    if (_self.webSocket) 
    {
        _self.webSocket.send(JSON.stringify(msg));
    }
    else 
    {
        console.log ("there is no web socket object....");
    }

  };


  this.webSocket.onmessage = function (inEvent) 
  {

    var msgData = JSON.parse(inEvent.data);

    console.log ("message back!");
    console.log (msgData);

    if (msgData.controller === "mdns" && msgData.action === "resolveservice")
    {

      console.log ("got a sensible list");

      //  some test data...
      //  var fakeArray = [];
      //  for (var i = 0; i < 22; i++)
      //  {
      //    var fakeArray = fakeArray.concat(msgData.data);
      //  }
      //  msgData.data = fakeArray;

      // horrible hack for TTL, 
      // we might still receive records for services which have just gone offline
      // but not yet expired in the MDNS ring...  let's request each app's properties  
      //for the moment to see if they are still up

      var totalServices = msgData.data.length;
      var checkedServices = 0;
      var validatedServices = [];

      console.log ("found: " + totalServices + " services, checking that each is up");

      msgData.data.forEach ( 
      function(inService, x)
      {
        
        var app = inService;
        
        console.log (x + " verifying " + app.host);

       

        var propertiesURL = "http://" + app.host + ":" + app.port + "/properties/get";

        var s = document.createElement("script");
        s.app = app;
        s.indx = x;
        s.propsURL = propertiesURL;
        s.onload = function() {

          console.log (this);
          console.log (this.app);

          console.log ("properties script loaded for: " + this.propsURL);
          checkedServices ++;
          validatedServices.push(this.app);

          if (checkedServices == totalServices)
          {
            _self.refreshServices(validatedServices);
          }

        }

        s.onerror = function() 
        {

          console.log ("script load FAILED, this service might be dead and not TTL'd yet");
          console.log (this.propsURL);
          checkedServices ++;

          if (checkedServices == totalServices)
          {
            _self.refreshServices(validatedServices);
          }

        }
        s.src = propertiesURL;
        document.body.appendChild(s);

      });

    }

  }

};

Application.prototype.refreshServices = function refresh_services (inServices)
{
  
  console.log ("refreshing services!");
  
  var counter = 0;
  var currentLensPage;
  var lensPages = [];
  
  for (var x in inServices) 
  {
    // for every 8 lenses, create a new lensPage
    if ( counter % 8 == 0) 
    {
      if (counter > 0) lensPages.push(currentLensPage);
      currentLensPage = new Array();
    }

    var app = inServices[x];

    currentLensPage.push(app);
    counter ++;

  }

  lensPages.push(currentLensPage);


  // we have a list of services, globalize key "services" 
  // and refresh the lenslist
  gApplication.sensibleServicePages = lensPages;
  gApplication.context.put ("services", lensPages);
  gApplication.refreshView ("things-around");
  
};


Application.prototype.sendAsJSON = function a_send_as_json (inController, inAction) 
{

  var msg = {
    controller: inController,
    action: inAction
  };

	if (this.webSocket) 
	{
		this.webSocket.send(JSON.stringify(msg));
	}
	else 
	{
		console.log ("there is no web socket object....");
	}
	
 
};

