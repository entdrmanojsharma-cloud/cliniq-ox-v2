import re

with open("/Users/Shared/Mobile app cliniq-OX/frontend/features/estimates/EstimateFormScreen.js", "r") as f:
    content = f.read()

# 1. Add saveAsTemplate state
state_match = "const [packageName, setPackageName] = useState(existing.packageName || '');"
new_state = state_match + "\n  const [saveAsTemplate, setSaveAsTemplate] = useState(false);"
content = content.replace(state_match, new_state)

# 2. Add the UI fields in the Fixed Template section
# Find the Package Amount input
ui_match = """
            <View style={tableStyles.tableRow}>
              <View style={tableStyles.cellLabel}><Text style={tableStyles.cellLabelText}>Package Amount (₹) *</Text></View>
"""
new_ui = """
            <View style={tableStyles.tableRow}>
              <View style={tableStyles.cellLabel}><Text style={tableStyles.cellLabelText}>Package Name *</Text></View>
              <View style={tableStyles.cellInputs}>
                <TextInput
                  style={tableStyles.tableInput}
                  value={packageName}
                  onChangeText={setPackageName}
                  placeholder="e.g. Gallbladder Removal Package"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            <View style={tableStyles.tableRow}>
              <View style={tableStyles.cellLabel}><Text style={tableStyles.cellLabelText}>Package Amount (₹) *</Text></View>
"""
content = content.replace(ui_match.strip(), new_ui.strip())

# Find the Inclusion Note input
ui_match_2 = """
            <View style={[tableStyles.tableRow, tableStyles.tableRowLast]}>
              <View style={tableStyles.cellLabel}>
                <Text style={tableStyles.cellLabelText}>Inclusion Note</Text>
"""
new_ui_2 = """
            <View style={tableStyles.tableRow}>
              <View style={tableStyles.cellLabel}>
                <Text style={tableStyles.cellLabelText}>Save as Template</Text>
              </View>
              <View style={[tableStyles.cellInputs, { justifyContent: 'center', paddingVertical: 10 }]}>
                <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', gap: 8}} onPress={() => setSaveAsTemplate(!saveAsTemplate)}>
                  <View style={[tableStyles.checkboxSquare, saveAsTemplate && tableStyles.checkboxSquareChecked]}>
                    {saveAsTemplate && <Text style={tableStyles.checkboxTick}>✓</Text>}
                  </View>
                  <Text style={{fontSize: 13, color: '#333'}}>Save this package for future use</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[tableStyles.tableRow, tableStyles.tableRowLast]}>
              <View style={tableStyles.cellLabel}>
                <Text style={tableStyles.cellLabelText}>Inclusion Note</Text>
"""
content = content.replace(ui_match_2.strip(), new_ui_2.strip())

# 3. Add API call in handleSave
save_match = """
      const saved = id ? await updateEstimate(id, payload) : await createEstimate(payload);
      const estimateId = saved?.id || id;
"""
new_save = """
      const saved = id ? await updateEstimate(id, payload) : await createEstimate(payload);
      const estimateId = saved?.id || id;

      if (isPackage && saveAsTemplate && packageName.trim()) {
        try {
          await api.post('/estimate-templates', {
            templateName: packageName.trim(),
            templateType: 'FIXED_PACKAGE',
            packagePrice: Number(packagePrice) || 0,
            packageNotes: packageIncludes || '',
            templateItems: surgeries.map(s => ({
              referenceId: s.surgeryId,
              itemCategory: 'SURGERY',
              itemName: s.surgeryName,
              quantity: 1,
              defaultRate: 0,
              discountValue: 0,
              discountType: 'PERCENTAGE'
            }))
          });
        } catch (err) {
          console.warn('Failed to save template', err);
        }
      }
"""
content = content.replace(save_match.strip(), new_save.strip())

with open("/Users/Shared/Mobile app cliniq-OX/frontend/features/estimates/EstimateFormScreen.js", "w") as f:
    f.write(content)
