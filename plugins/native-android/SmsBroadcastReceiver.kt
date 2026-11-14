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
 * Fully compatible with React Native 0.88 + New Architecture (ReactHost).
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

                // In React Native 0.88 New Architecture, ReactApplication provides reactHost
                val reactApp = context.applicationContext as? ReactApplication
                val reactContext = reactApp?.reactHost?.currentReactContext

                if (reactContext != null) {
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
                    SmsHeadlessTaskService.acquireWakeLock(context)
                    val serviceIntent = Intent(context, SmsHeadlessTaskService::class.java).apply {
                        putExtra("sender", sender)
                        putExtra("body", body)
                        putExtra("timestamp", timestamp)
                    }
                    context.startService(serviceIntent)
                    Log.d(TAG, "Triggered SmsHeadlessTaskService in background")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error processing incoming SMS broadcast", e)
            }
        }
    }
}
