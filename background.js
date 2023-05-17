const headerOverrideMap = {
	// Смена User-Agent
	'user-agent': __APIDOG_PLUS_USER_AGENT__,

	// Смена Referer (на всякий случай)
	referer: 'https://vk.com/',

	// Сброс кук
	cookie: '',

	// С какого домена запрос
	origin: 'https://vk.com',
};

/**
 * Смена заголовков для запросов к API VK и другим служебным доменам
 */
chrome.webRequest.onBeforeSendHeaders.addListener(info => {
	const { requestHeaders, initiator, url } = info;

	const needChangeRequestHeaders = initiator !== undefined && (
		// video, audio
		initiator.includes('apidog.ru') ||
		// запросы к API с расширением делаются от имени расширения
		initiator.includes('chrome-extension') && url.includes('api.vk.com')
	);

	// Тайпинги подсказывают, что оно может быть undefined
	if (needChangeRequestHeaders && requestHeaders !== undefined) {
		const referer = requestHeaders.find(header => header.name.toLowerCase() === 'referer');

		// Меняем заголовки только если запрос с apidog.ru (или в худшем случае - не знаем откуда)
		if (referer === undefined || referer.value?.includes('apidog.ru')) {
			requestHeaders.forEach(header => {
				const name = header.name.toLowerCase();

				if (name in headerOverrideMap) {
					header.value = headerOverrideMap[name];
				}
			});
		}
	}

	return { requestHeaders };
}, {
	// Здесь также нужно описывать домены, которые используются внутри расширения: например, домен LongPoll, который
	// расширение получает от API в libapidog0. Если не добавить - будет ошибка про CORS, ВК не добавляет заголовки
	// Access-Control-Allow-Origin и, уж тем более, не разрешает читать ответ на других доменах. Подменяем заголовки
	// так, чтобы оказалось, что это запрос с vk.com и ошибки не будет.
	urls: [
		'*://api.vk.com/*', // API
		'*://api.vk.ru/*', // API fallback
		'*://api.vk.me/*', // LongPoll
		'*://*.mycdn.me/*', // видеозаписи
		'*://*.vkuser.net/*', // видеозаписи
		'*://*.vkuseraudio.net/*', // аудиозаписи
	],
}, ['blocking', 'requestHeaders']);

/**
 * @typedef {{ input: string, init: RequestInit }} IRequestArg
 */

/**
 * @see https://stackoverflow.com/a/55215898/6142038
 * @param {IRequestArg} request
 */
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
	fetch(request.input, request.init)
		.then(response => {
			response.text().then(body => sendResponse([{
				body,
				status: response.status,
				statusText: response.statusText,
			}, null]));
		})
		.catch(error => sendResponse([null, error]));
	return true;
});


/**
 * Контекстное меню для открытия ссылок vk.com в apidog.ru
 */
const CONTEXT_MENU_OPEN_IN_APIDOG_ID = 'open-in-apidog';

chrome.contextMenus.create({
	id: CONTEXT_MENU_OPEN_IN_APIDOG_ID,
	title: chrome.i18n.getMessage('openInAPIdog'),
	contexts: ['link'],
	targetUrlPatterns: [
		'*://vk.com/*',
		'*://vk.ru/*',
		'*://m.vk.com/*',
		'*://m.vk.ru/*',
	],
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
	switch (info.menuItemId) {
		case CONTEXT_MENU_OPEN_IN_APIDOG_ID: {
			const linkUrl = info.linkUrl;

			const url = linkUrl.replace(/^https?:\/\/(m\.|new\.)?(vk\.(com|ru)|vkontakte\.ru)\//igm, 'https://apidog.ru/#');
			const index = tab.index + 1;

			chrome.tabs.create({ url, index });
			break;
		}
	}
});
