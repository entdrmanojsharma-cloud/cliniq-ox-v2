import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Platform } from 'react-native';
import { useLoadingStore } from '../utils/loadingStore';
import { theme } from '../styles/theme';

export function LoadingBar() {
  const showLoadingBar = useLoadingStore((state) => state.showLoadingBar);
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showLoadingBar) {
      // 1. Reset progress and set opacity to 1
      progress.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }).start();

      // 2. Animate to 30% quickly, then trickle to 85%
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0.85,
          duration: 8000,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      // 3. Complete progress to 100%, then fade out
      Animated.timing(progress, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            progress.setValue(0);
          });
        }
      });
    }
  }, [showLoadingBar]);

  const widthInterpolation = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.container, { opacity }]}>
      <Animated.View style={[styles.bar, { width: widthInterpolation }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'transparent',
    zIndex: 99999,
  },
  bar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 3,
  },
});
export default LoadingBar;
