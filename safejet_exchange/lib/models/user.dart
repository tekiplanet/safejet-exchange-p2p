class User {
  final String id;
  final String email;
  final String? name;
  final bool isEmailVerified;
  final bool is2FAEnabled;
  final bool biometricEnabled;  // For biometric authentication

  User({
    required this.id,
    required this.email,
    this.name,
    this.isEmailVerified = false,
    this.is2FAEnabled = false,
    this.biometricEnabled = false,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      email: json['email'],
      name: json['name'],
      isEmailVerified: json['isEmailVerified'] ?? false,
      is2FAEnabled: json['is2FAEnabled'] ?? false,
      biometricEnabled: json['biometricEnabled'] ?? false,
    );
  }
} 