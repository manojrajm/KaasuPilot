package expo.modules.smsinbox

import android.Manifest
import android.content.pm.PackageManager
import android.provider.Telephony
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Reads recent messages from the device SMS inbox so the app can catch up on bank SMS
 * that arrived while it could not process them (app force-stopped, battery restrictions).
 */
class SmsInboxModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SmsInbox")

    /**
     * Newest-first inbox messages received at or after `sinceMs` (epoch ms), at most `limit`.
     * `dateSent` is the service-centre timestamp, the same value the live BroadcastReceiver
     * reports (SmsMessage.timestampMillis), so duplicate keys match across both paths.
     */
    AsyncFunction("readRecentAsync") { limit: Int, sinceMs: Double ->
      val context = appContext.reactContext
        ?: throw CodedException("ERR_NO_CONTEXT", "Android context is not available", null)

      if (context.checkSelfPermission(Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
        throw CodedException("ERR_SMS_PERMISSION", "READ_SMS permission is not granted", null)
      }

      val cap = limit.coerceIn(1, 200)
      val projection = arrayOf(
        Telephony.Sms._ID,
        Telephony.Sms.ADDRESS,
        Telephony.Sms.BODY,
        Telephony.Sms.DATE,
        Telephony.Sms.DATE_SENT
      )
      val messages = mutableListOf<Map<String, Any?>>()

      context.contentResolver.query(
        Telephony.Sms.Inbox.CONTENT_URI,
        projection,
        "${Telephony.Sms.DATE} >= ?",
        arrayOf(sinceMs.toLong().toString()),
        "${Telephony.Sms.DATE} DESC"
      )?.use { cursor ->
        val idCol = cursor.getColumnIndexOrThrow(Telephony.Sms._ID)
        val addressCol = cursor.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
        val bodyCol = cursor.getColumnIndexOrThrow(Telephony.Sms.BODY)
        val dateCol = cursor.getColumnIndexOrThrow(Telephony.Sms.DATE)
        val dateSentCol = cursor.getColumnIndexOrThrow(Telephony.Sms.DATE_SENT)

        while (cursor.moveToNext() && messages.size < cap) {
          messages.add(
            mapOf(
              "id" to cursor.getLong(idCol).toString(),
              "sender" to (cursor.getString(addressCol) ?: ""),
              "body" to (cursor.getString(bodyCol) ?: ""),
              "date" to cursor.getLong(dateCol).toDouble(),
              "dateSent" to cursor.getLong(dateSentCol).toDouble()
            )
          )
        }
      }

      messages
    }
  }
}
