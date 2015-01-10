
positron.provide ("ChangeLensAction");

ChangeLensAction = function ()
{
  positron.action.Action.call (this);
  
  console.log ("registering ChangeLensAction");
}

positron.inherits (ChangeLensAction, positron.action.Action);

ChangeLensAction.prototype.fire = function (inEvent)
{
  
  positron.action.Action.prototype.fire.call (this, inEvent);
  
  console.log("change lense action firing with arg:");
  console.log(this.actionArgs [0]);
  
  var direction = inEvent.detail.direction;
  var type = inEvent.detail.type;
  var position = inEvent.detail.position;
  var startPosition = inEvent.detail.startPosition;
  var centerDistance = inEvent.detail.centerDistance;
  var centerDistanceDelta = inEvent.detail.centerDistanceDelta;
  var moveDelta = Math.abs(startPosition - position);
  
  console.log ("change lens with " + position);
  console.log ("move delta is: " + moveDelta);
  console.log ("Center distance delta is: " + centerDistanceDelta);
  console.log ("START TOP LEFT? " + inEvent.detail.START_TOP_LEFT);

  
  if (inEvent.detail.START_TOP_LEFT && moveDelta < 20 && centerDistanceDelta > 30 && gApplication.canCollapse) 
  {
    gApplication.canCollapse = false;
    console.log ("!!!!!! COLLAPSE!");
    var runningLenses = document.querySelector("#running-lenses:not(.offscreen)");
    
    if (runningLenses) 
    {

      document.querySelector("#detached-lens-blocker").classList.remove("blocking");
      runningLenses.classList.remove("detached");
      runningLenses.classList.add("offscreen");
      
      var closeLensButtons = document.querySelectorAll(".close-lens");
      
      console.log ("found close buttons");
      console.log (closeLensButtons);
      
      [].forEach.call(
        document.querySelectorAll(".close-lens"), 
        function(el){
          el.classList.remove("visible");
        }
      );
      
    }
        
  }
  
  else if (inEvent.detail.START_TOP_LEFT && moveDelta < 10 && centerDistanceDelta > 5 && gApplication.canDetach) 
  {
    gApplication.canDetach = false;
    console.log ("!!!!!! DETACH!");
    var runningLenses = document.querySelector("#running-lenses:not(.offscreen)");
    
    if (runningLenses) 
    {
      runningLenses.classList.add ("detached");
      document.querySelector("#detached-lens-blocker").classList.add("blocking");
    }
    
    [].forEach.call(
      document.querySelectorAll(".close-lens"), 
      function(el){
        el.classList.add("visible");
      }
    );
    
    
  }
  
};

