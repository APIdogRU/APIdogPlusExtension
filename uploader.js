importScripts("xhr2-FormData.js");

self.onmessage = function (event) {
	var d = event.data;

	API(d.getServerMethod, d.getServerParams, function (result) {
		if (!result || !result.response) {
			// TODO: обработка капчи и прочих ошибок
			return;
		};

		uploadFile(result.response.upload_url, d);
	});
};
function uploadFile (uploadURL, data) {

	var xhr = new XMLHttpRequest(),
		fd = new FormData();
	fd.append(data.field, data.file);

	xhr.open("POST", uploadURL, true);
	xhr.onprogress = function (event) {
		sendEvent(METHOD_FILE_UPLOAD_PROGRESS, { precent: event.loaded * 100 / event.total });
	};
	xhr.onload = function (event) {

	};
	xhr.send(fd);
};