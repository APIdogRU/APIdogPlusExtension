// ==UserScript==
// @name         APIdog Plus
// @namespace    http://tampermonkey.net/
// @version      3.3
// @author       APIdog
// @grant        GM_webRequest
// @grant        GM_xmlhttpRequest
// @match        *://apidog.ru/*
// @connect      api.vk.com
// @connect      api.vk.me
// @connect      im.vk.com
// @icon         https://www.google.com/s2/favicons?domain=apidog.ru
// ==/UserScript==

let userAgent;
let longpollServer;
let longpollKey;
let longpollTs;
let longpollVersion;
let longpollMode;

const METHOD_ACCESS_TOKEN_REQUIRE = 'onAccessTokenRequire';
const METHOD_LONGPOLL_DATA_RECEIVED = 'onLongPollDataReceived';
const EVENT_ACCESS_TOKEN_RECEIVED = 'onAccessTokenReceived';

function fetch(url) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            url,
            method: 'GET',
            onload: res => {
                try {
                    resolve(JSON.parse(res.responseText));
                } catch (e) {
                    reject(undefined);
                }
            },
            onerror: reject,
        })
    });
}

function sendMessage(method, data, callback) {
    unsafeWindow.postMessage(JSON.stringify({ ...data, method, callback }), '*');
}

function getLongPollServer(token, version) {
    return fetch(`https://api.vk.com/method/messages.getLongPollServer?v=${version}&access_token=${token}`);
}

function longPollHandle() {
    const url = `https://${longpollServer}?act=a_check&key=${longpollKey}&ts=${longpollTs}&wait=25&mode=${longpollMode}&version=${longpollVersion}`;

    fetch(url).then(({ ts, updates }) => {
        longpollTs = ts;
        sendMessage(METHOD_LONGPOLL_DATA_RECEIVED, { updates });
    })
        .catch(err => console.error('APIdog Plus TM error', err))
        .then(() => setTimeout(longPollHandle, 100));
}

window.addEventListener('message', event => {
    const data = event.data;

    if (data.method === EVENT_ACCESS_TOKEN_RECEIVED) {
        userAgent = data.userAgent;
        longpollVersion = data.longpollVersion;
        longpollMode = data.mode;

        getLongPollServer(data.useraccesstoken, data.apiVersion).then(result => {
            const { server, ts, key } = result.response;

            longpollServer = server;
            longpollKey = key;
            longpollTs = ts;

            longPollHandle();
        });
    }
});

sendMessage(METHOD_ACCESS_TOKEN_REQUIRE, { version: '3.3' }, EVENT_ACCESS_TOKEN_RECEIVED);
