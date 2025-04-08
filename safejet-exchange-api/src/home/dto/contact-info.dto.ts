export interface SocialMediaLinks {
    facebook: string;
    twitter: string;
    instagram: string;
    tiktok: string;
    telegram: string;
    discord: string;
    whatsapp: string;
    wechat: string;
    linkedin: string;
    youtube: string;
}

export interface SupportLinks {
    helpCenter: string;
    supportTickets: string;
    faq: string;
    knowledgeBase: string;
}

export interface CompanyAddress {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
}

export interface EmergencyContact {
    phone: string;
    email: string;
    supportLine: string;
}

export interface ContactInfoResponse {
    contactEmail: string;
    supportPhone: string;
    emergencyContact: EmergencyContact;
    companyAddress: CompanyAddress;
    socialMedia: SocialMediaLinks;
    supportLinks: SupportLinks;
} 