/**
 * Кроссбраузерная библиотека для удобного использования API расширений для Gecko/Webkit одновременно
 * Version 1.0: 25 марта 2016 г.
 */

var
	EXTENSION_VERSION = 2.0,
	EXTENSION_AGENT = "webkit",

	METHOD_ACCESS_TOKEN_REQUIRE = "onAccessTokenRequire",
	METHOD_LONGPOLL_DATA_RECEIVED = "onLongPollDataReceived",
	METHOD_LONGPOLL_CONNECTION_ERROR = "onLongPollConnectionError",
	METHOD_EXECUTE_API_REQUESTED = "onAPIRequestExecuted",
	METHOD_FILE_UPLOADED = "onFileUploaded",
	METHOD_FILE_UPLOAD_PROGRESS = "onFileUploading",
	IMETHOD_FILE_UPLOAD_READ = "onFileReceivedToWorker",

	EVENT_ACCESS_TOKEN_RECEIVED = "onAccessTokenReceived",
	EVENT_EXECUTE_API_REQUEST = "onAPIRequestExecute",
	EVENT_FILE_UPLOAD_REQUEST = "onFileUploadRequest",

	ERROR_NO_RESPONSE_VKAPI = 1,
	ERROR_WHILE_REQUEST_LONGPOLL = 2;

/**
 * Отправляет событие из расширения на страницу
 */
function sendEvent (method, data, callback) {
	data.method = method;
	data.callback = callback;
	data.version = EXTENSION_VERSION;
	data.agent = EXTENSION_AGENT;
	window.postMessage(data, "*");
};

/**
 * Функция-распределитель событий
 */
function receiveEvent (method, data) {
	switch (method) {

		case EVENT_ACCESS_TOKEN_RECEIVED:
			LongPoll.init(data.useraccesstoken);
			APIdog.userAgent = data.userAgent;
			break;

		case EVENT_EXECUTE_API_REQUEST:
			API(data.requestMethod, data.requestParams, function (result) {
				sendEvent(METHOD_EXECUTE_API_REQUESTED, {
					requestId: data.requestId,
					requestResult: result
				});
			});
			break;

		case EVENT_FILE_UPLOAD_REQUEST:
			chrome.runtime.sendMessage({
				method: IMETHOD_FILE_UPLOAD_READ,
				file: data.file,
				field: data.field,
				getServerMethod: data.getServerMethod,
				getServerParams: data.getServerParams,
				saveMethod: data.saveMethod
			});
			break;
	};
};

var APIdog = {

	userAgent: "VKAndroidApp/4.38-816 (Android 6.0; SDK 23; x86;  Google Nexus 5X; ru)"

};

/**
 * Обработчик нового события
 */
window.addEventListener("message", function (event) {
	if (event.source != window) {
		return;
	};

	if (event.data.method) {
		receiveEvent(event.data.method, event.data);
	};
});

/**
 * Запрос на любой сайт
 */
function RequestTask (url, params) {
	var context = this;

	this.xhr = new XMLHttpRequest();
	this.url = url;
	this.params = params || {};

	this.xhr.onloadend = function (event) {
		var result = event.target.responseText;
		if (!result) {
			return context.onError && context.onError({
				result: result,
				event: event,
				xhr: this
			});
		};

		try {
			result = JSON.parse(result);
		} catch (e) {
			return context.onError && context.onError({
				result: result,
				event: event,
				xhr: this
			});
		} finally {
			context.onComplete && context.onComplete({
				result: result || {},
				isSuccess: true
			});
		};

	};
};

RequestTask.prototype = {

	onComplete: null,
	onError: null,

	setOnComplete: function (onComplete) {
		this.onComplete = onComplete;
		return this;
	},

	setOnError: function (onError) {
		this.onError = onError;
		return this;
	},

	get: function () {
		this.url += (!~this.url.indexOf("?") ? "?" : "&") + this.params.join("&");
		this.type = "GET";
		this.send(null);
		return this;
	},

	post: function () {
		this.type = "POST";
		var queryString = [], key;

		for (key in this.params) {
			queryString.push(encodeURIComponent(key) + "=" + encodeURIComponent(this.params[key]));
		};

		this.send(queryString.join("&"));
		return this;
	},

	send: function (body) {
		this.xhr.open(this.type, this.url, true);
		this.xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		this.xhr.send(this.type === "POST" ? body : null);
		return this;
	}

};

/**
 * Запрос к API ВКонтакте
 */
 function API (method, params, callback) {
 	params = params || {};
 	params.https = 1;
	var request = new RequestTask("https://api.vk.com/method/" + method, params)
		.setOnComplete(function (result) {
			if (result.isSuccess) {
				callback(result.result);
			} else {
				console.error(result); // TODO: как-то реагировать на ошибку
			}
		})
		.post();
};


/**
 * Запрос токена со страницы для инициализации расширения
 */
sendEvent(METHOD_ACCESS_TOKEN_REQUIRE, {}, EVENT_ACCESS_TOKEN_RECEIVED);