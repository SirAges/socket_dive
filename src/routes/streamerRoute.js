const express=require("express")
const router = express.Router();
const Stream = require("../models/streamsModel");
const rooms = {};
router.post("/rooms", async (req, res) => {
    const room = req.body;
    console.log(`room:`, room);
    try {
        if (rooms[room.roomName]) {
            return res.status(401).json({
                message: "Room already exist"
            });
        }
        rooms[room.roomName] = room;

        return res.status(201).json({
            message: "Room created successfully"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
});
module.exports= { router, rooms };
