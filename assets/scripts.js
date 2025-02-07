document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://azuracast.banabyte.com/api';
    const currentAudio = new Audio();
    let currentStationUrl = null; // Track the current stream URL

    const closeBtn = document.getElementById('close-btn');
    const nowPlayingBar = document.querySelector('.now-playing');
    const playPauseBtn = document.getElementById('play-pause');
    const refreshBtn = document.getElementById('refresh-btn');

    console.log("Play/Pause Button:", playPauseBtn);
    console.log("Refresh Button:", refreshBtn);

    if (!playPauseBtn || !refreshBtn) {
        console.error("ERROR: One or more media buttons were not found!");
        return;
    }

    // Play/Pause Toggle
    function togglePlayPause() {
        console.log("togglePlayPause function is running!");
    
        if (!currentAudio.src || currentAudio.src === "") {
            console.warn("No stream loaded. Attempting to reload...");
            return;
        }
    
        if (currentAudio.paused) {
            console.log("Playing stream:", currentAudio.src);
            currentAudio.play().then(() => {
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>'; // Set pause icon
            }).catch(error => {
                console.error('Playback failed:', error);
            });
        } else {
            console.log("Pausing stream...");
            currentAudio.pause();
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>'; // Set play icon
        }
    }
    

    // Refresh Stream
    function refreshStream() {
        if (!currentStationUrl) {
            console.error('No stream to refresh.');
            return;
        }

        console.log("Refreshing stream:", currentStationUrl);

        currentAudio.pause();
        const refreshedUrl = `${currentStationUrl}?t=${Date.now()}`;
        currentAudio.src = refreshedUrl;
        currentAudio.load();

        currentAudio.play().then(() => {
            // biome-ignore lint/style/useConst: <explanation>
            let playIcon = playPauseBtn.querySelector("i");
            if (playIcon) playIcon.classList.replace('fa-play', 'fa-pause');
        }).catch(error => {
            console.error('Refresh failed:', error);
        });

        console.log('Stream refreshed!');
    }

    // Load and Play Station
    function playStation(stationId, song) {
        currentStationUrl = `https://azuracast.banabyte.com/listen/${stationId}/radio.mp3`;
        currentAudio.src = currentStationUrl;
        currentAudio.load(); // Ensure it reloads
    
        console.log("Playing station:", currentStationUrl);
    
        // Use the correct default album art
        const defaultNowPlayingArt = "https://azuracast.banabyte.com/static/uploads/album_art.1732690005.png";
        document.getElementById('now-playing-title').textContent = song.title || 'Unknown Title';
        document.getElementById('now-playing-artist').textContent = song.artist || 'Unknown Artist';
        document.getElementById('now-playing-art').src = song.art || defaultNowPlayingArt;
        nowPlayingBar.style.display = 'flex';
    
        // Play the stream
        currentAudio.play().then(() => {
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }).catch(error => {
            console.error('Playback error:', error);
        });
    
        // Expand to full-screen on mobile
        if (window.innerWidth <= 768) {
            nowPlayingBar.classList.add('fullscreen');
        }
    }
    

    // Fetch and Render Stations
    async function fetchNowPlaying() {
        try {
            const response = await fetch(`${API_BASE_URL}/nowplaying`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const stations = await response.json();
            document.querySelector('.loading').style.display = 'none';
            renderStations(stations);
        } catch (error) {
            document.querySelector('.loading').innerHTML = 'Error loading stations.';
            console.error('Fetch error:', error);
        }
    }

    // Render Stations Grid
    function renderStations(stations) {
        const grid = document.querySelector('.stations-grid');
        grid.innerHTML = '';
    
        // biome-ignore lint/complexity/noForEach: <explanation>
            stations.forEach(stationData => {
            const station = stationData.station;
            const nowPlaying = stationData.now_playing;
            const song = nowPlaying.song;
    
            // Default image for station cards
            const defaultStationArt = "https://azuracast.banabyte.com/static/uploads/background.1732689552.png";
    
            const card = document.createElement('div');
            card.className = 'station-card';
            card.innerHTML = `
                <img src="${song.art || defaultStationArt}" class="station-art" alt="Album Art">
                <h3>${station.name || 'Unknown Station'}</h3>
                <p>${station.description || 'No description'}</p>
                <div class="play-btn">
                    <i class="fas fa-play"></i>
                </div>
            `;
    
            // Use station.shortcode instead of listen_url
            card.querySelector('.play-btn').addEventListener('click', () => {
                playStation(station.shortcode, song);
            });
    
            grid.appendChild(card);
        });
    }
    

    // ----------------------------------------
    // Event Listeners
    // ----------------------------------------

    // Play/Pause Button
    playPauseBtn.addEventListener('click', () => {
        console.log("Play/Pause button clicked!");
        togglePlayPause();
    });

    // Refresh Button
    refreshBtn.addEventListener('click', () => {
        console.log("Refresh button clicked!");
        refreshStream();
    });

    // Close Button
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        nowPlayingBar.classList.remove('fullscreen');
    });

    // Minimized Bar Click (Reopen Fullscreen)
    nowPlayingBar.addEventListener('click', () => {
        if (!nowPlayingBar.classList.contains('fullscreen')) {
            nowPlayingBar.classList.add('fullscreen');
        }
    });

    // Initialize
    fetchNowPlaying();
    setInterval(fetchNowPlaying, 10000); // Update stations every 10 seconds
    document.getElementById('current-year').textContent = new Date().getFullYear();
});
