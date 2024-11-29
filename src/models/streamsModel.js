const { Schema, model } =require ("mongoose")

// Define the schema
const streamSchema = new Schema(
    {
        roomName: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        movieUrl: { type: String, required: true },
        movieId: { type: String, required: true },
        userId: { type: String, required: true },
        playSchedule: { type: Date, default: Date.now },
        movieTitle: { type: String, required: true },
        movieRuntime: { type: Number, required: true },
        moviePoster: { type: String, required: true },
        users: {
            type: [String],
            ref: "User",
            default: []
        }
    },
    { timestamps: true }
);

// Create the model
const Stream = model("Stream", streamSchema);

// Export the model
module.exports = Stream;
