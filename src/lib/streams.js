const  Stream =require("../models/streamsModel")
const createStream = async data => {
    try {
        // Check if room already exists
        const existingStream = await Stream.findOne({
            roomName: data.roomName
        });
        if (existingStream) {
            return { message: "Stream already exists" };
        }

        // Create and save new room
        const newStream = new Stream(data);

        await newStream.save();

        return {
            message: "Stream created successfully"
        };
    } catch (error) {
        console.error(error);
        return { message: "Server error" + error };
    }
};

const getRoom = async roomName => {
    try {
        const existingRoom = await Stream.findOne({ roomName });
        if (!existingRoom) {
            return { message: "no room with that name" };
        }

        return { message: existingRoom };
    } catch (error) {
        console.log(`error:`, error);
    }
};

const addUser = async (roomName, userId) => {
    try {
        const room = await Stream.findOneAndUpdate(
            { roomName },
            { $addToSet: { users: userId } }, // Ensures the userId is added only if it doesn't exist
            { new: true }
        );

        if (!room) {
            return { message: "Room not found" };
        }

        return { message: "User added successfully", users: room.users };
    } catch (error) {
        console.error(error);
        return { message: "Server error" };
    }
};
const removeUser = async (roomName, userId) => {
    try {
        const room = await Stream.findOneAndUpdate(
            { roomName },
            { $pull: { users: userId } },
            { new: true }
        );

        if (!room) {
            return { message: "Room not found" };
        }
        console.log("user removed");
        return { message: "User removed successfully", users: room.users };
    } catch (error) {
        console.error(error);
        return { message: "Server error" };
    }
};
const deleteRoom = async roomName => {
    try {
        const deletedRoom = await Stream.findOneAndDelete({ roomName });

        if (!deletedRoom) {
            return { message: "Room not found" };
        }

        return { message: "Room deleted successfully" };
    } catch (error) {
        console.error(error);
        return { message: "Server error" };
    }
};

module.exports= { addUser, removeUser, getRoom, deleteRoom, createStream };
