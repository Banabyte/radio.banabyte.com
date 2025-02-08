document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://azuracast.banabyte.com/api';
    const currentAudio = new Audio();
    let currentStationId = null; // Track the current station ID
    let currentStationUrl = null; // Track the current stream URL

    // DOM Elements
    const nowPlayingBar = document.querySelector('.now-playing');
    const playPauseBtn = document.getElementById('play-pause');
    const refreshBtn = document.getElementById('refresh-btn');
    const closeBtn = document.getElementById('close-btn');
    const muteBtn = document.getElementById('mute-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const overlay = document.querySelector('.overlay'); // Overlay element
    let isMuted = false;

    const songTitleElem = document.getElementById('now-playing-title');
    const songArtistElem = document.getElementById('now-playing-artist');
    const albumArtElem = document.getElementById('now-playing-art');

    const defaultNowPlayingArt = "https://azuracast.banabyte.com/static/uploads/album_art.1732690005.png";

    // Initialize volume from localStorage
    currentAudio.volume = localStorage.getItem('volume') || 1;
    volumeSlider.value = currentAudio.volume;

    // ----------------------------------------
    // PLAYBACK CONTROLS
    // ----------------------------------------

    function togglePlayPause() {
        if (!currentAudio.src || currentAudio.src === "") {
            console.warn("No stream loaded.");
            return;
        }

        if (currentAudio.paused) {
            currentAudio.play().then(() => {
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            }).catch(error => console.error('Playback error:', error));
        } else {
            currentAudio.pause();
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    }

    function refreshStream() {
        if (!currentStationUrl) {
            console.error('No stream to refresh.');
            return;
        }

        currentAudio.pause();
        const refreshedUrl = `${currentStationUrl}?t=${Date.now()}`;
        currentAudio.src = refreshedUrl;
        currentAudio.load();
        currentAudio.play().then(() => {
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }).catch(error => console.error('Refresh failed:', error));
    }

    // ----------------------------------------
    // PLAY STATION & UPDATE NOW PLAYING
    // ----------------------------------------

    function playStation(stationId, song) {
        currentStationId = stationId; // Save current station ID
        currentStationUrl = `https://azuracast.banabyte.com/listen/${stationId}/radio.mp3`;

        currentAudio.src = currentStationUrl;
        currentAudio.load();
        currentAudio.play().then(() => {
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            updateNowPlayingInfo(); // Immediately update song info
        }).catch(error => console.error('Playback error:', error));

        // Update UI with the first song info
        songTitleElem.textContent = song.title || 'Unknown Title';
        songArtistElem.textContent = song.artist || 'Unknown Artist';
        albumArtElem.src = song.art || defaultNowPlayingArt;

        nowPlayingBar.style.display = 'flex';

        // Expand fullscreen on mobile
        if (window.innerWidth <= 768) {
            nowPlayingBar.classList.add('fullscreen');
            overlay.style.display = 'block'; // Show the overlay
        }
    }

    async function updateNowPlayingInfo() {
        if (!currentStationId) return; // Don't fetch if no station is playing

        try {
            const response = await fetch(`${API_BASE_URL}/nowplaying/${currentStationId}`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const nowPlayingData = await response.json();

            const nowPlaying = nowPlayingData.now_playing.song;
            songTitleElem.textContent = nowPlaying.title || 'Unknown Title';
            songArtistElem.textContent = nowPlaying.artist || 'Unknown Artist';
            albumArtElem.src = nowPlaying.art || defaultNowPlayingArt;
        } catch (error) {
            console.error("Error fetching song info:", error);
        }
    }

    // ----------------------------------------
    // VOLUME CONTROL
    // ----------------------------------------

    // Volume Slider Event Listeners
    volumeSlider.addEventListener('input', (e) => {
        e.stopPropagation(); // Prevent event from bubbling up
        const volume = e.target.value;
        currentAudio.volume = volume;
        localStorage.setItem('volume', volume);

        // Update mute state and icon
        // biome-ignore lint/suspicious/noDoubleEquals: <explanation>
                if (volume == 0) {
            muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            isMuted = true;
        } else {
            muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            isMuted = false;
        }
    });

    volumeSlider.addEventListener('click', (e) => {
        e.stopPropagation(); // Explicitly stop click propagation
    });

    volumeSlider.addEventListener('mousedown', (e) => {
        e.stopPropagation(); // Prevent fullscreen toggle when starting to drag the slider
    });

    volumeSlider.addEventListener('mouseup', (e) => {
        e.stopPropagation(); // Prevent fullscreen toggle when releasing the slider
    });

    // Mute Button Event Listener
    muteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent fullscreen toggle
        if (isMuted) {
            currentAudio.volume = volumeSlider.value || 0.5;
            muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            isMuted = false;
        } else {
            currentAudio.volume = 0;
            muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            isMuted = true;
        }
    });

    // ----------------------------------------
    // FETCH & RENDER STATIONS
    // ----------------------------------------

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

    function renderStations(stations) {
        const grid = document.querySelector('.stations-grid');
        grid.innerHTML = '';

        // biome-ignore lint/complexity/noForEach: <explanation>
        stations.forEach(stationData => {
            const station = stationData.station;
            const nowPlaying = stationData.now_playing;
            const song = nowPlaying.song;

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

            // Add click handler to entire card
            card.addEventListener('click', (e) => {
                // Prevent station change if the fullscreen player is open
                if (nowPlayingBar.classList.contains('fullscreen')) {
                    return;
                }

                // Prevent station change if clicking the play button
                if (!e.target.closest('.play-btn')) {
                    playStation(station.shortcode, song);
                }
            });

            grid.appendChild(card);
        });
    }

    // ----------------------------------------
    // EVENT LISTENERS
    // ----------------------------------------

    playPauseBtn.addEventListener('click', (e) => {
        console.log("Play/Pause button clicked!");
        e.stopPropagation(); // Prevent fullscreen toggle
        togglePlayPause();
    });

    // Refresh Button
    refreshBtn.addEventListener('click', (e) => {
        console.log("Refresh button clicked!");
        e.stopPropagation(); // Prevent fullscreen toggle
        refreshStream();
    });

    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        nowPlayingBar.classList.remove('fullscreen');
        overlay.style.display = 'none'; // Hide the overlay
    });

    nowPlayingBar.addEventListener('click', (e) => {
        // Only trigger fullscreen if the click is NOT on:
        // - Player buttons (play, refresh, mute)
        // - Volume slider
        if (
            !e.target.closest('.player-btn') && 
            !e.target.closest('#volume-slider') &&
            !e.target.closest('.volume-controls')
        ) {
            if (!nowPlayingBar.classList.contains('fullscreen')) {
                nowPlayingBar.classList.add('fullscreen');
                overlay.style.display = 'block'; // Show the overlay
            }
        }
    });

    // Initialize
    fetchNowPlaying();
    setInterval(fetchNowPlaying, 10000); // Update stations every 10 seconds
    setInterval(updateNowPlayingInfo, 10000); // Update song info every 10 seconds
});