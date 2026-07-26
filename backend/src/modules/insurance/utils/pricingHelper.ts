import prisma from '../../../lib/prisma.js';

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface InsurancePricingResult {
  policyId: string;
  coveragePercent: number;
  maxCoverageAmount: number | null;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    standardPrice: number;
    insurancePrice: number | null;
  }>;
  totalStandard: number;
  totalInsurance: number;
  patientPays: number;
  insurancePays: number;
}

export async function applyInsurancePricing(
  hospitalId: string,
  patientId: string,
  cartItems: CartItem[]
): Promise<InsurancePricingResult | null> {
  const policy = await prisma.insurancePolicy.findFirst({
    where: {
      patientId,
      hospitalId,
      isActive: true,
      isPrimary: true,
    },
    include: { insuranceCompany: true },
  });

  if (!policy) return null;

  const coveragePct = Number(policy.coveragePercent);

  const itemNames = [...new Set(cartItems.map((ci) => ci.name))];
  const rules = await prisma.insurancePricingRule.findMany({
    where: {
      insuranceCompanyId: policy.insuranceCompanyId,
      hospitalId,
      isActive: true,
      itemName: { in: itemNames },
    },
  });
  const ruleMap = new Map(rules.map((r) => [r.itemName, r]));

  const items = cartItems.map((cartItem) => {
    const rule = ruleMap.get(cartItem.name) ?? null;
    const insurancePrice = rule ? Number(rule.insurancePrice) : null;

    return {
      id: cartItem.id,
      name: cartItem.name,
      quantity: cartItem.quantity,
      standardPrice: cartItem.price,
      insurancePrice,
    };
  });

  let totalStandard = 0;
  let totalInsurance = 0;

  for (const item of items) {
    const effectivePrice = item.insurancePrice ?? item.standardPrice;
    totalStandard += item.standardPrice * item.quantity;
    totalInsurance += effectivePrice * item.quantity;
  }

  let patientPays = totalInsurance * ((100 - coveragePct) / 100);
  let insurancePays = totalInsurance - patientPays;

  if (policy.maxCoverageAmount !== null) {
    const maxAmt = Number(policy.maxCoverageAmount);
    if (insurancePays > maxAmt) {
      insurancePays = maxAmt;
      patientPays = totalInsurance - insurancePays;
    }
  }

  return {
    policyId: policy.id,
    coveragePercent: coveragePct,
    maxCoverageAmount: policy.maxCoverageAmount ? Number(policy.maxCoverageAmount) : null,
    items,
    totalStandard,
    totalInsurance,
    patientPays: Math.round(patientPays * 100) / 100,
    insurancePays: Math.round(insurancePays * 100) / 100,
  };
}
