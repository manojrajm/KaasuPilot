package com.kasupilot.app.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * KasuPilot Production APK Background SMS Broadcast Receiver.
 * Intercepts incoming SMS broadcasts (android.provider.Telephony.SMS_RECEIVED).
 * 
 * Flow:
 * 1. Combines multi-part SMS messages from banks.
 * 2. Acquires WakeLock via SmsHeadlessTaskService so CPU stays awake.
 * 3. Starts SmsHeadlessTaskService to parse SMS, write to SQLite, and fire push notification alert.
 * 4. If React Native foreground instance is alive, also emits directly to UI for 0ms reactivity.
 */
class SmsBroadcastReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "KasuPilotSmsReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            try {
                val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
                if (messages.isNullOrEmpty()) return

                val sender = messages[0].originatingAddress ?: "UNKNOWN"
                val bodyBuilder = StringBuilder()
                var timestamp = System.currentTimeMillis()

                for (sms in messages) {
                    bodyBuilder.append(sms.messageBody)
                    timestamp = sms.timestampMillis
                }
                val body = bodyBuilder.toString()
                Log.d(TAG, "Incoming SMS from [$sender]: $body")

                // 1. ALWAYS start HeadlessJsTaskService with WakeLock for guaranteed background processing
                SmsHeadlessTaskService.acquireWakeLock(context)
                val serviceIntent = Intent(context, SmsHeadlessTaskService::class.java).apply {
                    putExtra("sender", sender)
                    putExtra("body", body)
                    putExtra("timestamp", timestamp)
                }
                context.startService(serviceIntent)
                Log.d(TAG, "Started SmsHeadlessTaskService with WakeLock for [$sender]")

                // 2. If app is foregrounded, also emit directly to UI for immediate update
                try {
                    val reactApp = context.applicationContext as? ReactApplication
                    val reactContext = reactApp?.reactHost?.currentReactContext
                    if (reactContext != null) {
                        val params = Arguments.createMap().apply {
                            putString("sender", sender)
                            putString("body", body)
                            putDouble("timestamp", timestamp.toDouble())
                        }
                        reactContext
                            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                            .emit("KasuPilotSmsReceived", params)
                        Log.d(TAG, "Dispatched SMS to active React Native foreground emitter")
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Foreground emitter skipped, headless task handles ingestion", e)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error processing incoming SMS broadcast", e)
            }
        }
    }
}
