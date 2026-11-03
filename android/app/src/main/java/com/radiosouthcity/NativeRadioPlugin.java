package com.radiosouthcity;

import android.content.Intent;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSObject;

@CapacitorPlugin(name = "NativeRadio")
public class NativeRadioPlugin extends Plugin {
    private static NativeRadioPlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    public static void emitPlaybackState(String state) {
        if (instance == null) return;
        JSObject data = new JSObject();
        data.put("state", state);
        instance.notifyListeners("playbackStateChange", data);
    }
    @PluginMethod
    public void play(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("A stream URL is required");
            return;
        }
        Intent intent = new Intent(getContext(), RadioPlaybackService.class)
                .setAction(RadioPlaybackService.ACTION_PLAY)
                .putExtra(RadioPlaybackService.EXTRA_URL, url)
                .putExtra(RadioPlaybackService.EXTRA_TITLE, call.getString("title", "Radio South City"))
                .putExtra(RadioPlaybackService.EXTRA_ARTIST, call.getString("artist", "Radio South City"))
                .putExtra(RadioPlaybackService.EXTRA_ALBUM, call.getString("album", "Radio South City"));
        ContextCompat.startForegroundService(getContext(), intent);
        call.resolve();
    }

    @PluginMethod
    public void pause(PluginCall call) {
        send(RadioPlaybackService.ACTION_PAUSE);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        send(RadioPlaybackService.ACTION_STOP);
        call.resolve();
    }

    private void send(String action) {
        Intent intent = new Intent(getContext(), RadioPlaybackService.class).setAction(action);
        ContextCompat.startForegroundService(getContext(), intent);
    }
}
