/*
 * APIdog+ extension
 * version 2.0
 * 25/03/2016
 */

/**
 * Вся грязная работа по LongPoll
 */
var LongPoll = {

	userAccessToken: null,
	params: null,

	/**
	 * Инициализация LongPoll
	 */
	init: function (userAccessToken) {
		this.userAccessToken = userAccessToken;
		this.getServer();
	},

	/**
	 * Получение адреса сервера LongPoll
	 */
	getServer: function () {
		var self = this;

		API("messages.getLongPollServer", {
			access_token: this.userAccessToken
		}, function (data) {

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
		});
	},

	/**
	 * Запрос к LongPoll для получения новых событий
	 */
	request: function () {
		var self = this;
		new RequestTask("https://" + this.params.server + "?act=a_check&key=" + this.params.key + "&ts=" + this.params.ts + "&wait=25&mode=66")
			.setOnComplete(function (result) {

				self.params.ts = result.result.ts;
				self.request();
				self.sendEvents(result.result.updates);

			})
			.setOnError(function (event) {

				sendEvent(METHOD_LONGPOLL_CONNECTION_ERROR, {
					errorId: ERROR_WHILE_REQUEST_LONGPOLL,
					error: event
				});
				this.getServer();

			})
			.post();
	},

	/**
	 * Отправка событий на сайт
	 */
	sendEvents: function (items) {
		sendEvent(METHOD_LONGPOLL_DATA_RECEIVED, {
			updates: items
		});
	}

};