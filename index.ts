/**
 * App entry point.
 *
 * When an SMS arrives while KasuPilot is fully closed, Android starts SmsHeadlessTaskService,
 * which loads this bundle WITHOUT rendering any screen and runs the task
 * "KasuPilotSmsReceiverTask". Expo Router only evaluates src/app/_layout.tsx when it renders,
 * so the task must be registered here, before the router entry, or React Native finds no task
 * and the SMS is silently dropped.
 */
import './src/services/smsBackgroundReceiver';
import 'expo-router/entry';
