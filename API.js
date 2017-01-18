/**
 * Запрос в сеть
 */
function RequestTask(url, params) {
	var context = this;

	this.xhr = new XMLHttpRequest();
	this.url = url;
	this.params = params || {};

	this.xhr.onloadend = function(event) {
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

	setOnComplete: function(onComplete) {
		this.onComplete = onComplete;
		return this;
	},

	setOnError: function(onError) {
		this.onError = onError;
		return this;
	},

	get: function() {
		this.url += (!~this.url.indexOf("?") ? "?" : "&") + this.params.join("&");
		this.type = "GET";
		this.send(null);
		return this;
	},

	post: function() {
		this.type = "POST";
		var queryString = [], key;

		for (key in this.params) {
			queryString.push(encodeURIComponent(key) + "=" + encodeURIComponent(this.params[key]));
		};

		this.send(queryString.join("&"));
		return this;
	},

	send: function(body) {
		this.xhr.open(this.type, this.url, true);
		this.xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		this.xhr.send(this.type === "POST" ? body : null);
		return this;
	},

	abort: function() {
		this.xhr.abort();
	}

};

/**
 * Запрос к API ВКонтакте
 */
 function API(method, params, callback) {
 	params = params || {};
	var request = new RequestTask("https://api.vk.com/method/" + method, params)
		.setOnComplete(function(result) {
			if (result.isSuccess) {
				callback(result.result);
			} else {
				console.info("ERROR API");
			}
		})
		.post();
};