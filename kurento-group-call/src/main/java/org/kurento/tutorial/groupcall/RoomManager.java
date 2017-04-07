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

package org.kurento.tutorial.groupcall;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import org.kurento.client.KurentoClient;
import org.kurento.jsonrpc.JsonUtils;
import org.kurento.repository.RepositoryClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.ArrayList;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * @author Ivan Gracia (izanmail@gmail.com)
 * @since 4.3.1
 */
public class RoomManager {

    private final Logger log = LoggerFactory.getLogger(RoomManager.class);

    @Autowired
    private KurentoClient kurento;
    @Autowired
    private RepositoryClient repositoryClient;


    private final ConcurrentMap<String, Room> rooms = new ConcurrentHashMap<>();

    /**
     * Looks for a room in the active room list.
     *
     * @param ARoomName the name of the room
     * @return the room if it was already created, or a new one if it is the first time this room is
     * accessed
     */
    public Room getRoom(String ARoomName) {
        log.debug("Searching for room {}", ARoomName);
        Room room = rooms.get(ARoomName);

        if (room == null) {
            log.debug("Room {} not existent. Will create now!", ARoomName);
            room = new Room(ARoomName, kurento.createMediaPipeline(),repositoryClient);
            rooms.put(ARoomName, room);
        }
        log.debug("Room {} found!", ARoomName);
        return room;
    }

    /**
     * Removes a room from the list of available rooms.
     *
     * @param ARoom the room to be removed
     */
    public void removeRoom(Room ARoom) {
        this.rooms.remove(ARoom.getName());
        ARoom.close();
        log.info("Room {} removed and closed", ARoom.getName());
    }

    public JsonObject getRoomStatistic() {
        final JsonObject result = new JsonObject();
        result.addProperty("id", "roomStatistic");

        JsonArray jsRooms = new JsonArray();

        for (String roomName : rooms.keySet()) {
            Room room = rooms.get(roomName);
            RoomStatItem roomStatItem = new RoomStatItem();
            roomStatItem.Name = roomName;
            for (UserSession userSession : room.getParticipants()) {
                roomStatItem.Users.add(userSession.getName());
            }
            if (roomStatItem.Users.size() > 0)
                jsRooms.add(JsonUtils.toJsonElement(roomStatItem));
        }
        result.add("rooms", jsRooms);
        return result;
    }


    public class RoomStatItem {
        public String Name;
        public ArrayList<String> Users = new ArrayList<>();
    }
}
