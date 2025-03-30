import { Store } from "./base-store.js";
import { env } from "../config.js";

/**
 * Store for tracking download statistics using Redis
 * Falls back to memory store if Redis is not available
 */
export default class StatsStore extends Store {
    constructor(name = 'stats') {
        super(name);
        this.useRedis = !!env.redisURL;
        console.log(`Stats store initialized with ${this.useRedis ? 'Redis' : 'memory'} backend`);
        this.initializeStats();
    }

    async initializeStats() {
        // Initialize total downloads count if not exists
        if (!(await this._has('totalDownloads'))) {
            await this._set('totalDownloads', 0);
        }

        // Initialize daily stats if not exists
        if (!(await this._has('dailyStats'))) {
            await this._set('dailyStats', {});
        }

        // Initialize social media stats if not exists
        if (!(await this._has('socialMediaStats'))) {
            await this._set('socialMediaStats', {});
        }
    }

    /**
     * Record a download with optional social media source
     * @param {string} socialMedia - Social media source (optional)
     */
    async recordDownload(socialMedia = null) {
        // Increment total downloads using Redis INCR if available
        if (this.useRedis) {
            try {
                // For Redis implementations, we'll rely on the appropriate Redis commands
                // via the Store interface which should map to Redis operations
                await this._set('totalDownloads', (await this.getTotalDownloads()) + 1);

                // Update daily stats
                const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                const dailyStats = await this.getDailyStats();

                if (!dailyStats[today]) {
                    dailyStats[today] = 0;
                }
                dailyStats[today]++;

                await this._set('dailyStats', dailyStats);

                // Update social media stats if available
                if (socialMedia) {
                    const socialMediaStats = await this.getSocialMediaStats();

                    if (!socialMediaStats[socialMedia]) {
                        socialMediaStats[socialMedia] = 0;
                    }
                    socialMediaStats[socialMedia]++;

                    await this._set('socialMediaStats', socialMediaStats);
                }
            } catch (error) {
                console.error('Error recording download in Redis:', error);
                throw error;
            }
        } else {
            // Fallback to memory store implementation
            // Increment total downloads
            const totalDownloads = await this.getTotalDownloads();
            await this._set('totalDownloads', totalDownloads + 1);

            // Update daily stats
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const dailyStats = await this.getDailyStats();

            if (!dailyStats[today]) {
                dailyStats[today] = 0;
            }
            dailyStats[today]++;

            await this._set('dailyStats', dailyStats);

            // Update social media stats if available
            if (socialMedia) {
                const socialMediaStats = await this.getSocialMediaStats();

                if (!socialMediaStats[socialMedia]) {
                    socialMediaStats[socialMedia] = 0;
                }
                socialMediaStats[socialMedia]++;

                await this._set('socialMediaStats', socialMediaStats);
            }
        }
    }

    /**
     * Get total number of downloads
     * @returns {Promise<number>}
     */
    async getTotalDownloads() {
        return await this._get('totalDownloads') || 0;
    }

    /**
     * Get daily download statistics
     * @returns {Promise<Object>}
     */
    async getDailyStats() {
        return await this._get('dailyStats') || {};
    }

    /**
     * Get social media download statistics
     * @returns {Promise<Object>}
     */
    async getSocialMediaStats() {
        return await this._get('socialMediaStats') || {};
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