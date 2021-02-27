"use strict";

let Service, Characteristic;

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory('homebridge-spaberry',
        'Hot Tub', spacontrol);
};

function spacontrol(log, config, api) {
    this.log = log;
    this.config = config;
    this.homebridge = api;
    this.url = this.config.url;

    // this.heater = new Service.Thermostat(this.config.name);
    // this.heater.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
    // .on("get", this.getMode.bind(this))
    // .on("set", this.getMode.bind(this));
    // this.heater.getCharacteristic(Characteristic.TargetHeatingCoolingState)
    // .on("get", this.getMode.bind(this))
    // .on("set", this.getMode.bind(this));
    // this.heater.getCharacteristic(Characteristic.CurrentTemperature)
    // .on("get", this.getMode.bind(this))
    // .on("set", this.getMode.bind(this));
    // this.heater.getCharacteristic(Characteristic.TargetTemperature)
    // .on("get", this.getMode.bind(this))
    // .on("set", this.getMode.bind(this));
    // this.heater.setCharacteristic(Characteristic.TemperatureDisplayUnits, Characteristic.TemperatureDisplayUnits.FAHRENHEIT);
    //this.pump = new Service.Switch(this.config.name);

}

function _toCelsius(f) {
    return (f - 32) * (5/9)
}

spacontrol.prototype = {
    getServices: function() {
        this.log("spacontrol.getServices");
        //if (!this.heater) return [];

        this.infoService = new Service.AccessoryInformation();
        this.infoService
            .setCharacteristic(Characteristic.Manufacturer, 'SuperFly, Inc.')
            .setCharacteristic(Characteristic. Model, 'Balboa 9800CP')

        this.heater = new Service.Thermostat(this.config.name)
        this.heater.setCharacteristic(Characteristic.TemperatureDisplayUnits, Characteristic.TemperatureDisplayUnits.FAHRENHEIT);

        this.heater
            .getCharacteristic(Characteristic.TargetHeatingCoolingState)
            .on('set', this.setTargetHeatingCoolingState.bind(this))
            .setProps({
                maxValue: Characteristic.TargetHeatingCoolingState.HEAT
            })
  
        this.heater
            .getCharacteristic(Characteristic.TargetTemperature)
            .on('set', this.setTargetTemperature.bind(this))
            .setProps({
                minValue: _toCelsius(80),
                maxValue: _toCelsius(104)
            })


        this._getSpaStatus(function () {})

        setInterval(function () {
            this._getSpaStatus(function () {})
        }.bind(this), 5000)

        return [this.infoService, this.heater];
    },

    _getSpaStatus: function(callback) {
        this.log("Getting Status from Spa...")
        // Get JSON from API
        let status = {"display":"101F","setHeat":1,"mode":1,"heating":1,"blower":0,"pump":1,"jets":0,"light":0,"temperature":94,"setTemp":101}
        // Update the relevant characteristics
        this.heater.getCharacteristic(Characteristic.CurrentTemperature).updateValue(_toCelsius(status.temperature))
        this.heater.getCharacteristic(Characteristic.TargetTemperature).updateValue(_toCelsius(status.setTemp))
        this.heater.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(status.heating)
        this.heater.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(status.heating)
        callback()
    },

    getMode: function(callback) {
        this.log('getMode');
        callback(null);
    },

    setTargetHeatingCoolingState: function (value, callback) {
        this.log("setTargetHeatingCoolingState")  
        callback()
    },
    
    setTargetTemperature: function (value, callback) {
        this.log("setTargetTemperature")  
        callback()
    },

    _toCelsius: function(f) {
        return (f - 32) * (5/9)
    }

}