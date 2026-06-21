/* 
  Purpose: Define HTML patient info component for Estimate printing.
  Responsibility: Structure patient details and consulting clinician details.
*/

function renderPatientSection(data) {
  const patient = data.patient || {};
  const doctor = data.doctor || {};

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return `
    <table class="metadata-table">
      <tr>
        <td class="metadata-label">Patient Name:</td>
        <td>${patient.name || 'Patient Name'}</td>
        <td class="metadata-label">UHID / Patient ID:</td>
        <td><strong>${patient.uhid || 'UHID'}</strong></td>
      </tr>
      <tr>
        <td class="metadata-label">Gender / DOB:</td>
        <td>${patient.gender || 'N/A'} / ${formatDate(patient.dateOfBirth)}</td>
        <td class="metadata-label">Contact Mobile:</td>
        <td>${patient.mobile || 'N/A'}</td>
      </tr>
      <tr>
        <td class="metadata-label">Doctor / Surgeon:</td>
        <td>Dr. ${doctor.firstName || ''} ${doctor.lastName || ''}</td>
        <td class="metadata-label">Specialty:</td>
        <td>${doctor.specialty || 'N/A'}</td>
      </tr>
      ${data.diagnoses && data.diagnoses.length > 0 ? `
      <tr>
        <td class="metadata-label">Diagnosis:</td>
        <td colspan="3">${data.diagnoses.join(', ')}</td>
      </tr>
      ` : ''}
    </table>
  `;
}

module.exports = renderPatientSection;
