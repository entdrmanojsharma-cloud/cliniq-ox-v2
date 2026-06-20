/* 
  Purpose: Define Business Service for Advance Balances.
  Responsibility: Enforce balance access controls and coordinate ledger statement fetching.
*/

class AdvanceBalancesService {
  constructor(repository) {
    this.repository = repository;
  }

  async getBalanceDetails(patientId, estimateId, hospitalId) {
    return this.repository.findOrCreate(patientId, estimateId, hospitalId);
  }

  async getLedgerHistory(patientId, estimateId, hospitalId) {
    const balance = await this.repository.findOrCreate(patientId, estimateId, hospitalId);
    return this.repository.getLedgerEntries(balance.id);
  }
}

module.exports = AdvanceBalancesService;
