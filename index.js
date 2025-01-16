"use strict";
let Service, Characteristic
const fetch = require('node-fetch')
const PUMP_ONE = '[1]' // Command to toggle pump 1
const PUMP_TWO = '[2]' // Command to toggle pump 2
//const LIGHT = '[???]' // Command to toggle light

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
            .setCharacteristic(Characteristic.Model, 'Balboa 9800CP')

        this.heater = new Service.Thermostat(this.config.name)
        this.heater.setCharacteristic(Characteristic.TemperatureDisplayUnits, Characteristic.TemperatureDisplayUnits.FAHRENHEIT);

        this.heater
            .getCharacteristic(Characteristic.TargetHeatingCoolingState)
            .on('set', this.setTargetHeatingCoolingState.bind(this))
            .setProps({
                maxValue: Characteristic.TargetHeatingCoolingState.HEAT,
                validValues: [Characteristic.TargetHeatingCoolingState.OFF, Characteristic.TargetHeatingCoolingState.HEAT]
            })
            .on('get', this._getSpaStatus.bind(this))
  
        this.heater
            .getCharacteristic(Characteristic.TargetTemperature)
            .on('set', this.setTargetTemperature.bind(this))
            .setProps({
                minValue: _toCelsius(80),
                maxValue: _toCelsius(104)
            })
            .on('get', this._getSpaStatus.bind(this))

        this.pumpOne = new Service.Fan('Pump 1', 'pumpSwitchOne')
        this.pumpOne
            .setCharacteristic(Characteristic.Name, 'Pump 1')
            .getCharacteristic(Characteristic.On)
            .onSet(this.setJets.bind(this));

        this.pumpTwo = new Service.Fan('Pump 2', 'pumpSwitchTwo')
            this.pumpTwo
                .setCharacteristic(Characteristic.Name, 'Pump 2')
                .getCharacteristic(Characteristic.On)
                .onSet(this.setJets.bind(this));

        this.light = new Service.Lightbulb('Light', 'lightSwitch')        
        this.light
            .setCharacteristic(Characteristic.Name, 'Spa Light')
            .getCharacteristic(Characteristic.On)
            .onSet(this.setLight.bind(this));

        this._getSpaStatus(function () {})

        setInterval(function () {
            this._getSpaStatus(function () {})
        }.bind(this), this.config.pollInterval * 1000)

        return [this.infoService, this.heater, this.pumpOne, this.pumpTwo, this.light]
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
            this.pumpOne.getCharacteristic(Characteristic.On).updateValue(status.jets)
            this.pumpTwo.getCharacteristic(Characteristic.On).updateValue(status.jets)
            this.light.getCharacteristic(Characteristic.On).updateValue(status.light)
            callback(null)
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
    },

    setPumpOne: function (value, callback) {
        this.log.info(`setPumpOne: ${value}`)
        //this.log.info(`${this.config.url}/command?commands=${JETS}`)
        fetch(`${this.config.url}/command?commands=${PUMP_ONE}`)
        .then(res => {
            this.pumpOne.getCharacteristic(Characteristic.On).updateValue(value)
            callback(null)
            this._getSpaStatus(function () {})
        })
        .catch(e => this.log.error(`Error in pumpOne: ${e}`))
    },

    setPumpTwo: function (value, callback) {
        this.log.info(`setPumpTwo: ${value}`)
        //this.log.info(`${this.config.url}/command?commands=${JETS}`)
        fetch(`${this.config.url}/command?commands=${PUMP_TWO}`)
        .then(res => {
            this.pumpTwo.getCharacteristic(Characteristic.On).updateValue(value)
            callback(null)
            this._getSpaStatus(function () {})
        })
        .catch(e => this.log.error(`Error in pumpTwo: ${e}`))
    },

    setLight: function (value, callback) {
        this.log.info(`setLight: ${value}`)
        //this.log.info(`${this.config.url}/command?commands=${LIGHT}`)
        fetch(`${this.config.url}/command?commands=${LIGHT}`)
        .then(res => {
            this.light.getCharacteristic(Characteristic.On).updateValue(value)
            callback(null)
            this._getSpaStatus(function () {})
        })
        .catch(e => this.log.error(`Error in setLight: ${e}`))
    }

}