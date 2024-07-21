const { val } = require("objection");

const test = {
    "DIAL": [
        {
            "TONUMBER": [
                "03455725592"
            ],
            "FROMNUMBER": [
                "123123123"
            ]
        }
    ],
    "PLAY": [
        "info.wav",
        "info11.wav"
    ],
    "SAY": [
        "Hello There",
        "Hello There2"
    ],
    "PAUSE": [
        "5"
    ],
    "HANGUP": [
        "YES"
    ]
};
const { v4: uuidv4 } = require('uuid');
const main = () => {
    const data = [];
    const id = uuidv4();
    const { TONUMBER, FROMNUMBER } = test.DIAL[0];
    let counter = 1;

    const payload = {
        id,
        toNumber: TONUMBER[0],
        fromNumber: FROMNUMBER[0],
        action: "DIAL",
        sequence: counter,
        actionValue: JSON.stringify({}),
        isCompleted: '0',
    }
    data.push(payload);

    for (const [key, value] of Object.entries(test)) {
        if (key == "DIAL") continue;
        data.push({
            id,
            toNumber: TONUMBER[0],
            fromNumber: FROMNUMBER[0],
            action: key,
            sequence: counter + 1,
            actionValue: JSON.stringify({ [key]: value }),
            isCompleted: '0',
        });
    }

    console.log(data)
    return data;
}

main();