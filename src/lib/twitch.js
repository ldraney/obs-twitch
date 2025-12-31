/**
 * Twitch API Client
 *
 * Provides access to Twitch Helix API for affiliate tracking.
 * Credentials loaded from ~/twitch-secrets/.env
 */

const path = require('path');
const os = require('os');

// Load Twitch secrets from separate file
require('dotenv').config({
  path: path.join(os.homedir(), 'twitch-secrets', '.env')
});

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const USERNAME = process.env.TWITCH_USERNAME || 'devopsphilosopher';

const API_BASE = 'https://api.twitch.tv/helix';

class TwitchClient {
  constructor() {
    this.accessToken = process.env.TWITCH_ACCESS_TOKEN;
    this.userId = null;
  }

  async ensureToken() {
    if (!this.accessToken) {
      // Get a new app token
      const response = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: 'client_credentials',
        }),
      });
      const data = await response.json();
      if (data.access_token) {
        this.accessToken = data.access_token;
      } else {
        throw new Error('Failed to get Twitch access token');
      }
    }
    return this.accessToken;
  }

  async apiCall(endpoint) {
    await this.ensureToken();

    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Client-Id': CLIENT_ID,
      },
    });

    if (response.status === 401) {
      // Token expired, get a new one
      this.accessToken = null;
      await this.ensureToken();
      return this.apiCall(endpoint);
    }

    const data = await response.json();

    // Include rate limit info
    data._rateLimit = {
      limit: response.headers.get('Ratelimit-Limit'),
      remaining: response.headers.get('Ratelimit-Remaining'),
      reset: response.headers.get('Ratelimit-Reset'),
    };

    return data;
  }

  async getUser(username = USERNAME) {
    const data = await this.apiCall(`/users?login=${username}`);
    if (data.data?.length > 0) {
      this.userId = data.data[0].id;
      return data.data[0];
    }
    return null;
  }

  async getFollowerCount() {
    if (!this.userId) {
      await this.getUser();
    }
    const data = await this.apiCall(`/channels/followers?broadcaster_id=${this.userId}`);
    return data.total || 0;
  }

  async getStreamStatus() {
    if (!this.userId) {
      await this.getUser();
    }
    const data = await this.apiCall(`/streams?user_id=${this.userId}`);
    if (data.data?.length > 0) {
      return {
        live: true,
        viewers: data.data[0].viewer_count,
        title: data.data[0].title,
        game: data.data[0].game_name,
        startedAt: data.data[0].started_at,
      };
    }
    return { live: false, viewers: 0 };
  }

  async getAffiliateData() {
    const user = await this.getUser();
    const followers = await this.getFollowerCount();
    const stream = await this.getStreamStatus();

    return {
      user,
      followers,
      stream,
      broadcasterType: user?.broadcaster_type || 'none',
    };
  }

  isConfigured() {
    return !!(CLIENT_ID && CLIENT_SECRET);
  }
}

module.exports = TwitchClient;
