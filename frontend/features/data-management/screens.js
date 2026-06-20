/*
  Purpose: Define frontend Data Management Screen.
  Responsibility: Render Excel bulk importing interface, show real-time sheet validation summaries and itemized row preview lists, and display historic logs of past imports.
*/

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useDataManagementStore } from './store';
import { theme } from '../../shared/styles/theme';

export function DataManagementScreen() {
  const {
    history,
    validationReport,
    loading,
    error,
    fetchHistory,
    validateImport,
    commitImport,
    downloadTemplate,
    clearValidationReport
  } = useDataManagementStore();

  const [activeTab, setActiveTab] = useState('SURGERY'); // 'SURGERY' | 'DIAGNOSIS' | 'STAFF'
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchHistory(activeTab);
    clearValidationReport();
    setUploadFileName('');
  }, [activeTab]);

  const handleDownload = () => {
    downloadTemplate(activeTab);
  };

  const handleUploadClick = () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Not Supported', 'Excel upload is only supported on a computer web browser.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target.result;
          const base64 = bstr.split(',')[1] || bstr;
          setUploadFileName(file.name);
          setUploading(true);
          await validateImport(activeTab, base64);
        } catch (err) {
          Alert.alert('Validation Failed', err.message || 'Error occurred during validation');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleCommit = async () => {
    if (!validationReport) return;
    try {
      await commitImport(activeTab, uploadFileName, validationReport);
      Alert.alert('Success', `Successfully imported ${uploadFileName}!`);
      setUploadFileName('');
      fetchHistory(activeTab);
    } catch (err) {
      Alert.alert('Import Failed', err.message || 'Error committing data to database.');
    }
  };

  const renderHistoryTable = () => {
    if (history.length === 0) {
      return (
        <View style={styles.emptyHistoryBox}>
          <Text style={styles.emptyText}>No import history for this module.</Text>
        </View>
      );
    }

    return (
      <View style={styles.tableWrapper}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.th, { flex: 1.5 }]}>Date & Time</Text>
          <Text style={[styles.th, { flex: 2 }]}>File Name</Text>
          <Text style={[styles.th, { flex: 1.5 }]}>Uploaded By</Text>
          <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Added</Text>
          <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Updated</Text>
          <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Status</Text>
        </View>
        {history.map((item) => {
          const uName = item.user 
            ? `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim() || item.user.username 
            : 'Unknown';
          const formattedDate = new Date(item.createdAt).toLocaleString();
          return (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.td, { flex: 1.5 }]}>{formattedDate}</Text>
              <Text style={[styles.td, { flex: 2, fontWeight: '600' }]} numberOfLines={1}>{item.fileName}</Text>
              <Text style={[styles.td, { flex: 1.5 }]}>{uName}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: 'center', color: theme.colors.success }]}>{item.addedCount}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: 'center', color: theme.colors.primaryLight }]}>{item.updatedCount}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: 'center' }]}>
                <View style={styles.successBadge}>
                  <Text style={styles.successBadgeText}>{item.status}</Text>
                </View>
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderPreviewGrid = () => {
    if (!validationReport) return null;
    const { toAdd, toUpdate, errors } = validationReport;
    const hasErrors = errors && errors.length > 0;

    return (
      <View style={styles.previewContainer}>
        <View style={styles.summaryTitleRow}>
          <Text style={styles.summaryTitle}>📊 Validation Preview Summary</Text>
          {uploadFileName ? <Text style={styles.uploadFileName}>File: {uploadFileName}</Text> : null}
        </View>

        {/* Counts summary row */}
        <View style={styles.summaryStatsRow}>
          <View style={[styles.statBox, { borderColor: theme.colors.success }]}>
            <Text style={[styles.statCount, { color: theme.colors.success }]}>{toAdd.length}</Text>
            <Text style={styles.statLabel}>To Add</Text>
          </View>
          <View style={[styles.statBox, { borderColor: theme.colors.primary }]}>
            <Text style={[styles.statCount, { color: theme.colors.primaryLight }]}>{toUpdate.length}</Text>
            <Text style={styles.statLabel}>To Update</Text>
          </View>
          <View style={[styles.statBox, { borderColor: hasErrors ? theme.colors.danger : theme.colors.border }]}>
            <Text style={[styles.statCount, { color: hasErrors ? theme.colors.danger : theme.colors.textMuted }]}>{errors.length}</Text>
            <Text style={styles.statLabel}>Errors</Text>
          </View>
        </View>

        {/* Warning or success header */}
        {hasErrors ? (
          <View style={styles.errorAlertCard}>
            <Text style={styles.errorAlertText}>
              ⚠️ Validation failed. Please fix the {errors.length} error(s) in your spreadsheet and upload again. Commit is blocked until all errors are resolved.
            </Text>
          </View>
        ) : (
          <View style={styles.successAlertCard}>
            <Text style={styles.successAlertText}>
              ✅ Validation successful! No errors found. You can proceed to commit this import to the database.
            </Text>
          </View>
        )}

        {/* Detailed items list */}
        <Text style={styles.previewSectionHeader}>Detailed Row Previews</Text>
        <ScrollView style={styles.previewRowsScroll} nestedScrollEnabled={true}>
          {errors.map((item, idx) => (
            <View key={`err-${idx}`} style={[styles.previewItemCard, styles.previewItemError]}>
              <View style={styles.previewItemHeader}>
                <Text style={styles.previewItemRowNumber}>Row {item.rowNum}</Text>
                <Text style={styles.previewItemStatusBadgeError}>Error</Text>
              </View>
              {activeTab === 'SURGERY' && (
                <Text style={styles.previewItemDetails}>Code: {item.surgeryCode || '(Missing)'} | Name: {item.surgeryName || '(Missing)'}</Text>
              )}
              {activeTab === 'DIAGNOSIS' && (
                <Text style={styles.previewItemDetails}>Code: {item.diagnosisCode || '(Missing)'} | Name: {item.diagnosisName || '(Missing)'}</Text>
              )}
              {activeTab === 'STAFF' && (
                <Text style={styles.previewItemDetails}>Username: {item.username || '(Missing)'} | Name: {item.firstName || '(Missing)'} {item.lastName || ''}</Text>
              )}
              <View style={styles.errorList}>
                {item.errors.map((err, eIdx) => (
                  <Text key={`err-desc-${eIdx}`} style={styles.errorMsgText}>• {err}</Text>
                ))}
              </View>
            </View>
          ))}

          {toUpdate.map((item, idx) => (
            <View key={`upd-${idx}`} style={[styles.previewItemCard, styles.previewItemUpdate]}>
              <View style={styles.previewItemHeader}>
                <Text style={styles.previewItemRowNumber}>Row {item.rowNum}</Text>
                <Text style={styles.previewItemStatusBadgeUpdate}>Update Existing</Text>
              </View>
              {activeTab === 'SURGERY' && (
                <Text style={styles.previewItemDetails}>Code: {item.surgeryCode} | Name: {item.surgeryName} | Category: {item.category} | Fee: INR {item.defaultSurgeonFee}</Text>
              )}
              {activeTab === 'DIAGNOSIS' && (
                <Text style={styles.previewItemDetails}>Code: {item.diagnosisCode} | Name: {item.diagnosisName}</Text>
              )}
              {activeTab === 'STAFF' && (
                <Text style={styles.previewItemDetails}>Username: {item.username} | Role: {item.staffType} | Name: {item.firstName} {item.lastName || ''}</Text>
              )}
            </View>
          ))}

          {toAdd.map((item, idx) => (
            <View key={`add-${idx}`} style={[styles.previewItemCard, styles.previewItemAdd]}>
              <View style={styles.previewItemHeader}>
                <Text style={styles.previewItemRowNumber}>Row {item.rowNum}</Text>
                <Text style={styles.previewItemStatusBadgeAdd}>Add New</Text>
              </View>
              {activeTab === 'SURGERY' && (
                <Text style={styles.previewItemDetails}>Code: {item.surgeryCode} | Name: {item.surgeryName} | Category: {item.category} | Fee: INR {item.defaultSurgeonFee}</Text>
              )}
              {activeTab === 'DIAGNOSIS' && (
                <Text style={styles.previewItemDetails}>Code: {item.diagnosisCode} | Name: {item.diagnosisName}</Text>
              )}
              {activeTab === 'STAFF' && (
                <Text style={styles.previewItemDetails}>Username: {item.username} | Role: {item.staffType} | Name: {item.firstName} {item.lastName || ''}</Text>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Action button row */}
        <View style={styles.previewActionsRow}>
          <TouchableOpacity style={styles.cancelPreviewBtn} onPress={clearValidationReport}>
            <Text style={styles.cancelPreviewBtnText}>Clear / Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.commitBtn, (hasErrors || (toAdd.length === 0 && toUpdate.length === 0)) && styles.commitBtnDisabled]}
            disabled={hasErrors || (toAdd.length === 0 && toUpdate.length === 0) || loading}
            onPress={handleCommit}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.commitBtnText}>💾 Commit Import to Database</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={theme.typography.title}>⚙️ Data Management</Text>
        <Text style={styles.subTitle}>Bulk import Master Databases via spreadsheets</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[
          { key: 'SURGERY', label: 'Surgery Master' },
          { key: 'DIAGNOSIS', label: 'Diagnosis Master' },
          { key: 'STAFF', label: 'Staff Master' }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabButtonText, activeTab === tab.key && styles.tabButtonTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Actions card */}
      <View style={styles.actionCard}>
        <Text style={styles.actionCardTitle}>Import {activeTab === 'SURGERY' ? 'Surgeries' : activeTab === 'DIAGNOSIS' ? 'Diagnoses' : 'Staff Members'}</Text>
        <Text style={styles.actionCardDesc}>
          {activeTab === 'SURGERY' && 'Download the standard Excel template, populate your surgeries (matching is done via Surgery Code), and upload the completed sheet.'}
          {activeTab === 'DIAGNOSIS' && 'Download the template, populate codes/names, and upload to configure diagnosis autocomplete selections.'}
          {activeTab === 'STAFF' && 'Import or bulk-update hospital staff logins. Specialty, Department and License columns apply specifically to doctors.'}
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleDownload}>
            <Text style={styles.secondaryBtnText}>📥 Download Sample Excel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleUploadClick} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>📤 Upload & Validate Excel</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Error Message */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Error: {error}</Text>
        </View>
      ) : null}

      {/* Validation previews */}
      {renderPreviewGrid()}

      {/* Import history table */}
      <View style={styles.historySection}>
        <Text style={styles.sectionHeader}>Import History Logs</Text>
        {loading && history.length === 0 ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          renderHistoryTable()
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: 60
  },
  header: {
    marginBottom: theme.spacing.md
  },
  subTitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginTop: 4
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8
  },
  tabButtonActive: {
    backgroundColor: theme.colors.primary
  },
  tabButtonText: {
    color: theme.colors.textMuted,
    fontWeight: '600',
    fontSize: 13
  },
  tabButtonTextActive: {
    color: '#ffffff',
    fontWeight: '800'
  },
  actionCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6
  },
  actionCardDesc: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: 16
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: theme.colors.success,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  secondaryBtnText: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 13
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: theme.colors.danger,
    padding: 12,
    borderRadius: 10,
    marginBottom: theme.spacing.md
  },
  errorBannerText: {
    color: theme.colors.danger,
    fontSize: 13,
    fontWeight: '600'
  },

  /* Preview Styles */
  previewContainer: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md
  },
  summaryTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text
  },
  uploadFileName: {
    fontSize: 11,
    color: theme.colors.textMuted,
    backgroundColor: theme.colors.background,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6
  },
  summaryStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14
  },
  statBox: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1
  },
  statCount: {
    fontSize: 20,
    fontWeight: '800'
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontWeight: '600'
  },
  errorAlertCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: theme.colors.danger,
    padding: 12,
    borderRadius: 10,
    marginBottom: 14
  },
  errorAlertText: {
    color: theme.colors.danger,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600'
  },
  successAlertCard: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderWidth: 1,
    borderColor: theme.colors.success,
    padding: 12,
    borderRadius: 10,
    marginBottom: 14
  },
  successAlertText: {
    color: theme.colors.success,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600'
  },
  previewSectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 10
  },
  previewRowsScroll: {
    maxHeight: 250,
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16
  },
  previewItemCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8
  },
  previewItemAdd: {
    borderColor: 'rgba(52, 211, 153, 0.3)'
  },
  previewItemUpdate: {
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  previewItemError: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.02)'
  },
  previewItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  previewItemRowNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted
  },
  previewItemStatusBadgeAdd: {
    fontSize: 9,
    color: theme.colors.success,
    fontWeight: '700',
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4
  },
  previewItemStatusBadgeUpdate: {
    fontSize: 9,
    color: theme.colors.primaryLight,
    fontWeight: '700',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4
  },
  previewItemStatusBadgeError: {
    fontSize: 9,
    color: theme.colors.danger,
    fontWeight: '700',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4
  },
  previewItemDetails: {
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 16
  },
  errorList: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 68, 68, 0.1)'
  },
  errorMsgText: {
    color: theme.colors.danger,
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500'
  },
  previewActionsRow: {
    flexDirection: 'row',
    gap: 12
  },
  cancelPreviewBtn: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  cancelPreviewBtnText: {
    color: theme.colors.textMuted,
    fontWeight: '600',
    fontSize: 13
  },
  commitBtn: {
    flex: 2,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  commitBtnDisabled: {
    opacity: 0.5,
    backgroundColor: theme.colors.border
  },
  commitBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13
  },

  /* History Table Styles */
  historySection: {
    marginTop: theme.spacing.md
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12
  },
  emptyHistoryBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 30,
    alignItems: 'center'
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 13
  },
  tableWrapper: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden'
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  th: {
    color: theme.colors.textMuted,
    fontWeight: '700',
    fontSize: 11
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center'
  },
  td: {
    color: theme.colors.text,
    fontSize: 12
  },
  successBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
    borderRadius: 20,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignSelf: 'center'
  },
  successBadgeText: {
    color: theme.colors.success,
    fontSize: 9,
    fontWeight: '700'
  }
});
