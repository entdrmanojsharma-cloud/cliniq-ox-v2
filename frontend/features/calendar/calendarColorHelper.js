/* 
  Purpose: Define event color mapping for 3-band background zoning.
  Responsibility: Map eventType to upper, middle, and lower band colors.
*/

export const getEventBands = (eventType) => {
  const defaultColor = 'transparent';
  
  // Translucent colors using rgba for premium contrast, readability, and theme compatibility
  const colors = {
    red: 'rgba(239, 68, 68, 0.25)',      // OPD (Upper 1/3)
    green: 'rgba(16, 185, 129, 0.25)',    // Surgery (Middle 1/3)
    orange: 'rgba(249, 115, 22, 0.25)',   // Other Events (Lower 1/3)
    purple: 'rgba(168, 85, 247, 0.25)',   // Future Emergency (e.g. Upper 1/3)
    blue: 'rgba(59, 130, 246, 0.25)',     // Future IPD Admission (e.g. Middle 1/3)
    darkGrey: 'rgba(100, 116, 139, 0.35)'  // Future OT Blocked (e.g. Lower 1/3)
  };

  const type = (eventType || '').trim().toUpperCase();

  switch (type) {
    case 'OPD':
      return [colors.red, defaultColor, defaultColor];
      
    case 'SURGERY':
      return [defaultColor, colors.green, defaultColor];
      
    case 'MEETING':
    case 'LEAVE':
    case 'CONFERENCE':
    case 'HOLIDAY':
    case 'CME':
    case 'PERSONAL':
    case 'PERSONAL EVENT':
    case 'ADMINISTRATIVE':
    case 'ADMINISTRATIVE EVENT':
    case 'OTHER':
      return [defaultColor, defaultColor, colors.orange];
    
    // Future Extensible Types
    case 'EMERGENCY':
      return [colors.purple, defaultColor, defaultColor];
      
    case 'IPD':
    case 'IPD ADMISSION':
      return [defaultColor, colors.blue, defaultColor];
      
    case 'OT BLOCKED':
      return [defaultColor, defaultColor, colors.darkGrey];
      
    default:
      // Fallback: If it matches keyword patterns, classify accordingly
      if (
        type.includes('MEETING') || 
        type.includes('LEAVE') || 
        type.includes('CONFERENCE') || 
        type.includes('HOLIDAY') || 
        type.includes('CME') || 
        type.includes('PERSONAL') || 
        type.includes('ADMINISTRATIVE')
      ) {
        return [defaultColor, defaultColor, colors.orange];
      }
      if (type.includes('EMERGENCY')) {
        return [colors.purple, defaultColor, defaultColor];
      }
      if (type.includes('IPD')) {
        return [defaultColor, colors.blue, defaultColor];
      }
      if (type.includes('OT') || type.includes('BLOCKED')) {
        return [defaultColor, defaultColor, colors.darkGrey];
      }
      
      // Default fallback for any unrecognized event is Orange in Lower 1/3
      return [defaultColor, defaultColor, colors.orange];
  }
};
