package com.kasupilot.app.sms

import android.content.Context
import android.content.Intent
import android.os.Bundle
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * Headless JS Service that awakens React Native's JS runtime when the app
 * is backgrounded or completely terminated, allowing financial SMS parsing
 * and SQLite insertion without launching the UI.
 */
class SmsHeadlessTaskService : HeadlessJsTaskService() {

    companion object {
        @JvmStatic
        fun acquireWakeLock(context: Context) {
            HeadlessJsTaskService.acquireWakeLockNow(context)
        }
    }

    // React Native 0.8x declares the intent as nullable (Intent?); a non-null Intent "overrides nothing".
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        val extras: Bundle? = intent?.extras
        if (extras != null) {
            val params = Arguments.createMap().apply {
                putString("sender", extras.getString("sender", "UNKNOWN"))
                putString("body", extras.getString("body", ""))
                putDouble("timestamp", extras.getLong("timestamp", System.currentTimeMillis()).toDouble())
            }
            return HeadlessJsTaskConfig(
                "KasuPilotSmsReceiverTask",
                params,
                20000, // 20 seconds timeout for safe DB write & regex
                true   // allowed in foreground / background
            )
        }
        return null
    }
}
