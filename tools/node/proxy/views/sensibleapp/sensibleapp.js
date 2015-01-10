var SensibleappView = function ()
{
	
	positron.View.call (this);
  
    console.log("SensibleappView created!");
  
};

positron.inherits (SensibleappView, positron.View);



SensibleappView.prototype.onDOMReady = function ()
{
	
  
  positron.View.prototype.onDOMReady.call (this);
	
  console.log ("---SensibleappView.onDOMReady()");
  
  console.log("launch action firing with arg:");
  console.log(this.params.server);
  
  var _self = this;

  var appFrame = this.element.querySelector(".app-frame");
  var rootURL = "http://" + this.params.server + ":" + this.params.port;
  
  var mozAppUrl = rootURL + "/manifest.webapp";

  var entry = "/index.html";
  
  console.log ("!!!!!!!!!!!!!!!!!!!! trying to launch: ||" + rootURL + entry + "||");
  console.log ("uuid: " + this.params.uuid);
    
  var appID = "lensid-" + this.params.uuid;

  console.log ("NO RUNNING LENS, embedding");

  var appIFrame = document.createElement('iframe');

  appIFrame.src =  rootURL + entry;
  //appIFrame.src =  appDescriptor.icon_html;

  appIFrame.className = "sensible-app-iframe";

  appIFrame.setAttribute('mozallowfullscreen', 'true');
  appIFrame.setAttribute('remote', 'true');
  appIFrame.setAttribute('mozbrowser', 'true');
  appIFrame.setAttribute('mozapp', mozAppUrl);

  appIFrame.name = 'main';
  appIFrame.id = "lens-" + appID;

  this.element.appendChild (appIFrame);
  
  setTimeout ( function () {
    _self.element.classList.add ("build-in");
  }, 100);
  
   
};


SensibleappView.prototype.closeLens = function ()
{
  
  console.log ("---SensibleappView.closeLens()");
    
  this.element.classList.add("closing-lens");
  
  this.element.addEventListener ("transitionend", function() {
    
    console.log ("END");
    console.log ("clearing frames");
    document.querySelector("#running-lenses").innerHTML = "";
    
  }, false);
  
  
}
