/*
 * APIdog LongPoll extension for Chrome
 * v1.0
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
	console.log("longpoll.js: inited");
	sendEvent("onAccessTokenRequire", {}, "onAccessTokenReceived");
};
function start (userAccessToken) {
	API("messages.getLongPollServer", {
		access_token: userAccessToken
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
	var url = "http://" + o.server + "?act=a_check&key=" + o.key + "&ts=" + o.ts + "&wait=25&mode=66";
	Request({
		url: url,
		onComplete: function (response) {
			handleLongPollData(response.json, o);
		},
		type: "POST"
	});
};
function handleLongPollData (j, o) {
	if (j.failed)
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
		o.onComplete && o.onComplete({
			text: event.target.responseText,
			json: JSON.parse(event.target.responseText)
		});
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