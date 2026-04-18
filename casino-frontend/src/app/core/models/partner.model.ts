/**
 * Interfaces do sistema de Parceiros/Afiliados
 */

// ===== ENTIDADES =====

export interface Partner {
  id: string;
  userId: string;
  referralCode: string;
  commissionType: 'percentage' | 'fixed';
  commissionValue: number;
  commissionThreshold: number;
  isActive: boolean;
  totalReferredUsers: number;
  totalCommissionsEarned: number;
  commissionBalance: number;
  pendingCommission: number;
  validationPeriodHours: number;
  partnerLevel: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  levelMode: 'auto' | 'manual';
  username?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
  // Campos extras retornados pela busca avançada
  lastActivity?: string;
  activeReferredUsers?: number;
  totalLosses?: number;
}

export interface PartnerCommission {
  id: string;
  partner_id: string;
  referred_user_id: string;
  transaction_id: string;
  bet_amount: number;
  loss_amount: number;
  commission_amount: number;
  commission_type: string;
  commission_value: number;
  status: 'pending' | 'validated' | 'cancelled';
  validated_at: string | null;
  created_at: string;
  referred_username?: string;
  referral_code?: string;
  partner_username?: string;
}

export interface PartnerWithdrawal {
  id: string;
  partner_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  referral_code?: string;
  username?: string;
  email?: string;
}

export interface ReferredUser {
  id: string;
  username: string;
  email: string;
  created_at: string;
  is_active: boolean;
  total_bets: string;
  total_wins: string;
  net_loss: string;
  commissions_generated: string;
}

// ===== ESTATÍSTICAS =====

export interface PartnerStats {
  totalReferredUsers: number;
  commissionBalance: number;
  pendingCommission: number;
  totalCommissionsEarned: number;
  totalCommissions: number;
  totalLossesReferred: number;
  pendingAmount: number;
  validatedAmount: number;
  monthly: PartnerMonthlyStats[];
}

export interface PartnerMonthlyStats {
  month: string;
  commissions_count: number;
  amount: number;
}

// ===== REQUESTS =====

export interface CreatePartnerRequest {
  userId: string;
  commissionType?: 'percentage' | 'fixed';
  commissionValue?: number;
  commissionThreshold?: number;
}

export interface UpdatePartnerConfigRequest {
  commissionType?: 'percentage' | 'fixed';
  commissionValue?: number;
  commissionThreshold?: number;
  validationPeriodHours?: number;
  partnerLevel?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  levelMode?: 'auto' | 'manual';
}

export interface WithdrawalReviewRequest {
  status: 'approved' | 'rejected';
  notes?: string;
}

// ===== RESPONSES =====

export interface PartnerProfileResponse {
  partner: Partner;
  stats: PartnerStats;
  referredUsers: PaginatedReferredUsers;
}

export interface PaginatedReferredUsers {
  users: ReferredUser[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PaginatedCommissions {
  commissions: PartnerCommission[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PaginatedWithdrawals {
  withdrawals: PartnerWithdrawal[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PaginatedPartners {
  partners: Partner[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ValidateCodeResponse {
  valid: boolean;
  partnerName: string;
  referralCode: string;
}

// ===== ADMIN METRICS =====

export interface PartnerAdminMetrics {
  activePartners: number;
  totalPartners: number;
  totalReferred: number;
  totalPendingCommission: number;
  totalCommissionsPaid: number;
  totalLosses: number;
  pendingWithdrawals: number;
}

export interface PartnerRanking {
  position: number;
  id: string;
  userId: string;
  referralCode: string;
  commissionType: string;
  commissionValue: number;
  isActive: boolean;
  totalReferredUsers: number;
  totalCommissionsEarned: number;
  commissionBalance: number;
  partnerLevel?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  levelMode?: 'auto' | 'manual';
  username?: string;
  email?: string;
  totalLosses: number;
  activeReferredUsers: number;
}

export interface PaginatedRanking {
  ranking: PartnerRanking[];
  total: number;
  page: number;
  totalPages: number;
}
