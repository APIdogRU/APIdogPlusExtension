var
	EXTENSION_VERSION = 2.1,
	EXTENSION_AGENT = "all",

	METHOD_ACCESS_TOKEN_REQUIRE = "onAccessTokenRequire",
	METHOD_LONGPOLL_DATA_RECEIVED = "onLongPollDataReceived",
	METHOD_LONGPOLL_CONNECTION_ERROR = "onLongPollConnectionError",
	METHOD_EXECUTE_API_REQUESTED = "onAPIRequestExecuted",
	METHOD_FILE_UPLOADED = "onFileUploaded",
	METHOD_FILE_UPLOAD_PROGRESS = "onFileUploading",
	METHOD_FILE_UPLOAD_READ = "onFileReceivedToWorker",

	EVENT_ACCESS_TOKEN_RECEIVED = "onAccessTokenReceived",
	EVENT_EXECUTE_API_REQUEST = "onAPIRequestExecute",
	EVENT_FILE_UPLOAD_REQUEST = "onFileUploadRequest",

	ERROR_NO_RESPONSE_VKAPI = 1,
	ERROR_WHILE_REQUEST_LONGPOLL = 2;

/**
 * Отправляет событие из расширения на страницу
 */
function sendEvent(method, data, callback) {
	data.method = method;
	data.callback = callback;
	data.version = EXTENSION_VERSION;
	data.agent = EXTENSION_AGENT;
	console.log("EXT", JSON.stringify(data));
	window.postMessage(JSON.stringify(data), "*");
};

/**
 * Функция-распределитель событий
 */
function receiveEvent(method, data) {
	switch (method) {

		case EVENT_ACCESS_TOKEN_RECEIVED:
			LongPoll.init(data.useraccesstoken);
			APIdog.userAgent = data.userAgent;
			break;

		case EVENT_EXECUTE_API_REQUEST:
			API(data.requestMethod, data.requestParams, function(result) {
				sendEvent(METHOD_EXECUTE_API_REQUESTED, {
					requestId: data.requestId,
					requestResult: result
				});
			});
			break;

		case EVENT_FILE_UPLOAD_REQUEST:
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
			break;
	};
};

var APIdog = {

};

/**
 * Обработчик нового события
 */
window.addEventListener("message", function(event) {
	if (event.source != window) {
		return;
	};

	var res;

	// дитчайший костыль
	try {
		res = JSON.parse(event.data)
	} catch (e) {
//		console.error("DROPPED ON ", event.data, e);
		return;
	}

	if (res.method) {
		receiveEvent(res.method, JSON.parse(event.data));
	};
});


/**
 * Запрос токена со страницы для инициализации расширения
 */
sendEvent(METHOD_ACCESS_TOKEN_REQUIRE, {}, EVENT_ACCESS_TOKEN_RECEIVED);