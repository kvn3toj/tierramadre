import {
  TreasureItem,
  GemologicalCertification,
  ColombianOriginCertification,
  EthicalCertification,
} from '../../../types';

export interface CertificationUploadProps {
  open: boolean;
  onClose: () => void;
  item: TreasureItem;
  onSave: (certifications: TreasureItem['certifications']) => void;
}

export interface GemologicalTabProps {
  gemological: Partial<GemologicalCertification>;
  setGemological: React.Dispatch<React.SetStateAction<Partial<GemologicalCertification>>>;
  certificateImage: string | undefined;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isLight: boolean;
}

export interface ColombianOriginTabProps {
  colombianOrigin: Partial<ColombianOriginCertification>;
  setColombianOrigin: React.Dispatch<React.SetStateAction<Partial<ColombianOriginCertification>>>;
  isLight: boolean;
}

export interface EthicalTabProps {
  ethical: Partial<EthicalCertification>;
  setEthical: React.Dispatch<React.SetStateAction<Partial<EthicalCertification>>>;
  isLight: boolean;
}
