package com.radiosouthcity;

import android.content.Intent;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

public class RadioPlaybackService extends MediaSessionService {
    public static final String ACTION_PLAY = "com.radiosouthcity.PLAY";
    public static final String ACTION_PAUSE = "com.radiosouthcity.PAUSE";
    public static final String ACTION_STOP = "com.radiosouthcity.STOP";
    public static final String EXTRA_URL = "url";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_ARTIST = "artist";
    public static final String EXTRA_ALBUM = "album";

    private ExoPlayer player;
    private MediaSession mediaSession;

    @Override
    public void onCreate() {
        super.onCreate();
        AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .build();
        player = new ExoPlayer.Builder(this).build();
        player.setAudioAttributes(attributes, true);
        mediaSession = new MediaSession.Builder(this, player).build();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_PLAY.equals(action)) {
                String url = intent.getStringExtra(EXTRA_URL);
                if (url != null && !url.equals(player.getCurrentMediaItem() == null
                        ? null : player.getCurrentMediaItem().localConfiguration.uri.toString())) {
                    MediaMetadata metadata = new MediaMetadata.Builder()
                            .setTitle(intent.getStringExtra(EXTRA_TITLE))
                            .setArtist(intent.getStringExtra(EXTRA_ARTIST))
                            .setAlbumTitle(intent.getStringExtra(EXTRA_ALBUM))
                            .build();
                    player.setMediaItem(new MediaItem.Builder().setUri(url).setMediaMetadata(metadata).build());
                    player.prepare();
                }
                player.play();
            } else if (ACTION_PAUSE.equals(action)) {
                player.pause();
            } else if (ACTION_STOP.equals(action)) {
                player.stop();
                stopSelf();
            }
        }
        return START_NOT_STICKY;
    }

    @Nullable
    @Override
    public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        if (player == null || !player.isPlaying()) stopSelf();
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) mediaSession.release();
        if (player != null) player.release();
        super.onDestroy();
    }
}
