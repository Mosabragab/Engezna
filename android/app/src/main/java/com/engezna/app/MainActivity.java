package com.engezna.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);

            // Orders channel - high priority for order updates
            NotificationChannel ordersChannel = new NotificationChannel(
                    "orders",
                    "تحديثات الطلبات",
                    NotificationManager.IMPORTANCE_HIGH
            );
            ordersChannel.setDescription("إشعارات حالة الطلبات والتحديثات");
            ordersChannel.enableVibration(true);
            ordersChannel.setShowBadge(true);
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

            // General channel - default fallback
            NotificationChannel generalChannel = new NotificationChannel(
                    "general",
                    "إشعارات عامة",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            generalChannel.setDescription("إشعارات عامة من التطبيق");
            generalChannel.setShowBadge(true);
            manager.createNotificationChannel(generalChannel);
        }
    }
}
