/* 
  Purpose: Toast Notification UI Component.
  Responsibility: Render a floating toast alert that slides down from the top and automatically fades out.
*/

import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useToastStore } from '../utils/toastStore';
import { theme } from '../styles/theme';

export function ToastNotification() {
  const { visible, message, type, hideToast } = useToastStore();
  const [localVisible, setLocalVisible] = useState(false);
  
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setLocalVisible(true);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 350,
          useNativeDriver: Platform.OS !== 'web'
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web'
        })
      ]).start();
    } else if (localVisible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web'
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web'
        })
      ]).start(() => {
        setLocalVisible(false);
      });
    }
  }, [visible]);

  if (!localVisible) return null;

  let icon = 'ℹ️';
  let badgeColor = theme.colors.primary;
  if (type === 'success') {
    icon = '✅';
    badgeColor = theme.colors.success;
  } else if (type === 'warning') {
    icon = '⚠️';
    badgeColor = theme.colors.warning;
  } else if (type === 'danger') {
    icon = '🚫';
    badgeColor = theme.colors.danger;
  }

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          opacity: opacity,
          transform: [{ translateY: translateY }]
        }
      ]}
    >
      <Pressable onPress={hideToast} style={styles.toastBox}>
        <View style={[styles.indicator, { backgroundColor: badgeColor }]} />
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.messageText}>{message}</Text>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 24 : 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10000,
    elevation: 10,
    paddingHorizontal: 16
  },
  toastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 450,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    gap: 10,
    position: 'relative',
    overflow: 'hidden'
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5
  },
  icon: {
    fontSize: 18,
    lineHeight: 20
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#f8fafc',
    lineHeight: 18
  },
  closeText: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 6,
    fontWeight: '700'
  }
});
