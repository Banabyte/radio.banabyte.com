// server.js
import express from 'express';
import fetch from 'node-fetch-native';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

const AZURACAST_API = 'https://azuracast.banabyte.com/api';
const STATIONS_JSON_PATH = path.join(__dirname, 'public', 'stations.json');

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint for frontend
app.get('/api/stations', async (req, res) => {
    try {
        const response = await fetch(`${AZURACAST_API}/nowplaying`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching stations:', error);
        res.status(500).json({ error: 'Failed to fetch stations' });
    }
});

// API endpoint for VRChat JSON (on-demand refresh)
app.get('/api/stations-vrchat', async (req, res) => {
    try {
        const response = await fetch(`${AZURACAST_API}/nowplaying`);
        const data = await response.json();

        const vrchatStations = data.map(stationData => ({
            id: stationData.station.id,
            name: stationData.station.name,
            streamUrl: `https://azuracast.banabyte.com/listen/${stationData.station.shortcode}/radio.mp3`,
            logo: `https://radio.banabyte.com/assets/station_logos/${stationData.station.shortcode}.png`
        }));

        await fs.writeFile(STATIONS_JSON_PATH, JSON.stringify(vrchatStations, null, 2));
        res.json(vrchatStations);
    } catch (error) {
        console.error('Error generating VRChat stations JSON:', error);
        res.status(500).json({ error: 'Failed to generate VRChat station list' });
    }
});

// Function to refresh stations.json periodically
async function refreshStationsJSON() {
    try {
        const response = await fetch(`${AZURACAST_API}/nowplaying`);
        const data = await response.json();

        const vrchatStations = data.map(stationData => ({
            id: stationData.station.id,
            name: stationData.station.name,
            streamUrl: `https://azuracast.banabyte.com/listen/${stationData.station.shortcode}/radio.mp3`,
            logo: `https://radio.banabyte.com/assets/station_logos/${stationData.station.shortcode}.png`
        }));

        await fs.writeFile(STATIONS_JSON_PATH, JSON.stringify(vrchatStations, null, 2));
        console.log(`[${new Date().toLocaleTimeString()}] Updated stations.json`);
    } catch (error) {
        console.error('Error refreshing stations.json:', error);
    }
}

// Immediately generate stations.json at server start
refreshStationsJSON();

// Refresh every 10 minutes
setInterval(refreshStationsJSON, 10 * 60 * 1000);

// Home fallback (index.html)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
