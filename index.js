var http = require('http');
const rfxcom = require('rfxcom')

var Accessory, Service, Characteristic, UUIDGen;

module.exports = function(homebridge) {
  console.log("homebridge API version: " + homebridge.version);

  // Accessory must be created from PlatformAccessory Constructor
  Accessory = homebridge.platformAccessory;

  // Service and Characteristic are from hap-nodejs
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;

  // For platform plugin to be considered as dynamic platform plugin,
  // registerPlatform(pluginName, platformName, constructor, dynamic), dynamic must be true
  homebridge.registerPlatform("homebridge-rfxtrx433", "RFXtrx433", RFXtrx433Platform, true);
}

// Platform constructor
// config may be null
// api may be null if launched from old homebridge version
function RFXtrx433Platform(log, config, api) {
  // log("RFXtrx433 Init")
  var platform = this
  this.log = log
  this.config = config
  this.accessories = []
  this.tty = this.config.tty || '/dev/ttyUSB0'
  this.debug = this.config.debug || false

  this.rfxtrx = new rfxcom.RfxCom(this.tty, {
    debug: this.debug
  });
  this.rfy = new rfxcom.Rfy(this.rfxtrx, eval(rfxcom.rfy.RFY), {});
  this.orno = new rfxcom.Lighting2(this.rfxtrx, rfxcom.lighting2.AC, {});


  this.rfxtrx.on('disconnect', () => this.log('ERROR: RFXtrx disconnect'))
  this.rfxtrx.on('connectfailed', () => this.log('ERROR: RFXtrx connect fail'))

  // this.requestServer = http.createServer(function(request, response) {
  //   if (request.url === "/add") {
  //     this.addAccessory(new Date().toISOString());
  //     response.writeHead(204);
  //     response.end();
  //   }
  //
  //   if (request.url == "/reachability") {
  //     this.updateAccessoriesReachability();
  //     response.writeHead(204);
  //     response.end();
  //   }
  //
  //   if (request.url == "/remove") {
  //     this.removeAccessory();
  //     response.writeHead(204);
  //     response.end();
  //   }
  // }.bind(this));
  //
  // this.requestServer.listen(18081, function() {
  //   platform.log("Server Listening...");
  // });

  if (api) {
    // Save the API object as plugin needs to register new accessory via this object
    this.api = api;

    // Listen to event "didFinishLaunching", this means homebridge already finished loading cached accessories.
    // Platform Plugin should only register new accessory that doesn't exist in homebridge after this event.
    // Or start discover new accessories.
    this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
  }
}

RFXtrx433Platform.prototype.didFinishLaunching = function() {
  this.rfxtrx.initialise(() => {
    this.log('RFX init done')
    this.rfxtrx.once('rfyremoteslist', remotes => {
      this.log(remotes)
    })
    // this.rfxtrx.on('receive', bytes => {this.log("e: receive"); this.log(bytes);})
    this.rfxtrx.on('lighting2', data => {
      this.log("e: lighting2");
      this.log(data);
    })
    // this.rfy.listRemotes()
    // this.rfy.up("0x020101/1", function(err, res, sequenceNumber) {
    //   if (!err) console.log('complete');
    // });
  })
  this.addAccessory("test1");
  // this.addAccessory("test2");
}

// Function invoked when homebridge tries to restore cached accessory.
// Developer can configure accessory at here (like setup event handler).
// Update current value.
RFXtrx433Platform.prototype.configureAccessory = function(accessory) {
  this.log(accessory.displayName, "Configure Accessory");
  var platform = this;

  // Set the accessory to reachable if plugin can currently process the accessory,
  // otherwise set to false and update the reachability later by invoking
  // accessory.updateReachability()
  accessory.reachable = true;

  accessory.on('identify', function(paired, callback) {
    platform.log(accessory.displayName, "Identify!!!");
    callback();
  });


  if (accessory.getService(Service.Lightbulb)) {
    accessory.getService(Service.Lightbulb)
      .getCharacteristic(Characteristic.On)
      .on('set', function(value, callback) {
        platform.log(accessory.displayName, "Lightzz -> " + value);
        this.orno.switchOn("0x02EBE746/16");
        platform.log('Done');
        // lighting2.switchOff("0xF09AC8AA/1");
        callback();
      });
  }

  this.accessories.push(accessory);
}

// Handler will be invoked when user try to config your plugin.
// Callback can be cached and invoke when necessary.
RFXtrx433Platform.prototype.configurationRequestHandler = function(context, request, callback) {
  this.log("Context: ", JSON.stringify(context));
  this.log("Request: ", JSON.stringify(request));

  // Check the request response
  if (request && request.response && request.response.inputs && request.response.inputs.name) {
    this.addAccessory(request.response.inputs.name);

    // Invoke callback with config will let homebridge save the new config into config.json
    // Callback = function(response, type, replace, config)
    // set "type" to platform if the plugin is trying to modify platforms section
    // set "replace" to true will let homebridge replace existing config in config.json
    // "config" is the data platform trying to save
    callback(null, "platform", true, {
      "platform": "RFXtrx433",
      "otherConfig": "SomeData"
    });
    return;
  }

  // - UI Type: Input
  // Can be used to request input from user
  // User response can be retrieved from request.response.inputs next time
  // when configurationRequestHandler being invoked

  var respDict = {
    "type": "Interface",
    "interface": "input",
    "title": "Add Accessory",
    "items": [{
        "id": "name",
        "title": "Name",
        "placeholder": "Fancy Light"
      } //,
      // {
      //   "id": "pw",
      //   "title": "Password",
      //   "secure": true
      // }
    ]
  }

  // - UI Type: List
  // Can be used to ask user to select something from the list
  // User response can be retrieved from request.response.selections next time
  // when configurationRequestHandler being invoked

  // var respDict = {
  //   "type": "Interface",
  //   "interface": "list",
  //   "title": "Select Something",
  //   "allowMultipleSelection": true,
  //   "items": [
  //     "A","B","C"
  //   ]
  // }

  // - UI Type: Instruction
  // Can be used to ask user to do something (other than text input)
  // Hero image is base64 encoded image data. Not really sure the maximum length HomeKit allows.

  // var respDict = {
  //   "type": "Interface",
  //   "interface": "instruction",
  //   "title": "Almost There",
  //   "detail": "Please press the button on the bridge to finish the setup.",
  //   "heroImage": "base64 image data",
  //   "showActivityIndicator": true,
  // "showNextButton": true,
  // "buttonText": "Login in browser",
  // "actionURL": "https://google.com"
  // }

  // Plugin can set context to allow it track setup process
  context.ts = "Hello";

  // Invoke callback to update setup UI
  callback(respDict);
}

// Sample function to show how developer can add accessory dynamically from outside event
RFXtrx433Platform.prototype.addAccessory = function(accessoryName) {
  this.log("Add Accessory");
  var platform = this;
  var uuid;

  uuid = UUIDGen.generate(accessoryName);

  var newAccessory = new Accessory(accessoryName, uuid);
  newAccessory.on('identify', function(paired, callback) {
    platform.log(newAccessory.displayName, "Identify!!!");
    callback();
  });


  service = new Service.WindowCovering("Test 1");

  service.setCharacteristic(Characteristic.PositionState, 2)


  newAccessory.context = {
    upDownTime: 17000,
    commandQueue: [],
    lastTargetValue: -1,
    intermediateTarget: 0
  }

  // service.getCharacteristic(Characteristic.PositionState)
  //   .on('get', function(callback) {
  //     platform.log('====== get state')
  //     // platform.log(this)
  //     callback(null, 2)
  //   });
  //
  //   service.getCharacteristic(Characteristic.CurrentPosition)
  //     .on('get', function(callback) {
  //       platform.log('====== get current')
  //       // platform.log(this)
  //       callback(null, service.getCharacteristic(Characteristic.CurrentPosition).value)
  //     });
  //
  //   service.getCharacteristic(Characteristic.TargetPosition)
  //     .on('get', function(callback) {
  //       platform.log('====== get target')
  //       // platform.log(this)
  //       callback(null, service.getCharacteristic(Characteristic.TargetPosition).value)
  //     });



  newAccessory.addService(service);

  processTimeouts = function() {
    platform.log('Processing timeouts...')
    platform.log(newAccessory.context.commandQueue)
    // platform.log('ps: '+service.getCharacteristic(Characteristic.PositionState).value)
    // setTimeout(() => {service.getCharacteristic(Characteristic.PositionState).setValue(2)}, 300)
    // Service.getCharacteristic(Characteristic.CurrentPosition)
    service.setCharacteristic(Characteristic.CurrentPosition, newAccessory.context.intermediateTarget)
    platform.log("Intermetiate position reached: " + newAccessory.context.intermediateTarget)
    if (newAccessory.context.commandQueue.length > 0) {
      newDelay = newAccessory.context.commandQueue[0].delay;
      newDir = newAccessory.context.commandQueue[0].dir;
      newAccessory.context.intermediateTarget = newAccessory.context.commandQueue[0].value
      platform.log("Setting new intermediate target " + newAccessory.context.intermediateTarget)
      if (newDir == "up") {
        service.getCharacteristic(Characteristic.PositionState).setValue(1)
        platform.log("PositionState set to 1")
        platform.rfy.up("0x020101/1", function(err, res, sequenceNumber) {
          if (!err) console.log('complete');
        });

      } else if (newDir == "down") {
        service.getCharacteristic(Characteristic.PositionState).setValue(0)
        platform.log("PositionState set to 0")
        platform.rfy.down("0x020101/1", function(err, res, sequenceNumber) {
          if (!err) console.log('complete');
        });

      }
      newAccessory.context.commandQueue.shift()
      platform.log('Transitioning for ' + newDelay + ' ms')
      setTimeout(processTimeouts, newDelay)
    } else {
      service.getCharacteristic(Characteristic.PositionState).setValue(2)
      if ((newAccessory.context.intermediateTarget > 0) && (newAccessory.context.intermediateTarget < 100)) {
        platform.log('Sending STOP command')
        platform.rfy.stop("0x020101/1", function(err, res, sequenceNumber) {
          if (!err) console.log('complete');
        });
      }
    }
    platform.log('end ps: ' + service.getCharacteristic(Characteristic.PositionState).value)
  }

  newAccessory.getService("Test 1").getCharacteristic(Characteristic.TargetPosition)
    .on('set', function(value, callback) {
      currentPosition = newAccessory.context.lastTargetValue;
      if (currentPosition == -1) {
        currentPosition = service.getCharacteristic(Characteristic.CurrentPosition).value
      }
      newAccessory.context.lastTargetValue = value;
      platform.log('Got command to transition from ' + currentPosition + ' to ' + value)
      platform.log('Current PositionState is ' + service.getCharacteristic(Characteristic.PositionState).value)
      platform.log('Current Position is ' + service.getCharacteristic(Characteristic.CurrentPosition).value)
      // platform.log('Current TargetPosition is '+service.getCharacteristic(Characteristic.TargetPosition).value)

      distance = currentPosition - value;
      delay = Math.abs(distance) / 100 * newAccessory.context.upDownTime;
      if (currentPosition < value) { // should open
        platform.log('Going up')
        newAccessory.context.commandQueue.push({
          "dir": "up",
          "value": value,
          "delay": delay
        })
      } else { // should close
        platform.log('Going down')
        newAccessory.context.commandQueue.push({
          "dir": "down",
          "value": value,
          "delay": delay
        })
      }
      if (service.getCharacteristic(Characteristic.PositionState).value == 2) {
        platform.log('Calling processTimeouts')
        setImmediate(processTimeouts)
      }
      return callback()
    });


  // newAccessory.addService(Service.WindowCovering, "Test 1")
  //   .getCharacteristic(Characteristic.TargetPosition)
  //   .on('set', function(value, callback) {
  //     platform.log(newAccessory.displayName, "Light -> " + value);
  //     callback();
  //   });


  this.accessories.push(newAccessory);
  this.api.registerPlatformAccessories("homebridge-rfxtrx433", "RFXtrx433", [newAccessory]);
}

RFXtrx433Platform.prototype.updateAccessoriesReachability = function() {
  this.log("Update Reachability");
  for (var index in this.accessories) {
    var accessory = this.accessories[index];
    accessory.updateReachability(false);
  }
}

// Sample function to show how developer can remove accessory dynamically from outside event
RFXtrx433Platform.prototype.removeAccessory = function() {
  this.log("Remove Accessory");
  this.api.unregisterPlatformAccessories("homebridge-rfxtrx433", "RFXtrx433", this.accessories);

  this.accessories = [];
}
