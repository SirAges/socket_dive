// routes/movieRoutes.js
const express = require("express");
const router = express.Router();
const {
    scrapeMovies,
    scrapeSearch
} = require("../controllers/moviesController");
router.get("/scrape", scrapeMovies);
router.get("/search", scrapeSearch);
module.exports = router;
