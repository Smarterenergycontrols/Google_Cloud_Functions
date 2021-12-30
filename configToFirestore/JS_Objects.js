/**
 * Author: RobertCarroll84@gmail.com
 * Description: This will allow JS Objects to be searched
 * Date: 29-12-21
 * ToDos:
 * Notes:
 * Instructions: Add const JS_Object = require('./JS_Objects'); to your code and then us the Class.
 */

class JS_Object{

    JSObject = null;
    JSObjectString = "";
    
    // If the user wants a message to be printed to the console.
    #JSObjectEnableDebug = false;
    #JSObjectslistOfObjectsToFind = [];

    constructor(JSObjectEnableDebug) {
        this.#JSObjectEnableDebug = JSObjectEnableDebug;
    }

    /**
     * hasMember - Will check if the JS Object has the defined valueToFind
     * @param {*} JSobject - The Object to search
     * @param {*} valueToFind - The value delimited by . 
     * @returns true if found
     */
    hasMember(JSobject,valueToFind)
    {
        // Pass the data to the Public Feilds
        this.JSObject = JSobject;
        this.JSObjectString = JSON.stringify(JSobject);
        // Set the found flag to false
        let found = false;
        // Break up and check for the object layout.
        this.#JSObjectslistOfObjectsToFind = valueToFind.split('.');

        /**
         * Below we loop through the elements and look at the postion for the first
         * then we split at this point to find the elements scema.
         */
        var foundCounter = 0;
        var foundPosition = 0;
        for(var index = 0; index < this.#JSObjectslistOfObjectsToFind.length; index ++)
        {
            let position = this.JSObjectString.substring(foundPosition).search(this.#JSObjectslistOfObjectsToFind[index]);
            if (position != -1)
            {
                foundCounter ++;
                foundPosition = position;
            }
        }
        // If we have found all of the object keys then found is true
        if (foundCounter >= this.#JSObjectslistOfObjectsToFind.length)
        {
            found = true;
        }
        // We want debug messages then this is true.
        if(this.#JSObjectEnableDebug)
        {
            console.log(`JSObject Searching for ${valueToFind} in ${this.JSObjectString} and found is ${found}`);
        }
        return found;
    }


}
module.exports = JS_Object;


/**
 * EXAMPLE 1 - Find simple Object
 */
// var test = new JS_Object(true);
// test.hasMember({"test":12,asd : {t1:true,t2:false}},"asd");

/**
 * EXAMPLE 1 - Find complex Object
 */
// var settingsScheduler = 
// {   "relay":
//         {"mode":
//             {
//                 "set":2,
//                 "override":"HIGH",
//                 "Dates":[{"1":"HIGH"},{"2":"HIGH"},{"3":"HIGH"},{"4":"HIGH"},{"5":"HIGH"},{"6":"HIGH"},{"7":"HIGH"},{"8":"HIGH"},{"9":"HIGH"},{"10":"HIGH"},{"11":"LOW"},{"12":"HIGH"},{"13":"HIGH"},{"14":"HIGH"}],"Day":[{"57300":"LOW"},{"53700":"HIGH"}]
//             }
//         },
//     "deviceId":"CC50E3CAD394",
//     "version":3.42
// };

// test.hasMember(settingsScheduler,"relay.mode.Dafte");