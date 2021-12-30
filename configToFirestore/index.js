/**
 * Author: robertcarroll84@gmail.com
 * Description : On PUBSUB message for device config
 * we update the device
 * Notes: 
 * 1. Enable Debug for local debugging ...
 * ToDos:
 * Date: 26-12-2021
 */

const JS_Object = require('./JS_Objects');
const admin = require('firebase-admin');
var serviceAccount = require("./serviceAccountKey.json"); //DEBUG

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
}); // DEBUG 

var db = admin.firestore();
db.settings( { timestampsInSnapshots: true });
var jsonFromRequest = new JS_Object(true);


var settingsScheduler = 
{   "relay":
        {"mode":
            {
                "set":2,
                "override":"HIGH",
                "Dates":[{"1":"HIGH"},{"2":"HIGH"},{"3":"HIGH"},{"4":"HIGH"},{"5":"HIGH"},{"6":"HIGH"},{"7":"HIGH"},{"8":"HIGH"},{"9":"HIGH"},{"10":"HIGH"},{"11":"LOW"},{"12":"HIGH"},{"13":"HIGH"},{"14":"HIGH"}],"Day":[{"57300":"LOW"},{"53700":"HIGH"}]
            }
        },
    "deviceId":"CC50E3CAD394",
    "version":0.10
};

var settingsDataMain =
{
    "version":0.10,
    "timezone":3600,
    "timezoneName":"Europe/Dublin",
    "relay":{
        "default":"HIGH",
        "on":-18,
        "off":-21,
        "mode":{"set":2,"override":"HIGH"}
    },
    "sensor":{"log_interval":300,"sensor_type":0,"max_humid":1,"max_temp":30,"wait_timer":-1,"en_logging":"on"},
    "deviceId":"CC50E3CAD394"
}

var settingsLocationData = 
{
    "version":0.10,
    "deviceId":"CC50E3CAD394",
    "name":"Test Project",
    "site":"site",
    "location":"location"
}

var settingsForUse = {
    settingsScheduler : settingsScheduler,
    settingsDataMain : settingsDataMain,
    settingsLocationData : settingsLocationData
}

/**
 * settingsToFirestore - main entry point.
 * @param {*} event 
 * @param {*} callback 
 */
exports.settingsToFirestore = (event, callback) => {

    //let data = event.headers.data; //DEBUG REMOVE EVENT BELOW
    let buff = new Buffer.from(event.data, 'base64');
    let jsonText = buff.toString('ascii');
    // Typo by team in india there is an extra "
    jsonText = jsonText.replace('""mode"', '"mode"');
    // Convert to JSON
    const settingsData = JSON.parse(jsonText);
    
    /**
     * First we need to know what the message type is 
     * There are three types 
     * 1# The Alarm Message 
     * 2# The Timezone Message
     * 3# The Schedule Message
     */
    //if (!("alarmName" in settingsData)==0)
     if (jsonFromRequest.hasMember(settingsData,"alarmNamed"))
     {
        // ALARM Message.
        alarmTriggered(settingsData);
        console.log("Alarm received");
     }
     //else if (!("timezoneName" in settingsData)==0)
     else if (jsonFromRequest.hasMember(settingsData,"timezoneName"))
     {
        // DATA from first page of the settings.
        updateSettingsDeviceBasic(settingsData);
        console.log("timezoneName received");
     }
     //else if (!("relay.mode.Dates" in settingsData)==0)
     else if (jsonFromRequest.hasMember(settingsData,"relay.mode.Dates"))
     {
         // DATA datas array
        updateScheduleSettings(settingsData);
        console.log("Dates received");
     }
    /// else if (!("location" in settingsData) ==0)
     else if (jsonFromRequest.hasMember(settingsData,"location"))
     {
        // DATA is the location of the device update.
        updateDeviceLocationAndName(settingsData);
        console.log("location received");
     }
     else 
     {
        // DATA Is date timepage update.
        updateSettingsDeviceBasic(settingsData);
        console.log("default received");
     }
    
};


/**
 * updateScheduleSettings - Update the schedule settings
 * @param {*} settingsData 
 * eyJyZWxheSI6eyJtb2RlIjp7InNldCI6Miwib3ZlcnJpZGUiOiJISUdIIiwiRGF0ZXMiOlt7IjEiOiJISUdIIn0seyIyIjoiSElHSCJ9LHsiMyI6IkhJR0gifSx7IjQiOiJISUdIIn0seyI1IjoiSElHSCJ9LHsiNiI6IkhJR0gifSx7IjciOiJISUdIIn0seyI4IjoiSElHSCJ9LHsiOSI6IkhJR0gifSx7IjEwIjoiSElHSCJ9LHsiMTEiOiJMT1cifSx7IjEyIjoiSElHSCJ9LHsiMTMiOiJISUdIIn0seyIxNCI6IkhJR0gifV0sIkRheSI6W3siNTczMDAiOiJMT1cifSx7IjUzNzAwIjoiSElHSCJ9XX19LCJkZXZpY2VJZCI6IkNDNTBFM0NBRDM5NCIsInZlcnNpb24iOjMuNDJ9
 * {"relay":{"mode":{"set":2,"override":"HIGH","Dates":[{"1":"HIGH"},{"2":"HIGH"},{"3":"HIGH"},{"4":"HIGH"},{"5":"HIGH"},{"6":"HIGH"},{"7":"HIGH"},{"8":"HIGH"},{"9":"HIGH"},{"10":"HIGH"},{"11":"LOW"},{"12":"HIGH"},{"13":"HIGH"},{"14":"HIGH"}],"Day":[{"57300":"LOW"},{"53700":"HIGH"}]}},"deviceId":"CC50E3CAD394","version":3.42}
 */
function updateScheduleSettings(settingsData)
{

    let ts = admin.firestore.Timestamp.fromMillis(Date.now());
    // 1. Check if the device Exists
    deviceDoc = db.collection('devices').doc(settingsData.deviceId);
    deviceDocObj = deviceDoc.get()
    .then(doc => {
        // 2. If Exists we use if not then we need to create
        if (!doc.exists) {
            // Reset the settings object
            let deviceSettings = null;
            updateDevice = null;
            console.log('No such document!');
            // Below we get the device default settings from the Default settings collection.
            let deviceSettingDoc = db.collection('default_Settings').doc('Sonoffth16');
            var settingDefault = deviceSettingDoc.get().then(doc => {
                console.log('Settings gotten');
                console.log(doc.data().Settings);
                
                deviceSettings = doc.data().Settings;
                console.log(deviceSettings);
                


                // Create Default data Set
                let data = {
                deviceName: '',
                CustomerName: '',
                siteName: '',
                deviceLocation: '',
                deviceId: settingsData.deviceId,
                deviceComment: '',
                deviceURL: '',
                averageForDayData: {
                    lastValue :  null,
                    TimeStamp : ts, 
                    dailyData : [
                    ]
                },
                deviceStatus: { 
                    deviceLastOnline: admin.firestore.FieldValue.serverTimestamp(),
                    deviceStatus: true,
                    firmwareVersion : '',
                    settingsVersion: settingsData.version ,
                    deviceType: 'Sonoffth16',
                    } 
                };
        
                // Add the new doc for the device.
                deviceDocUpdate = db.collection('devices').doc(settingsData.deviceId).set(data).then(ref => {
                console.log('Added document with ID: ', settingsData.deviceId);
                
        
                // return null;
                });
            
                /**
                 * Next Add the Settings Subcollection Doc
                 * Add the new doc for the device.
                */
                settingsForUse.settingsScheduler = settingsData;
                settingsForUse.version = settingsData.version;
                deviceDocSettingsUpdate = db.collection('devices').doc(settingsData.deviceId).collection('deviceSettings').doc('Settings').set(settingsForUse)
                .then(ref => {
                    console.log('Added document with ID: ', settingsData.deviceId);
                    // return null;
                });
            })
            .catch(err => {
                console.log('Error getting settings document', err);
                // return null;
            });

        } 
        // 2. Else if the doc dose actually exist we need to update it
        else 
        {
            /**
             * Update the collection with the lastest data 
             */
             settingsForUse.settingsScheduler = settingsData;
            let updateDevice = db.collection('devices').doc(settingsData.deviceId).collection('deviceSettings').doc('Settings').update({
        
                settingsScheduler : settingsData,
                version : settingsData.version

            }).then(ref => {
            console.log('Updated document Settings with ID: ', settingsData.deviceId
            );
            });
        }
    });
}

/**
 * updateSettingsDeviceBasic - This will update the settings page
 * @param {*} settingsData 
 * {"version":3.42,"timezone":3600,"timezoneName":"Europe/Dublin","relay":{"default":"HIGH","on":20,"off":25,"mode":{"set":2,"override":"HIGH"}},"sensor":{"log_interval":300,"sensor_type":0,"max_humid":1,"max_temp":30,"wait_timer":-1,"en_logging":"on"},"deviceId":"CC50E3CAD394"}
 * eyJ2ZXJzaW9uIjozLjQyLCJ0aW1lem9uZSI6MzYwMCwidGltZXpvbmVOYW1lIjoiRXVyb3BlL0R1YmxpbiIsInJlbGF5Ijp7ImRlZmF1bHQiOiJISUdIIiwib24iOiIyMCIsIm9mZiI6MjUsIm1vZGUiOnsic2V0IjoyLCJvdmVycmlkZSI6IkhJR0gifX0sInNlbnNvciI6eyJsb2dfaW50ZXJ2YWwiOjMwMCwic2Vuc29yX3R5cGUiOjAsIm1heF9odW1pZCI6MSwibWF4X3RlbXAiOjMwLCJ3YWl0X3RpbWVyIjotMSwiZW5fbG9nZ2luZyI6Im9uIn0sImRldmljZUlkIjoiQ0M1MEUzQ0FEMzk0In0=
 */
function updateSettingsDeviceBasic(settingsData)
{
    let ts = admin.firestore.Timestamp.fromMillis(Date.now());
    // 1. Check if the device Exists
    deviceDoc = db.collection('devices').doc(settingsData.deviceId);
    deviceDocObj = deviceDoc.get()
    .then(doc => {
        // 2. If Exists we use if not then we need to create
        if (!doc.exists) {
            // Reset the settings object
            let deviceSettings = null;
            updateDevice = null;
            console.log('No such document!');
            // Below we get the device default settings from the Default settings collection.
            let deviceSettingDoc = db.collection('default_Settings').doc('Sonoffth16');
            var settingDefault = deviceSettingDoc.get().then(doc => {
                console.log('Settings gotten');
                console.log(doc.data().Settings);
                
                deviceSettings = doc.data().Settings;
                console.log(deviceSettings);
                


                // Create Default data Set
                let data = {
                deviceName: '',
                CustomerName: '',
                siteName: '',
                deviceLocation: '',
                deviceId: settingsData.deviceId,
                deviceComment: '',
                deviceURL: '',
                averageForDayData: {
                    lastValue :  null,
                    TimeStamp : ts, 
                    dailyData : [
                    ]
                },
                deviceStatus: { 
                    deviceLastOnline: admin.firestore.FieldValue.serverTimestamp(),
                    deviceStatus: true,
                    firmwareVersion : '',
                    settingsVersion: settingsData.version ,
                    deviceType: 'Sonoffth16',
                    } 
                };
        
                // Add the new doc for the device.
                deviceDocUpdate = db.collection('devices').doc(settingsData.deviceId).set(data).then(ref => {
                console.log('Added document with ID: ', settingsData.deviceId);
                
        
                // return null;
                });
            
                /**
                 * Next Add the Settings Subcollection Doc
                 * Add the new doc for the device.
                */
                settingsForUse.settingsDataMain = settingsData;
                settingsForUse.version = settingsData.version;
                deviceDocSettingsUpdate = db.collection('devices').doc(settingsData.deviceId).collection('deviceSettings').doc('Settings').set(settingsForUse)
                .then(ref => {
                    console.log('Added document with ID: ', settingsData.deviceId);
                    // return null;
                });
            })
            .catch(err => {
                console.log('Error getting settings document', err);
                // return null;
            });

        } 
        // 2. Else if the doc dose actually exist we need to update it
        else 
        {
            /**
             * Update the collection with the lastest data 
             */
        
            let updateDevice = db.collection('devices').doc(settingsData.deviceId).collection('deviceSettings').doc('Settings').update({
        
                settingsDataMain : settingsData,
                version : settingsData.version

            }).then(ref => {
            console.log('Updated document Settings with ID: ', settingsData.deviceId
            );
            });
        }
    });
    
}


/**
 * updateDeviceLocationAndName - Will update the device location only if not set alrealy
 * @param {*} settingsData - A list of the settings to include  
 * {"version":3.42,"deviceId":"CC50E3CAD394","name":"Test Project","site":"site","location":"location"}
 * eyJ2ZXJzaW9uIjozLjQyLCJkZXZpY2VJZCI6IkNDNTBFM0NBRDM5NCIsIm5hbWUiOiJUZXN0IFByb2plY3QiLCJzaXRlIjoic2l0ZSIsImxvY2F0aW9uIjoibG9jYXRpb24ifQ==
 */
function updateDeviceLocationAndName(settingsData)
{

    // 1. Check if the device Exists
    deviceDoc = db.collection('devices').doc(settingsData.deviceId);
    deviceDocObj = deviceDoc.get()
    .then(doc => {
        // 2. If Exists we use if not then we need to create
        if (!doc.exists) {
            // Reset the settings object
            let deviceSettings = null;
            updateDevice = null;
            console.log('No such document!');
            // Below we get the device default settings from the Default settings collection.
            let deviceSettingDoc = db.collection('default_Settings').doc('Sonoffth16');
            var settingDefault = deviceSettingDoc.get().then(doc => {
                console.log('Settings gotten');
                console.log(doc.data().Settings);
                
                deviceSettings = doc.data().Settings;
                console.log(deviceSettings);
                let ts = admin.firestore.Timestamp.fromMillis(Date.now());


                // Create Default data Set
                let data = {
                deviceName: '',
                CustomerName: '',
                siteName: settingsData.site,
                deviceLocation: settingsData.location,
                deviceId: settingsData.deviceId,
                deviceComment: '',
                deviceURL: '',
                averageForDayData: {
                    lastValue :  null,
                    TimeStamp : ts, 
                    dailyData : [
                    ]
                },
                deviceStatus: { 
                    deviceLastOnline: admin.firestore.FieldValue.serverTimestamp(),
                    deviceStatus: true,
                    firmwareVersion : '',
                    settingsVersion: settingsData.version ,
                    deviceType: 'Sonoffth16',
                    } 
                };
        
                // Add the new doc for the device.
                deviceDocUpdate = db.collection('devices').doc(settingsData.deviceId).set(data).then(ref => {
                console.log('Added document with ID: ', settingsData.deviceId);
                /**
                 * Next Add the Settings Subcollection Doc
                 * Add the new doc for the device.
                */
                settingsForUse.settingsLocationData = settingsData;
                settingsForUse.version = settingsData.version;
                deviceDocSettingsUpdate = db.collection('devices').doc(settingsData.deviceId).collection('deviceSettings').doc('Settings').set(settingsForUse)
                .then(ref => {
                    console.log('Added document with ID: ', settingsData.deviceId);
                    // return null;
                });
                
        
                // return null;
                });
            })
            .catch(err => {
                console.log('Error getting settings document', err);
                // return null;
            });

        } 
        // 2. Else if the doc dose actually exist we need to update it
        else 
        {
            // To resolve Promise
            deviceDocUpdate = null;
            deviceDocSettingsUpdate = null;
            let ts = admin.firestore.Timestamp.fromMillis(Date.now());
            // Exists we need to update the device Status 
            console.log('Updating document!');
            console.log('Document data:', doc.data());
            /**
             * First we need to get the device data array and remove any data over 24hours old 
             * as we use round robin to do this. This will make sure we have the latest data in the array 
             * and also allow a 24hour review to a user at any point in time.
             */
            let newdaysData = [];
            const dateTimeNow = Date.now();
            var newDeviceLocation = doc.data().deviceLocation;
            var newsiteName = doc.data().siteName;
            // Check the user has not updated the feilds already if so then we take the cloud as master.
            if (newDeviceLocation == "")
            {
                newDeviceLocation = settingsData.location;
            }
            if (newsiteName == "" )
            {
                newsiteName = settingsData.site;
            }
            /**
             * Update the collection with the lastest data 
             */
            let updateDevice = db.collection('devices').doc(settingsData.deviceId).update({
                'deviceStatus.deviceStatus': true,
                'deviceStatus.firmwareVersion': '',
                'deviceStatus.settingsVersion': settingsData.version,
                'deviceStatus.deviceType': 'Sonoffth16',
                'deviceURL' : '',
                'deviceStatus.deviceLastOnline': admin.firestore.FieldValue.serverTimestamp(),
                'averageForDayData.lastTimeStamp' : ts,
                'deviceLocation' : newDeviceLocation,
                'siteName' : newsiteName

            }).then(ref => {
                console.log('Updated document with ID with device comments: ', settingsData.deviceId);
                /**
                 * Update the collection with the lastest data 
                 */
            
                let updateDevice = db.collection('devices').doc(settingsData.deviceId).collection('deviceSettings').doc('Settings').update({
            
                    settingsLocationData : settingsData,
                    version : settingsData.version

                }).then(ref => {
                console.log('Updated document Settings with ID: ', settingsData.deviceId
                );
                });
            
            

            // return null;
            });
            //return null;
        }
    })
    .catch(err => {
        console.log('Error getting document', err);
    // return null;
    });

}


/**
 * alarmTriggered - On the trigger of a alarm
 * @param {*} settingsData - The alarm data from the device.
 * {"deviceId":"AAB565BF16","alarmName":"ALM02","lastTriggered":1640709078,"status":"on" }
 * eyJ2ZXJzaW9uIjozLjUyLCJkZXZpY2VJZCI6IkNDNTBFM0NBRDM5NCIsImFsYXJtTmFtZSI6IkFMTTAxIiwibGFzdFRyaWdnZXJlZCI6MTY0MDcxMjY2Niwic3RhdHVzIjoib2ZmIiB9
 */
function alarmTriggered(settingsData)
{

    /**
     * If we have an alarm and its active then we set the alarm
     * Status via the structure below 
     */
     var alarm = {
        'ackedBy': "",
        'ackedDate' : null,
        'alarmActive': true,
        'alarmCreationDate': null,
        'alarmDescription' : "",
        'comment': "",
        'deviceId' : "",
        'deviceLocation' : "",
        'deviceName' : "",
        'sensor': "",
        'sensorLocation': "",
        'siteName': "",
        'type': 0,
        'lastActive': '',
        'alarmStillActiveOnDevice': true,
    }

    // Next we assign the code and text to the Alarm.
    if ( settingsData.alarmName == 'ALM01')
    {
        // ALM01 is device is missing sensor
        alarm.type = 1;
        alarm.alarmDescription = "The device has detected that the sensor connected is missing please check the sensor and cable."
        alarm.sensor = "DS18B20"
    }
    else if ( settingsData.alarmName == 'ALM02')
    {
        // ALM02 over temperature alarm
        alarm.type = 2;
        alarm.alarmDescription = "The device has detected the temperature detected has out of range please check the appliance is not faulty."
        alarm.sensor = "DS18B20"
    }
    let ts = admin.firestore.Timestamp.fromMillis(Date.now());
    alarm.deviceId = settingsData.deviceId;
    db.collection('alarms')
    .where('deviceId', '==', settingsData.deviceId)
    .where('alarmActive', '==', true).get()
    .then(snapshot => {
        if (!snapshot.empty)
        {
            console.log("Docs Exist");
            snapshot.forEach(doc => {
                console.log(doc.id, '=>', doc.data());
                // Check if the alarm is already active on the device
                if (doc.data().type == alarm.type)
                {
                    if ( settingsData.status == "on")
                    {
                        alarm.alarmStillActiveOnDevice = true;
                    }
                    else
                    {
                        alarm.alarmStillActiveOnDevice = false;
                    }
                }

                let updateAlarm = db.collection('alarms').doc(doc.id).update({
                    'lastActive': ts,
                    'alarmStillActiveOnDevice' : alarm.alarmStillActiveOnDevice,
 

                }).then(ref => {
                    console.log('Updated document with ID: ', settingsData.deviceId
                );
                });
            });
            
            // Alarm is already Active for the device we need to update it or we need to ack it
        }
        else
        {
            // Alarm needs to be set.
            /**
             * Convert the timestamp from the device
             */
            let timestamp = settingsData.lastTriggered ; // Add Extra missing hour
            let newTimestamp = timestamp * 1000;
            lastTriggered = admin.firestore.Timestamp.fromMillis(Math.floor(newTimestamp));
            let ts = admin.firestore.Timestamp.fromMillis(Date.now());
            alarm.deviceId = settingsData.deviceId;
            alarm.alarmCreationDate = lastTriggered;



            var newAlarm = db.collection('alarms').doc()
            .set(alarm).then(ref => {
                console.log('Added document with ID: ', settingsData.deviceId);
                // return null;
            });
        }

    });
}
