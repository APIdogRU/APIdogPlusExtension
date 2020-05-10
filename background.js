chrome.webRequest.onBeforeSendHeaders.addListener(function(info) {
	var headers = info.requestHeaders;

	headers.forEach(function(header) {
		switch (header.name.toLowerCase()) {

			/**
			 * Смена User-Agent
			 */
			case "user-agent":
				header.value = "VKAndroidApp/4.12-1118";
				break;

			/**
			 * Смена Referer (на всякий случай)
			 */
			case "referer":
				header.value = "https://vk.com/";
				break;

			/**
			 * Сброс кук
			 */
			case "cookie":
				header.value = "";
				break;

			/**
			 * Обозначение с какой страницы запрашивается информация
			 */
			case "origin":
				header.value = "https://vk.com";
				break;
		}
	});

	return {requestHeaders: headers};
}, {
	/**
	 * Применение к запросам к API
	 * Будет применяться только с сайта APIdog, поскольку background.js
	 * подключается только ко перечисленным доменам в файле манифеста
	 */
	urls: [
		"http://api.vk.com/*",
		"https://api.vk.com/*"
	]
}, ["blocking", "requestHeaders"]);


// https://stackoverflow.com/a/55215898/6142038
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	fetch(request.input, request.init).then(function(response) {
		return response.text().then(function(text) {
			sendResponse([{
				body: text,
				status: response.status,
				statusText: response.statusText,
			}, null]);
		});
	}, function(error) {
		sendResponse([null, error]);
	});
	return true;
});









//noinspection JSUnusedGlobalSymbols
function UNUSED_CODE() {
	/**
	 * В Chrome корректно работает только с onBeforeRequest
	 * В Firefox redirectUrl разрешен только в onBeforeSendHeaders (или onBeforeRequest, но с примисом?)
	 *
	 * https://stackoverflow.com/questions/35803135/onbeforerequest-url-redirect-in-firefox-addon-conversion-from-chrome-extension
	 * https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/webRequest/onBeforeRequest
	 *
	 * Невозможно сделать неблокирующий запрос прям тут
	 */
	chrome.webRequest.onBeforeRequest.addListener(function (info) {
//      return new Promise(function(resolve, reject) {
		var ser, p, url, xhr;

		ser = info.url.split("?")[1];

		/**
		 * @var {{server: string, ts: string, wait: int, key: string, mode: int}} p
		 */
		p = get(ser);

		url = `https://${p.server}?act=a_check&key=${p.key}&ts=${p.ts}&wait=${p.wait}&mode=${p.mode}`;
		console.error(">>> " + url);

		xhr = new XMLHttpRequest();
		xhr.open("POST", url, false);
		xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		xhr.setRequestHeader("User-Agent", "VKAndroidApp/4.12-1118");
		xhr.send(null);
		console.error(">>> " + xhr.responseText);
		var res = "data:text/plain," + encodeURIComponent(xhr.responseText);
		//resolve({redirectUrl: res});
		return {redirectUrl: res};
//      });
	}, {
		urls: [
			"http://apidog.ru/longpoll*",
			"https://apidog.ru/longpoll*"
		]
	}, ["blocking"]);

}

/*
chrome.runtime.onMessage.addListener(function(request) {
	console.log(request);
    switch (request.method) {
    	case "onFileReceivedToWorker":
        	var worker = new Worker("uploader.js");
        	worker.postMessage(request);
        	break;
    };
});*/

function get(source, param, defaultValue) {
	var offset, params = {};

	source = source.split("&");

	source.forEach(function(item) {
		offset = item.indexOf("=");
		params[item.slice(0, offset)] = decodeURIComponent(item.slice(++offset));
	});

	return param ? (params[param] || defaultValue) : params;
}