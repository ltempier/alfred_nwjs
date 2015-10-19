var _ = require('lodash');
var gui = require("nw.gui");


// Extend application menu for Mac OS
if (process.platform == "darwin") {
    var menu = new gui.Menu({type: "menubar"});
    menu.createMacBuiltin && menu.createMacBuiltin(window.document.title);
    gui.Window.get().menu = menu;
}


window.onload = function () {
    $('#scan-wifi').on('click', scanWifi);
    $('#scan-serial').on('click', scanSerial);
    scanWifi();

    gui.Window.get().show();
};

function scanWifi() {
    WifiUtilities.scan()
        .then(WifiUtilities.cleanApList)
        .then(function (wifiList) {
            var $list = $("#wifi-list");
            $list.empty();
            _.each(wifiList, function (wifiConfig) {
                var $option = $('<option></option>').val(wifiConfig.ssid).html(wifiConfig.ssid);
                $list.append($option);
            });
        });
}

function scanSerial() {
    var serialCommand = new SerialCommand();
    serialCommand.findDevices(function (deviceList) {

        var $list = $("#serial-list");
        $list.empty();
        _.each(deviceList, function (device) {
            var $option = $('<option></option>').val(device.port).html(device.type);
            $list.append($option);
        });

        //var wifiConfig = {
        //    channel: "1",
        //    mac: "00:1c:7b:cd:56:25",
        //    security: "WPA(PSK/AES,TKIP/TKIP) WPA2(PSK/AES,TKIP/TKIP)",
        //    signal_level: "-33",
        //    ssid: "NUMERICABLE-C93E",
        //    password: 'baurentlaptistebangbang'
        //};
        //
        //serialCommand.customSerialWifiConfig(device, wifiConfig)
        //    .then(function (s) {
        //        console.log(s)
        //    }, function (e) {
        //        console.log(e)
        //    })
    });
}
