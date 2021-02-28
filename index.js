"use strict";
let Service, Characteristic
const fetch = require('node-fetch')


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
}

function _toCelsius(f) {
    return (f - 32) * (5/9)
}

function _toFahrenheit(c) {
    return Math.round((c * 9/5) + 32)
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
        }.bind(this), this.config.pollInterval * 1000)

        return [this.infoService, this.heater];
    },

    _getSpaStatus: function(callback) {
        this.log("Getting Status from Spa...")
        fetch(`${this.config.url}/json`)
        .then(res => res.json())
        .then(status => {
            console.log(status)
            //status = json
            //let status = {"display":"101F","setHeat":1,"mode":1,"heating":1,"blower":0,"pump":1,"jets":0,"light":0,"temperature":94,"setTemp":101}
            // Update the relevant characteristics
            this.heater.getCharacteristic(Characteristic.CurrentTemperature).updateValue(_toCelsius(status.temperature))
            this.heater.getCharacteristic(Characteristic.TargetTemperature).updateValue(_toCelsius(status.setTemp))
            this.heater.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(status.mode)  // 1 = HEAT, 0 = OFF
            this.heater.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(status.mode)
            callback()
        })
    },

    // setTargetHeatingCoolingState: function (value, callback) {
    //     this.log("setTargetHeatingCoolingState")
    //     fetch(`${this.config.url}/mode`)
    //     .then(res => this._getSpaStatus(callback))
    // },

    setTargetHeatingCoolingState: function (value, callback) {
        this.log("setTargetHeatingCoolingState")
        fetch(`${this.config.url}/mode`)
        .then(res => {
            this.heater.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(value)
            this.heater.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(value)
            callback(null)
            this._getSpaStatus(function () {})
        })
    },    

    setTargetTemperature: function (value, callback) {
        this.log(`setTargetTemperature: ${value}`)
        fetch(`${this.config.url}/change?temp=${_toFahrenheit(value)}`)
        .then(res => {
            this.heater.getCharacteristic(Characteristic.TargetTemperature).updateValue(value)
            callback(null)
            this._getSpaStatus(function () {})
        })
    }

}