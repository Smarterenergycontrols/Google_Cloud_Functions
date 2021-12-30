/**
 * Author: robertcarroll84@gmail.com
 * Description : On PUBSUB message for device config
 * we update the device
 * Notes: 
 * 1. Enable Debug for local debugging ...
 * ToDos:
 * Date: 26-12-2021
 */
 'use strict';
const admin = require('firebase-admin');
var serviceAccount = require("./serviceAccountKey.json"); //DEBUG


const {google} = require('googleapis');
const iot = require('@google-cloud/iot');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
}); // DEBUG 

var db = admin.firestore();
db.settings( { timestampsInSnapshots: true });

var settingsToSend =
{
    "version":"10.53",
    "timezone":9,
    "relay":{
        "default":"HIGH",
        "on":18.00,
        "off":25.00,
        "mode":
        {"set":2,
        "override":"HIGH",
        "Dates":[{"1":"HIGH"},{"2":"HIGH"},{"3":"HIGH"},{"4":"HIGH"},{"5":"HIGH"},{"6":"HIGH"},{"7":"HIGH"},{"8":"HIGH"},{"9":"HIGH"},{"10":"HIGH"},{"11":"LOW"},{"12":"HIGH"},{"13":"HIGH"},{"14":"HIGH"}],
        "Day":[{"429496729":"HIGH"},{"429496729":"HIGH"}]
    }
},
    "sensor":{
        "log_interval":300,
        "sensor_type":0,
        "max_humid":1.00,
        "max_temp":30,
        "wait_timer":-1,
        "en_logging":"on"
    }
}


/**
 * updateDeviceConfig - main entry point.
 * @param {*} event 
 * @param {*} callback 
 */
exports.updateDeviceConfig = (req, res) => {
    console.log('Started');
    console.log(req.body);
    var data = req.body;
    
    // Convert to JSON
    const settingsData = data;
    // Update the version to start with.
    console.log(settingsData);
    
    db.collection('devices').doc(settingsData.deviceId).collection('deviceSettings').doc('Settings').get()
    .then(doc => {
        //console.log(doc.data());
        var test = doc.data();
        settingsToSend.version = updateVersion(doc.data().version);
        settingsToSend.timezone = doc.data().settingsDataMain.timezone;
        settingsToSend.relay.default = doc.data().settingsDataMain.relay.default;
        settingsToSend.relay.on = doc.data().settingsDataMain.relay.on;
        settingsToSend.relay.off = doc.data().settingsDataMain.relay.off;
        settingsToSend.relay.mode.set = doc.data().settingsDataMain.relay.mode.set;
        settingsToSend.relay.mode.override = doc.data().settingsDataMain.relay.mode.override;
        settingsToSend.relay.mode.Dates = doc.data().settingsScheduler.relay.mode.Dates;
        settingsToSend.relay.mode.Day = doc.data().settingsScheduler.relay.mode.Day;
        settingsToSend.sensor = doc.data().settingsDataMain.sensor;
        console.log( JSON.stringify(settingsToSend));
        /**
         * Update the version of settings the the firebase.
         */
      
        let updateDevice = db.collection('devices').doc(settingsData.deviceId).collection('deviceSettings').doc('Settings').update({
        
            version : settingsToSend.version

        }).then(ref => {
            console.log('Updated document Settings with ID: ', settingsData.deviceId);
            console.log(sendConfigToDevice(settingsToSend));
        });
    })
    .catch(err => {
        console.log(err);
    });
    
};

var responceMessage = {
    data : null,
    error : {
        status : false,
        code : 0,
        description: ""
    }
}

// Used to reset the responce Message.
function resetMessage()
{
    responceMessage = {
        data : null,
        error : {
            status : false,
            code : 0,
            description: ""
        }
    }
}

function sendConfigToDevice(Config)
{
    resetMessage();
      // Take the data from the request.
      const projectId = 'seci-322519';
      const cloudRegion = 'europe-west1';
      const registryId = 'SonOffTH17';
      const deviceId = 'CC50E3CAD394';
      const deviceConfig = Config;
  
      return google.auth.getClient().then(client => {
              google.options({
                  auth: client
              });
  
              // Create the Nessary project links 
              const parentName = `projects/${projectId}/locations/${cloudRegion}`;
              const registryName = `${parentName}/registries/${registryId}`;
              // Turn the String JSON to base64
              const binaryData = Buffer.from(JSON.stringify(deviceConfig)).toString('base64');
              // Create the request
              const request = {
                  name: `${registryName}/devices/${deviceId}`,
                  versionToUpdate: 0,
                  binaryData: binaryData
              };
  
              return google.cloudiot('v1').projects.locations.registries.devices.modifyCloudToDeviceConfig(request).then(result => {
                  //console.log(result);
                  responceMessage.data = "Done";
                  console.log("OK");
                  return responceMessage;
              }).catch(error => {
                  responceMessage.data = error;
                  responceMessage.error.status = true;
                  responceMessage.error.code = 1;
                  responceMessage.error.description = `Failed to send the config to the device ${deviceId}` ;
                  console.log("NOK");
                  // 403  Device Error or NO device
                  return responceMessage;
          });
      });

}
/**
 * updateVersion - will update the version of the settings.
 * @param {float} currentVersion - The current version of the settings
 * @returns {float} newVersion - The new version of settings
 */
function updateVersion(currentVersion)
{
    var version = parseFloat(currentVersion) + 0.01;
    console.log("New Version" + version.toFixed(2).toString());
    return version.toFixed(2).toString();
}



