/**
 * APIdog Plus extension
 * @version 3.0
 * @author Vladislav Veluga; velu.ga
 */


/**
 * Запрос в сеть
 * @param {string} url
 * @param {object} params
 */
function RequestTask(url, params) {
	var context = this;

	this.xhr = new XMLHttpRequest();
	this.url = url;
	this.params = params || {};

	this.xhr.onloadend = function(event) {
		var result = event.target["responseText"];
		if (!result) {
			return context.onError && context.onError({
				result: result,
				event: event,
				__xhr: this
			});
		}

		try {
			result = JSON.parse(result);
		} catch (e) {
			return context.onError && context.onError({
				result: result,
				event: event,
				__xhr: this
			});
		} finally {
			context.onComplete && context.onComplete({
				result: result || {},
				isSuccess: true
			});
		}
	};
}

//noinspection JSUnusedGlobalSymbols
RequestTask.prototype = {

	/**
	 * Callback-функция при успешном получени ответа
	 */
	onComplete: null,

	/**
	 * Fallback-функция при неудаче
	 */
	onError: null,

	/**
	 * Смена callback
	 * @param {function} onComplete
	 * @returns {RequestTask}
	 */
	setOnComplete: function(onComplete) {
		this.onComplete = onComplete;
		return this;
	},

	/**
	 * Смена fallback
	 * @param {function} onError
	 * @returns {RequestTask}
	 */
	setOnError: function(onError) {
		this.onError = onError;
		return this;
	},

	/**
	 * Выполнить запрос с помощью GET
	 * @returns {RequestTask}
	 */
	get: function() {
		this.url += (!~this.url.indexOf("?") ? "?" : "&") + this.params.join("&");
		this.type = "GET";
		this.__send(null);
		return this;
	},

	/**
	 * Выполнить запрос с помощью POST
	 * @returns {RequestTask}
	 */
	post: function() {
		this.type = "POST";
		var queryString = [], key;

		for (key in this.params) {
			if (this.params.hasOwnProperty(key)) {
				queryString.push(encodeURIComponent(key) + "=" + encodeURIComponent(this.params[key]));
			}
		}

		this.__send(queryString.join("&"));
		return this;
	},

	/**
	 * Отправка XHR
	 * @param {string|FormData|null} body
	 * @returns {RequestTask}
	 * @private
	 */
	__send: function(body) {
		this.xhr.open(this.type, this.url, true);
		this.xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		this.xhr.setRequestHeader("User-Agent", LongPoll.userAgent);
		this.xhr.setRequestHeader("Cookie", "");
		this.xhr.send(this.type === "POST" ? body : null);
		return this;
	},

	/**
	 * Отмена запроса
	 */
	abort: function() {
		this.xhr.abort();
	}

};

/**
 * Запрос к API ВКонтакте
 * @param {string} method Название метода API
 * @param {object} params Объект параметров
 * @param {function} callback Callback-функция
 */
function API(method, params, callback) {
 	params = params || {};
	new RequestTask("https://api.vk.com/method/" + method, params)
		.setOnComplete(function(result) {
			if (result.isSuccess) {
				callback(result.result);
			} else {
				console.info("ERROR API");
			}
		})
		.post();
}

var
	EXTENSION_VERSION = 3.0,
	EXTENSION_AGENT = "all",

	METHOD_ACCESS_TOKEN_REQUIRE = "onAccessTokenRequire",
	METHOD_LONGPOLL_DATA_RECEIVED = "onLongPollDataReceived",
	METHOD_LONGPOLL_CONNECTION_ERROR = "onLongPollConnectionError",

	EVENT_ACCESS_TOKEN_RECEIVED = "onAccessTokenReceived",

	ERROR_NO_RESPONSE_VKAPI = 1,
	ERROR_WHILE_REQUEST_LONGPOLL = 2;

/**
 * Отправляет событие из расширения на страницу
 * @param {string} method
 * @param {object} data
 * @param {string=} callback
 */
function sendEvent(method, data, callback) {
	data.method = method;
	data.callback = callback;
	data.version = EXTENSION_VERSION;
	data.agent = EXTENSION_AGENT;
	console.log("sendEvent:", method + "@" + JSON.stringify(data));
	window.postMessage(JSON.stringify(data), "*");
}

/**
 * Функция-распределитель событий, приходящих с сайта
 * @param {string} method
 * @param {object} data
 */
function receiveEvent(method, data) {
	switch (method) {

		/**
		 * Получение токена от страницы
		 */
		case EVENT_ACCESS_TOKEN_RECEIVED:
			LongPoll.userAgent = data.userAgent;
			LongPoll.apiVersion = data.apiVersion;
			LongPoll.init(data["useraccesstoken"]);
			break;

		/**
		 * Загрузка файла
		 * @deprecated
 		 */
		/*case EVENT_FILE_UPLOAD_REQUEST:
			chrome.runtime.sendMessage({
				method: METHOD_FILE_UPLOAD_READ,
				file: data.file,
				field: data.paramName,
				filename: data.fileName,
				getServerMethod: data.getServerMethod,
				getServerParams: data.getServerParams,
				saveMethod: data.saveMethod,
				accessToken: data.accessToken,
				uploadId: data.uploadId
			});
			break;*/
	}
}

/**
 * Обработчик событий со страницы
 */
window.addEventListener("message", function(event) {
	if (event.source !== window) {
		return;
	}

	// дитчайший костыль
	try {
		var res = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

		if (res.method && !res.agent) {
			receiveEvent(res.method, res);
		}
	} catch (e) {
		console.error("onMessage:", event.data, e);
	}
});





var LongPoll = {

	/**
	 * @var {string}
	 * @public
	 * @static
	 */
	userAgent: "VKAndroidApp/4.12-1118",

	/**
	 * @var {number}
	 * @public
	 * @static
	 */
	apiVersion: 5.56,

	/**
	 * @var {string|null}
	 * @private
	 */
	__userAccessToken: null,

	/**
	 * @var {{}|null}
	 * @private
	 */
	__params: null,

	/**
	 * @var {boolean}
	 * @private
	 */
	__stopped: true,

	/**
	 * @var {XMLHttpRequest|null}
	 * @private
	 */
	__xhr: null,

	/**
	 * Инициализация LongPoll
	 * @public
	 */
	init: function(userAccessToken) {
		console.info("[Extension] start init longpoll");

		if (!this.__stopped) {
			console.log("[Extension] already running");
			return;
		}

		this.__stopped = false;
		this.__userAccessToken = userAccessToken;
		this.__getServer();
	},

	/**
	 * Получение адреса сервера LongPoll
	 * @private
	 */
	__getServer: function() {
		if (this.__stopped) {
			return;
		}

		var self = this;

		API("messages.getLongPollServer", {
			access_token: this.__userAccessToken,
			v: LongPoll.apiVersion
		}, function(data) {
			if (!data.response) {
				data = data.error;
				sendEvent(METHOD_LONGPOLL_DATA_RECEIVED, {
					errorId: ERROR_NO_RESPONSE_VKAPI,
					error: data
				});
				return;
			}

			self.__params = data.response;
			self.__request();
//			console.info("[Extension] Getted longpoll server");
		});
	},

	/**
	 * Запрос к LongPoll для получения новых событий
	 * @private
	 */
	__request: function() {
		var self = this;
		this.__xhr = new RequestTask("https://" + this.__params.server + "?act=a_check&key=" + this.__params.key + "&ts=" + this.__params.ts + "&wait=25&mode=66", null)
			.setOnComplete(function(result) {
//				console.log("[Extension] Received response from longpoll");
				if (result.result["failed"]) {
					return self.__getServer();
				}
				self.__params.ts = result.result.ts;
				self.__xhr = null;
				self.__request();
				self.__sendEvents(result.result.updates);

			})
			.setOnError(function(event) {
				sendEvent(METHOD_LONGPOLL_CONNECTION_ERROR, {
					errorId: ERROR_WHILE_REQUEST_LONGPOLL,
					error: event
				});
				self.__getServer();
			})
			.post();
	},

	/**
	 * Отправка событий на сайт
	 * @param {object[]} items
	 * @private
	 */
	__sendEvents: function(items) {
		sendEvent(METHOD_LONGPOLL_DATA_RECEIVED, {
			updates: items
		});
	},

	/**
	 * Разрыв соединения
	 * @public
	 */
	abort: function() {
		this.__stopped = true;
		if (this.__xhr) {
			this.__xhr.abort();
		}
	}

};

/**
 * Инициализация расширения на странице: запрос токена с сайта
 */
sendEvent(METHOD_ACCESS_TOKEN_REQUIRE, {}, EVENT_ACCESS_TOKEN_RECEIVED);

/**
 * Костыль для Firefox
 * Не сбрасываются скрипты при перезагрузке одной вкладки
 * В chrome же выгрузка скриптов происходит при перезагрузке или
 * закрытии вкладки. Firefox выгружает скрипты только при закрытии
 * вкладки
 */
window.addEventListener("beforeunload", function() {
	LongPoll.abort();
});