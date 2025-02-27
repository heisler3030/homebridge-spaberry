"use strict";
let Service, Characteristic

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory('homebridge-spaberry',
        'spaberry', spacontrol);
};

function spacontrol(log, config, api) {
    this.log = log;
    this.config = config;
    this.homebridge = api;
    this.url = this.config.url;
    this.debug = this.config.debug;
}

function _toCelsius(f) {
    return (f - 32) * (5/9)
}

function _toFahrenheit(c) {
    return Math.round((c * 9/5) + 32)
}

spacontrol.prototype = {
    getServices: function() {
        if (this.debug) this.log("spacontrol.getServices")
        //if (!this.heater) return [];

        this.infoService = new Service.AccessoryInformation()
        this.infoService
            .setCharacteristic(Characteristic.Manufacturer, 'SuperFly, Inc.')
            .setCharacteristic(Characteristic. Model, 'Balboa 9800CP')

        this.heater = new Service.Thermostat(this.config.name)
        this.heater.setCharacteristic(Characteristic.TemperatureDisplayUnits, Characteristic.TemperatureDisplayUnits.FAHRENHEIT);

        this.heater
            .getCharacteristic(Characteristic.TargetHeatingCoolingState)
            .on('set', this.setTargetHeatingCoolingState.bind(this))
            .setProps({
                maxValue: Characteristic.TargetHeatingCoolingState.HEAT,
                validValues: [Characteristic.TargetHeatingCoolingState.OFF, Characteristic.TargetHeatingCoolingState.HEAT]
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
        if (this.debug) this.log("Getting Status from Spa...")
        fetch(`${this.config.url}/json`)
        .then(res => res.json())
        .then(status => {
            if (this.debug) this.log(status)
            //status = json
            //let status = {"display":"101F","setHeat":1,"mode":1,"heating":1,"blower":0,"pump":1,"jets":0,"light":0,"temperature":94,"setTemp":101}
            // Update the relevant characteristics
            this.heater.getCharacteristic(Characteristic.CurrentTemperature).updateValue(_toCelsius(status.temperature))
            this.heater.getCharacteristic(Characteristic.TargetTemperature).updateValue(_toCelsius(status.setTemp))
            this.heater.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(status.mode)  // 1 = HEAT, 0 = OFF
            this.heater.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(status.mode)
            callback()
        })
        .catch(e => this.log.error(`Error in _getSpaStatus: ${e}`))
    },

    setTargetHeatingCoolingState: function (value, callback) {
        this.log.info(`Spa heat mode switched to ${value}`)
        this.heater.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(value)
        fetch(`${this.config.url}/mode`)
        .then(res => {
            this.heater.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(value)
            callback(null)
            this._getSpaStatus(function () {})
        })
        .catch(e => this.log.error(`Error in setTargetHeatingCoolingState: ${e}`))
    },    

    setTargetTemperature: function (value, callback) {
        if (this.debug) this.log(`setTargetTemperature: ${value}`)
        let newTemp = _toFahrenheit(value)
        this.log.info(`Adjusting target temp to ${newTemp}`)
        fetch(`${this.config.url}/change?temp=${newTemp}`)
        .then(res => {
            this.heater.getCharacteristic(Characteristic.TargetTemperature).updateValue(value)
            callback(null)
            this._getSpaStatus(function () {})
        })
        .catch(e => this.log.error(`Error in setTargetTemperature: ${e}`))
    }

}