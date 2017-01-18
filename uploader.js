importScripts("API.js");
importScripts("xhr2-FormData.js");

self.onmessage = function(event) {
	var d = event.data;

	console.log(d);

	var params = d.getServerParams;

	params.access_token = d.accessToken;

	API(d.getServerMethod, params, function(result) {
		if (!result || result && !result.response) {
			// TODO: обработка капчи и прочих ошибок
			return;
		};
		uploadFile(result.response.upload_url, d);
	});
};

function uploadFile(uploadURL, data) {
	var xhr = new XMLHttpRequest(),
		fd = new FormData();
	fetch(data.file).then(function(res) {
		return res.blob();
	}).then(function(blob) {
		fd.append(data.field, blob);

		xhr.open("POST", uploadURL, true);

		xhr.onprogress = function(event) {
			sendEvent(METHOD_FILE_UPLOAD_PROGRESS, { precent: event.loaded * 100 / event.total });
		};

		xhr.onload = function(event) {

		};

		xhr.send(fd);
	});
};