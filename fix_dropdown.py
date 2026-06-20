with open("/Users/Shared/Mobile app cliniq-OX/frontend/features/estimates/EstimateFormScreen.js", "r") as f:
    content = f.read()

# Modify DaysDropdown to accept unit
old_days_dropdown = """function DaysDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const options = [
    { label: '0 Days (Day Care)', value: 0 },
    { label: '1 Day', value: 1 },
    { label: '2 Days', value: 2 },
    { label: '3 Days', value: 3 },
    { label: '4 Days', value: 4 },
    { label: '5 Days', value: 5 },
    { label: '6 Days', value: 6 },
    { label: '7 Days', value: 7 },
    { label: '10 Days', value: 10 },
    { label: '14 Days', value: 14 },
    { label: '21 Days', value: 21 },
    { label: '30 Days', value: 30 },
  ];

  return (
    <View>
      <TouchableOpacity style={tableStyles.tableInput} onPress={() => setOpen(true)}>
        <Text style={{ color: '#333', fontSize: 13 }}>
          {(() => {
            const found = options.find(o => o.value === value);
            return found ? found.label : `${value} Days`;
          })()}
        </Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setOpen(false)} activeOpacity={1}>
          <View style={[styles.dropdownMenu, { width: 160 }]}>
            <FlatList
              data={options}
              keyExtractor={item => item.value.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownMenuItem}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.dropdownMenuItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}"""

new_days_dropdown = """function DaysDropdown({ value, onChange, unit = 'Days' }) {
  const [open, setOpen] = useState(false);
  const options = unit === 'Hours' ? [
    { label: '0 Hours', value: 0 },
    { label: '1 Hour', value: 1 },
    { label: '2 Hours', value: 2 },
    { label: '3 Hours', value: 3 },
    { label: '4 Hours', value: 4 },
    { label: '5 Hours', value: 5 },
    { label: '6 Hours', value: 6 },
    { label: '8 Hours', value: 8 },
    { label: '10 Hours', value: 10 },
    { label: '12 Hours', value: 12 },
    { label: '24 Hours', value: 24 },
  ] : [
    { label: '0 Days (Day Care)', value: 0 },
    { label: '1 Day', value: 1 },
    { label: '2 Days', value: 2 },
    { label: '3 Days', value: 3 },
    { label: '4 Days', value: 4 },
    { label: '5 Days', value: 5 },
    { label: '6 Days', value: 6 },
    { label: '7 Days', value: 7 },
    { label: '10 Days', value: 10 },
    { label: '14 Days', value: 14 },
    { label: '21 Days', value: 21 },
    { label: '30 Days', value: 30 },
  ];

  return (
    <View>
      <TouchableOpacity style={tableStyles.tableInput} onPress={() => setOpen(true)}>
        <Text style={{ color: '#333', fontSize: 13 }}>
          {(() => {
            const found = options.find(o => o.value === value);
            return found ? found.label : `${value} ${unit === 'Hours' ? (value === 1 ? 'Hour' : 'Hours') : (value === 1 ? 'Day' : 'Days')}`;
          })()}
        </Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setOpen(false)} activeOpacity={1}>
          <View style={[styles.dropdownMenu, { width: 160 }]}>
            <FlatList
              data={options}
              keyExtractor={item => item.value.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownMenuItem}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.dropdownMenuItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}"""

content = content.replace(old_days_dropdown, new_days_dropdown)

old_ot_dropdown = "<DaysDropdown value={Number(otUnits) || 0} onChange={(val) => setOtUnits(String(val))} />"
new_ot_dropdown = "<DaysDropdown value={Number(otUnits) || 0} unit=\"Hours\" onChange={(val) => setOtUnits(String(val))} />"
content = content.replace(old_ot_dropdown, new_ot_dropdown)

with open("/Users/Shared/Mobile app cliniq-OX/frontend/features/estimates/EstimateFormScreen.js", "w") as f:
    f.write(content)
