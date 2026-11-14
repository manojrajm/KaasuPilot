const {
  withAndroidManifest,
  withDangerousMod,
  createRunOncePlugin,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PLUGIN_NAME = 'withSmsReceiver';
const PLUGIN_VERSION = '1.0.0';

/**
 * Injects RECEIVE_SMS, READ_SMS, and RECEIVE_BOOT_COMPLETED permissions,
 * and registers the SmsBroadcastReceiver and SmsHeadlessTaskService into AndroidManifest.xml.
 */
function modifyAndroidManifest(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const manifest = androidManifest.manifest;

    // 1. Ensure uses-permission array exists
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const requiredPermissions = [
      'android.permission.RECEIVE_SMS',
      'android.permission.READ_SMS',
      'android.permission.RECEIVE_BOOT_COMPLETED',
    ];

    requiredPermissions.forEach((perm) => {
      const exists = manifest['uses-permission'].some(
        (p) => p.$ && p.$['android:name'] === perm
      );
      if (!exists) {
        manifest['uses-permission'].push({
          $: { 'android:name': perm },
        });
      }
    });

    // 2. Ensure application exists
    if (!manifest.application || manifest.application.length === 0) {
      manifest.application = [{}];
    }
    const application = manifest.application[0];

    // 3. Register Receiver
    if (!application.receiver) {
      application.receiver = [];
    }
    const receiverName = 'com.kasupilot.app.sms.SmsBroadcastReceiver';
    const receiverExists = application.receiver.some(
      (r) => r.$ && r.$['android:name'] === receiverName
    );

    if (!receiverExists) {
      application.receiver.push({
        $: {
          'android:name': receiverName,
          'android:permission': 'android.permission.BROADCAST_SMS',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            $: {
              'android:priority': '999',
            },
            action: [
              {
                $: {
                  'android:name': 'android.provider.Telephony.SMS_RECEIVED',
                },
              },
            ],
          },
        ],
      });
    }

    // 4. Register Headless Task Service
    if (!application.service) {
      application.service = [];
    }
    const serviceName = 'com.kasupilot.app.sms.SmsHeadlessTaskService';
    const serviceExists = application.service.some(
      (s) => s.$ && s.$['android:name'] === serviceName
    );

    if (!serviceExists) {
      application.service.push({
        $: {
          'android:name': serviceName,
          'android:exported': 'false',
        },
      });
    }

    return config;
  });
}

/**
 * Copies the native Kotlin source files into the android project during expo prebuild / EAS build.
 */
function copyNativeSourceFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const packageName = config.android?.package || 'com.kasupilot.app';
      const packagePath = packageName.replace(/\./g, '/');

      const targetDir = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        packagePath,
        'sms'
      );

      fs.mkdirSync(targetDir, { recursive: true });

      const templatesDir = path.join(projectRoot, 'plugins', 'native-android');

      const files = ['SmsBroadcastReceiver.kt', 'SmsHeadlessTaskService.kt'];

      files.forEach((file) => {
        const srcFile = path.join(templatesDir, file);
        const destFile = path.join(targetDir, file);
        if (fs.existsSync(srcFile)) {
          let content = fs.readFileSync(srcFile, 'utf8');
          // Replace package name dynamically if customized
          content = content.replace(
            /package com\.kasupilot\.app\.sms/,
            `package ${packageName}.sms`
          );
          fs.writeFileSync(destFile, content, 'utf8');
        }
      });

      return config;
    },
  ]);
}

function withSmsReceiver(config) {
  config = modifyAndroidManifest(config);
  config = copyNativeSourceFiles(config);
  return config;
}

module.exports = createRunOncePlugin(withSmsReceiver, PLUGIN_NAME, PLUGIN_VERSION);
