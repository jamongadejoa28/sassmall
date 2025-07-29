// AddressModal Component - 우편번호 검색 모달
// 위치: client/src/frameworks/ui/components/AddressModal.tsx

import React from 'react';
import AddressSearch, { AddressData } from './AddressSearch';

// ========================================
// Types & Interfaces
// ========================================

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddressSelect: (address: AddressData) => void;
}

// ========================================
// AddressModal Component
// ========================================

const AddressModal: React.FC<AddressModalProps> = ({
  isOpen,
  onClose,
  onAddressSelect,
}) => {
  if (!isOpen) return null;

  const handleAddressSelect = (address: AddressData) => {
    onAddressSelect(address);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-full overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <AddressSearch
          onAddressSelect={handleAddressSelect}
          onClose={onClose}
          width={480}
          height={500}
          className="rounded-lg"
        />
      </div>
    </div>
  );
};

export { AddressModal };
export default AddressModal;
