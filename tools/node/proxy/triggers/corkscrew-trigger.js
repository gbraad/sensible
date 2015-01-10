positron.provide ("CorkscrewTrigger");

var CorkscrewTrigger = function ()
{
};

positron.inherits (CorkscrewTrigger, positron.trigger.Trigger);


CorkscrewTrigger.prototype.register = function (inAction)
{

  // note!  choose the NAME of the triggerlet in positron.json!
  
  console.log ("**********CorkscrewTrigger.register()");
  console.log (inAction.element);
  
  var isCorking = false;
  
  var currentRotationAngle = 0;
  var startRotationAngle = 0;
  var rotationDelta = 0;
  
  var currentPage = 0;
   
  // event translators
  var startEvent = null;
  var endEvent = null;
  var moveEvent = null;
  var cancelEvent = null;
  var lenses;
  
  var _self = this;
  
  if (gApplication.browser.isMobile)
  {
      startEvent = "touchstart";
      endEvent = "touchend";
      moveEvent = "touchmove";
      cancelEvent = "touchcancel";
  }
  else
  {
      startEvent = "mousedown";
      endEvent = "mouseup";
      moveEvent = "mousemove";
      cancelEvent = null;
  }
  
  this.conns = null;
  var _self = this;
  
//  navigator.mozApps.getSelf().onsuccess = function() {
//    
//    console.log("GOT SELF!");
//    
//    var app = this.result;
//    
//    app.connect("mdns-action", null).then(function onConnectionAccepted(ports) {
//        
//        console.log("connection accepted");
//        console.log(ports);
//        _self.ports = ports;
//      
//      
//      }, 
//      function onConnectionRejected(reason) {
//        console.log("connection rejected");
//        console.log(reason);
//      });
//    };
  
  

  
  inAction.element.addEventListener(startEvent, function(inEvent) {
    
    console.log("corkscrew start");
    
    isCorking = true;
    
    var w = window.innerWidth;
    var h = window.innerHeight;

    // note: on rectagle screens with the UI justified to bottom, 
    // we'll be yOffset too high on the Y, so:
    var yOffset = h - w;
    
    var center = w/2;

    var touchX = inEvent.touches ? inEvent.touches[0].pageX: inEvent.pageX;
    var touchY = inEvent.touches ? inEvent.touches[0].pageY: inEvent.pageY;

    if (yOffset) touchY -= yOffset;

    // Angle between the center of the circle and p1,
    // measured in degrees counter-clockwise from the positive X axis 
    // (horizontal), always +90deg

    var angle = ( Math.atan2(touchY-center,touchX-center) * 180/Math.PI + 360 ) % 360;
    angle += 90;
    if (angle > 360) angle -= 360;

    console.log("touch start angle : " + angle + "deg at " + inEvent.pageX + " " + inEvent.pageY);

    _self.startRotationAngle = angle;
    
    lenses = inAction.element.querySelectorAll(".lens-page");
    
    console.log ("CURRENT PAGE IS: " + currentPage);
    
    for (var i=0; i<lenses.length; i++) {
      if (i != currentPage) {
        lenses[i].style.display = "none";
      }
    }
    
    
    if (lenses && lenses[currentPage])
    {
    
      lenses[currentPage].style.transitionProperty = "none";
      lenses[currentPage].style.transitionDuration = "300ms";


      if (currentPage > 0) {
        lenses[currentPage-1].style.transitionProperty = "none";
        lenses[currentPage-1].style.transitionDuration = "300ms";
        lenses[currentPage-1].style.display = "block";
      }

      if (currentPage < (lenses.length-1)) {
        lenses[currentPage+1].style.transitionProperty = "none";
        lenses[currentPage+1].style.transitionDuration = "300ms";
        lenses[currentPage+1].style.display = "block";
      }
    }
    
    

    
  }, false);
  
  
  inAction.element.addEventListener(moveEvent, function(inEvent) {
    
    if (isCorking) {
      
      inEvent.preventDefault();
      
      console.log("corkscrew move");
      
      var w = window.innerWidth;
      var h = window.innerHeight;

      var center = w/2;

      var touchX = inEvent.touches ? inEvent.touches[0].pageX: inEvent.pageX;
      var touchY = inEvent.touches ? inEvent.touches[0].pageY: inEvent.pageY;

      var yOffset = h - w; 
      if (yOffset) touchY -= yOffset; // again, just for rectangle screens when bottom-justified

      var angle = ( Math.atan2(touchY-center,touchX-center) * 180/Math.PI + 360 ) % 360;
      angle += 90;
      
      
      // TBD! create a real fix for over and under runs, and or calc based on start angle
      if (angle > 360 && (_self.startRotationAngle < 200)) angle -= 360;
      else if (angle > 200 && (_self.startRotationAngle < 110)) angle -= 360; // stop gap for overruns

      //console.log("corcscrew move to : " + angle + "deg at " + inEvent.pageX + " " + inEvent.pageY);


      // !TBD: if the move isn't enough to change the angle, do we want to fire event?
      var direction = "none"; 
      
      _self.rotationDelta = _self.startRotationAngle - angle;

      if ( _self.rotationDelta < 0 ) {
        direction = "clockwise";
        //console.log("MOVE CLOCKWISE: " + _self.rotationDelta);
      }
      else if ( _self.rotationDelta > 0 ) {
        direction = "counterclockwise";
        //console.log("MOVE COUNTERCLOCKWISE: " + _self.rotationDelta);
        
      }
      
      var moveRotation = -1 * _self.rotationDelta;
      
      //console.log("MOVING: " + currentPage);
      //console.log("ROTATION: " + moveRotation);
       
      if (lenses && lenses[currentPage]) 
      {
      
        lenses[currentPage].style.transform = "rotate3d(0,0,1,"+moveRotation+"deg) translate3d(0,0,"+ (-2*moveRotation) +"px)";
        
      }
      
       
    }
    
  }, false);
  
  
  inAction.element.addEventListener(endEvent, function() {
    
    
    console.log("END EVENT");
    
    if (isCorking) {
    
      console.log("corkscrew end at " + _self.rotationDelta);
      
      
      if (_self.rotationDelta > 30) 
      {
        currentPage = Math.min( currentPage + 1, lenses.length - 1);
      }
      else if (_self.rotationDelta < -30) 
      {
        currentPage = Math.max( currentPage - 1, 0);
      }
      
      console.log("SETTING CURRENT PAGE TO: " + currentPage);
      gApplication.context.put ("currentPage", currentPage);
      
      
      
      var selectedDot = inAction.element.parentElement.querySelector(".paginator-dot.selected");
            
      if (selectedDot) {
        var newDotSelector = ".paginator-dot:nth-of-type("+(currentPage+1)+")";
        var newDot = inAction.element.parentElement.querySelector(newDotSelector);
        
        selectedDot.classList.remove("selected");
        newDot.classList.add("selected");
      }
            
      
      // TBD! look at time delta and determine fast and slow rotation thresholds
      var slowRotation = false;
      
      
      // !TBD: DRY the following out...
      for (var i=0; i<lenses.length; i++) {
      
        console.log("LENS LOOP: " + i + " current page is: " + currentPage);

        lenses[i].style.transitionProperty = "transform, opacity";
        lenses[i].style.transitionTimingFunction = "ease-out";
        lenses[i].style.transitionDuration = slowRotation ? "650ms" : "400ms";
        
        if (i < currentPage) {
          
          lenses[i].style.transform = "rotate3d(0,0,1,"+(-179)+"deg) translate3d(0vw,0vw,400px)";
          lenses[i].style.opacity = -1;
          lenses[i].style.pointerEvents = "none";
        
        }
        else if (i > currentPage) {
          
          lenses[i].style.transform = "rotate3d(0,0,1,"+(179)+"deg) translate3d(0vw,0vw,-900px)";
          lenses[i].style.opacity = -1;
          lenses[i].style.pointerEvents = "none";
          
        
        }
        else {
          
          lenses[i].style.transform = "rotate3d(0,0,1,"+(0)+"deg) translate3d(0,0vw,0px)";
          lenses[i].style.opacity = 1;
          lenses[i].style.pointerEvents = "all";
          
        }
        
      }
      
      isCorking = false;
      
    }
    
    
  }, false);
  
  
  inAction.element.addEventListener(cancelEvent, function() {
   
    //console.log("!!!!pan cancel");
        
    isCorking = false;
    
    var angleBlocks = Math.round(currentRotation / 30);
    var finalAngle = rotationIncrement * angleBlocks;
    
    currentRotation = finalAngle;
    
  
  }, false);
  
	
	
};
