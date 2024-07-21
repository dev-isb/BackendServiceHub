require('./database');
const callHistoryModel = require('./models/callHistory.model');
const callActionsModel = require('./models/actions.model');
const axios = require("axios");
const express = require('express');
const xmlParser = require('express-xml-bodyparser');
const { v4: uuidv4 } = require('uuid');
const log = console.log;
const serverPort = 4000;
const config = require("./config/general.config.json")
const logger = require('morgan');
const cors = require('cors');
const ivrCategories = ["DIAL", "PLAY", "SAY", "RECORD", "GATHER", "PAUSE", "REDIRECT", "HANGUP"];

const app = express();
app.use(xmlParser({ normalizeTags: false }));
app.use(logger('dev'));
app.use(cors());

const validateXML = (payload) => {
    const validated = {};
    const checkMainTag = Object.keys(payload);
    if (checkMainTag == "IVR") {
        for (const key of Object.keys(payload["IVR"])) {
            if (ivrCategories.includes(key)) {
                validated[key] = payload["IVR"][key];
            }
        }
        if (Object.keys(validated).length > 0) return validated;
        else return null;
    } else {
        return null;
    }
}

const filterXml = async (payload) => {
    const { xmlData, queryData } = payload
    const data = [];
    if (queryData && Object.keys(queryData).length) {
        const { accountSid } = queryData;
        if (accountSid) {
            const foundRecord = await callHistoryModel.query().where({ uniqueId: accountSid }).first();
            if (foundRecord && Object.keys(foundRecord).length > 0) {
                const { channelId, toNumber, fromNumber } = foundRecord;
                const uniqueId = accountSid;
                let counter = 1;
                for (const [key, value] of Object.entries(xmlData.IVR)) {
                    if (key == "DIAL") continue;
                    counter++;
                    for (const ele of value) {
                        const { CALLBACKURL, CALLBACKMETHOD, PRIORITY } = ele;
                        console.log("ele : ", ele);
                        if (!(typeof ele == 'object')) {
                            console.log("idhr kesa")
                            continue
                        };
                        console.log("CALLBACKURL[0] :", CALLBACKURL[0]);
                        data.push({
                            uniqueId,
                            channelId,
                            toNumber: toNumber,
                            fromNumber: fromNumber,
                            callbackUrl: CALLBACKURL[0],
                            callbackMethod: CALLBACKMETHOD[0] || "POST",
                            action: key,
                            sequence: PRIORITY[0],
                            actionValue: JSON.stringify({ [key]: value.find(e => e.PRIORITY[0] == PRIORITY[0]) }),
                            isCompleted: '0',
                        });
                    }
                }
                return data;

            }
            else {
                const uniqueId = uuidv4();
                const { TONUMBER, FROMNUMBER, CALLBACKURL, CALLBACKMETHOD } = xmlData.IVR.DIAL[0];
                console.log({ TONUMBER, FROMNUMBER, CALLBACKURL, CALLBACKMETHOD });
                let counter = 1;

                const payload = {
                    uniqueId,
                    toNumber: TONUMBER[0],
                    fromNumber: FROMNUMBER[0],
                    callbackUrl: CALLBACKURL[0],
                    callbackMethod: CALLBACKMETHOD[0] || "POST",
                    action: "DIAL",
                    sequence: 1,
                    actionValue: JSON.stringify({}),
                    isCompleted: '0',
                }
                data.push(payload);

                for (const [key, value] of Object.entries(xmlData.IVR)) {
                    if (key == "DIAL") continue;
                    counter++;
                    for (const ele of value) {
                        const { CALLBACKURL, CALLBACKMETHOD, PRIORITY } = ele;
                        console.log("ele : ", ele);
                        if (!(typeof ele == 'object')) {
                            console.log("idhr kesa")
                            continue
                        };
                        console.log("CALLBACKURL[0] :", CALLBACKURL[0]);
                        data.push({
                            uniqueId,
                            toNumber: TONUMBER[0],
                            fromNumber: FROMNUMBER[0],
                            callbackUrl: CALLBACKURL[0],
                            callbackMethod: CALLBACKMETHOD[0] || "POST",
                            action: key,
                            sequence: PRIORITY[0],
                            actionValue: JSON.stringify({ [key]: value.find(e => e.PRIORITY[0] == PRIORITY[0]) }),
                            isCompleted: '0',
                        });
                    }
                }
                return data;
            }
        }
    }
    else {
        const uniqueId = uuidv4();
        const { TONUMBER, FROMNUMBER, CALLBACKURL, CALLBACKMETHOD } = xmlData.IVR.DIAL[0];
        console.log({ TONUMBER, FROMNUMBER, CALLBACKURL, CALLBACKMETHOD });
        let counter = 1;

        const payload = {
            uniqueId,
            toNumber: TONUMBER[0],
            fromNumber: FROMNUMBER[0],
            callbackUrl: CALLBACKURL[0],
            callbackMethod: CALLBACKMETHOD[0] || "POST",
            action: "DIAL",
            sequence: 1,
            actionValue: JSON.stringify({}),
            isCompleted: '0',
        }
        data.push(payload);

        for (const [key, value] of Object.entries(xmlData.IVR)) {
            if (key == "DIAL") continue;
            counter++;
            for (const ele of value) {
                const { CALLBACKURL, CALLBACKMETHOD, PRIORITY } = ele;
                console.log("ele : ", ele);
                if (!(typeof ele == 'object')) {
                    console.log("idhr kesa")
                    continue
                };
                console.log("CALLBACKURL[0] :", CALLBACKURL[0]);
                data.push({
                    uniqueId,
                    toNumber: TONUMBER[0],
                    fromNumber: FROMNUMBER[0],
                    callbackUrl: CALLBACKURL[0],
                    callbackMethod: CALLBACKMETHOD[0] || "POST",
                    action: key,
                    sequence: PRIORITY[0],
                    actionValue: JSON.stringify({ [key]: value.find(e => e.PRIORITY[0] == PRIORITY[0]) }),
                    isCompleted: '0',
                });
            }
        }
        return data;
    }

}

app.post('/ivr', async function (req, res) {
    try {
        //log('Raw XML: ' + req.rawBody);
        log('got hit on /ivr: ' + JSON.stringify(req.body));
        log("got req .query ", JSON.stringify(req.query));
        // const isValidated = validateXML(req.body);
        // if (!isValidated) res.status(400).send({});

        /*
        call functions of IVR sent by XML request 
        */

        const dbData = await filterXml({ xmlData: req.body, queryData: req.query })
        // console.log("dbData : ", JSON.stringify(dbData));
        const dbResponse = await callHistoryModel.query().insertGraph(dbData);
        console.log("dbResponse : ", JSON.stringify(dbResponse));
        /* 
        send action request to server
        */
        const firstAction = dbResponse[0];
        console.log("first Action :", firstAction);
        const { action, actionValue, toNumber, fromNumber, id, uniqueId, channelId } = firstAction;
        const requestPayload = await actionServices[action]({
            toNumber
            , fromNumber
            , id
            , uniqueId
            , action
            , actionValue
            , channelId
        })
        const response = await axios.post(`${config.actionUrl}`, requestPayload)
        if (response && response.data) {
            const data = response.data;
            if (data?.success) {
                console.log("success api hit");
                return
            }
            else {
                console.log("failed request");
                console.log(JSON.stringify(data));
            }
        }

        res.status(201).send('<RESPONSE>Successfully added call to system.</RESPONSE>');
        return;
    } catch (error) {
        log("error", error)
        res.status(400).send('<RESPONSE>Error in adding call to system.</RESPONSE>');
        return;
    }
});

app.post('/ivr/actions/:id', async function (req, res) {
    try {
        const { id } = req.params;
        const nextCallAction = await callHistoryModel.query()
            .where({ isCompleted: '0', uniqueId: id })
            .orderBy('sequence', 'acs')
            .first();

        log(id, "nextCallAction", JSON.stringify(nextCallAction))
        if (!nextCallAction) {
            res.status(200).send({ success: true, message: 'All call actions completed', data: null });
            return;
        }

        const { action, actionValue, toNumber, fromNumber, id: newActionId, uniqueId, channelId } = nextCallAction;
        const requestPayload = await actionServices[action]({
            toNumber
            , fromNumber
            , id: newActionId
            , uniqueId
            , action
            , actionValue
            , channelId
        })

        res.status(200).send({ success: true, message: `Next call action is ${nextCallAction.action}`, data: requestPayload });
        return;
    } catch (error) {
        log("/ivr/actions error", error)
        res.status(400).send({ success: false, message: 'Error in getting call next action', data: null });
        return;
    }
});


/* 
"DIAL", "PLAY", "SAY", "RECORD", "GATHER", "PAUSE", "REDIRECT", "HANGUP"
*/
const actionServices = {};

actionServices.DIAL = async (payload) => {
    const {
        toNumber
        , fromNumber
        , id
        , uniqueId
        , action
    } = payload;

    const requestPayload = {
        values: {
            number: toNumber,
            mask: fromNumber,
            actionId: id,
            uuid: uniqueId
        },
        actionName: action

    }
    return requestPayload;
    // const response = await axios.post(`${config.actionUrl}`, requestPayload)
    // if (response && response.data) {
    //     const data = response.data;
    //     if (data?.success) {
    //         console.log("success api hit");
    //         return
    //     }
    //     else {
    //         console.log("failed request");
    //         console.log(JSON.stringify(data));
    //     }
    // }
}
actionServices.PLAY = async (payload) => {
    const {
        id
        , uniqueId
        , action
        , channelId
        , actionValue
    } = payload;

    const parsedJsonValue = JSON.parse(actionValue)
    console.log("actionValue : ", actionValue, "action key value : ", parsedJsonValue[action], "action : ", action);
    const fileName = parsedJsonValue[action]["FILE"][0];
    const requestPayload = {
        values: {
            channel: channelId,
            fileName,
            actionId: id,
            uuid: uniqueId,
        },
        actionName: action
    }

    return requestPayload;
    // const response = await axios.post(`${config.actionUrl}`, requestPayload)
    // if (response && response.data) {
    //     const data = response.data;
    //     if (data?.success) {
    //         console.log("success api hit");
    //         return
    //     }
    //     else {
    //         console.log("failed request");
    //         console.log(JSON.stringify(data));
    //     }
    // }
}
actionServices.TRANSFER = async (payload) => {
    const {
        id
        , uniqueId
        , action
        , channelId
        , actionValue
    } = payload;

    const parsedJsonValue = JSON.parse(actionValue)
    console.log("actionValue : ", actionValue, "action key value : ", parsedJsonValue[action], "action : ", action);
    const number = parsedJsonValue[action]["NUMBER"][0];
    const requestPayload = {
        values: {
            channel: channelId,
            number,
            actionId: id,
            uuid: uniqueId,
        },
        actionName: action
    }

    return requestPayload;
}
actionServices.RECORD = async (payload) => {
    const {
        id
        , uniqueId
        , action
        , channelId
    } = payload;

    const requestPayload = {
        values: {
            channel: channelId,
            actionId: id,
            uuid: uniqueId,
        },
        actionName: action
    }

    return requestPayload;

    // const response = await axios.post(`${config.actionUrl}`, requestPayload)
    // if (response && response.data) {
    //     const data = response.data;
    //     if (data?.success) {
    //         console.log("success api hit");
    //         return
    //     }
    //     else {
    //         console.log("failed request");
    //         console.log(JSON.stringify(data));
    //     }
    // }
}
actionServices.PAUSE = async (payload) => {
    const {
        id
        , uniqueId
        , action
        , channelId
        , actionValue
    } = payload;

    const parsedJson = JSON.parse(actionValue)
    const pause = parsedJson[action]["DURATION"][0];
    const requestPayload = {
        values: {
            channel: channelId,
            pause,
            actionId: id,
            uuid: uniqueId,
        },
        actionName: action
    }
    return requestPayload;
}
actionServices.HANGUP = async (payload) => {
    const {
        id
        , uniqueId
        , action
        , channelId
        , actionValue
    } = payload;


    const requestPayload = {
        values: {
            channel: channelId,
            actionId: id,
            uuid: uniqueId,
        },
        actionName: action
    }
    return requestPayload;
    // const response = await axios.post(`${config.actionUrl}`, requestPayload)
    // if (response && response.data) {
    //     const data = response.data;
    //     if (data?.success) {
    //         console.log("success api hit");
    //         return
    //     }
    //     else {
    //         console.log("failed request");
    //         console.log(JSON.stringify(data));
    //     }
    // }
}
actionServices.GATHER = async (payload) => {
    const {
        id
        , uniqueId
        , action
        , channelId
        , actionValue
    } = payload;
    const parsedJson = JSON.parse(actionValue)
    const dtmfLength = parsedJson[action]["DTMFLENGTH"][0];
    const dtmfTime = parsedJson[action]["DTMFTIME"][0];
    const requestPayload = {
        values: {
            channel: channelId,
            actionId: id,
            uuid: uniqueId,
            dtmfTime,
            dtmfLength
        },
        actionName: action
    }

    return requestPayload;
}
actionServices.SAY = async (payload) => {
    const {
        id
        , uniqueId
        , action
        , channelId
        , actionValue
    } = payload;

    const parsedJsonValue = JSON.parse(actionValue)
    console.log("actionValue : ", actionValue, "action key value : ", parsedJsonValue[action], "action : ", action);
    const tts = parsedJsonValue[action]["TEXT"][0];
    const requestPayload = {
        values: {
            channel: channelId,
            tts,
            actionId: id,
            uuid: uniqueId,
        },
        actionName: action
    }

    return requestPayload;
}
/*
curl --location 'http://127.0.0.1:4000/ivr/play' \
--header 'Content-Type: text/xml' \
--data '<IVR>
<PLAY>welcome.wav</PLAY>
<PLAY>info.wav</PLAY>
</IVR>'
*/


app.listen(serverPort, () => log("listening on port :", serverPort));