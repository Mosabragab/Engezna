package com.engezna.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannels();
    }

    @Override
    public void onStart() {
        super.onStart();
        WebView webView = getBridge().getWebView();
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request) {
                String url = request.getUrl().toString();
                // Keep engezna.com URLs inside the WebView
                if (url.contains("engezna.com")) {
                    return false;
                }
                return super.shouldOverrideUrlLoading(view, request);
            }
        });
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build();

            // Orders channel - high priority for order updates
            NotificationChannel ordersChannel = new NotificationChannel(
                    "orders",
                    "تحديثات الطلبات",
                    NotificationManager.IMPORTANCE_HIGH
            );
            ordersChannel.setDescription("إشعارات حالة الطلبات والتحديثات");
            ordersChannel.enableVibration(true);
            ordersChannel.setShowBadge(true);
            ordersChannel.setSound(
                    Uri.parse("android.resource://" + getPackageName() + "/raw/new_order"),
                    audioAttributes
            );
            manager.createNotificationChannel(ordersChannel);

            // Chat channel - for AI chat and customer support
            NotificationChannel chatChannel = new NotificationChannel(
                    "chat",
                    "الرسائل والمحادثات",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            chatChannel.setDescription("إشعارات المحادثات والدعم الفني");
            chatChannel.enableVibration(true);
            chatChannel.setShowBadge(true);
            chatChannel.setSound(
                    Uri.parse("android.resource://" + getPackageName() + "/raw/notification"),
                    audioAttributes
            );
            manager.createNotificationChannel(chatChannel);

            // Promotions channel - lower priority for offers
            NotificationChannel promosChannel = new NotificationChannel(
                    "promotions",
                    "العروض والتخفيضات",
                    NotificationManager.IMPORTANCE_LOW
            );
            promosChannel.setDescription("إشعارات العروض الخاصة والتخفيضات");
            promosChannel.setShowBadge(false);
            manager.createNotificationChannel(promosChannel);

            // Custom orders channel - for custom order broadcasts
            NotificationChannel customOrdersChannel = new NotificationChannel(
                    "custom_orders",
                    "الطلبات المخصصة",
                    NotificationManager.IMPORTANCE_HIGH
            );
            customOrdersChannel.setDescription("إشعارات البث والطلبات المخصصة");
            customOrdersChannel.enableVibration(true);
            customOrdersChannel.setShowBadge(true);
            customOrdersChannel.setSound(
                    Uri.parse("android.resource://" + getPackageName() + "/raw/custom_order"),
                    audioAttributes
            );
            manager.createNotificationChannel(customOrdersChannel);

            // General channel - default fallback
            NotificationChannel generalChannel = new NotificationChannel(
                    "general",
                    "إشعارات عامة",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            generalChannel.setDescription("إشعارات عامة من التطبيق");
            generalChannel.setShowBadge(true);
            generalChannel.setSound(
                    Uri.parse("android.resource://" + getPackageName() + "/raw/notification"),
                    audioAttributes
            );
            manager.createNotificationChannel(generalChannel);
        }
    }
}
