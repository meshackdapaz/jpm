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
import android.widget.Toast;

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
    private static String currentAdUnitId = "ca-app-pub-8166782428171770/3141151608"; // Default to feed ID

    private NativeAd currentNativeAd = null;
    private FrameLayout adContainer = null;
    private boolean isAdLoaded = false;
    private boolean isAdLoading = false;

    @PluginMethod
    public void initialize(PluginCall call) {
        String adId = call.getString("adId");
        
        // If we already have an ad for this ID and it's loaded, just resolve
        if (isAdLoaded && currentNativeAd != null && adId != null && adId.equals(currentAdUnitId)) {
            JSObject result = new JSObject();
            result.put("status", "already_loaded");
            call.resolve(result);
            return;
        }

        if (adId != null && !adId.isEmpty()) {
            currentAdUnitId = adId;
        }
        
        getActivity().runOnUiThread(() -> {
            try {
                MobileAds.initialize(getActivity(), initStatus -> {
                    Log.d(TAG, "AdMob Initialized. Loading ad...");
                    if (!isAdLoading) {
                        loadAd();
                    }
                    JSObject result = new JSObject();
                    result.put("status", "initialized");
                    call.resolve(result);
                });
            } catch (Exception e) {
                Log.e(TAG, "Init failed", e);
                call.reject("AdMob init failed: " + e.getMessage());
            }
        });
    }

    private void loadAd() {
        if (isAdLoading) return;
        isAdLoading = true;

        getActivity().runOnUiThread(() -> {
            AdLoader adLoader = new AdLoader.Builder(getActivity(), currentAdUnitId)
                .forNativeAd(nativeAd -> {
                    if (currentNativeAd != null) {
                        currentNativeAd.destroy();
                    }
                    currentNativeAd = nativeAd;
                    isAdLoaded = true;
                    isAdLoading = false;
                    Log.d(TAG, "Ad loaded successfully");

                    JSObject event = new JSObject();
                    event.put("loaded", true);
                    notifyListeners("adLoaded", event);
                })
                .withAdListener(new AdListener() {
                    @Override
                    public void onAdFailedToLoad(@NonNull LoadAdError error) {
                        Log.e(TAG, "Ad failed to load: " + error.getMessage());
                        isAdLoaded = false;
                        isAdLoading = false;
                        
                        getActivity().runOnUiThread(() -> {
                            if (adContainer != null) {
                                adContainer.setVisibility(View.GONE);
                            }
                        });

                        JSObject event = new JSObject();
                        event.put("error", error.getMessage());
                        event.put("code", error.getCode());
                        notifyListeners("adFailedToLoad", event);
                        
                        if (error.getCode() != AdRequest.ERROR_CODE_NO_FILL) {
                            Toast.makeText(getActivity(), "Ad Load Failed: " + error.getMessage(), Toast.LENGTH_SHORT).show();
                        }
                    }
                })
                .withNativeAdOptions(new NativeAdOptions.Builder()
                    .setRequestMultipleImages(false)
                    .setAdChoicesPlacement(NativeAdOptions.ADCHOICES_TOP_RIGHT)
                    .build())
                .build();

            adLoader.loadAd(new AdRequest.Builder().build());
        });
    }

    private float absoluteYPx = 0f;

    @PluginMethod
    public void showAd(PluginCall call) {
        double x = call.getDouble("x", 0.0);
        double y = call.getDouble("y", 0.0);
        double width = call.getDouble("width", 360.0);
        double height = call.getDouble("height", 400.0);

        getActivity().runOnUiThread(() -> {
            try {
                if (!isAdLoaded || currentNativeAd == null) {
                    call.reject("Ad not loaded yet");
                    return;
                }

                float density = getContext().getResources().getDisplayMetrics().density;
                float xPx = (float)(x * density);
                absoluteYPx = (float)(y * density);
                int widthPx = (int)(width * density);

                if (adContainer == null) {
                    // Using the WebView's parent instead of the DecorView for better clipping
                    ViewGroup rootView = (ViewGroup) getBridge().getWebView().getParent();
                    if (rootView == null) {
                        rootView = getActivity().getWindow().getDecorView().findViewById(android.R.id.content);
                    }
                    adContainer = new FrameLayout(getActivity());
                    
                    // Theme detection for background
                    boolean isDarkMode = (getContext().getResources().getConfiguration().uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK) == android.content.res.Configuration.UI_MODE_NIGHT_YES;
                    
                    GradientDrawable bg = new GradientDrawable();
                    // Use a slightly transparent background initially or clear color
                    bg.setColor(isDarkMode ? Color.parseColor("#1A121212") : Color.parseColor("#1AFFFFFF"));
                    bg.setCornerRadius(16 * density);
                    adContainer.setBackground(bg);
                    adContainer.setElevation(2 * density);

                    // Forward all touches to the WebView so scrolling works 
                    // even if the user starts their swipe ON the ad.
                    adContainer.setOnTouchListener((v, event) -> {
                        if (getBridge() != null && getBridge().getWebView() != null) {
                            getBridge().getWebView().onTouchEvent(event);
                        }
                        // Returning false allows the children (the NativeAdView)
                        // to still receive the events for clicking.
                        return false;
                    });

                    // Inflate
                    NativeAdView adView = (NativeAdView) LayoutInflater.from(getActivity())
                        .inflate(R.layout.native_ad_layout, adContainer, false);

                    populateNativeAdView(currentNativeAd, adView);
                    adContainer.addView(adView);

                    FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(widthPx, ViewGroup.LayoutParams.WRAP_CONTENT);
                    params.leftMargin = 0; // Use translationX instead
                    params.topMargin = 0;  // Use translationY instead
                    
                    adContainer.setTranslationX(xPx);
                    
                    // Set up Native scroll listener to perfectly sync with WebView scroll
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                        getBridge().getWebView().setOnScrollChangeListener((v, scrollX, scrollY, oldScrollX, oldScrollY) -> {
                            if (adContainer != null && adContainer.getVisibility() == View.VISIBLE) {
                                adContainer.setTranslationY(absoluteYPx - scrollY);
                            }
                        });
                    }

                    // Initial position calculation
                    int currentScrollY = getBridge().getWebView().getScrollY();
                    adContainer.setTranslationY(absoluteYPx - currentScrollY);
                    
                    rootView.addView(adContainer, params);
                } else {
                    adContainer.setVisibility(View.VISIBLE);
                    updatePositionInternal(y);
                }

                call.resolve();

            } catch (Exception e) {
                Log.e(TAG, "showAd error", e);
                call.reject(e.getMessage());
            }
        });
    }

    private void updatePositionInternal(double y) {
        if (adContainer == null) return;
        float density = getContext().getResources().getDisplayMetrics().density;
        absoluteYPx = (float)(y * density);
        
        int currentScrollY = getBridge().getWebView().getScrollY();
        adContainer.setTranslationY(absoluteYPx - currentScrollY);
    }

    @PluginMethod
    public void updatePosition(PluginCall call) {
        double y = call.getDouble("y", 0.0);
        getActivity().runOnUiThread(() -> {
            updatePositionInternal(y);
            call.resolve();
        });
    }

    @PluginMethod
    public void hideAd(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (adContainer != null) adContainer.setVisibility(View.GONE);
            call.resolve();
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
            call.resolve();
        });
    }

    @PluginMethod
    public void isAdReady(PluginCall call) {
        JSObject result = new JSObject();
        result.put("ready", isAdLoaded && currentNativeAd != null);
        call.resolve(result);
    }

    private void populateNativeAdView(NativeAd nativeAd, NativeAdView adView) {
        try {
            // Headline
            TextView headlineView = adView.findViewById(R.id.ad_headline);
            headlineView.setText(nativeAd.getHeadline());
            adView.setHeadlineView(headlineView);

            // Body
            TextView bodyView = adView.findViewById(R.id.ad_body);
            if (nativeAd.getBody() == null) {
                bodyView.setVisibility(View.INVISIBLE);
            } else {
                bodyView.setVisibility(View.VISIBLE);
                bodyView.setText(nativeAd.getBody());
                adView.setBodyView(bodyView);
            }

            // CTA
            Button ctaView = adView.findViewById(R.id.ad_call_to_action);
            if (nativeAd.getCallToAction() == null) {
                ctaView.setVisibility(View.INVISIBLE);
            } else {
                ctaView.setVisibility(View.VISIBLE);
                ctaView.setText(nativeAd.getCallToAction());
                adView.setCallToActionView(ctaView);
            }

            // Icon
            ImageView iconView = adView.findViewById(R.id.ad_icon);
            if (nativeAd.getIcon() == null) {
                iconView.setVisibility(View.GONE);
            } else {
                iconView.setImageDrawable(nativeAd.getIcon().getDrawable());
                iconView.setVisibility(View.VISIBLE);
                adView.setIconView(iconView);
            }

            // Media
            MediaView mediaView = adView.findViewById(R.id.ad_media);
            if (nativeAd.getMediaContent() != null) {
                mediaView.setMediaContent(nativeAd.getMediaContent());
                mediaView.setVisibility(View.VISIBLE);
                adView.setMediaView(mediaView);
            } else {
                mediaView.setVisibility(View.GONE);
            }

            // IMPORTANT: setNativeAd last
            adView.setNativeAd(nativeAd);
            Log.d(TAG, "NativeAdView populated successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error populating ad view", e);
        }
    }
}
