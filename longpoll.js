/*
 * APIdog+ extension
 * version 2.1
 * 18/01/2017
 */

var LongPoll = {

	userAccessToken: null,
	params: null,
	stopped: true,

	/**
	 * Инициализация LongPoll
	 */
	init: function(userAccessToken) {
		console.info("[Extension] start init longpoll");

		if (!this.stopped) {
			console.log("[Extension] already running");
			return;
		}

		this.stopped = false;
		this.userAccessToken = userAccessToken;
		this.getServer();
	},

	/**
	 * Получение адреса сервера LongPoll
	 */
	getServer: function() {
		if (this.stopped) {
			return;
		};

		var self = this;

		API("messages.getLongPollServer", {
			access_token: this.userAccessToken
		}, function(data) {
			if (!data.response) {
				data = data.error;
				sendEvent(METHOD_LONGPOLL_DATA_RECEIVED, {
					errorId: ERROR_NO_RESPONSE_VKAPI,
					error: data
				});
				return;
			};

			self.params = data.response;
			self.request();
//			console.info("[Extension] Getted longpoll server");
		});
	},

	/**
	 * Запрос к LongPoll для получения новых событий
	 */
	request: function() {
		var self = this;
		this.xhr = new RequestTask("https://" + this.params.server + "?act=a_check&key=" + this.params.key + "&ts=" + this.params.ts + "&wait=25&mode=66")
			.setOnComplete(function(result) {
//				console.log("[Extension] Received response from longpoll");
				if (result.result.failed) {
					return self.getServer();
				};
				self.params.ts = result.result.ts;
				self.xhr = null
				self.request();
				self.sendEvents(result.result.updates);

			})
			.setOnError(function(event) {
				sendEvent(METHOD_LONGPOLL_CONNECTION_ERROR, {
					errorId: ERROR_WHILE_REQUEST_LONGPOLL,
					error: event
				});
				self.getServer();
			})
			.post();
	},

	/**
	 * Отправка событий на сайт
	 */
	sendEvents: function(items) {
		sendEvent(METHOD_LONGPOLL_DATA_RECEIVED, {
			updates: items
		});
	}

};

/**
 * Костыль для Firefox
 * Не сбрасиываются скрипты при перезагрузке одной вкладки
 * В хроме же выгрузка скриптов происходит при перезагрузке или
 * закрытии вкладки. Firefox выгружает скрипты только при закрытии
 * вкладки
 */
window.addEventListener("beforeunload", function() {
	LongPoll.stopped = true;
	LongPoll.xhr && LongPoll.xhr.abort();
	console.info("[Extension] LongPoll stopped");
});