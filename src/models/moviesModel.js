const { Schema, model } =require( "mongoose")
const coverSchema = new Schema({
    url: { type: String, required: true },
    width: { type: Number },
    height: { type: Number },
    size: { type: Number },
    format: { type: String },
    thumbnail: { type: String },
    blurHash: { type: String },
    gif: { type: String }
});

const downloadSchema = new Schema({
    id: { type: String, required: true },
    url: { type: String, required: true },
    resolution: { type: Number },
    size: { type: String }
});

const captionSchema = new Schema({
    id: { type: String, required: true },
    lan: { type: String, required: true },
    lanName: { type: String },
    url: { type: String, required: true },
    size: { type: String },
    delay: { type: Number, default: 0 }
});

const movieSchema = new Schema({
    movieId: { type: String, required: true, unique: true },
    movieType: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String },
    releaseDate: { type: Date },
    duration: { type: Number },
    genre: { type: String },
    cover: coverSchema,
    countryName: { type: String },
    imdbRatingValue: { type: String },
    subtitles: { type: String },
    ops: { type: String },
    hasResource: { type: Boolean },
    trailer: { type: String },
    keywords: { type: String },
    detailPath: { type: String, required: true },
    downloads: [downloadSchema],
    captions: [captionSchema]
});

const Movie = model("Movie", movieSchema);

module.exports = Movie;
