import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

interface ExpenseVideoReactionProps {
  size?: number;
}

const videoSource = require('@/assets/images/reactions/sad_expense.mp4');

export function ExpenseVideoReaction({ size = 180 }: ExpenseVideoReactionProps) {
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <VideoView
        player={player}
        style={{ width: size, height: size, borderRadius: 22 }}
        contentFit="cover"
        nativeControls={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
