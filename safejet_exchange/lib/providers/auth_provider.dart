import 'package:flutter/foundation.dart';
import '../services/auth_service.dart';
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/material.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();
  bool _isLoading = false;
  bool _isLoggedIn = false;
  String? _error;
  BuildContext? _context;
  User? _user;

  bool get isLoading => _isLoading;
  bool get isLoggedIn => _isLoggedIn;
  String? get error => _error;
  User? get user => _user;

  void setContext(BuildContext context) {
    _context = context;
  }

  Future<void> handleSessionExpiration() async {
    await logout();
    if (_context != null && _context!.mounted) {
      // Clear navigation stack and go to login
      Navigator.of(_context!).pushNamedAndRemoveUntil(
        '/login',
        (route) => false,
      );
    }
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _authService.login(email, password);
      print('Login response: $response'); // Debug log

      _isLoading = false;
      notifyListeners();

      // If 2FA is required, don't store tokens yet
      if (response['requires2FA'] == true) {
        return response;
      }

      // Store tokens and user data only if 2FA is not required or after 2FA verification
      await _authService.storage.write(key: 'accessToken', value: response['accessToken']);
      await _authService.storage.write(key: 'refreshToken', value: response['refreshToken']);
      await _authService.storage.write(key: 'user', value: json.encode(response['user']));

      return response;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      await _authService.logout();
      _isLoggedIn = false;
      _error = null;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> checkAuthStatus() async {
    _isLoggedIn = await _authService.isLoggedIn();
    notifyListeners();
  }

  Future<void> register(String fullName, String email, String phone, String password, String countryCode, String countryName) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _authService.register(
        fullName,
        email,
        phone,
        password,
        countryCode,
        countryName,
      );
      _isLoggedIn = true;
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> verifyEmail(String code) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _authService.verifyEmail(code);
      _isLoggedIn = true;
      _isLoading = false;
      notifyListeners();
      return response;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> resendVerificationCode(String email) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _authService.resendVerificationCode(email);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> verify2FA(String code, [String? email]) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      if (email != null) {
        // This is for login verification
        final response = await _authService.verify2FA(email, code);
        
        // Store tokens after successful 2FA verification
        await _authService.storage.write(key: 'accessToken', value: response['accessToken']);
        await _authService.storage.write(key: 'refreshToken', value: response['refreshToken']);
        await _authService.storage.write(key: 'user', value: json.encode(response['user']));
        
        _isLoggedIn = true;
      } else {
        // This is for password change verification
        await _authService.verify2FAForAction(code);
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      print('2FA Provider error: $e');
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> forgotPassword(String email) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _authService.forgotPassword(email);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> resetPassword(String email, String code, String newPassword) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _authService.resetPassword(email, code, newPassword);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<Map<String, dynamic>> generate2FASecret() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _authService.generate2FASecret();
      _isLoading = false;
      notifyListeners();
      return result;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<Map<String, dynamic>> enable2FA(String code) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _authService.enable2FA(code);
      _isLoading = false;
      notifyListeners();
      return result;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> disable2FA(String code, String codeType) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _authService.disable2FA(code, codeType);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<List<String>> getBackupCodes() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _authService.getBackupCodes();
      _isLoading = false;
      notifyListeners();
      return List<String>.from(result['backupCodes']);
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getCurrentUser() async {
    try {
      return await _authService.getCurrentUser();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> storeTemp2FASecret(String secret) async {
    await _authService.storeTemp2FASecret(secret);
  }

  Future<void> updatePhone({
    required String phone,
    required String countryCode,
    required String countryName,
    required String phoneWithoutCode,
  }) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      await _authService.updatePhone(
        phone: phone,
        countryCode: countryCode,
        countryName: countryName,
        phoneWithoutCode: phoneWithoutCode,
      );

      // Update local user data
      final updatedUser = await _authService.getCurrentUser();
      await _updateStoredUser(updatedUser);

    } catch (e) {
      _error = e.toString();
      if (e.toString().contains('Session expired')) {
        await handleSessionExpiration();
      }
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Helper method to update stored user data
  Future<void> _updateStoredUser(Map<String, dynamic> user) async {
    final storage = const FlutterSecureStorage();
    await storage.write(key: 'user', value: json.encode(user));
  }

  Future<void> sendPhoneVerification() async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      await _authService.sendPhoneVerification();
    } catch (e) {
      _error = e.toString();
      if (e.toString().contains('Session expired')) {
        await handleSessionExpiration();
      }
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> verifyPhone(String code) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final response = await _authService.verifyPhone(code);
      await _updateStoredUser(response['user']);
    } catch (e) {
      _error = e.toString();
      if (e.toString().contains('Session expired')) {
        await handleSessionExpiration();
      }
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> verifyCurrentPassword(String currentPassword) async {
    try {
      final response = await _authService.verifyCurrentPassword(currentPassword);
      return response;
    } catch (e) {
      print('Error verifying password: $e');
      rethrow;
    }
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      await _authService.changePassword(currentPassword, newPassword);
    } catch (e) {
      print('Error changing password: $e');
      rethrow;
    }
  }

  Future<void> loadUser() async {
    try {
      final userData = await _authService.getCurrentUser();
      _user = User.fromJson(userData); // You'll need to create this model
      notifyListeners();
    } catch (e) {
      print('Error loading user: $e');
      rethrow;
    }
  }
}

class User {
  final String id;
  final String email;
  final String fullName;
  final bool emailVerified;
  final bool phoneVerified;
  final bool twoFactorEnabled;
  final String? phone;
  final String? countryCode;
  final String? countryName;
  final int kycLevel;
  final Map<String, dynamic>? kycData;

  User({
    required this.id,
    required this.email,
    required this.fullName,
    required this.emailVerified,
    required this.phoneVerified,
    required this.twoFactorEnabled,
    this.phone,
    this.countryCode,
    this.countryName,
    required this.kycLevel,
    this.kycData,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      email: json['email'],
      fullName: json['fullName'],
      emailVerified: json['emailVerified'] ?? false,
      phoneVerified: json['phoneVerified'] ?? false,
      twoFactorEnabled: json['twoFactorEnabled'] ?? false,
      phone: json['phone'],
      countryCode: json['countryCode'],
      countryName: json['countryName'],
      kycLevel: json['kycLevel'] ?? 0,
      kycData: json['kycData'],
    );
  }
} 