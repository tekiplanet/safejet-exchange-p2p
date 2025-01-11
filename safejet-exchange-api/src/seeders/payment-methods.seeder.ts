export const paymentMethodTypes = [
  {
    name: 'Bank Transfer',
    icon: 'bank',
    description: 'Traditional bank transfer payment method',
    fields: [
      {
        name: 'bank_name',
        label: 'Bank Name',
        type: 'text',
        placeholder: 'Enter your bank name',
        helpText: 'The name of your bank',
        isRequired: true,
        order: 1,
        validationRules: {
          required: true,
          minLength: 2,
          maxLength: 100,
        },
      },
      {
        name: 'account_number',
        label: 'Account Number',
        type: 'text',
        placeholder: 'Enter your account number',
        helpText: 'Your bank account number',
        isRequired: true,
        order: 2,
        validationRules: {
          required: true,
          pattern: '^[0-9]{8,20}$',
        },
      },
      // More fields...
    ],
  },
  {
    name: 'Mobile Money',
    icon: 'mobile',
    description: 'Mobile money transfer services',
    fields: [
      {
        name: 'provider',
        label: 'Provider',
        type: 'select',
        placeholder: 'Select your provider',
        helpText: 'Your mobile money provider',
        isRequired: true,
        order: 1,
        validationRules: {
          required: true,
          options: ['M-Pesa', 'MTN Mobile Money', 'Airtel Money'],
        },
      },
      {
        name: 'phone_number',
        label: 'Phone Number',
        type: 'text',
        placeholder: 'Enter your mobile money number',
        helpText: 'The phone number registered with your mobile money account',
        isRequired: true,
        order: 2,
        validationRules: {
          required: true,
          pattern: '^[0-9]{10,12}$',
        },
      },
    ],
  },
  // More payment method types...
];
