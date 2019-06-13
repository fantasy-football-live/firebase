"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cross_fetch_1 = require("cross-fetch");
admin.initializeApp();
const database = admin.database();
const firestore = admin.firestore();
//http endpoint
exports.checkDeadline = functions.https.onRequest((req, res) => {
    checkTimeOfNextDeadline();
    res.send('transfer deadline job complete');
    return null;
});
function checkTimeOfNextDeadline() {
    database
        .ref('fantasy-football-live')
        .child('deadline')
        .once('value')
        .then((value) => value)
        .then((time) => {
        if (!time || isPastDeadline(time)) {
            getDeadline();
        }
        else if (lessThanSixtyMinutesToDeadline(time)) {
            //if less than 60 mins before deadline, check if the notification has been sent already, if not send it
            database
                .ref('fantasy-football-live')
                .child('reminder-sent')
                .once('value')
                .then((sent) => {
                if (!sent.val()) {
                    sendReminder();
                    database
                        .ref('fantasy-football-live')
                        .child('reminder-sent')
                        .set(true)
                        .catch((err) => console.log(err));
                }
                return null;
            })
                .catch((err) => console.log(err));
        }
        return null;
    })
        .catch((err) => console.log(err));
    return null;
}
function getDeadline() {
    cross_fetch_1.default('https://fantasy.premierleague.com/drf/bootstrap-static')
        .then((data) => data.json())
        .then((data) => {
        const deadlineTime = data.next_event_fixtures[0].deadline_time;
        database
            .ref('fantasy-football-live')
            .set({
            deadline: deadlineTime,
            'reminder-sent': false
        })
            .catch((err) => console.log(err));
    })
        .catch((err) => console.log(err));
}
function sendReminder() {
    firestore
        .collection('devices')
        .listDocuments()
        .then((docs) => {
        for (const doc of docs) {
            const notification = {
                title: 'Deadline Approaching',
                body: 'Less than 60 minutes until the deadline, make your transfers soon!'
            };
            const payload = {
                notification,
                webpush: {
                    notification: {
                        vibrate: [200, 100, 200],
                        icon: 'notification_icon'
                    }
                },
                android: {
                    notification: {
                        icon: 'notification_icon',
                        color: '#BF4035'
                    }
                },
                token: doc.id
            };
            if (payload.token !== 'BLACKLISTED') {
                admin.messaging().send(payload).catch((err) => console.log(err, doc, doc.id));
            }
        }
    })
        .catch((err) => console.log(err));
}
/**
 *
 * @param time string
 */
function isPastDeadline(time) {
    return new Date().getTime() >= new Date(time.val()).getTime();
}
/**
 *
 * @param time string with UTC time
 */
function lessThanSixtyMinutesToDeadline(time) {
    //creating new date object with time of next deadline
    const sixtyMinutesBeforeDeadline = new Date(time.val());
    //setting date object to 60 mins before deadline is due to occur
    sixtyMinutesBeforeDeadline.setHours(sixtyMinutesBeforeDeadline.getHours() - 1);
    //checking if current time within the 60mins
    return new Date().getTime() >= sixtyMinutesBeforeDeadline.getTime();
}
//# sourceMappingURL=index.js.map