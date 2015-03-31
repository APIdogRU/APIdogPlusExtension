/*
 * APIdog LongPoll extension for Chrome
 * v1.2
 * 29/03/2015
 */

function sendEvent (method, data, callback) {
	console.log("longpoll.js: sendEvent<" + method + ">");
	data.method = method;
	data.callback = callback;
	window.postMessage(data, "*");
	console.log("APIdogExtensionReceiverSendEvent<" + method + ">:", data);
};
window.addEventListener("message", function (event) {
	if (event.source != window)
		return;
	if (event.data.method) {
		console.log("APIdogExtensionReceiverSendEvent<" + event.data.method + ">: ", event.data);
		receiveEvent(event.data);
	};
});
function receiveEvent (event) {
	console.log("APIdogExtensionReceiverOut<" + event.method + ">: ", event);
	switch (event.method) {
		case "onAccessTokenReceived":
			start(event.useraccesstoken);
			break;
	};
};
function init () {
	console.log("APIdogExtension<Inited>");
	sendEvent("onAccessTokenRequire", {}, "onAccessTokenReceived");
};
function start (userAccessToken) {
	API("messages.getLongPollServer", {
		access_token: userAccessToken,
		https: 1
	}, function (data) {
		if (!data.response) {
			data = data.error;
			sendEvent("onLongPollDataReceived", {errorId: data.error_code, error: data});
			return;
		};
		data = data.response;
		getLongPoll({
			userAccessToken: userAccessToken,
			server: data.server,
			key: data.key,
			ts: data.ts
		});
	});
};

function getLongPoll (o) {
	var url = "https://" + o.server + "?act=a_check&key=" + o.key + "&ts=" + o.ts + "&wait=25&mode=66";
	Request({
		url: url,
		onComplete: function (response) {
			handleLongPollData(response.json, o);
		},
		onError: function (event) {
			sendEvent("onLongPollConnectionError", {error: event});
			start(o.userAccessToken);
		},
		type: "POST"
	});
};
function handleLongPollData (j, o) {
	if (!j || j.failed)
		return start(o.userAccessToken);

	o.ts = j.ts;

	sendEvent("onLongPollDataReceived", {updates: j.updates});
	getLongPoll(o);
};

function API (method, params, callback) {
	Request({
		url: "https://api.vk.com/method/" + method,
		content: params,
		onComplete: function (response) {
			callback(response.json);
		},
		type: "GET"
	});
};
function Request (o) {
	o = o || {};
	var xhr = new XMLHttpRequest();
	xhr.onloadend = function (event) {
		var result = event.target.responseText;
		if (!result)
			return o.onError && o.onError({response: result, event: event, xhr: xhr});
		try {
			result = JSON.parse(result);
		} catch (e) {
			return o.onError && o.onError({response: result, event: event, xhr: xhr});
		} finally {
			o.onComplete && o.onComplete({json: result || {}});
		};
	};
	var url = o.url,
		type = (o.type || "get").toUpperCase();
	if (o.content) {
		var params = [], c = o.content, e = encodeURIComponent;
		for (var k in c)
			params.push(e(k) + "=" + e(c[k]));
		if (type === "GET")
			url += (!~url.indexOf("?") ? "?" : "&") + params.join("&");
	};
	xhr.open(type, url, true);
	xhr.send(type === "POST" ? params : null);
};

init();