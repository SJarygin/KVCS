/*
 * (C) Copyright 2014 Kurento (http://kurento.org/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

var ws = null;
reConnect();
var participants = {};
var name;

setInterval(function () {
    reConnect();
    var message = {id: 'roomStatistic'};
    sendMessage(message);
}, 1000);

function reConnect() {
    if (ws == null) {
        try {
            ws = new WebSocket('wss://' + location.host + '/groupcall');
            ws.onmessage = OnMessage;
            setTimeout('', 1000);
        } catch (err) {
            ws = null;
            console.error(err);
        }
    }
}

window.onload = function () {
    $('#stat').draggable();
}

window.onbeforeunload = function () {
    if (ws != null) {
        ws.close();
    }
};


function OnMessage(message) {
    var parsedMessage = JSON.parse(message.data);
    console.info('Received message: ' + message.data);

    switch (parsedMessage.id) {
        case 'existingParticipants':
            onExistingParticipants(parsedMessage);
            break;
        case 'newParticipantArrived':
            onNewParticipant(parsedMessage);
            break;
        case 'participantLeft':
            onParticipantLeft(parsedMessage);
            break;
        case 'receiveVideoAnswer':
            receiveVideoResponse(parsedMessage);
            break;
        case 'iceCandidate':
            participants[parsedMessage.name].rtcPeer.addIceCandidate(parsedMessage.candidate, function (error) {
                if (error) {
                    console.error("Error adding candidate: " + error);
                    return;
                }
            });
            break;
        case 'roomStatistic':
            viewStatistic(parsedMessage);
            break;
        default:
            console.error('Unrecognized message', parsedMessage);
    }
}

function viewStatistic(AMessage) {
    console.log(JSON.stringify(AMessage));
    var statElement = document.getElementById("statList");

    if (AMessage.rooms.length == 0) {
        statElement.innerHTML = 'No Rooms';
    }
    else {
        statElement.innerHTML = '';
        for (var i = 0; i < AMessage.rooms.length; i++) {
            if (AMessage.rooms[i].Users.length == 0)
                continue;
            var item = document.createElement('li');
            var s = AMessage.rooms[i].Name + ' : ';
            for (var j = 0; j < AMessage.rooms[i].Users.length; j++) {
                s += ' ' + AMessage.rooms[i].Users[j] + ',';
            }
            item.innerHTML = s;
            statElement.appendChild(item);
        }
    }
}

function register() {
    name = document.getElementById('name').value;
    var room = document.getElementById('roomName').value;

    document.getElementById('room-header').innerText = 'ROOM ' + room;
    document.getElementById('join').style.display = 'none';
    document.getElementById('room').style.display = 'block';

    var message = {
        id: 'joinRoom',
        name: name,
        room: room,
    };
    sendMessage(message);
}

function onNewParticipant(request) {
    receiveVideo(request.name);
}

function receiveVideoResponse(result) {
    participants[result.name].rtcPeer.processAnswer(result.sdpAnswer, function (error) {
        if (error) return console.error(error);
    });
}

function callResponse(message) {
    if (message.response != 'accepted') {
        console.info('Call not accepted by peer. Closing call');
        stop();
    } else {
        webRtcPeer.processAnswer(message.sdpAnswer, function (error) {
            if (error) return console.error(error);
        });
    }
}

function onExistingParticipants(msg) {
    var constraints = {
        audio: true,
        video: {
            mandatory: {
                maxWidth: 320,
                maxFrameRate: 15,
                minFrameRate: 15
            }
        }
    };
    console.log(name + " registered in room " + room);
    var participant = new Participant(name);
    participants[name] = participant;
    var video = participant.getVideoElement();

    var options = {
        localVideo: video,
        mediaConstraints: constraints,
        onicecandidate: participant.onIceCandidate.bind(participant)
    }
    participant.rtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options,
        function (error) {
            if (error) {
                return console.error(error);
            }
            this.generateOffer(participant.offerToReceiveVideo.bind(participant));
        });

    msg.data.forEach(receiveVideo);
}

function leaveRoom() {
    sendMessage({
        id: 'leaveRoom'
    });

    for (var key in participants) {
        participants[key].dispose();
    }

    document.getElementById('join').style.display = 'block';
    document.getElementById('room').style.display = 'none';

    ws.close();
}

function receiveVideo(sender) {
    var participant = new Participant(sender);
    participants[sender] = participant;
    var video = participant.getVideoElement();

    var options = {
        remoteVideo: video,
        onicecandidate: participant.onIceCandidate.bind(participant)
    }

    participant.rtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options,
        function (error) {
            if (error) {
                return console.error(error);
            }
            this.generateOffer(participant.offerToReceiveVideo.bind(participant));
        });
    ;
}

function onParticipantLeft(request) {
    console.log('Participant ' + request.name + ' left');
    var participant = participants[request.name];
    participant.dispose();
    delete participants[request.name];
}

function sendMessage(message) {

    if (ws == null)return;
    if (ws.readyState == WebSocket.CLOSING) {
        return;
    }
    if (ws.readyState == WebSocket.CONNECTING) {
        return;
    }
    if (ws.readyState == WebSocket.CLOSED) {
        ws = null;
        return;
    }
    try {
        var jsonMessage = JSON.stringify(message);
        console.log('Senging message: ' + jsonMessage);
        ws.send(jsonMessage);
    } catch (err) {
        console.error(err);
        ws = null;
    }
}

