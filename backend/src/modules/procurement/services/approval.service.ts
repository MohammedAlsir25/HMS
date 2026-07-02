export function calculateApprovalTier(invoiceTotal: number, expenseType: string): number {
  if (expenseType === 'CAPEX') {
    if (invoiceTotal <= 200000) return 2;
    return 3;
  }
  if (invoiceTotal <= 50000) return 1;
  if (invoiceTotal <= 200000) return 2;
  return 3;
}

export function getRequiredApprovalPermission(tier: number): string {
  switch (tier) {
    case 1:
      return ''; // auto-approve
    case 2:
      return 'approval:write';
    case 3:
      return 'approval:write';
    default:
      return 'approval:write';
  }
}
