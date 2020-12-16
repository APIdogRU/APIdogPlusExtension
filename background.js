chrome.webRequest.onBeforeSendHeaders.addListener(info => {
	const headers = info.requestHeaders;

	headers.forEach(header => {
		switch (header.name.toLowerCase()) {
			// Смена User-Agent
			case 'user-agent': {
				header.value = 'VKAndroidApp/5.56.1-4841';
				break;
			}

			// Смена Referer (на всякий случай)
			case 'referer': {
				header.value = 'https://vk.com/';
				break;
			}

			// Сброс кук
			case 'cookie': {
				header.value = '';
				break;
			}

			// Обозначение с какой страницы запрашивается информация
	
			case 'origin': {
				header.value = 'https://vk.com';
				break;
			}
		}
	});

	return {
		requestHeaders: headers,
	};
}, {
	/**
	 * Применение к запросам к API
	 * Будет применяться только с сайта APIdog, поскольку background.js
	 * подключается только ко перечисленным доменам в файле манифеста
	 */
	urls: [
		'*://api.vk.com/*',
	],
}, ['blocking', 'requestHeaders']);


// https://stackoverflow.com/a/55215898/6142038
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	fetch(request.input, request.init)
		.then(response => response.text())
		.then(text => sendResponse([{
			body: text,
			status: response.status,
			statusText: response.statusText,
		}, null]))
		.catch(error => sendResponse([null, error]));
	return true;
});

const CONTEXT_MENU_OPEN_IN_APIDOG_ID = 'open-in-apidog';

chrome.contextMenus.create({
	id: CONTEXT_MENU_OPEN_IN_APIDOG_ID,
	title: chrome.i18n.getMessage('openInAPIdog'),
	contexts: ['link'],
	targetUrlPatterns: [
		'*://vk.com/*',
		'*://m.vk.com/*',
	],
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
	switch (info.menuItemId) {
		case CONTEXT_MENU_OPEN_IN_APIDOG_ID: {
			const url = info.linkUrl;

			const newUrl = url.replace(/^https?:\/\/(m\.|new\.)?(vk\.com|vkontakte\.ru)\//igm, 'https://apidog.ru/6.6/#');

			chrome.tabs.create({
				url: newUrl,
				index: tab.index + 1,
			});
			break;
		}
	}
});
