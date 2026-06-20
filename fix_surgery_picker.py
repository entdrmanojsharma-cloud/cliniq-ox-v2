import re

with open("/Users/Shared/Mobile app cliniq-OX/frontend/features/estimates/components/SurgeryPicker.js", "r") as f:
    content = f.read()

# Change the trigger to look like an input box instead of a button
trigger_html = """
    <View>
      <TouchableOpacity style={styles.triggerBtn} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={styles.triggerText}>{placeholder}</Text>
        <Text style={{ color: '#666', fontSize: 12 }}>▼</Text>
      </TouchableOpacity>
"""
content = re.sub(r'    <View>\s*<TouchableOpacity style=\{styles\.triggerBtn\} onPress=\{.*?\}\>\s*<Text style=\{styles\.triggerText\}>\{placeholder\}</Text>\s*</TouchableOpacity>', trigger_html, content)

# Change the trigger styling
old_trigger_styles = """
  triggerBtn: {
    backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 8,
    paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center'
  },
  triggerText: { color: theme.colors.primary, fontWeight: '700', fontSize: 13 },
"""
new_trigger_styles = """
  triggerBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: 4,
    paddingVertical: 10, paddingHorizontal: 12, minHeight: 40
  },
  triggerText: { flex: 1, color: '#333', fontSize: 13 },
"""
content = content.replace(old_trigger_styles.strip(), new_trigger_styles.strip())

# Change modal search box styling to light theme
old_modal_styles = """
  modalContentSearch: { 
    backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155',
    maxHeight: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8
  },

  searchRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#334155', paddingRight: 12 },
  searchInputModal: {
    flex: 1, color: '#f1f5f9', padding: 16, fontSize: 15,
  },
"""
new_modal_styles = """
  modalContentSearch: { 
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ccc',
    maxHeight: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 8
  },

  searchRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingRight: 12 },
  searchInputModal: {
    flex: 1, color: '#333', padding: 16, fontSize: 15,
  },
"""
content = content.replace(old_modal_styles.strip(), new_modal_styles.strip())

with open("/Users/Shared/Mobile app cliniq-OX/frontend/features/estimates/components/SurgeryPicker.js", "w") as f:
    f.write(content)
