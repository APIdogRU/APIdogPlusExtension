chrome.webRequest.onBeforeSendHeaders.addListener(function(info) {
	var headers = info.requestHeaders;
	headers.forEach(function(header, i) {
		switch (header.name.toLowerCase()) {
			case "user-agent": header.value = "VKAndroidApp/4.9-1118"; break;

			case "referer": header.value = "https://vk.com/"; break;

			case "origin": header.value = "https://vk.com"; break;
		};
	});
	return {requestHeaders: headers};
}, {
	urls: [
		"http://api.vk.com/*",
		"https://api.vk.com/*"
	]
}, ["blocking", "requestHeaders"]);

chrome.runtime.onMessage.addListener(function(request) {
    switch (request.method) {
    	case "onFileReceivedToWorker":
        	var worker = new Worker("uploader.js");
        	worker.postMessage(request);
        	break;
    };
});
