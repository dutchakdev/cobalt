import StatsStore from "../store/stats-store.js";
import { env } from "../config.js";
import { createResponse } from "../processing/request.js";

let statsStore;

/**
 * Initialize the stats store
 */
export const initStatsStore = async () => {
    try {
        if (!statsStore) {
            statsStore = new StatsStore();
            await statsStore.initializeStats();
        }
        return statsStore;
    } catch (error) {
        console.error("Error initializing stats store:", error);
        // Return null but don't throw - we want the application to continue
        // even if stats tracking isn't working
        return null;
    }
};

/**
 * Record a download with optional social media source
 * @param {string} socialMedia - Social media source (optional)
 */
export const recordDownload = async (socialMedia = null) => {
    try {
        if (!statsStore) {
            statsStore = await initStatsStore();
        }

        if (statsStore && statsStore.isAvailable && statsStore.isAvailable()) {
            return await statsStore.recordDownload(socialMedia);
        }
        return false;
    } catch (error) {
        console.error("Error recording download:", error);
        return false;
    }
};

/**
 * Handle stats API request
 * @returns {Object} API response with download statistics
 */
export const handleStatsRequest = async (req, res) => {
    // Verify API key or authentication if needed
    if (env.apiKeyURL && env.authRequired) {
        const authorization = req.header("Authorization");
        if (!authorization || !authorization.startsWith('API-Key ')) {
            const { status, body } = createResponse("error", {
                code: "error.api.auth.key.missing"
            });
            return res.status(status).json(body);
        }
    }

    try {
        // If we don't have a stats store yet, try to initialize it
        if (!statsStore) {
            console.log("Stats store not initialized, attempting to initialize");
            try {
                statsStore = await initStatsStore();
            } catch (initError) {
                console.error("Error initializing stats store:", initError);
                // Continue without a store
            }
        }

        // Check if the stats store is available and properly initialized
        if (!statsStore || (statsStore.isAvailable && !statsStore.isAvailable())) {
            console.log("Stats store not available, returning empty stats");
            const { status, body } = createResponse("success", {
                data: {
                    totalDownloads: 0,
                    downloadsToday: 0,
                    downloadsThisWeek: 0,
                    downloadsThisMonth: 0,
                    socialMediaStats: {}
                }
            });
            return res.status(status).json(body);
        }

        // Get all stats with individual try/catch for each operation
        let totalDownloads = 0;
        let downloadsToday = 0;
        let downloadsThisWeek = 0;
        let downloadsThisMonth = 0;
        let socialMediaStats = {};

        try {
            totalDownloads = await statsStore.getTotalDownloads();
        } catch (error) {
            console.error("Error getting total downloads:", error);
        }

        try {
            downloadsToday = await statsStore.getDownloadsToday();
        } catch (error) {
            console.error("Error getting downloads today:", error);
        }

        try {
            downloadsThisWeek = await statsStore.getDownloadsThisWeek();
        } catch (error) {
            console.error("Error getting downloads this week:", error);
        }

        try {
            downloadsThisMonth = await statsStore.getDownloadsThisMonth();
        } catch (error) {
            console.error("Error getting downloads this month:", error);
        }

        try {
            socialMediaStats = await statsStore.getSocialMediaStats();
        } catch (error) {
            console.error("Error getting social media stats:", error);
        }

        // Format response
        const { status, body } = createResponse("success", {
            data: {
                totalDownloads,
                downloadsToday,
                downloadsThisWeek,
                downloadsThisMonth,
                socialMediaStats: Object.entries(socialMediaStats).reduce((acc, [network, count]) => {
                    acc[network] = count;
                    return acc;
                }, {})
            }
        });

        return res.status(status).json(body);
    } catch (error) {
        console.error("Critical error handling stats request:", error);
        // Log the full error with stack trace
        console.error(JSON.stringify({
            message: error.message,
            stack: error.stack,
            ...error
        }));

        const { status, body } = createResponse("error", {
            code: "error.api.generic"
        });
        return res.status(status).json(body);
    }
}; 