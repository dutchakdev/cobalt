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
        // Initialize total downloads count if not exists
        if (!(await this.#store.has('totalDownloads'))) {
            await this.#store.set('totalDownloads', 0);
        }

        // Initialize daily stats if not exists
        if (!(await this.#store.has('dailyStats'))) {
            await this.#store.set('dailyStats', {});
        }

        // Initialize social media stats if not exists
        if (!(await this.#store.has('socialMediaStats'))) {
            await this.#store.set('socialMediaStats', {});
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
        } catch (error) {
            console.error('Error recording download:', error);
            throw error;
        }
    }

    /**
     * Get total number of downloads
     * @returns {Promise<number>}
     */
    async getTotalDownloads() {
        return await this.#store.get('totalDownloads') || 0;
    }

    /**
     * Get daily download statistics
     * @returns {Promise<Object>}
     */
    async getDailyStats() {
        return await this.#store.get('dailyStats') || {};
    }

    /**
     * Get social media download statistics
     * @returns {Promise<Object>}
     */
    async getSocialMediaStats() {
        return await this.#store.get('socialMediaStats') || {};
    }

    /**
     * Get downloads from today
     * @returns {Promise<number>}
     */
    async getDownloadsToday() {
        const today = new Date().toISOString().split('T')[0];
        const dailyStats = await this.getDailyStats();
        return dailyStats[today] || 0;
    }

    /**
     * Get downloads from this week
     * @returns {Promise<number>}
     */
    async getDownloadsThisWeek() {
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
    }

    /**
     * Get downloads from this month
     * @returns {Promise<number>}
     */
    async getDownloadsThisMonth() {
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
    }
} 