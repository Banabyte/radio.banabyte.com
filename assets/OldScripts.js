document.addEventListener('DOMContentLoaded', async () => {
    // Define variables
    const toggleStationsButton = document.getElementById('toggle-stations');
    const stationsSidebar = document.getElementById('stations-sidebar');
    const audioPlayer = document.getElementById('audio-player');
    const stationsMenu = document.getElementById('stations-menu');
    const volumeLabel = document.getElementById('volume-label');
    const loadingScreen = document.getElementById('loading-screen');
    const songTitle = document.getElementById('song-title');
    const albumArt = document.getElementById('album-art');
    const nextSongTitle = document.getElementById('next-song-title');
    const nextSongInfo = document.getElementById('next-song-info');
    const stationElement = document.getElementById('station-name'); // Station element added here
    let currentStationId = null;
    let songEndTimeout = null;
    let nextSongTimeout = null;
    let currentStationLink = ''; // Global variable for the shareable link
    const defaultBackground = 'url("path-to-default-background-image")'; // Set your default background image path

    // Set default volume to 25%
    audioPlayer.volume = 0.25;
    volumeLabel.textContent = 'Volume: 25%';

    // Toggle sidebar visibility
    toggleStationsButton.addEventListener('click', () => {
        stationsSidebar.classList.toggle('open');
    });

    // Show the loading screen when starting to fetch data
    loadingScreen.style.display = 'flex';
    albumArt.style.display = 'none';

    // Fetch stations from AzuraCast API and play the first station by default or last played station from localStorage
    try {
        const responseStations = await fetch('https://azuracast.banabyte.com/api/stations');
        if (!responseStations.ok) {
            throw new Error(`Network response was not ok ${responseStations.statusText}`);
        }
        const stations = await responseStations.json();

        console.log('Stations data:', stations); // Log stations data
        // Display list of stations
        for (const station of stations) {
            const responseStationStatus = await fetch(`https://azuracast.banabyte.com/api/nowplaying/${station.shortcode}`);
            const stationStatus = await responseStationStatus.json();
            console.log(`station ${station.shortcode} status:`, stationStatus);
            if (stationStatus.is_online === false) continue;
            const stationItem = document.createElement('li');
            stationItem.textContent = station.name;
            stationItem.addEventListener('click', () => {
                playStation(station.id);
                localStorage.setItem('lastStationId', station.id); // Save the selected station ID
            });
            stationsMenu.appendChild(stationItem);
        }

        // Check localStorage for the last played station ID
        const lastStationId = localStorage.getItem('lastStationId');
        if (lastStationId) {
            playStation(lastStationId);
        } else if (stations.length > 0) {
            playStation(stations[0].id);
        }
    } catch (error) {
        console.error('Error fetching stations:', error);
    } finally {
        // Fade out the loading screen
        loadingScreen.classList.add('hidden');
        albumArt.classList.add('Visible');

        // Optionally, remove the loading screen from the DOM after the fade-out completes
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            albumArt.style.display = '';
        }, 500); // Match the timeout with the CSS transition duration (0.5s)
    }

    // Function to play the selected station
    function playStation(stationId) {
        if (currentStationId === stationId) return; // Prevent re-fetching if the same station is clicked

        // Clear existing timeouts to avoid overlapping
        if (songEndTimeout) {
            clearTimeout(songEndTimeout);
        }
        if (nextSongTimeout) {
            clearTimeout(nextSongTimeout);
        }

        // Hide next song info when switching stations
        hideNextSongInfo();

        currentStationId = stationId;

        // Fetch the station's streaming URL
        fetch(`https://azuracast.banabyte.com/api/station/${stationId}`)
            .then(response => response.json())
            .then(data => {
                const streamUrl = data.listen_url;

                // Update the audio player's source and play
                audioPlayer.src = streamUrl;
                audioPlayer.play();

                // Update the global station link for sharing
                currentStationLink = streamUrl;

                // Fetch the now playing information
                fetchNowPlaying(stationId);
            })
            .catch(error => {
                console.error('Error fetching station stream URL:', error);
            });
    }

    // Function to hide next song info with animation
    function hideNextSongInfo() {
        nextSongInfo.classList.remove('visible');
        nextSongInfo.classList.add('hidden');
    }

    // Function to show next song info with animation
    function showNextSongInfo(title) {
        document.getElementById('next-song-info').style.display = 'block';
        nextSongTitle.textContent = title;
    }

    // Function to clear next song info
    function clearNextSongInfo() {
        nextSongInfo.classList.remove('visible');
        nextSongInfo.classList.add('hidden');
        nextSongInfo.style.display = 'none';
        nextSongTitle.textContent = ''; // Clear the next song title
    }

    // Function to fetch and display the currently playing song
    function fetchNowPlaying(stationId) {
        fetch(`https://azuracast.banabyte.com/api/nowplaying/${stationId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Network response was not ok ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Now playing data:', data); // Log now playing data
                if (currentStationId !== stationId) return; // Ensure the data corresponds to the current station

                // Check if the stationElement exists
                if (!stationElement) {
                    console.error('Station element not found in the DOM.');
                    return;
                }

                // Display station logo or name
                const stationShortcode = data.station.shortcode;
                const stationNameText = data.station.name;
                const logoUrl = `https://radio.banabyte.com/assets/station_logos/${stationShortcode}.png`;

                // Create an image element to check if the logo exists
                const img = new Image();
                img.src = logoUrl;

                // When the image loads successfully
                img.onload = () => {
                    // Clear the content and add the logo
                    stationElement.innerHTML = `<img src="${logoUrl}" alt="${stationNameText} Logo" class="station-logo"/>`;
                };

                // If the image fails to load, show the station name
                img.onerror = () => {
                    stationElement.textContent = stationNameText;
                };

                // Display currently playing song
                if (data.now_playing) {
                    songTitle.textContent = `Now Playing: ${data.now_playing.song.title} - ${data.now_playing.song.artist}`;

                    // Set album art image
                    const albumArtUrl = data.now_playing.song.art || defaultBackground;

                    // Smooth transition for album art
                    albumArt.classList.remove('fade-in');
                    albumArt.classList.add('fade-out');
                    setTimeout(() => {
                        albumArt.src = albumArtUrl;
                        albumArt.alt = `${data.now_playing.song.artist} - ${data.now_playing.song.title}`;
                        albumArt.classList.remove('fade-out');
                        albumArt.classList.add('fade-in');
                    }, 500); // Change image mid-transition

                    // Update body background based on album art
                    document.body.style.backgroundImage = `url(${albumArtUrl})`;

                    // Set Media Session API metadata
                    if ('mediaSession' in navigator) {
                        navigator.mediaSession.metadata = new MediaMetadata({
                            title: data.now_playing.song.title,
                            artist: data.now_playing.song.artist,
                            album: data.station.name,
                            artwork: [
                                { src: albumArtUrl, sizes: '96x96', type: 'image/png' },
                                { src: albumArtUrl, sizes: '128x128', type: 'image/png' },
                                { src: albumArtUrl, sizes: '192x192', type: 'image/png' },
                                { src: albumArtUrl, sizes: '256x256', type: 'image/png' },
                                { src: albumArtUrl, sizes: '384x384', type: 'image/png' },
                                { src: albumArtUrl, sizes: '512x512', type: 'image/png' },
                            ]
                        });
                    }

                    // Calculate remaining time and set timeout to fetch next song information
                    const startTimestamp = data.now_playing.played_at * 1000;
                    const currentTimestamp = Date.now();
                    const elapsedMs = currentTimestamp - startTimestamp;
                    const durationMs = data.now_playing.duration * 1000;
                    const remainingMs = durationMs - elapsedMs;

                    const showNextSongMs = remainingMs - 20000; // 20 seconds before end

                    // Show next song info 20 seconds before the current song ends
                    if (data.playing_next) {
                        nextSongTimeout = setTimeout(() => {
                            if (currentStationId === stationId) { // Ensure the station is still the current one
                                showNextSongInfo(`Next: ${data.playing_next.song.title} - ${data.playing_next.song.artist}`);
                            }
                        }, showNextSongMs);
                    }

                    // Fetch the next song info when the current song ends
                    songEndTimeout = setTimeout(() => {
                        if (currentStationId === stationId) { // Ensure the station is still the current one
                            fetchNowPlaying(stationId);
                            clearNextSongInfo(); // Hide next song info when the song ends
                        }
                    }, remainingMs);
                } else {
                    songTitle.textContent = 'No song currently playing.';
                    albumArt.src = ''; // Clear album art
                    albumArt.alt = 'No album art available';

                    // Clear Media Session API metadata
                    if ('mediaSession' in navigator) {
                        navigator.mediaSession.metadata = null;
                    }
                }

                // Set the shareable link for the current station
                currentStationLink = `https://azuracast.banabyte.com/listen/${data.station.shortcode}/radio.mp3`;

                // Play the station if not already playing
                if (audioPlayer.src !== data.station.listen_url) {
                    audioPlayer.src = data.station.listen_url;
                    audioPlayer.play();
                }

                // Update play/pause button state
                updatePlayPauseButton();
            })
            .catch(error => console.error('Error fetching now playing information:', error));
    }

    // Custom audio controls functionality
    const playPauseButton = document.getElementById('play-pause-button');
    const refreshButton = document.getElementById('refresh-button');
    const volumeSlider = document.getElementById('volume-slider');

    playPauseButton.addEventListener('click', () => {
        if (audioPlayer.paused) {
            audioPlayer.play();
        } else {
            audioPlayer.pause();
        }
        updatePlayPauseButton();
    });

    refreshButton.addEventListener('click', () => {
        if (audioPlayer.src) {
            audioPlayer.pause();
            audioPlayer.load(); // Reload the audio source
            audioPlayer.play();
        }
        updatePlayPauseButton();
    });

    volumeSlider.addEventListener('input', () => {
        audioPlayer.volume = volumeSlider.value;
        volumeLabel.textContent = `Volume: ${(volumeSlider.value * 100).toFixed(0)}%`;
    });

    // Function to update play/pause button state
    function updatePlayPauseButton() {
        if (audioPlayer.paused) {
            playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
        }
    }

    // Event listener for share button
    document.getElementById('share-button').addEventListener('click', () => {
        if (navigator.share) {
            navigator.share({
                title: 'Now Playing',
                text: 'Listen to this station',
                url: currentStationLink // Use the global variable for the current station link
            }).catch(error => console.error('Error sharing:', error));
        } else {
            console.log('Web Share API is not supported in your browser.');
        }
    });
});
