'use strict';


var _ = require('lodash');

var SerialBoredParser = function () {
    _.assign(this, {
        makeParser: function (boredDelay) {
            var boredTimer,
                chunks = [];

            var whenBored = function (emitter) {
                emitter.emit('data', chunks.join(''));
                chunks = [];
            };

            var updateTimer = function (emitter) {
                clearTimeout(boredTimer);
                boredTimer = setTimeout(function () {
                    whenBored(emitter);
                }, boredDelay);
            };


            return function (emitter, buffer) {
                chunks.push(buffer.toString());
                updateTimer(emitter);
            };
        }
    })
};
