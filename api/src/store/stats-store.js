import { env } from "../config.js";
import Store from "./store.js";

/**
 * Store for tracking download statistics
 */
export default class StatsStore {
    #store;

    constructor(name = 'stats') {
        this.#store = new Store(name);
        console.log(`Stats store initialized with ${env.redisURL ? 'Redis' : 'memory'} backend`);
        this.initializeStats();
    }

    async initializeStats() {
        try {
            // Initialize total downloads count if not exists
            if (!(await this.hasKey('totalDownloads'))) {
                await this.#store.set('totalDownloads', 0);
            }

            // Initialize daily stats if not exists
            if (!(await this.hasKey('dailyStats'))) {
                await this.#store.set('dailyStats', {});
            }

            // Initialize social media stats if not exists
            if (!(await this.hasKey('socialMediaStats'))) {
                await this.#store.set('socialMediaStats', {});
            }
        } catch (error) {
            console.error("Error initializing stats store:", error);
            // Continue anyway to allow the app to start even if Redis has issues
        }
    }

    /**
     * Safely check if a key exists
     */
    async hasKey(key) {
        try {
            return await this.#store.has(key);
        } catch (error) {
            console.error(`Error checking if key ${key} exists:`, error);
            return false;
        }
    }

    /**
     * Record a download with optional social media source
     * @param {string} socialMedia - Social media source (optional)
     */
    async recordDownload(socialMedia = null) {
        try {
            // Increment total downloads
            const totalDownloads = await this.getTotalDownloads();
            await this.#store.set('totalDownloads', totalDownloads + 1);

            // Update daily stats
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const dailyStats = await this.getDailyStats();

            if (!dailyStats[today]) {
                dailyStats[today] = 0;
            }
            dailyStats[today]++;

            await this.#store.set('dailyStats', dailyStats);

            // Update social media stats if available
            if (socialMedia) {
                const socialMediaStats = await this.getSocialMediaStats();

                if (!socialMediaStats[socialMedia]) {
                    socialMediaStats[socialMedia] = 0;
                }
                socialMediaStats[socialMedia]++;

                await this.#store.set('socialMediaStats', socialMediaStats);
            }
            return true;
        } catch (error) {
            console.error('Error recording download:', error);
            // Don't throw the error - we want the app to continue working
            // even if statistics can't be recorded
            return false;
        }
    }

    /**
     * Get total number of downloads
     * @returns {Promise<number>}
     */
    async getTotalDownloads() {
        try {
            return await this.#store.get('totalDownloads') || 0;
        } catch (error) {
            console.error("Error getting total downloads:", error);
            return 0;
        }
    }

    /**
     * Get daily download statistics
     * @returns {Promise<Object>}
     */
    async getDailyStats() {
        try {
            return await this.#store.get('dailyStats') || {};
        } catch (error) {
            console.error("Error getting daily stats:", error);
            return {};
        }
    }

    /**
     * Get social media download statistics
     * @returns {Promise<Object>}
     */
    async getSocialMediaStats() {
        try {
            return await this.#store.get('socialMediaStats') || {};
        } catch (error) {
            console.error("Error getting social media stats:", error);
            return {};
        }
    }

    /**
     * Get downloads from today
     * @returns {Promise<number>}
     */
    async getDownloadsToday() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const dailyStats = await this.getDailyStats();
            return dailyStats[today] || 0;
        } catch (error) {
            console.error("Error getting downloads today:", error);
            return 0;
        }
    }

    /**
     * Get downloads from this week
     * @returns {Promise<number>}
     */
    async getDownloadsThisWeek() {
        try {
            const dailyStats = await this.getDailyStats();

            // Calculate date for 7 days ago
            const today = new Date();
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);

            let weeklyTotal = 0;

            for (const [dateStr, count] of Object.entries(dailyStats)) {
                const date = new Date(dateStr);
                if (date >= weekAgo && date <= today) {
                    weeklyTotal += count;
                }
            }

            return weeklyTotal;
        } catch (error) {
            console.error("Error getting downloads this week:", error);
            return 0;
        }
    }

    /**
     * Get downloads from this month
     * @returns {Promise<number>}
     */
    async getDownloadsThisMonth() {
        try {
            const dailyStats = await this.getDailyStats();

            // Calculate current month
            const today = new Date();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();

            let monthlyTotal = 0;

            for (const [dateStr, count] of Object.entries(dailyStats)) {
                const date = new Date(dateStr);
                if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                    monthlyTotal += count;
                }
            }

            return monthlyTotal;
        } catch (error) {
            console.error("Error getting downloads this month:", error);
            return 0;
        }
    }
} 