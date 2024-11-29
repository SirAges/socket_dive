const Movie = require("../models/moviesModel");
const { subjects, ids, alpha } = require("../data");
const axios = require("axios");
const retry = require("async-retry");

const fs = require("fs");
const path = require("path");

const baseURL = process.env.BASE_URL;
console.log("baseURL", baseURL);
const scrapeMovies = async (req, res) => {
    console.log("i am scraping");
    try {
        const fetchMovies = async (id, page) => {
            const { data: movies } = await axios.post(
                `${baseURL}/ranking-list/content`,
                {
                    id,
                    page,
                    perPage: 20
                }
            );

            return movies.data;
        };

        const fetchResources = async subjectId => {
            const { data } = await axios.get(
                `${baseURL}/subject/download?subjectId=${subjectId}&se=0&ep=0`
            );
            return data;
        };

        for (const list of ids) {
            console.log(`Processing list: ${list.title} (${list.id})`);

            let currentPage = 1;
            let hasMore = true;

            while (hasMore) {
                const response = await fetchMovies(list.id, currentPage);

                if (response?.subjectList?.length > 0) {
                    const moviesWithResources = await Promise.all(
                        response.subjectList.map(async movie => {
                            const existingMovie = await Movie.findOne({
                                movieId: movie.subjectId
                            });

                            if (existingMovie) {
                                console.log(
                                    `Movie with ID ${movie.subjectId} already exists. Skipping.`
                                );
                            }
                            if (!existingMovie) {
                                const resources = await fetchResources(
                                    movie.subjectId
                                );

                                const { subjectId, subjectType, ...others } =
                                    movie;
                                const reMovie = {
                                    movieId: subjectId,
                                    movieType: subjectType,
                                    ...others
                                };
                                if (resources?.data) {
                                    return {
                                        ...reMovie,
                                        downloads: resources.data.downloads,
                                        captions: resources.data.captions
                                    };
                                }
                            }
                        })
                    );

                    // Filter out null values (movies that already exist)
                    const newMovies = moviesWithResources.filter(Boolean);

                    if (newMovies.length > 0) {
                        await Movie.insertMany(newMovies);
                        console.log(
                            `Inserted ${newMovies.length} new movies =require( page ${currentPage}.`
                        );
                    }

                    currentPage = response.pager.nextPage;
                    hasMore = response.pager?.hasMore ?? false;
                } else {
                    hasMore = false;
                }
            }

            console.log(`Finished processing list: ${list.title}`);
        }

        res.status(200).json({
            message:
                "All movie lists successfully scraped and stored in the database."
        });
    } catch (error) {
        console.error("Error scraping movies:", error.message);
        res.status(500).json({
            message: "An error occurred while scraping movies",
            error: error.message
        });
    }
};
// Path to the progress file
const progressFilePath = path.join(__dirname, "scrapingProgress.json");

// Load the progress file (completed combinations)
const loadProgress = () => {
    try {
        if (fs.existsSync(progressFilePath)) {
            const progressData = fs.readFileSync(progressFilePath, "utf-8");
            return JSON.parse(progressData);
        }
        return []; // If no progress file exists, return empty array
    } catch (error) {
        console.error("Error reading progress file:", error.message);
        return [];
    }
};

// Save the progress to the file
const saveProgress = completedCombinations => {
    try {
        fs.writeFileSync(
            progressFilePath,
            JSON.stringify(completedCombinations, null, 2)
        );
    } catch (error) {
        console.error("Error writing progress file:", error.message);
    }
};

// Scraping function
const scrapeSearch = async (req, res) => {
    console.log("Starting scraping process...");

    try {
        // Load progress file to avoid re-scraping already completed combinations
        let completedCombinations = loadProgress();

        // Function to scrape movies based on keyword and page number
        const fetchMovies = async (keyword, page) => {
            return await retry(
                async () => {
                    const { data: movies } = await axios.post(
                        `${baseURL}/subject/search`,
                        {
                            keyword,
                            page,
                            perPage: 100,
                            subjectType: 0
                        }
                    );
                    return movies.data;
                },
                {
                    retries: 3, // Retry up to 3 times
                    factor: 2, // Exponential backoff
                    minTimeout: 1000, // 1 second wait time between retries
                    maxTimeout: 5000 // Maximum wait time 5 seconds
                }
            );
        };

        // Function to fetch movie resources
        const fetchResources = async subjectId => {
            return await retry(
                async () => {
                    const { data } = await axios.get(
                        `${baseURL}/subject/download?subjectId=${subjectId}&se=0&ep=0`
                    );
                    return data;
                },
                {
                    retries: 3,
                    factor: 2,
                    minTimeout: 1000,
                    maxTimeout: 5000
                }
            );
        };

        // Loop through combinations of A-Z and A-Z (total 26x26 combinations)
        

        for (let i = 0; i < alpha.length; i++) {
            for (let j = 0; j < alpha.length; j++) {
                const keyword = alpha[i] + alpha[j];

                // Skip if already completed
                if (completedCombinations.includes(keyword)) {
                    console.log(`Skipping already completed: ${keyword}`);
                    continue;
                }

                console.log(`Processing list: ${keyword}`);

                let currentPage = 1;
                let hasMore = true;

                while (hasMore) {
                    const response = await fetchMovies(keyword, currentPage);

                    if (response?.items?.length > 0) {
                        // Process movies one by one
                        for (const movie of response.items) {
                            const existingMovie = await Movie.findOne({
                                movieId: movie.subjectId
                            });

                            if (existingMovie) {
                                console.log(
                                    `Movie with ID ${movie.subjectId} already exists. Skipping.`
                                );
                                continue;
                            }

                            const resources = await fetchResources(
                                movie.subjectId
                            );

                            const { subjectId, subjectType, ...others } = movie;
                            const reMovie = {
                                movieId: subjectId,
                                movieType: subjectType,
                                ...others
                            };

                            if (resources?.data) {
                                const newMovie = {
                                    ...reMovie,
                                    downloads: resources.data.downloads,
                                    captions: resources.data.captions
                                };
                                await Movie.create(newMovie);
                                console.log(
                                    `Inserted new movie with ID ${subjectId}`
                                );
                            }
                        }

                        currentPage = response.pager.nextPage;
                        hasMore = response.pager?.hasMore ?? false;
                    } else {
                        hasMore = false;
                    }
                }

                // Mark this combination as completed and save progress
                completedCombinations.push(keyword);
                saveProgress(completedCombinations);

                console.log(`Finished processing list: ${keyword}`);
            }
        }

        // Final response when all combinations are completed
        res.status(200).json({
            message:
                "All movie lists successfully scraped and stored in the database."
        });
    } catch (error) {
        console.error("Error scraping movies:", error.message);
        res.status(500).json({
            message: "An error occurred while scraping movies",
            error: error.message
        });
    }
    
};
module.exports = {
    scrapeMovies,
    scrapeSearch
};
