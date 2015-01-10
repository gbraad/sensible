chrome.app.runtime.onLaunched.addListener
(
	function()
	{
		chrome.app.window.create
		(
			'main.html',
			{
				"bounds":
				{
					"width": 500,
					"height": 650
				}
			}
		);
	}
);

