package com.radiosouthcity;

import android.content.Intent;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.os.Build;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;
import androidx.media3.common.Player;

public class RadioPlaybackService extends MediaSessionService {
    public static final String ACTION_PLAY = "com.radiosouthcity.PLAY";
    public static final String ACTION_PAUSE = "com.radiosouthcity.PAUSE";
    public static final String ACTION_STOP = "com.radiosouthcity.STOP";
    public static final String EXTRA_URL = "url";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_ARTIST = "artist";
    public static final String EXTRA_ALBUM = "album";
    private static final String CHANNEL_ID = "radio-playback";
    private static final int NOTIFICATION_ID = 4202;

    private ExoPlayer player;
    private MediaSession mediaSession;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startForeground(NOTIFICATION_ID, notification("Radio South City", "Ready to play"));
        AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .build();
        player = new ExoPlayer.Builder(this).build();
        player.setAudioAttributes(attributes, true);
        player.addListener(new Player.Listener() {
            @Override
            public void onIsPlayingChanged(boolean isPlaying) {
                updatePlaybackState(isPlaying ? "playing" : "paused");
                startForeground(NOTIFICATION_ID, notification(
                        "Radio South City", isPlaying ? "Playing live radio" : "Paused"));
            }

            @Override
            public void onPlayerError(androidx.media3.common.PlaybackException error) {
                updatePlaybackState("error");
            }
        });
        mediaSession = new MediaSession.Builder(this, player).build();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_PLAY.equals(action)) {
                String url = intent.getStringExtra(EXTRA_URL);
                String currentUrl = null;
                if (player.getCurrentMediaItem() != null
                        && player.getCurrentMediaItem().localConfiguration != null) {
                    currentUrl = player.getCurrentMediaItem().localConfiguration.uri.toString();
                }
                if (url != null && !url.equals(currentUrl)) {
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
                updatePlaybackState("stopped");
                stopSelf();
            }
        }
        if (player != null && !ACTION_STOP.equals(intent == null ? null : intent.getAction())) {
            String state = player.isPlaying() ? "Playing live radio" : "Paused";
            startForeground(NOTIFICATION_ID, notification("Radio South City", state));
        }
        // Let Media3 process media-button intents and maintain its foreground notification.
        super.onStartCommand(intent, flags, startId);
        return START_NOT_STICKY;
    }

    @Nullable
    @Override
    public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Keep playback while the app is merely backgrounded, but stop it when the
        // user explicitly dismisses the app from Android's Recents screen.
        stopSelf();
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) mediaSession.release();
        if (player != null) player.release();
        super.onDestroy();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "Radio playback", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Playback controls for Radio South City");
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    private Notification notification(String title, String text) {
        Intent pause = new Intent(this, RadioPlaybackService.class).setAction(ACTION_PAUSE);
        Intent stop = new Intent(this, RadioPlaybackService.class).setAction(ACTION_STOP);
        PendingIntent pauseIntent = PendingIntent.getService(this, 1, pause, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent stopIntent = PendingIntent.getService(this, 2, stop, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(com.radiosouthcity.R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(text)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
                .addAction(android.R.drawable.ic_media_pause, "Pause", pauseIntent)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", stopIntent)
                .build();
    }

    private void updatePlaybackState(String state) {
        NativeRadioPlugin.emitPlaybackState(state);
    }
}
