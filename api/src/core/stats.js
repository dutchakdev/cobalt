import StatsStore from "../store/stats-store.js";
import { env } from "../config.js";
import { createResponse } from "../processing/request.js";

let statsStore;

/**
 * Initialize the stats store
 */
export const initStatsStore = async () => {
    statsStore = new StatsStore();
    await statsStore.initializeStats();
    return statsStore;
};

/**
 * Record a download with optional social media source
 * @param {string} socialMedia - Social media source (optional)
 */
export const recordDownload = async (socialMedia = null) => {
    if (!statsStore) {
        await initStatsStore();
    }

    try {
        await statsStore.recordDownload(socialMedia);
        return true;
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

    if (!statsStore) {
        await initStatsStore();
    }

    try {
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