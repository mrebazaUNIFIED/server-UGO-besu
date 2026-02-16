import React from 'react';
import { LoanCertificate } from '../../../certificate/LoanCertificate';
import type { Loan } from '../../../../types/vaultTypes';

interface TabCertificateProps {
  loan: Loan;
}

export const TabCertificate: React.FC<TabCertificateProps> = ({ loan }) => {
  return <LoanCertificate loan={loan} />;
};