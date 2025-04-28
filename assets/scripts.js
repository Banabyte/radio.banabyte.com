document.addEventListener('DOMContentLoaded', () => {
    const splash = document.getElementById('splash');

    // Hide splash after 5 seconds
    setTimeout(() => {
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.remove();
        }, 1000);
    }, 5000);

    const API_BASE_URL = 'localhost:8000';
    const currentAudio = new Audio();
    let currentStationId = null;
    let currentStationUrl = null;

    // DOM Elements
    const nowPlayingBar = document.querySelector('.now-playing');
    const playPauseBtn = document.getElementById('play-pause');
    const refreshBtn = document.getElementById('refresh-btn');
    const closeBtn = document.getElementById('close-btn');
    const muteBtn = document.getElementById('mute-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const overlay = document.querySelector('.overlay');
    let isMuted = false;

    const songTitleElem = document.getElementById('now-playing-title');
    const songArtistElem = document.getElementById('now-playing-artist');
    const albumArtElem = document.getElementById('now-playing-art');

    const defaultNowPlayingArt = "https://azuracast.banabyte.com/static/uploads/album_art.1732690005.png";
    const defaultStationArt = "https://azuracast.banabyte.com/static/uploads/background.1732689552.png";

    // Station logo settings
    const STATION_LOGO_BASE_URL = 'https://radio.banabyte.com/assets/station_logos/';

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
                navigator.mediaSession.playbackState = 'playing';
            }).catch(error => console.error('Playback error:', error));
        } else {
            currentAudio.pause();
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            navigator.mediaSession.playbackState = 'paused';
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
    // MEDIA SESSION API INTEGRATION
    // ----------------------------------------

    function updateMediaSessionMetadata(song) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.title || 'Unknown Title',
                artist: song.artist || 'Unknown Artist',
                artwork: [
                    { 
                        src: song.art || defaultNowPlayingArt, 
                        sizes: '512x512',
                        type: 'image/png' 
                    }
                ]
            });

            navigator.mediaSession.setActionHandler('play', () => {
                togglePlayPause();
            });

            navigator.mediaSession.setActionHandler('pause', () => {
                togglePlayPause();
            });

            navigator.mediaSession.setActionHandler('stop', () => {
                currentAudio.pause();
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            });
        }
    }

    // ----------------------------------------
    // PLAY STATION & UPDATE NOW PLAYING
    // ----------------------------------------

    function playStation(stationId, stationShortcode, song, stationName) {
        currentStationId = stationId;
        currentStationUrl = `https://azuracast.banabyte.com/listen/${stationShortcode}/radio.mp3`;

        currentAudio.src = currentStationUrl;
        currentAudio.load();
        currentAudio.play().then(() => {
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            updateNowPlayingInfo();
        }).catch(error => console.error('Playback error:', error));

        songTitleElem.textContent = song.title || 'Unknown Title';
        songArtistElem.textContent = song.artist || 'Unknown Artist';
        albumArtElem.src = song.art || defaultNowPlayingArt;

        updateMediaSessionMetadata(song);

        const fullscreenContainer = document.querySelector('.station-logo-container');
        if (fullscreenContainer) {
            fullscreenContainer.innerHTML = `
                <img class="station-logo" 
                     src="${STATION_LOGO_BASE_URL}${stationShortcode}.png" 
                     alt="${stationName} Logo"
                     onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
                <div class="station-name-fallback">${stationName}</div>
            `;
        }
    }

    async function updateNowPlayingInfo() {
        if (!currentStationId) return;

        try {
            const response = await fetch(`${API_BASE_URL}/nowplaying/${currentStationId}`);
            const nowPlayingData = await response.json();
            const nowPlaying = nowPlayingData.now_playing.song;

            // Update text
            songTitleElem.textContent = nowPlaying.title || 'Unknown Title';
            songArtistElem.textContent = nowPlaying.artist || 'Unknown Artist';

            // Marquee Logic
            const enableMarquee = (elem) => {
                const container = elem.parentElement;
                const isOverflowing = elem.scrollWidth > container.offsetWidth;
                container.classList.toggle('marquee', isOverflowing);
            };

            enableMarquee(songTitleElem);
            enableMarquee(songArtistElem);

            // Rest of the function
            albumArtElem.src = nowPlaying.art || defaultNowPlayingArt;
            updateMediaSessionMetadata(nowPlaying);

        } catch (error) {
            console.error("Error fetching song info:", error);
        }
    }

    // ----------------------------------------
    // VOLUME CONTROL
    // ----------------------------------------

    volumeSlider.addEventListener('input', (e) => {
        e.stopPropagation();
        const volume = e.target.value;
        currentAudio.volume = volume;
        localStorage.setItem('volume', volume);

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
        e.stopPropagation();
    });

    volumeSlider.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });

    volumeSlider.addEventListener('mouseup', (e) => {
        e.stopPropagation();
    });

    muteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
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

            const card = document.createElement('div');
            card.className = 'station-card';
            card.innerHTML = `
                <div class="station-art-container">
                    <img src="${song.art || defaultStationArt}" 
                         class="station-art" 
                         alt="Album Art"
                         onerror="this.src='${defaultNowPlayingArt}'">
                    <img class="station-logo" 
                         src="${STATION_LOGO_BASE_URL}${station.shortcode}.png" 
                         alt="${station.name} Logo"
                         onerror="this.style.display='none'">
                    <div class="play-btn">
                        <i class="fas fa-play"></i>
                    </div>
                </div>
                <h3>${station.name}</h3>
                <p>${station.description || 'No description'}</p>
            `;

            card.addEventListener('click', (e) => {
                if (!nowPlayingBar.classList.contains('fullscreen') && 
                    !e.target.closest('.play-btn')) {
                    playStation(station.id, station.shortcode, song, station.name);
                }

                if (window.innerWidth <= 768) {
                    nowPlayingBar.classList.add('fullscreen');
                    overlay.style.display = 'block';
                }
            });

            grid.appendChild(card);
        });
    }

    // ----------------------------------------
    // EVENT LISTENERS
    // ----------------------------------------

    playPauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePlayPause();
    });

    refreshBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        refreshStream();
    });

    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        nowPlayingBar.classList.remove('fullscreen');
        overlay.style.display = 'none';
    });

    nowPlayingBar.addEventListener('click', (e) => {
        if (
            !e.target.closest('.player-btn') && 
            !e.target.closest('#volume-slider') &&
            !e.target.closest('.volume-controls')
        ) {
            if (!nowPlayingBar.classList.contains('fullscreen')) {
                nowPlayingBar.classList.add('fullscreen');
                overlay.style.display = 'block';
            }
        }
    });
  
    document.getElementById('share-btn').addEventListener('click', (e) => {
        e.stopPropagation();

        const songName = document.getElementById('now-playing-title').textContent;
        const artistName = document.getElementById('now-playing-artist').textContent;
        const stationName = document.querySelector('.station-name-fallback')?.textContent || 'Banabyte Radio';
        const url = window.location.href;

        const shareText = `Currently listening to "${songName}" by ${artistName} on ${stationName} at radio.banabyte.com`;
        const shareUrl = url;

        if (navigator.share) {
            navigator.share({
                title: 'Share this station',
                text: shareText,
                url
            });
        } else {
            navigator.clipboard.writeText(`${shareText} at ${shareUrl}`)
                .then(() => {
                    alert('Copied to clipboard!');
                })
                .catch(() => {
                    alert('Failed to copy.');
                });
        }
    });

    // Initialize
    fetchNowPlaying();
    setInterval(fetchNowPlaying, 10000);
    setInterval(updateNowPlayingInfo, 10000);
});
