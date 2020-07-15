chrome.webRequest.onBeforeSendHeaders.addListener(function(info) {
	var headers = info.requestHeaders;

	headers.forEach(function(header) {
		switch (header.name.toLowerCase()) {

			/**
			 * Смена User-Agent
			 */
			case "user-agent":
				header.value = "VKAndroidApp/5.56.1-4841";
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
		"https://api.vk.com/*",
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
