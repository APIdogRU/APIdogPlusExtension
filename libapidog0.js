/**
 * APIdog Plus extension
 * @version 3.5
 * @author Vladislav Veluga; velu.ga
 */

/**
 * HTTP-запрос через background (без учёта CORS)
 * @see https://stackoverflow.com/a/55215898/6142038
 * @param {string} input URL
 * @param {object} [init] Параметры (второй аргумент fetch)
 * @returns {Promise.<*>}
 */
function fetchResource(input, init) {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage({ input, init }, messageResponse => {
			const [response, error] = messageResponse;

			if (response === null) {
				reject(error);
			} else {
				// Use undefined on a 204 - No Content
				// body прилетает от background.js, там мы просим fetch вернуть именно строку, потому что
				// sendMessage умеет только в JSON serializable данные. Blob, arrayBuffer и прочее не такое.
				const body = response.body ? new Blob([response.body]) : undefined;

				resolve(new Response(body, {
					status: response.status,
					statusText: response.statusText,
				}));
			}
		});
	});
}

/**
 * Запрос к API ВКонтакте
 * @param {string} method Название метода API
 * @param {object} params Объект параметров
 * @returns {Promise.<*>} Ответ
 */
async function apiRequest(method, params) {
	const res = await fetchResource(`https://api.vk.com/method/${method}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'User-Agent': __APIDOG_PLUS_USER_AGENT__,
		},
		body: new URLSearchParams(params).toString(),
	});
	const json = await res.json();

	if ('error' in json) {
		throw json.error;
	}

	return json.response;
}

const EXTENSION_VERSION = 3.5;

const RESPONSE_ACCESS_TOKEN_REQUIRE = 'onAccessTokenRequire';
const RESPONSE_LONGPOLL_DATA_RECEIVED = 'onLongPollDataReceived';
const RESPONSE_LONGPOLL_CONNECTION_ERROR = 'onLongPollConnectionError';
const RESPONSE_API_CALL_DONE = 'onApiCallDone';

const INCOME_ACCESS_TOKEN_RECEIVED = 'onAccessTokenReceived';
const INCOME_MAKE_API_CALL = 'onMakeApiCall';

const ERROR_NO_RESPONSE_VKAPI = 1;
const ERROR_WHILE_REQUEST_LONGPOLL = 2;

/**
 * Отправляет событие из расширения на страницу
 * @param {string} method
 * @param {object} data
 * @param {string=} [callback]
 */
function sendEvent(method, data, callback) {
	data.method = method;
	data.callback = callback;
	data.version = EXTENSION_VERSION;
	console.log('sendEvent:', method + '@' + JSON.stringify(data));
	window.postMessage(JSON.stringify(data), '*');
}

/**
 * Функция-распределитель событий, приходящих с сайта
 * @param {string} method
 * @param {{
 *     useraccesstoken: string, // Токен (исторически дурацкое название)
 *     userAgent: string,       // User-Agent
 *     apiVersion: number,      // Версия API для messages.getLongPollServer
 *     mode: number,            // mode для LongPoll
 *     longpollVersion: number  // Версия LongPoll
 * } | {
 * 	   apiMethod: string;               // Название метода API
 *     params: Record.<string, string>; // Параметры
 *     id: string;                      // ID запроса
 * }} data
 */
function receiveEvent(method, data) {
	switch (method) {
		// Получение токена от страницы.
		case INCOME_ACCESS_TOKEN_RECEIVED: {
			LongPoll.userAgent = data.userAgent;
			data.apiVersion && (LongPoll.apiVersion = data.apiVersion);
			data.mode && (LongPoll.mode = data.mode);
			data.longpollVersion && (LongPoll.longpollVersion = data.longpollVersion);
			lp.init(data.useraccesstoken);
			break;
		}

		// Требование сделать запрос к API и вернуть его.
		case INCOME_MAKE_API_CALL: {
			makeApiCall(data);
			break;
		}
	}
}

/**
 * Дикий костыль, проверка аля строка - JSON
 * @param {*} data Строка
 * @returns {boolean} true, если data может быть JSON
 */
function isStringJson(data) {
	return typeof data === 'string' && data[0] === '{' && data[data.length - 1] === '}';
}

/**
 * Обработчик событий со страницы
 */
window.addEventListener('message', event => {
	if (event.source !== window) {
		return;
	}

	const data = event.data;
	try {
		const res = isStringJson(data) ? JSON.parse(data) : data;

		if (res && res.method && !res.agent) {
			receiveEvent(res.method, res);
		}
	} catch (e) {
		console.error('onMessage:', data, e);
	}
});


/**
 * @param {{ apiMethod: string, params: Record.<string, string>, id: string }} data Данные для запроса
 */
async function makeApiCall(data) {
	let result;

	if (data.params) {
		// да, медленно, но с data.params.callback = undefined не работает
		delete data.params.callback;
	}

	try {
		const response = await apiRequest(data.apiMethod, data.params);
		result = { response };
	} catch (error) {
		result = { error };
	} finally {
		sendEvent(RESPONSE_API_CALL_DONE, { id: data.id, result });
	}
}

class LongPoll {
	/**
	 * @type {string}
	 * @public
	 * @static
	 */
	static userAgent = __APIDOG_PLUS_USER_AGENT__;

	/**
	 * @type {number}
	 * @public
	 * @static
	 */
	static apiVersion = 5.131;

	/**
	 * @type {number}
	 * @public
	 * @static
	 */
	static longpollVersion = 3;

	/**
	 * @type {number}
	 * @public
	 * @static
	 */
	static mode = 2 | 8 | 64 | 128;

	/**
	 * @type {string=}
	 * @private
	 */
	__userAccessToken = null;

	/**
	 * @type {ILongPollParams | null}
	 * @private
	 */
	__params = null;

	/**
	 * @type {boolean}
	 * @private
	 */
	__stopped = true;

	constructor() {
		this.__request = this.__request.bind(this);
	}

	/**
	 * Инициализация LongPoll
	 * @public
	 * @param {string} userAccessToken
	 */
	init(userAccessToken) {
		console.info('[Extension] start init longpoll');

		if (!this.__stopped) {
			console.log('[Extension] already running');
			return;
		}

		this.__stopped = false;
		this.__userAccessToken = userAccessToken;
		this.__getServer();
	}

	/**
	 * Получение адреса сервера LongPoll
	 * @private
	 */
	async __getServer() {
		if (this.__stopped) return;

		try {
			/** @type {ILongPollParams} */
			const data = await apiRequest('messages.getLongPollServer', {
				access_token: this.__userAccessToken,
				lp_version: LongPoll.longpollVersion,
				v: LongPoll.apiVersion,
			});

			this.__params = data;

			this.__request();
		} catch (error) {
			sendEvent(RESPONSE_LONGPOLL_DATA_RECEIVED, {
				errorId: ERROR_NO_RESPONSE_VKAPI,
				error,
			});
		}
	}

	/**
	 * Запрос к LongPoll для получения новых событий
	 * @private
	 */
	async __request() {
		if (this.__params === null) return;

		const { server, key, ts } = this.__params;

		try {
			const request = await fetchResource(`https://${server}?act=a_check&key=${key}&ts=${ts}&wait=25&mode=${LongPoll.mode}&version=${LongPoll.longpollVersion}`);
			const result = await request.json();

			if (result.failed) return this.__getServer();

			this.__params.ts = result.ts;

			setTimeout(this.__request, 1000);
			this.__sendEvents(result.updates || []);
		} catch (event) {
			sendEvent(RESPONSE_LONGPOLL_CONNECTION_ERROR, {
				errorId: ERROR_WHILE_REQUEST_LONGPOLL,
				error: event
			});
			this.__getServer();
		}
	}

	/**
	 * Отправка событий на сайт
	 * @param {object[]} updates
	 * @private
	 */
	__sendEvents(updates) {
		sendEvent(RESPONSE_LONGPOLL_DATA_RECEIVED, { updates });
	}

	/**
	 * Разрыв соединения
	 * @public
	 */
	abort() {
		this.__stopped = true;
	}
}

/**
 * @typedef {{ ts: number, server: string, key: string }} ILongPollParams
 */

const lp = new LongPoll();

/**
 * Инициализация расширения на странице: запрос токена с сайта
 */
sendEvent(RESPONSE_ACCESS_TOKEN_REQUIRE, {}, INCOME_ACCESS_TOKEN_RECEIVED);

/**
 * Костыль для Firefox
 * Не сбрасываются скрипты при перезагрузке одной вкладки
 * В chrome же выгрузка скриптов происходит при перезагрузке или
 * закрытии вкладки. Firefox выгружает скрипты только при закрытии
 * вкладки
 */
window.addEventListener('beforeunload', function() {
	lp.abort();
});
