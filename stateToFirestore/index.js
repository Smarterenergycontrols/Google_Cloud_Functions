/**
 * Author: robertcarroll84@gmail.com
 * Description : On PUBSUB message for device data even
 * tho the chaps in india put telemetry data in State we 
 * use this data to update the database
 * Notes: 
 * 1. Enable Debug for local debugging ...
 * ToDos:
 * Date: 01-10-2021
 */

const admin = require('firebase-admin');
var serviceAccount = require("./serviceAccountKey.json"); //DEBUG

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
}); // DEBUG 

var db = admin.firestore();
db.settings( { timestampsInSnapshots: true });

exports.stateToFirestore = (event, callback) => {


    // const pubsubMessage = event.headers.data; //DEBUG REMOVE EVENT BELOW
    // let data = event.headers.data; //DEBUG REMOVE EVENT BELOW
    let buff = new Buffer.from(event.data, 'base64');
    let jsonText = buff.toString('ascii');
    // Typo by team in india there is an extra "
    jsonText = jsonText.replace('""mode"', '"mode"');
    // Convert to JSON
    const stateData = JSON.parse(jsonText);

    /**
     * Convert the timestamp from the device
     */
    let timestamp = stateData.datetime ; // Add Extra missing hour
    let newTimestamp = timestamp * 1000;
    let ts = admin.firestore.Timestamp.fromMillis(Math.floor(newTimestamp));

    // 1. Check if the device Exists
    deviceDoc = db.collection('devices').doc(stateData.deviceId);
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
                creationDate : admin.firestore.FieldValue.serverTimestamp(),
                siteName: '',
                deviceLocation: '',
                deviceId: stateData.deviceId,
                deviceComment: '',
                deviceURL: '',
                averageForDayData: {
                    lastValue :  stateData,
                    lastTimeStamp : ts, 
                    dailyData : [
                        {
                            time : ts,
                            value : stateData,
                        }
                    ]
                },
                deviceStatus: { 
                    deviceLastOnline: admin.firestore.FieldValue.serverTimestamp(),
                    deviceStatus: true,
                    firmwareVersion : '',
                    settingsVersion: '',
                    deviceType: 'Sonoffth16',
                    } 
                };
          
                // Add the new doc for the device.
                deviceDocUpdate = db.collection('devices').doc(stateData.deviceId).set(data).then(ref => {
                console.log('Added document with ID: ', stateData.deviceId);
                // return null;
                });
            
                /**
                 * Next Add the Settings Subcollection Doc
                 * Add the new doc for the device.
                */
                deviceDocSettingsUpdate = db.collection('devices').doc(stateData.deviceId).collection('deviceSettings').doc('Settings').set(deviceSettings)
                .then(ref => {
                    console.log('Added document with ID: ', stateData.deviceId);
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
            // Check the ts for the correct data.
            doc.data().averageForDayData.dailyData.forEach((data,index)=>{
                var hours = Math.abs(dateTimeNow - data.time.toDate()) / 36e5;
                if (hours < 24)
                {
                    newdaysData.push(data);
                }
            })
            // Add the lastest sample.
            newdaysData.push(
                {
                    time : ts,
                    value : stateData,
                }
            )
            /**
             * Update the collection with the lastest data 
             */
          	let updateDevice = db.collection('devices').doc(stateData.deviceId).update({
          		'deviceStatus.deviceStatus': true,
              	'deviceStatus.firmwareVersion': '',
              	'deviceStatus.settingsVersion': '',
              	'deviceStatus.deviceType': 'Sonoffth16',
              	'deviceURL' : '',
                'deviceStatus.deviceLastOnline': admin.firestore.FieldValue.serverTimestamp(),
                'averageForDayData.dailyData' : newdaysData,
                'averageForDayData.lastValue' : stateData,
                'averageForDayData.lastTimeStamp' : ts,

        	}).then(ref => {
              console.log('Updated document with ID: ', stateData.deviceId
              );
             // return null;
            });
            //return null;
        }
    })
    .catch(err => {
        console.log('Error getting document', err);
       // return null;
    });
};