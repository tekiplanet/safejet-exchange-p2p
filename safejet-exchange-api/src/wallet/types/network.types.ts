export interface NetworkConfig {
  network: string;
  version: string;
  isActive: boolean;
  blockchain: string;
  arrivalTime: string;
  requiredFields: {
    memo: boolean;
    tag: boolean;
  };
}

export interface NetworkResponse {
  blockchain: string;
  version: string;
  network: string;
  arrivalTime: string;
  requiredFields: {
    memo: boolean;
    tag: boolean;
  };
} 