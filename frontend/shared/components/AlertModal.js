import React from 'react';
import { Modal, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useAlertStore } from '../utils/alertStore';

export function AlertModal() {
  const { visible, title, message, buttons, hideAlert } = useAlertStore();

  if (!visible) return null;

  const handleButtonPress = (onPress) => {
    hideAlert();
    if (onPress) {
      // Small delay to ensure the modal closes before executing actions (helps navigation, etc.)
      setTimeout(() => {
        onPress();
      }, 50);
    }
  };

  const renderButtons = () => {
    if (!buttons || buttons.length === 0) {
      return (
        <TouchableOpacity style={styles.okButton} onPress={() => handleButtonPress(null)}>
          <Text style={styles.okButtonText}>OK</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.buttonRow}>
        {buttons.map((btn, index) => {
          const isDestructive = btn.style === 'destructive';
          const isCancel = btn.style === 'cancel';
          
          let btnStyle = styles.defaultButton;
          let textStyle = styles.defaultButtonText;

          if (isDestructive) {
            btnStyle = styles.destructiveButton;
            textStyle = styles.destructiveButtonText;
          } else if (isCancel) {
            btnStyle = styles.cancelButton;
            textStyle = styles.cancelButtonText;
          }

          return (
            <TouchableOpacity 
              key={index} 
              style={[styles.button, btnStyle]} 
              onPress={() => handleButtonPress(btn.onPress)}
            >
              <Text style={textStyle}>{btn.text}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={hideAlert}
    >
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.divider} />
          {renderButtons()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)', // Deep slate overlay
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  alertBox: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 8,
    textAlign: 'center'
  },
  message: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginBottom: 16
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  defaultButton: {
    backgroundColor: '#4f46e5'
  },
  defaultButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14
  },
  destructiveButton: {
    backgroundColor: '#ef4444'
  },
  destructiveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14
  },
  cancelButton: {
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#475569'
  },
  cancelButtonText: {
    color: '#cbd5e1',
    fontWeight: '700',
    fontSize: 14
  },
  okButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  okButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14
  }
});
