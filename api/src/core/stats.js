import StatsStore from "../store/stats-store.js";
import { env } from "../config.js";
import { createResponse } from "../processing/request.js";

let statsStore;

/**
 * Initialize the stats store
 */
export const initStatsStore = async () => {
    try {
        statsStore = new StatsStore();
        await statsStore.initializeStats();
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
            if (!statsStore) return false;
        }

        return await statsStore.recordDownload(socialMedia);
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
        if (!statsStore) {
            statsStore = await initStatsStore();
            if (!statsStore) {
                throw new Error("Failed to initialize stats store");
            }
        }

        // Get all stats
        const totalDownloads = await statsStore.getTotalDownloads();
        const downloadsToday = await statsStore.getDownloadsToday();
        const downloadsThisWeek = await statsStore.getDownloadsThisWeek();
        const downloadsThisMonth = await statsStore.getDownloadsThisMonth();
        const socialMediaStats = await statsStore.getSocialMediaStats();

        // Format response as requested in the requirements
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
        console.error("Error handling stats request:", error);
        const { status, body } = createResponse("error", {
            code: "error.api.generic"
        });
        return res.status(status).json(body);
    }
}; 