package com.jpm.app;

import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.FrameLayout;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdLoader;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.nativead.MediaView;
import com.google.android.gms.ads.nativead.NativeAd;
import com.google.android.gms.ads.nativead.NativeAdOptions;
import com.google.android.gms.ads.nativead.NativeAdView;

@CapacitorPlugin(name = "NativeInFeedAd")
public class NativeInFeedAdPlugin extends Plugin {

    private static final String TAG = "NativeInFeedAd";

    // ── IMPORTANT: Replace with your real Native Ad Unit ID from AdMob Dashboard ──
    // Go to AdMob > Ad units > Create ad unit > Native Advanced
    private static final String AD_UNIT_ID = "ca-app-pub-8166782428171770/3966636178";

    private NativeAd currentNativeAd = null;
    private FrameLayout adContainer = null;
    private boolean isAdLoaded = false;
    private boolean adVisible = false;

    @PluginMethod
    public void initialize(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                MobileAds.initialize(getContext(), initStatus -> {
                    loadAd();
                    JSObject result = new JSObject();
                    result.put("status", "initialized");
                    call.resolve(result);
                });
            } catch (Exception e) {
                call.reject("AdMob init failed: " + e.getMessage());
            }
        });
    }

    private void loadAd() {
        getActivity().runOnUiThread(() -> {
            AdLoader adLoader = new AdLoader.Builder(getContext(), AD_UNIT_ID)
                .forNativeAd(nativeAd -> {
                    // Destroy any existing ad first
                    if (currentNativeAd != null) {
                        currentNativeAd.destroy();
                    }
                    currentNativeAd = nativeAd;
                    isAdLoaded = true;
                    Log.d(TAG, "Native ad loaded successfully");

                    // Notify JS that ad is ready
                    JSObject event = new JSObject();
                    event.put("loaded", true);
                    notifyListeners("adLoaded", event);
                })
                .withAdListener(new AdListener() {
                    @Override
                    public void onAdFailedToLoad(@NonNull LoadAdError error) {
                        Log.e(TAG, "Failed to load ad: " + error.getMessage());
                        isAdLoaded = false;
                        JSObject event = new JSObject();
                        event.put("error", error.getMessage());
                        notifyListeners("adFailedToLoad", event);
                    }
                })
                .withNativeAdOptions(new NativeAdOptions.Builder().build())
                .build();

            adLoader.loadAd(new AdRequest.Builder().build());
        });
    }

    @PluginMethod
    public void showAd(PluginCall call) {
        double x = call.getDouble("x", 0.0);
        double y = call.getDouble("y", 0.0);
        double width = call.getDouble("width", 400.0);
        double height = call.getDouble("height", 200.0);

        getActivity().runOnUiThread(() -> {
            try {
                if (!isAdLoaded || currentNativeAd == null) {
                    // Try to load and queue show
                    call.reject("Ad not loaded yet");
                    return;
                }

                float density = getContext().getResources().getDisplayMetrics().density;
                int xPx = (int)(x * density);
                int yPx = (int)(y * density);
                int widthPx = (int)(width * density);
                int heightPx = (int)(height * density);

                if (adContainer != null) {
                    // Update position of existing container
                    FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(widthPx, ViewGroup.LayoutParams.WRAP_CONTENT);
                    params.leftMargin = xPx;
                    params.topMargin = yPx;
                    adContainer.setLayoutParams(params);
                    adContainer.setVisibility(View.VISIBLE);
                    adVisible = true;
                    JSObject result = new JSObject();
                    result.put("shown", true);
                    call.resolve(result);
                    return;
                }

                // First time: inflate and add to root
                ViewGroup rootView = getActivity().getWindow().getDecorView().findViewById(android.R.id.content);
                adContainer = new FrameLayout(getContext());

                // Rounded card background
                GradientDrawable bg = new GradientDrawable();
                bg.setColor(Color.WHITE);
                bg.setCornerRadius(24 * density);
                adContainer.setBackground(bg);
                adContainer.setElevation(4 * density);

                // Inflate our native ad layout
                NativeAdView adView = (NativeAdView) LayoutInflater.from(getContext())
                    .inflate(R.layout.native_ad_layout, adContainer, false);

                // Wire up the native ad data to views
                populateNativeAdView(currentNativeAd, adView);
                adContainer.addView(adView);

                FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(widthPx, ViewGroup.LayoutParams.WRAP_CONTENT);
                params.leftMargin = xPx;
                params.topMargin = yPx;

                rootView.addView(adContainer, params);
                adVisible = true;
                Log.d(TAG, "Native ad shown at x=" + xPx + " y=" + yPx);

                // Preload next ad for when this one scrolls away
                loadAd();

                JSObject result = new JSObject();
                result.put("shown", true);
                call.resolve(result);

            } catch (Exception e) {
                Log.e(TAG, "showAd error: " + e.getMessage());
                call.reject("showAd failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void updatePosition(PluginCall call) {
        double y = call.getDouble("y", 0.0);

        getActivity().runOnUiThread(() -> {
            if (adContainer == null) {
                call.resolve();
                return;
            }
            float density = getContext().getResources().getDisplayMetrics().density;
            int yPx = (int)(y * density);

            FrameLayout.LayoutParams params = (FrameLayout.LayoutParams) adContainer.getLayoutParams();
            if (params != null) {
                params.topMargin = yPx;
                adContainer.setLayoutParams(params);
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void hideAd(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (adContainer != null) {
                adContainer.setVisibility(View.GONE);
                adVisible = false;
            }
            JSObject result = new JSObject();
            result.put("hidden", true);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void destroyAd(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (adContainer != null) {
                ViewGroup parent = (ViewGroup) adContainer.getParent();
                if (parent != null) parent.removeView(adContainer);
                adContainer = null;
            }
            if (currentNativeAd != null) {
                currentNativeAd.destroy();
                currentNativeAd = null;
            }
            isAdLoaded = false;
            adVisible = false;
            JSObject result = new JSObject();
            result.put("destroyed", true);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void isAdReady(PluginCall call) {
        JSObject result = new JSObject();
        result.put("ready", isAdLoaded && currentNativeAd != null);
        call.resolve(result);
    }

    private void populateNativeAdView(NativeAd nativeAd, NativeAdView adView) {
        // Headline
        TextView headlineView = adView.findViewById(R.id.ad_headline);
        if (nativeAd.getHeadline() != null) {
            headlineView.setText(nativeAd.getHeadline());
            adView.setHeadlineView(headlineView);
        }

        // Body
        TextView bodyView = adView.findViewById(R.id.ad_body);
        if (nativeAd.getBody() != null) {
            bodyView.setText(nativeAd.getBody());
            bodyView.setVisibility(View.VISIBLE);
            adView.setBodyView(bodyView);
        } else {
            bodyView.setVisibility(View.INVISIBLE);
        }

        // Icon
        ImageView iconView = adView.findViewById(R.id.ad_icon);
        NativeAd.Image icon = nativeAd.getIcon();
        if (icon != null) {
            iconView.setImageDrawable(icon.getDrawable());
            iconView.setVisibility(View.VISIBLE);
            adView.setIconView(iconView);
        } else {
            iconView.setVisibility(View.GONE);
        }

        // Call to action button
        Button callToActionView = adView.findViewById(R.id.ad_call_to_action);
        if (nativeAd.getCallToAction() != null) {
            callToActionView.setText(nativeAd.getCallToAction());
            callToActionView.setVisibility(View.VISIBLE);
            adView.setCallToActionView(callToActionView);
        } else {
            callToActionView.setVisibility(View.INVISIBLE);
        }

        // Media view (optional large image)
        MediaView mediaView = adView.findViewById(R.id.ad_media);
        adView.setMediaView(mediaView);
        if (nativeAd.getMediaContent() != null) {
            mediaView.setMediaContent(nativeAd.getMediaContent());
            mediaView.setVisibility(View.VISIBLE);
        }

        // Register the native ad — this MUST be called last
        adView.setNativeAd(nativeAd);
    }
}
