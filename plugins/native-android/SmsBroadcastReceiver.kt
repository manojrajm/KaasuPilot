package com.kasupilot.app.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * KasuPilot Production APK Background SMS Broadcast Receiver.
 * Intercepts incoming SMS broadcasts (android.provider.Telephony.SMS_RECEIVED).
 * 
 * Flow:
 * 1. Combines multi-part SMS messages from banks.
 * 2. If app is foregrounded: Dispatches event directly to active React Native instance.
 * 3. If app is backgrounded / killed: Starts SmsHeadlessTaskService with wake lock
 *    to process and insert transaction into SQLite database seamlessly.
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

                // Check if React Native foreground instance is alive
                val reactApp = context.applicationContext as? ReactApplication
                val reactInstanceManager = reactApp?.reactNativeHost?.reactInstanceManager
                val reactContext = reactInstanceManager?.currentReactContext

                if (reactContext != null && reactContext.hasActiveReactInstance()) {
                    // Send to foreground listener
                    val params = Arguments.createMap().apply {
                        putString("sender", sender)
                        putString("body", body)
                        putDouble("timestamp", timestamp.toDouble())
                    }
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("KasuPilotSmsReceived", params)
                    Log.d(TAG, "Dispatched SMS to active React Native foreground emitter")
                } else {
                    // Start HeadlessJsTaskService in background
                    val serviceIntent = Intent(context, SmsHeadlessTaskService::class.java).apply {
                        putExtra("sender", sender)
                        putExtra("body", body)
                        putExtra("timestamp", timestamp)
                    }
                    HeadlessJsTaskService.acquireWakeLockNow(context)
                    context.startService(serviceIntent)
                    Log.d(TAG, "Triggered SmsHeadlessTaskService in background wake lock")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error processing incoming SMS broadcast", e)
            }
        }
    }
}
