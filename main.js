chrome.runtime.onInstalled.addListener(function() {
	chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
		init();
	});
});


function init () {
	chrome.declarativeContent.onPageChanged.addRules([{
		conditions: [new chrome.declarativeContent.PageStateMatcher({
			pageUrl: {
				hostContains: "apidog.ru"
			}
		})],
		actions: [
			new chrome.declarativeContent.ShowPageAction() // на что тут заменять?!
		]
	}]);
};