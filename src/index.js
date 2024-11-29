require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");
const http = require("http");
const { Server } = require("socket.io");
const { router: streamerRoutes } = require("./routes/streamerRoute"); // Use .js extension if ES module
const moviesRoute = require("./routes/moviesRoute"); // Use .js extension

const {
    addUser,
    removeUser,
    deleteRoom,
    createStream,
    getRoom
} = require("./lib/streams"); // Use .js extension

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME;
// Middleware
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});
app.use(express.json());
app.use(cors());

// Database connection
mongoose
    .connect(MONGO_URL, {
        dbName: DB_NAME
    })
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch(error => {
        console.error("Error connecting to MongoDB:", error.message);
        process.exit(1); // Exit the process if DB connection fails
    });

// Routes
app.use("/api/movie", moviesRoute);
app.use("/api/streamer", streamerRoutes);

//axios.get("http://localhost:3000/api/scrape");
let rooms = {};
// WebSocket for real-time communication
io.on("connection", socket => {
    const userId = socket.handshake.query.userId;

    console.log(`User connected: ${userId}`);

    // Create a new room
    socket.on("createRoom", data => {
        const roomName = data?.roomName;
        if (rooms[roomName]) {
            socket.emit("errorMessage", "Room already exists");
        } else {
            rooms[roomName] = data;
            socket.join(roomName);
            console.log(`Room created: ${roomName} by User: ${userId}`);
            socket.emit("roomCreated", { roomName });
        }
    });

    // Join a room
    socket.on("joinRoom", roomName => {
        const room = rooms[roomName];
        if (!room) {
            socket.emit("errorMessage", "Room does not exist");
        } else if (room.creator === userId || room.users.includes(userId)) {
            socket.emit("errorMessage", "User already in the room");
        } else {
            socket.join(roomName);
            room.users.push(userId);
            console.log(`User ${userId} joined room: ${roomName}`);
            io.to(roomName).emit("userJoined", { userId });
        }
    });

    // Stream time (only the creator can emit stream updates)
    socket.on("sendStreamTime", ({ roomName, currentTime }) => {
        const room = rooms[roomName];
        if (!room) {
            socket.emit("errorMessage", "Room does not exist");
        } else if (room.creator !== userId) {
            socket.emit(
                "errorMessage",
                "Only the room creator can stream time"
            );
        } else {
            io.to(roomName).emit("receiveStreamTime", {
                currentTime,
                userId
            });
            console.log(
                `Stream time updated for room ${roomName}: ${currentTime}`
            );
        }
    });

    // Leave a room
    socket.on("leaveRoom", roomName => {
        const room = rooms[roomName];
        if (!room) {
            socket.emit("errorMessage", "Room does not exist");
        } else if (room.creator === userId) {
            delete rooms[roomName];
            io.to(roomName).emit("roomDeleted", { roomName });
            console.log(`Room deleted as creator left: ${roomName}`);
        } else if (room.users.includes(userId)) {
            socket.leave(roomName);
            room.users = room.users.filter(user => user !== userId);
            console.log(`User ${userId} left room: ${roomName}`);
            io.to(roomName).emit("userLeft", { userId });
        } else {
            socket.emit("errorMessage", "User not in the room");
        }
    });

    // Delete a room (only creator can delete the room)
    socket.on("deleteRoom", roomName => {
        const room = rooms[roomName];
        if (!room) {
            socket.emit("errorMessage", "Room does not exist");
        } else if (room.creator !== userId) {
            socket.emit(
                "errorMessage",
                "Only the room creator can delete the room"
            );
        } else {
            delete rooms[roomName];
            io.to(roomName).emit("roomDeleted", { roomName });
            console.log(`Room deleted: ${roomName}`);
        }
    });

    // Send all rooms
    socket.on("sendRooms", () => {
        socket.emit("receiveRooms", rooms);
    });

    // Handle user disconnect
    socket.on("disconnect", () => {
        for (const [roomName, room] of Object.entries(rooms)) {
            if (room.creator === userId) {
                delete rooms[roomName];
                io.to(roomName).emit("roomDeleted", { roomName });
                console.log(
                    `Room deleted as creator disconnected: ${roomName}`
                );
            } else if (room.users.includes(userId)) {
                room.users = room.users.filter(user => user !== userId);
                io.to(roomName).emit("userLeft", { userId });
                console.log(`User ${userId} left room: ${roomName}`);
            }
        }
        console.log(`User disconnected: ${userId}`);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});
