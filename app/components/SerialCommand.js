'use strict';

var util = require('util');
var _ = require('lodash');

var when = require('when');
var extend = require('xtend');
var pipeline = require('when/pipeline');

var SerialPortLib = require('serialport');
var SerialPort = SerialPortLib.SerialPort;

var specs = new DeviceSpecs();
var SerialBoredParser = new SerialBoredParser();

var SerialCommand = function (cli, options) {
    SerialCommand.super_.call(this, cli, options);
    this.options = extend({}, this.options, options);
};

util.inherits(SerialCommand, BaseCommand);

SerialCommand.prototype = extend(BaseCommand.prototype, {
    options: null,
    name: 'serial',
    description: 'simple serial interface to your devices',

    findDevices: function (callback) {
        var devices = [];
        SerialPortLib.list(function (err, ports) {
            if (err) {
                console.error('Error listing serial ports: ', err);
                return callback([]);
            }

            ports.forEach(function (port) {
                // manufacturer value
                // Mac - Spark devices
                // Devices on old driver - Spark Core, Photon
                // Devices on new driver - Particle IO (https://github.com/spark/firmware/pull/447)
                // Windows only contains the pnpId field

                var device;
                var serialDeviceSpec = _.find(specs, function (deviceSpec) {
                    if (!deviceSpec.serial) {
                        return false;
                    }
                    var vid = deviceSpec.serial.vid;
                    var pid = deviceSpec.serial.pid;

                    var usbMatches = (port.vendorId === '0x' + vid.toLowerCase() && port.productId === '0x' + pid.toLowerCase());
                    var pnpMatches = !!(port.pnpId && (port.pnpId.indexOf('VID_' + vid.toUpperCase()) >= 0) && (port.pnpId.indexOf('PID_' + pid.toUpperCase()) >= 0));

                    if (usbMatches || pnpMatches) {
                        return true;
                    }
                    return false;
                });
                if (serialDeviceSpec) {
                    device = {
                        port: port.comName,
                        type: serialDeviceSpec.productName
                    };
                }

                var matchesManufacturer = port.manufacturer && (port.manufacturer.indexOf('Particle') >= 0 || port.manufacturer.indexOf('Spark') >= 0 || port.manufacturer.indexOf('Photon') >= 0);
                if (!device && matchesManufacturer) {
                    device = {port: port.comName, type: 'Core'};
                }

                if (device) {
                    devices.push(device);
                }
            });

            //if I didn't find anything, grab any 'ttyACM's
            if (devices.length === 0) {
                ports.forEach(function (port) {
                    //if it doesn't have a manufacturer or pnpId set, but it's a ttyACM port, then lets grab it.
                    if (port.comName.indexOf('/dev/ttyACM') === 0) {
                        devices.push({port: port.comName, type: ''});
                    }
                    else if (port.comName.indexOf('/dev/cuaU') === 0) {
                        devices.push({port: port.comName, type: ''});
                    }
                });
            }

            callback(devices);
        });
    },

    WifiUtilitiescustomSerialWifiConfig: function (device, wifiConfig) {

        var serialPort = new SerialPort(device.port, {
            baudrate: 9600,
            parser: SerialBoredParser.makeParser(250)
        }, false);

        var wifiDone = when.defer();
        serialPort.on('error', function (err) {
            wifiDone.reject(err);
        });
        serialPort.on('close', serialClosedEarly);
        function serialClosedEarly() {
            wifiDone.reject('Serial port closed early');
        }

        var st = new SerialTrigger(serialPort);
        st.addTrigger('SSID:', function (cb) {
            return cb(wifiConfig.ssid + '\n');
        });

        st.addTrigger('Security 0=unsecured, 1=WEP, 2=WPA, 3=WPA2:', function (cb) {
            var security = 2; // WPA2
            return cb(security + '\n');
        });

        st.addTrigger('Security Cipher 1=AES, 2=TKIP, 3=AES+TKIP:', function (cb) {
            var cipherType = 3;
            return cb(cipherType + '\n');
        });

        st.addTrigger('Password:', function (cb) {
            return cb(wifiConfig.password + '\n');
        });

        st.addTrigger('Spark <3 you!', function () {
            wifiDone.resolve();
        });

        st.addTrigger('Particle <3 you!', function () {
            wifiDone.resolve();
        });

        serialPort.open(function (err) {
            if (err) {
                return wifiDone.reject(err);
            }
            serialPort.flush(function () {
                serialPort.on('data', function (data) {
                    console.log(data.toString());
                });

                st.start();
                serialPort.write('w', function () {
                    serialPort.drain();
                });
            });
        });

        when(wifiDone.promise).then(
            function () {
                console.log('Done! Your device should now restart.');
            },
            function (err) {
                console.log('Something went wrong:', err);
            });

        when(wifiDone.promise).ensure(function () {
            serialPort.removeListener('close', serialClosedEarly);
            serialPort.close();
        });

        return wifiDone.promise;
    }
});
