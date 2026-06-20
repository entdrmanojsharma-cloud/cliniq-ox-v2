/* 
  Purpose: Define HTML header component for Estimate printing.
  Responsibility: Structure branding, hospital info, and estimate metadata.
*/

function renderHeader(data) {
  const hospital = data.hospital || {};

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return `
    <table class="header-table">
      <tr>
        ${hospital.logoUrl ? `<td class="header-logo"><img src="${hospital.logoUrl}" alt="Logo" class="header-logo" /></td>` : ''}
        <td class="header-branding">
          <h1 class="hospital-name">${hospital.name || 'Hospital Name'}</h1>
          <p class="hospital-meta">${hospital.address || 'Address'}</p>
          <p class="hospital-meta">Phone: ${hospital.phone || 'Phone'} | Email: ${hospital.email || 'Email'}</p>
          ${hospital.gstNumber ? `<p class="hospital-meta"><strong>GSTIN:</strong> ${hospital.gstNumber}</p>` : ''}
        </td>
        <td class="document-title-box">
          <div class="document-title">ESTIMATE</div>
          <div class="document-meta">
            <strong>No:</strong> ${data.estimateNumber || 'N/A'}<br />
            <strong>Date:</strong> ${formatDate(data.createdAt)}<br />
            <strong>Status:</strong> ${data.status || 'DRAFT'}
          </div>
        </td>
      </tr>
    </table>
  `;
}

module.exports = renderHeader;
